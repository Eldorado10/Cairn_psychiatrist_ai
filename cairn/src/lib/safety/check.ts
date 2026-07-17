import "server-only";

import { classifyCrisis, type ClassifierVerdict } from "@/lib/ai";
import { checkCrisisKeywords } from "./keywords";

const CLASSIFIER_TIMEOUT_MS = 1_800;

function classifierFailureDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { name: "UnknownError" };
  }

  return {
    name:
      "name" in error && typeof error.name === "string"
        ? error.name
        : "UnknownError",
    status:
      "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : undefined,
  };
}

async function checkWithModel(message: string): Promise<ClassifierVerdict> {
  try {
    return await classifyCrisis(message, {
      abortSignal: AbortSignal.timeout(CLASSIFIER_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(
      "Crisis classifier failed; relying on the local keyword layer",
      classifierFailureDetails(error),
    );

    return {
      crisis: false,
      confidence: 0,
      reason: "Classifier unavailable",
    };
  }
}

export function startSafetyChecks(message: string) {
  const keyword = checkCrisisKeywords(message);
  const model = checkWithModel(message);

  return { keyword, model };
}
