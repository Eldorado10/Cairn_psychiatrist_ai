import "server-only";

import { generateObject, streamText } from "ai";
import {
  createMockAssessment,
  createMockChatResponse,
  createMockClassifierVerdict,
} from "./mock";
import {
  aiEnv,
  assessmentModel,
  chatModel,
  crisisClassifierModel,
  isRateLimitError,
  RateLimitError,
} from "./provider";
import {
  assessmentSchema,
  classifierVerdictSchema,
  type AIConversationMessage,
  type Assessment,
  type ChatFinishHandler,
  type ClassifierVerdict,
} from "./types";

export const AI_RATE_LIMIT_CODE = "RATE_LIMIT";
const AI_ERROR_CODE = "CHAT_ERROR";

export { isRateLimitError, RateLimitError } from "./provider";
export type {
  AIConversationMessage,
  Assessment,
  ClassifierVerdict,
} from "./types";

type StreamWrenChatInput = {
  system: string;
  messages: AIConversationMessage[];
  onFinish: ChatFinishHandler;
};

export function streamWrenChat({
  system,
  messages,
  onFinish,
}: StreamWrenChatInput): Response {
  if (aiEnv.AI_MOCK_MODE) {
    return createMockChatResponse(onFinish);
  }

  const result = streamText({
    model: chatModel,
    system,
    messages,
    maxRetries: 0,
    onFinish: async ({ text, finishReason }) => {
      await onFinish({ text, finishReason });
    },
  });

  return result.toUIMessageStreamResponse({
    onError(error) {
      if (isRateLimitError(error)) {
        return AI_RATE_LIMIT_CODE;
      }

      console.error("Wren response stream failed", error);
      return AI_ERROR_CODE;
    },
  });
}

export async function generateAssessment(
  messages: AIConversationMessage[],
): Promise<Assessment> {
  if (aiEnv.AI_MOCK_MODE) {
    return createMockAssessment();
  }

  try {
    const result = await generateObject({
      model: assessmentModel,
      schema: assessmentSchema,
      schemaName: "cairn_assessment",
      system:
        "Summarize the conversation conservatively. Do not diagnose. Recommend only categories of clinicians. Mark urgent review only when the conversation supports it.",
      prompt: JSON.stringify(messages),
      maxRetries: 0,
    });

    return result.object;
  } catch (error) {
    if (isRateLimitError(error)) {
      throw new RateLimitError(3, error);
    }

    throw error;
  }
}

export async function classifyCrisis(
  message: string,
  options: { abortSignal?: AbortSignal } = {},
): Promise<ClassifierVerdict> {
  if (aiEnv.AI_MOCK_MODE) {
    return createMockClassifierVerdict();
  }

  try {
    const result = await generateObject({
      model: crisisClassifierModel,
      schema: classifierVerdictSchema,
      schemaName: "cairn_crisis_verdict",
      system:
        "Classify only whether this message indicates possible immediate danger, suicidal ideation, self-harm, acute crisis, or harm to another person. Bias toward crisis=true when uncertain. Return strict JSON matching the supplied schema, with no advice and no extra keys.",
      prompt: message,
      maxRetries: 0,
      abortSignal: options.abortSignal,
    });

    return result.object;
  } catch (error) {
    if (isRateLimitError(error)) {
      throw new RateLimitError(1, error);
    }

    throw error;
  }
}
