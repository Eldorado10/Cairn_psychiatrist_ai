import { z } from "zod";

export type AIConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatFinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other";

export type ChatFinishHandler = (result: {
  text: string;
  finishReason: ChatFinishReason;
}) => void | Promise<void>;

export const assessmentSchema = z.object({
  summary: z.string(),
  primaryConcern: z.string(),
  secondaryConcerns: z.array(z.string()),
  wellbeingScore: z.number().int().min(0).max(100),
  risk: z.enum(["low", "moderate", "elevated", "high"]),
  riskRationale: z.string(),
  recommendedSpecialties: z.array(z.string()),
  needsUrgentReview: z.boolean(),
});

export type Assessment = z.infer<typeof assessmentSchema>;

export const classifierVerdictSchema = z.object({
  crisis: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type ClassifierVerdict = z.infer<typeof classifierVerdictSchema>;
