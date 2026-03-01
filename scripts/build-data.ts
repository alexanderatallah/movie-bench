import { readFileSync, writeFileSync, mkdirSync } from "fs";
import type { MovieData, ModelPrediction, FrontendData, LeaderboardEntry } from "./lib/types.js";

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

      moviePreds.push({
        movie_id: movie.id,
        movie_title: movie.title,
        predicted: p.predicted_gross,
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

    leaderboard.push({
      model_id: modelId,
      model_name: modelName,
      avg_pct_error: avgError,
      median_pct_error: medianError,
      predictions: moviePreds,
    });
  }

  // Sort by avg % error (lowest = best)
  leaderboard.sort((a, b) => a.avg_pct_error - b.avg_pct_error);

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
