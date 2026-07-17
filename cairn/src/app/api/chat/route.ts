import { z } from "zod";
import {
  AI_RATE_LIMIT_CODE,
  isRateLimitError,
  streamWrenChat,
  type AIConversationMessage,
} from "@/lib/ai";
import { WREN_SYSTEM_PROMPT_V2 } from "@/lib/ai/prompts/wren";
import { startSafetyChecks } from "@/lib/safety/check";
import { createCrisisResponse } from "@/lib/safety/crisis-response";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CHAT_ERROR_CODE = "CHAT_ERROR";

const requestSchema = z.object({
  id: z.string().uuid(),
  messages: z
    .array(
      z
        .object({
          role: z.enum(["user", "assistant", "system"]),
          parts: z.array(z.unknown()),
        })
        .passthrough(),
    )
    .min(1),
});

function getText(parts: unknown[]) {
  return parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function errorResponse(code: string, status: number) {
  return new Response(code, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const userId = authData?.claims.sub;

  if (authError || !userId) {
    return errorResponse("UNAUTHENTICATED", 401);
  }

  let parsedBody: z.infer<typeof requestSchema>;

  try {
    parsedBody = requestSchema.parse(await request.json());
  } catch {
    return errorResponse("INVALID_CHAT_REQUEST", 400);
  }

  const currentMessage = parsedBody.messages.at(-1);

  if (!currentMessage || currentMessage.role !== "user") {
    return errorResponse("A_USER_MESSAGE_IS_REQUIRED", 400);
  }

  const userText = getText(currentMessage.parts);

  if (!userText || userText.length > 4_000) {
    return errorResponse("MESSAGE_MUST_BE_BETWEEN_1_AND_4000_CHARACTERS", 400);
  }

  // Start both layers before database work. The local result is immediate; the
  // model classifier runs concurrently behind a short timeout and never blocks
  // Wren indefinitely.
  const safety = startSafetyChecks(userText);

  const { data: existingConversation, error: conversationError } =
    await supabase
      .from("conversations")
      .select("id")
      .eq("id", parsedBody.id)
      .eq("user_id", userId)
      .maybeSingle();

  if (conversationError) {
    console.error("Could not load the chat conversation", conversationError);
    return errorResponse(CHAT_ERROR_CODE, 500);
  }

  if (!existingConversation) {
    const { error: insertConversationError } = await supabase
      .from("conversations")
      .insert({ id: parsedBody.id, user_id: userId });

    if (insertConversationError) {
      const status = insertConversationError.code === "23505" ? 403 : 500;
      console.error("Could not create the chat conversation", insertConversationError);
      return errorResponse(CHAT_ERROR_CODE, status);
    }
  }

  const { data: userMessage, error: userMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsedBody.id,
      role: "user",
      content: userText,
    })
    .select("id")
    .single();

  if (userMessageError) {
    console.error("Could not save the user message", userMessageError);
    return errorResponse(CHAT_ERROR_CODE, 500);
  }

  const modelSafety = await safety.model;
  const crisisDetected = safety.keyword.crisis || modelSafety.crisis;

  if (crisisDetected) {
    const triggerSource = safety.keyword.crisis ? "keyword" : "model";
    const matchedRule = safety.keyword.crisis
      ? `${safety.keyword.ruleId}:${safety.keyword.category}`
      : modelSafety.reason.slice(0, 500);

    const eventInsert = supabase
      .from("crisis_events")
      .insert({
        user_id: userId,
        conversation_id: parsedBody.id,
        message_id: userMessage.id,
        trigger_source: triggerSource,
        matched_rule: matchedRule,
      })
      .select("id")
      .single();

    const urgentReviewUpdate = (async () => {
      const { data: assessment, error: assessmentLookupError } = await supabase
        .from("assessments")
        .select("id")
        .eq("conversation_id", parsedBody.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assessmentLookupError) {
        console.error(
          "Could not find the latest assessment for urgent review",
          assessmentLookupError,
        );
        return;
      }

      if (!assessment) {
        return;
      }

      const { error: assessmentUpdateError } = await supabase
        .from("assessments")
        .update({ needs_urgent_review: true })
        .eq("id", assessment.id)
        .eq("user_id", userId);

      if (assessmentUpdateError) {
        console.error(
          "Could not mark the latest assessment for urgent review",
          assessmentUpdateError,
        );
      }
    })();

    const [{ data: crisisEvent, error: crisisEventError }] = await Promise.all([
      eventInsert,
      urgentReviewUpdate,
    ]);

    if (crisisEventError) {
      console.error("Could not save the crisis event", crisisEventError);
    }

    return createCrisisResponse({
      eventId: crisisEvent?.id ?? null,
      triggerSource,
    });
  }

  const { data: storedMessages, error: historyError } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", parsedBody.id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(100);

  if (historyError) {
    console.error("Could not load the chat history", historyError);
    return errorResponse(CHAT_ERROR_CODE, 500);
  }

  const modelMessages: AIConversationMessage[] = (storedMessages ?? []).map(
    ({ role, content }) => ({
      role: role === "assistant" ? "assistant" : "user",
      content,
    }),
  );

  try {
    return streamWrenChat({
      system: WREN_SYSTEM_PROMPT_V2.content,
      messages: modelMessages,
      onFinish: async ({ text, finishReason }) => {
        if (finishReason === "error" || !text.trim()) {
          return;
        }

        const { error } = await supabase.from("messages").insert({
          conversation_id: parsedBody.id,
          role: "assistant",
          content: text.trim(),
        });

        if (error) {
          console.error("Could not save Wren's response", error);
          throw error;
        }
      },
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return errorResponse(AI_RATE_LIMIT_CODE, 429);
    }

    console.error("Could not start Wren's response", error);
    return errorResponse(CHAT_ERROR_CODE, 500);
  }
}
