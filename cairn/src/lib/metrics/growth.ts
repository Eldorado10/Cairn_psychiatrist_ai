// Growth is computed, not generated: never ask a model for a number you can
// subtract yourself. Pure TypeScript, no I/O.

export type GrowthMetrics = {
  // Current wellbeing score minus the previous assessment's. Null until
  // there are at least two scores.
  delta: number | null;
  // Least-squares slope (points per assessment) across the last 5 scores.
  // Null until there are at least two scores.
  trend: number | null;
};

// `scores` ordered oldest -> newest; nulls (unscored fallback assessments)
// are ignored.
export function computeGrowth(
  scores: readonly (number | null | undefined)[],
): GrowthMetrics {
  const known = scores.filter((s): s is number => typeof s === "number");
  if (known.length < 2) {
    return { delta: null, trend: null };
  }

  const recent = known.slice(-5);
  return {
    delta: known[known.length - 1] - known[known.length - 2],
    trend: leastSquaresSlope(recent),
  };
}

function leastSquaresSlope(values: readonly number[]): number {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (i - meanX) * (values[i] - meanY);
    denominator += (i - meanX) ** 2;
  }

  return numerator / denominator;
}
