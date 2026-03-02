import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { callOpenRouter } from "./lib/openrouter.js";
import { SYSTEM_PROMPT, buildMoviePrompt } from "./lib/prompts.js";
import type { MovieData, ModelPrediction } from "./lib/types.js";

const MODELS = [
  { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro" },
  { id: "openai/gpt-5.2", name: "GPT 5.2" },
  { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5" },
  { id: "minimax/minimax-m2.5", name: "MiniMax M2.5" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
];

const MAX_CONCURRENT = 5;
const MAX_RETRIES = 3;
const PROMPT_VERSION = "2026-03-wikimedia-uncertainty-v1";

function parseUncertainty(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === "string") {
    const cleaned = value.replace("%", "").trim();
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
}

function parseResponse(raw: string): {
  predicted_gross: number;
  uncertainty_pct: number | null;
  reasoning: string;
} | null {
  // Try direct parse
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.predicted_gross === "number") {
      return {
        predicted_gross: parsed.predicted_gross,
        uncertainty_pct: parseUncertainty(parsed.uncertainty_pct),
        reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      };
    }
  } catch {}

  // Strip markdown fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (typeof parsed.predicted_gross === "number") {
        return {
          predicted_gross: parsed.predicted_gross,
          uncertainty_pct: parseUncertainty(parsed.uncertainty_pct),
          reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
        };
      }
    } catch {}
  }

  // Regex fallback
  const grossMatch = raw.match(/"predicted_gross"\s*:\s*(\d+(?:\.\d+)?)/);
  const uncertaintyMatch = raw.match(/"uncertainty_pct"\s*:\s*"?(\d+(?:\.\d+)?)%?"?/);
  const reasonMatch = raw.match(/"reasoning"\s*:\s*"([^"]*)"/);
  if (grossMatch) {
    return {
      predicted_gross: parseFloat(grossMatch[1]),
      uncertainty_pct: uncertaintyMatch ? parseFloat(uncertaintyMatch[1]) : null,
      reasoning: reasonMatch?.[1] ?? "",
    };
  }

  return null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function predictWithRetry(
  model: { id: string; name: string },
  movie: MovieData
): Promise<ModelPrediction> {
  const moviePrompt = buildMoviePrompt(movie);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const raw = await callOpenRouter(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: moviePrompt },
        ],
        { model: model.id, temperature: 0.3 }
      );

      const parsed = parseResponse(raw);
      if (!parsed) {
        return {
          model_id: model.id,
          model_name: model.name,
          movie_id: movie.id,
          prompt_version: PROMPT_VERSION,
          predicted_gross: null,
          uncertainty_pct: null,
          reasoning: "",
          raw_response: raw,
          success: false,
          error: "Failed to parse response",
        };
      }

      return {
        model_id: model.id,
        model_name: model.name,
        movie_id: movie.id,
        prompt_version: PROMPT_VERSION,
        predicted_gross: parsed.predicted_gross,
        uncertainty_pct: parsed.uncertainty_pct,
        reasoning: parsed.reasoning,
        raw_response: raw,
        success: true,
      };
    } catch (err: any) {
      if (err.message === "RATE_LIMITED" && attempt < MAX_RETRIES - 1) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`    Rate limited, retrying in ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }
      return {
        model_id: model.id,
        model_name: model.name,
        movie_id: movie.id,
        prompt_version: PROMPT_VERSION,
        predicted_gross: null,
        uncertainty_pct: null,
        reasoning: "",
        raw_response: "",
        success: false,
        error: err.message,
      };
    }
  }

  // Should not reach here
  return {
    model_id: model.id,
    model_name: model.name,
    movie_id: movie.id,
    prompt_version: PROMPT_VERSION,
    predicted_gross: null,
    uncertainty_pct: null,
    reasoning: "",
    raw_response: "",
    success: false,
    error: "Max retries exceeded",
  };
}

async function runBatch<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const moviesPath = "data/movies.json";
  if (!existsSync(moviesPath)) {
    console.error("data/movies.json not found. Run `npm run fetch` first.");
    process.exit(1);
  }

  const movies: MovieData[] = JSON.parse(readFileSync(moviesPath, "utf-8"));
  console.log(`Loaded ${movies.length} movies`);

  // Load existing results for caching
  const resultsPath = "data/results.json";
  let existing: ModelPrediction[] = [];
  if (existsSync(resultsPath)) {
    existing = JSON.parse(readFileSync(resultsPath, "utf-8"));
    console.log(`Loaded ${existing.length} existing predictions (cache)`);
  }

  const existingForPrompt = existing.filter(
    (p) => p.success && p.prompt_version === PROMPT_VERSION
  );
  const existingKeys = new Set(
    existingForPrompt.map((p) => `${p.model_id}::${p.movie_id}`)
  );

  // Build task list
  const tasks: { model: typeof MODELS[0]; movie: MovieData }[] = [];
  for (const model of MODELS) {
    for (const movie of movies) {
      const key = `${model.id}::${movie.id}`;
      if (!existingKeys.has(key)) {
        tasks.push({ model, movie });
      }
    }
  }

  console.log(`${tasks.length} predictions needed (${existingKeys.size} cached)`);

  if (tasks.length === 0) {
    console.log("All predictions cached. Nothing to do.");
    return;
  }

  const newPredictions = await runBatch(tasks, MAX_CONCURRENT, async ({ model, movie }) => {
    console.log(`  ${model.name} → "${movie.title}"...`);
    const result = await predictWithRetry(model, movie);
    if (result.success) {
      console.log(`    ✓ $${((result.predicted_gross ?? 0) / 1_000_000).toFixed(1)}M`);
    } else {
      console.log(`    ✗ ${result.error}`);
    }
    return result;
  });

  // Merge with existing
  const allPredictions = [...existingForPrompt, ...newPredictions];

  mkdirSync("data", { recursive: true });
  writeFileSync(resultsPath, JSON.stringify(allPredictions, null, 2));
  console.log(`\nSaved ${allPredictions.length} total predictions to data/results.json`);
}

main().catch(console.error);
