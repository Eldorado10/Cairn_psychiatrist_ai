import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z
    .url()
    .default("https://openrouter.ai/api/v1"),
  OPENROUTER_CHAT_MODEL: z.string().min(1).default("openrouter/free"),
  OPENROUTER_CLASSIFIER_MODEL: z
    .string()
    .min(1)
    .default("openrouter/free"),
  OPENROUTER_SITE_URL: z.url().default("http://localhost:3000"),
  OPENROUTER_SITE_NAME: z.string().min(1).default("Cairn"),
  AI_MOCK_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
}).superRefine((env, context) => {
  if (!env.AI_MOCK_MODE && !env.OPENROUTER_API_KEY) {
    context.addIssue({
      code: "custom",
      path: ["OPENROUTER_API_KEY"],
      message: "OPENROUTER_API_KEY is required when AI_MOCK_MODE=false",
    });
  }
});

const parsedEnv = envSchema.safeParse({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  OPENROUTER_CHAT_MODEL: process.env.OPENROUTER_CHAT_MODEL,
  OPENROUTER_CLASSIFIER_MODEL: process.env.OPENROUTER_CLASSIFIER_MODEL,
  OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
  OPENROUTER_SITE_NAME: process.env.OPENROUTER_SITE_NAME,
  AI_MOCK_MODE: process.env.AI_MOCK_MODE,
});

if (!parsedEnv.success) {
  const fields = parsedEnv.error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .join(", ");

  throw new Error(`Invalid server environment: ${fields}`);
}

export const aiEnv = parsedEnv.data;

export class RateLimitError extends Error {
  readonly statusCode = 429;
  readonly attempts: number;

  constructor(attempts: number, cause?: unknown) {
    super("OpenRouter rate limit exceeded");
    this.name = "RateLimitError";
    this.attempts = attempts;
    this.cause = cause;
  }
}

type RetryPolicy = {
  maxAttempts: number;
  retryServerErrors: boolean;
};

const RETRY_BASE_DELAY_MS = 300;

function waitWithJitter(retryNumber: number, signal?: AbortSignal | null) {
  const exponentialDelay = RETRY_BASE_DELAY_MS * 2 ** retryNumber;
  const delay = Math.round(exponentialDelay * (0.75 + Math.random() * 0.5));

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timeout = setTimeout(resolve, delay);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

function createRetryFetch(policy: RetryPolicy): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    let attempts = 0;
    let rateLimitRetries = 0;
    let serverErrorRetries = 0;

    while (attempts < policy.maxAttempts) {
      attempts += 1;
      const response = await globalThis.fetch(request.clone());

      if (response.status === 429) {
        if (attempts >= policy.maxAttempts) {
          await response.body?.cancel();
          throw new RateLimitError(attempts);
        }

        await response.body?.cancel();
        await waitWithJitter(rateLimitRetries, request.signal);
        rateLimitRetries += 1;
        continue;
      }

      if (
        response.status >= 500 &&
        response.status <= 599 &&
        policy.retryServerErrors &&
        serverErrorRetries < 1 &&
        attempts < policy.maxAttempts
      ) {
        await response.body?.cancel();
        await waitWithJitter(serverErrorRetries, request.signal);
        serverErrorRetries += 1;
        continue;
      }

      return response;
    }

    throw new Error("OpenRouter request exhausted its retry policy");
  };
}

const providerOptions = {
  apiKey: aiEnv.OPENROUTER_API_KEY,
  baseURL: aiEnv.OPENROUTER_BASE_URL,
  compatibility: "strict" as const,
  headers: {
    "HTTP-Referer": aiEnv.OPENROUTER_SITE_URL,
    "X-Title": aiEnv.OPENROUTER_SITE_NAME,
  },
};

const retryingOpenRouter = createOpenRouter({
  ...providerOptions,
  fetch: createRetryFetch({
    maxAttempts: 3,
    retryServerErrors: true,
  }),
});

const noRetryOpenRouter = createOpenRouter({
  ...providerOptions,
  fetch: createRetryFetch({
    maxAttempts: 1,
    retryServerErrors: false,
  }),
});

export const chatModel = retryingOpenRouter.chat(aiEnv.OPENROUTER_CHAT_MODEL);
export const assessmentModel = retryingOpenRouter.chat(
  aiEnv.OPENROUTER_CHAT_MODEL,
);
export const crisisClassifierModel = noRetryOpenRouter.chat(
  aiEnv.OPENROUTER_CLASSIFIER_MODEL,
);

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (
    ("name" in error && error.name === "RateLimitError") ||
    ("statusCode" in error && error.statusCode === 429) ||
    ("status" in error && error.status === 429)
  ) {
    return true;
  }

  return "cause" in error && isRateLimitError(error.cause);
}
