import "server-only";

import { generateText } from "ai";
import { CAIRN_SPECIALTIES } from "@/lib/matching/specialties";
import {
  parseAssessment,
  type ConversationAssessment,
} from "./assessment-schema";
import { aiEnv, assessmentModel } from "./provider";
import type { AIConversationMessage } from "./types";

// One structured extraction per finished conversation. Never throws for
// model/parse trouble: after two failed attempts the caller gets a
// "fallback" outcome and MUST still write an assessment row — an unassessed
// conversation is a person who fell through.
export type AssessmentOutcome =
  | { status: "ok"; assessment: ConversationAssessment; modelUsed: string }
  | { status: "fallback"; modelUsed: string };

const ASSESS_SYSTEM = `You summarize a supportive conversation into a single JSON object for a care coordination team.

Return ONLY the JSON object. No markdown, no code fences, no text before or after it. Use exactly these keys:
{
  "risk": "low" | "moderate" | "elevated" | "high",
  "riskRationale": string explaining the risk level in plain language,
  "primaryConcern": string naming the main concern in the person's terms,
  "secondaryConcerns": array of strings (may be empty),
  "wellbeingScore": integer from 0 to 100 (higher is doing better),
  "summary": string of at most 2 sentences,
  "suggestion": string of 1 sentence — one optional next step or category of human support, phrased as a possibility rather than a solution or instruction,
  "recommendedSpecialties": array containing ONLY values from ${JSON.stringify([...CAIRN_SPECIALTIES])},
  "needsUrgentReview": boolean
}

Be conservative. Never diagnose or imply a diagnosis. Never name medications, prescribe treatment, promise an outcome, or present the suggestion as a cure or solution. Never name a specific clinician. Prefer language such as "might consider" or "one option could be." Mark needsUrgentReview true only when the conversation itself supports it.`;

const MOCK_CONVERSATION_ASSESSMENT: ConversationAssessment = {
  risk: "low",
  riskRationale:
    "The person describes persistent worry without any indication of danger to themselves or others.",
  primaryConcern: "Persistent worry affecting sleep and work",
  secondaryConcerns: ["Difficulty settling at night", "Anticipatory dread"],
  wellbeingScore: 58,
  summary:
    "The person describes ongoing worry that disrupts sleep and makes work feel hard to approach. The pattern precedes conscious thought about the day.",
  suggestion:
    "Consider a first conversation with someone who works with anxiety and sleep.",
  recommendedSpecialties: ["anxiety", "depression"],
  needsUrgentReview: false,
};

function renderTranscript(messages: AIConversationMessage[]) {
  return messages
    .map((m) => `${m.role === "assistant" ? "Wren" : "Person"}: ${m.content}`)
    .join("\n\n");
}

export async function assessConversation(
  messages: AIConversationMessage[],
): Promise<AssessmentOutcome> {
  if (aiEnv.AI_MOCK_MODE) {
    return {
      status: "ok",
      assessment: {
        ...MOCK_CONVERSATION_ASSESSMENT,
        secondaryConcerns: [...MOCK_CONVERSATION_ASSESSMENT.secondaryConcerns],
        recommendedSpecialties: [
          ...MOCK_CONVERSATION_ASSESSMENT.recommendedSpecialties,
        ],
      },
      modelUsed: "mock",
    };
  }

  const basePrompt = `Conversation transcript:\n\n${renderTranscript(messages)}\n\nReturn the JSON object now.`;
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt =
      attempt === 0
        ? basePrompt
        : `${basePrompt}\n\nYour previous reply could not be used: ${lastError}\nReturn ONLY the corrected JSON object, with no code fences and no commentary.`;

    try {
      const { text } = await generateText({
        model: assessmentModel,
        system: ASSESS_SYSTEM,
        prompt,
        maxRetries: 0,
      });

      const parsed = parseAssessment(text);
      if (parsed.ok) {
        return {
          status: "ok",
          assessment: parsed.value,
          modelUsed: aiEnv.OPENROUTER_CHAT_MODEL,
        };
      }
      lastError = parsed.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  console.error(
    "Assessment extraction failed twice; falling back to manual review",
    lastError,
  );
  return { status: "fallback", modelUsed: aiEnv.OPENROUTER_CHAT_MODEL };
}
