import { readFileSync, writeFileSync, mkdirSync } from "fs";
import type { MovieData, ModelPrediction, FrontendData, LeaderboardEntry } from "./lib/types.js";

const INTERVAL_ALPHA = 0.32; // Treat reported +/- uncertainty as an approximate 68% interval.

function computeNormalizedIntervalScore(
  actual: number,
  predicted: number,
  uncertaintyPct: number
): number {
  const u = Math.max(0, uncertaintyPct) / 100;
  const lower = predicted * (1 - u);
  const upper = predicted * (1 + u);
  const width = upper - lower;
  const missBelow = Math.max(0, lower - actual);
  const missAbove = Math.max(0, actual - upper);
  const intervalScore = width + (2 / INTERVAL_ALPHA) * (missBelow + missAbove);
  return intervalScore / Math.max(actual, 1);
}

function main() {
  const movies: MovieData[] = JSON.parse(readFileSync("data/movies.json", "utf-8"));
  const predictions: ModelPrediction[] = JSON.parse(readFileSync("data/results.json", "utf-8"));

  console.log(`Building frontend data: ${movies.length} movies, ${predictions.length} predictions`);

  // Group predictions by model
  const byModel = new Map<string, ModelPrediction[]>();
  for (const p of predictions) {
    if (!byModel.has(p.model_id)) byModel.set(p.model_id, []);
    byModel.get(p.model_id)!.push(p);
  }

  const movieMap = new Map(movies.map((m) => [m.id, m]));

  const leaderboard: LeaderboardEntry[] = [];

  for (const [modelId, preds] of byModel) {
    const modelName = preds[0]?.model_name ?? modelId;
    const moviePreds: LeaderboardEntry["predictions"] = [];

    for (const p of preds) {
      const movie = movieMap.get(p.movie_id);
      if (!movie) continue;

      const pctError =
        p.success && p.predicted_gross !== null
          ? Math.abs(p.predicted_gross - movie.revenue) / movie.revenue
          : null;
      const uncertaintyPct =
        typeof p.uncertainty_pct === "number" && Number.isFinite(p.uncertainty_pct)
          ? Math.max(0, p.uncertainty_pct)
          : null;
      const withinUncertainty =
        p.success && p.predicted_gross !== null && uncertaintyPct !== null
          ? (() => {
              const range = (uncertaintyPct / 100) * p.predicted_gross;
              const lower = p.predicted_gross - range;
              const upper = p.predicted_gross + range;
              return movie.revenue >= lower && movie.revenue <= upper;
            })()
          : null;
      const intervalScore =
        p.success && p.predicted_gross !== null && uncertaintyPct !== null
          ? computeNormalizedIntervalScore(movie.revenue, p.predicted_gross, uncertaintyPct)
          : null;

      moviePreds.push({
        movie_id: movie.id,
        movie_title: movie.title,
        predicted: p.predicted_gross,
        uncertainty_pct: uncertaintyPct,
        within_uncertainty: withinUncertainty,
        interval_score: intervalScore,
        actual: movie.revenue,
        pct_error: pctError,
        reasoning: p.reasoning,
      });
    }

    const validErrors = moviePreds
      .map((p) => p.pct_error)
      .filter((e): e is number => e !== null);

    const avgError =
      validErrors.length > 0
        ? validErrors.reduce((a, b) => a + b, 0) / validErrors.length
        : Infinity;

    const sorted = [...validErrors].sort((a, b) => a - b);
    const medianError =
      sorted.length > 0
        ? sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        : Infinity;
    const validUncertainties = moviePreds
      .map((p) => p.uncertainty_pct)
      .filter((u): u is number => u !== null);
    const avgUncertainty =
      validUncertainties.length > 0
        ? validUncertainties.reduce((a, b) => a + b, 0) / validUncertainties.length
        : null;
    const withinValues = moviePreds
      .map((p) => p.within_uncertainty)
      .filter((v): v is boolean => v !== null);
    const withinRate =
      withinValues.length > 0
        ? withinValues.filter(Boolean).length / withinValues.length
        : null;
    const validIntervalScores = moviePreds
      .map((p) => p.interval_score)
      .filter((s): s is number => s !== null);
    const avgIntervalScore =
      validIntervalScores.length > 0
        ? validIntervalScores.reduce((a, b) => a + b, 0) / validIntervalScores.length
        : Infinity;

    leaderboard.push({
      model_id: modelId,
      model_name: modelName,
      avg_pct_error: avgError,
      median_pct_error: medianError,
      avg_interval_score: avgIntervalScore,
      avg_uncertainty_pct: avgUncertainty,
      within_uncertainty_rate: withinRate,
      predictions: moviePreds,
    });
  }

  // Sort by uncertainty-calibrated interval score (lowest = best)
  leaderboard.sort((a, b) => a.avg_interval_score - b.avg_interval_score);

  const output: FrontendData = {
    generated_at: new Date().toISOString(),
    movies,
    leaderboard,
  };

  mkdirSync("public", { recursive: true });
  writeFileSync("public/data.json", JSON.stringify(output, null, 2));
  console.log(`Wrote public/data.json (${leaderboard.length} models)`);
}

main();
