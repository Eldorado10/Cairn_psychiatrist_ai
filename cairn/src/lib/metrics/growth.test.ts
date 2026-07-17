import { describe, expect, it } from "vitest";
import { computeGrowth } from "./growth";

describe("computeGrowth", () => {
  it("returns nulls with no scores", () => {
    expect(computeGrowth([])).toEqual({ delta: null, trend: null });
  });

  it("returns nulls with a single score", () => {
    expect(computeGrowth([50])).toEqual({ delta: null, trend: null });
  });

  it("computes the delta from the last two scores", () => {
    expect(computeGrowth([40, 55]).delta).toBe(15);
    expect(computeGrowth([60, 45]).delta).toBe(-15);
  });

  it("computes the slope of a perfect linear series", () => {
    // 30, 35, 40, 45, 50 -> +5 per assessment
    expect(computeGrowth([30, 35, 40, 45, 50]).trend).toBe(5);
  });

  it("computes a flat trend for a constant series", () => {
    expect(computeGrowth([50, 50, 50]).trend).toBe(0);
  });

  it("uses only the last 5 scores for the trend", () => {
    // Early crash then steady +5 climb; trend must reflect the climb only.
    const { trend } = computeGrowth([90, 10, 30, 35, 40, 45, 50]);
    expect(trend).toBe(5);
  });

  it("ignores null scores from unscored fallback assessments", () => {
    const { delta, trend } = computeGrowth([40, null, 55, undefined, 60]);
    expect(delta).toBe(5);
    expect(trend).toBe(10);
  });

  it("returns nulls when only one real score is among nulls", () => {
    expect(computeGrowth([null, 50, null])).toEqual({ delta: null, trend: null });
  });
});
