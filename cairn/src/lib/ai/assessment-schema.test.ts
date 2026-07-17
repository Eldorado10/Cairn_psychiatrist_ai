import { describe, expect, it } from "vitest";
import {
  parseAssessment,
  stripJsonFences,
} from "./assessment-schema";

const VALID = {
  risk: "moderate",
  riskRationale: "Ongoing distress without immediate danger.",
  primaryConcern: "Sleep disruption",
  secondaryConcerns: ["Work stress"],
  wellbeingScore: 55,
  summary: "Worry is disrupting sleep. It precedes the workday itself.",
  suggestion: "A first conversation with an anxiety specialist could help.",
  recommendedSpecialties: ["anxiety"],
  needsUrgentReview: false,
};

describe("stripJsonFences", () => {
  it("passes bare JSON through unchanged", () => {
    expect(stripJsonFences('{"a":1}')).toBe('{"a":1}');
  });

  it("strips a ```json fence", () => {
    expect(stripJsonFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips a bare ``` fence", () => {
    expect(stripJsonFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("extracts the object when the model narrates around it", () => {
    expect(
      stripJsonFences('Sure! Here is the JSON you asked for: {"a":1} Hope that helps.'),
    ).toBe('{"a":1}');
  });
});

describe("parseAssessment", () => {
  it("accepts a valid payload", () => {
    const result = parseAssessment(JSON.stringify(VALID));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.risk).toBe("moderate");
      expect(result.value.recommendedSpecialties).toEqual(["anxiety"]);
    }
  });

  it("accepts a fenced payload", () => {
    const result = parseAssessment("```json\n" + JSON.stringify(VALID) + "\n```");
    expect(result.ok).toBe(true);
  });

  it("rejects non-JSON with a parse error message", () => {
    const result = parseAssessment("I cannot answer that.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid JSON/);
  });

  it("rejects specialties outside the seeded set", () => {
    const result = parseAssessment(
      JSON.stringify({ ...VALID, recommendedSpecialties: ["astrology"] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/recommendedSpecialties/);
  });

  it("rejects an out-of-range wellbeing score", () => {
    const result = parseAssessment(
      JSON.stringify({ ...VALID, wellbeingScore: 140 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/wellbeingScore/);
  });

  it("rejects a non-integer wellbeing score", () => {
    const result = parseAssessment(
      JSON.stringify({ ...VALID, wellbeingScore: 55.5 }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a missing risk field", () => {
    const withoutRisk: Record<string, unknown> = { ...VALID };
    delete withoutRisk.risk;
    const result = parseAssessment(JSON.stringify(withoutRisk));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/risk/);
  });
});
