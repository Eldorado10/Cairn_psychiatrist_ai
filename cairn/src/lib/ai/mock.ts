import "server-only";

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type {
  Assessment,
  ChatFinishHandler,
  ClassifierVerdict,
} from "./types";

export const MOCK_CHAT_RESPONSE =
  "It sounds like this has been following you through the day and making it harder to settle at night. What feels most difficult in the moment when that dread shows up?";

export const MOCK_ASSESSMENT = {
  summary:
    "The person describes ongoing worry that is affecting sleep and making work feel difficult to approach.",
  primaryConcern: "Persistent worry affecting sleep and work",
  secondaryConcerns: ["Difficulty settling at night", "Anticipatory dread"],
  wellbeingScore: 58,
  risk: "low",
  riskRationale: "No immediate safety concern appears in the fixture conversation.",
  recommendedSpecialties: ["Therapist", "Clinical psychologist"],
  needsUrgentReview: false,
} as const satisfies Assessment;

export const MOCK_CLASSIFIER_VERDICT = {
  crisis: false,
  confidence: 0.96,
  reason: "The fixture contains distress but no indication of immediate danger.",
} as const satisfies ClassifierVerdict;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockChatResponse(onFinish: ChatFinishHandler) {
  const stream = createUIMessageStream({
    async execute({ writer }) {
      const textPartId = "mock-wren-response";

      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textPartId });

      for (const chunk of MOCK_CHAT_RESPONSE.match(/\S+\s*/g) ?? []) {
        writer.write({ type: "text-delta", id: textPartId, delta: chunk });
        await wait(18);
      }

      await onFinish({ text: MOCK_CHAT_RESPONSE, finishReason: "stop" });

      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export function createMockAssessment(): Assessment {
  return {
    ...MOCK_ASSESSMENT,
    secondaryConcerns: [...MOCK_ASSESSMENT.secondaryConcerns],
    recommendedSpecialties: [...MOCK_ASSESSMENT.recommendedSpecialties],
  };
}

export function createMockClassifierVerdict(): ClassifierVerdict {
  return { ...MOCK_CLASSIFIER_VERDICT };
}
