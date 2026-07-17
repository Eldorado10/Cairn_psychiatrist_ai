import { z } from "zod";
import { assessConversation } from "@/lib/ai/assess";
import { FALLBACK_ASSESSMENT_SUMMARY } from "@/lib/ai/assessment-schema";
import type { AIConversationMessage } from "@/lib/ai";
import { matchDoctors } from "@/lib/matching/doctors";
import {
  CAIRN_SPECIALTIES,
  type CairnSpecialty,
} from "@/lib/matching/specialties";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

type AssessmentInsert = Database["public"]["Tables"]["assessments"]["Insert"];

const idSchema = z.string().uuid();

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function toSpecialties(values: string[] | null): CairnSpecialty[] {
  const allowed = new Set<string>(CAIRN_SPECIALTIES);
  return (values ?? []).filter((v): v is CairnSpecialty => allowed.has(v));
}

// Ends a conversation and guarantees exactly one assessment outcome for it:
// a model-extracted row, or the manual-review fallback row. Called by the
// Finish button and by the 20-minute idle timer; safe to call twice — the
// existing assessment is returned instead of a duplicate.
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return json({ error: "INVALID_CONVERSATION_ID" }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims.sub;
  if (authError || !userId) {
    return json({ error: "UNAUTHENTICATED" }, 401);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, ended_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError) {
    console.error("Could not load the conversation to finish", conversationError);
    return json({ error: "FINISH_FAILED" }, 500);
  }
  if (!conversation) {
    return json({ error: "CONVERSATION_NOT_FOUND" }, 404);
  }

  // Idempotency: one assessment per conversation. Finish + idle timer can
  // both fire; the second caller gets the first result.
  const { data: existing, error: existingError } = await supabase
    .from("assessments")
    .select("*")
    .eq("conversation_id", id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Could not check for an existing assessment", existingError);
    return json({ error: "FINISH_FAILED" }, 500);
  }

  if (!conversation.ended_at) {
    const { error: endError } = await supabase
      .from("conversations")
      .update({ ended_at: new Date().toISOString(), status: "ended" })
      .eq("id", id)
      .eq("user_id", userId);
    if (endError) {
      console.error("Could not mark the conversation as ended", endError);
      return json({ error: "FINISH_FAILED" }, 500);
    }
  }

  if (existing) {
    const doctors = await matchDoctors(
      supabase,
      toSpecialties(existing.recommended_specialties),
    );
    return json({ assessment: existing, doctors, alreadyAssessed: true });
  }

  const { data: storedMessages, error: historyError } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(200);

  if (historyError) {
    console.error("Could not load the transcript to assess", historyError);
    return json({ error: "FINISH_FAILED" }, 500);
  }

  // Nothing was said — nothing to assess. The conversation is still ended.
  if (!storedMessages?.some((m) => m.role === "user")) {
    return json({ assessment: null, doctors: [] });
  }

  const transcript: AIConversationMessage[] = storedMessages.map(
    ({ role, content }) => ({
      role: role === "assistant" ? "assistant" : "user",
      content,
    }),
  );

  const outcome = await assessConversation(transcript);

  const row: AssessmentInsert =
    outcome.status === "ok"
      ? {
          user_id: userId,
          conversation_id: id,
          risk: outcome.assessment.risk,
          risk_rationale: outcome.assessment.riskRationale,
          primary_concern: outcome.assessment.primaryConcern,
          secondary_concerns: outcome.assessment.secondaryConcerns,
          wellbeing_score: outcome.assessment.wellbeingScore,
          ai_summary: outcome.assessment.summary,
          ai_suggestion: outcome.assessment.suggestion,
          recommended_specialties: outcome.assessment.recommendedSpecialties,
          needs_urgent_review: outcome.assessment.needsUrgentReview,
          model_used: outcome.modelUsed,
        }
      : {
          // The extraction failed twice. Write the manual-review row anyway —
          // never silently drop an assessment.
          user_id: userId,
          conversation_id: id,
          risk: "moderate",
          ai_summary: FALLBACK_ASSESSMENT_SUMMARY,
          needs_urgent_review: true,
          model_used: outcome.modelUsed,
        };

  const { data: saved, error: insertError } = await supabase
    .from("assessments")
    .insert(row)
    .select("*")
    .single();

  if (insertError) {
    console.error("Could not save the assessment", insertError);
    return json({ error: "ASSESSMENT_SAVE_FAILED" }, 500);
  }

  const doctors =
    outcome.status === "ok"
      ? await matchDoctors(supabase, outcome.assessment.recommendedSpecialties)
      : [];

  return json({ assessment: saved, doctors });
}
