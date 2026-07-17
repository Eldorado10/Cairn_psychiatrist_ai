import { z } from "zod";
import { CAIRN_SPECIALTIES } from "@/lib/matching/specialties";

// What the extraction model must return. recommendedSpecialties is
// constrained to the exact seeded specialty strings — anything outside the
// set fails validation and triggers the retry path.
export const conversationAssessmentSchema = z.object({
  risk: z.enum(["low", "moderate", "elevated", "high"]),
  riskRationale: z.string().min(1),
  primaryConcern: z.string().min(1),
  secondaryConcerns: z.array(z.string()).max(8),
  wellbeingScore: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  suggestion: z.string().min(1),
  recommendedSpecialties: z.array(z.enum(CAIRN_SPECIALTIES)).max(4),
  needsUrgentReview: z.boolean(),
});

export type ConversationAssessment = z.infer<typeof conversationAssessmentSchema>;

export const FALLBACK_ASSESSMENT_SUMMARY =
  "Automatic assessment unavailable — needs manual review";

// Free models fence and narrate despite instructions. Peel a ```json fence
// if present, then keep only the outermost {...} span if prose leaked in.
export function stripJsonFences(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first && (first > 0 || last < text.length - 1)) {
    text = text.slice(first, last + 1);
  }
  return text;
}

export type ParsedAssessment =
  | { ok: true; value: ConversationAssessment }
  | { ok: false; error: string };

export function parseAssessment(raw: string): ParsedAssessment {
  let candidate: unknown;
  try {
    candidate = JSON.parse(stripJsonFences(raw));
  } catch (error) {
    return {
      ok: false,
      error: `Response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const result = conversationAssessmentSchema.safeParse(candidate);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { ok: false, error: `JSON did not match the schema: ${issues}` };
  }

  return { ok: true, value: result.data };
}
