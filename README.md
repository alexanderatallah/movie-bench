# Movie Bench

Movie Bench is a React + Vite app that benchmarks LLMs on a box-office forecasting task.
Each model gets structured movie metadata and demand signals, predicts worldwide gross, and is scored against actual TMDB revenue.

## What This Project Does

1. Fetches a benchmark set of recent films (currently Jan-Feb 2026) from TMDB.
2. Enriches each film with Wikimedia pre-release pageview signals.
3. Runs multiple LLMs through OpenRouter on the same prediction prompt.
4. Scores prediction error and renders a leaderboard + per-movie breakdown in the UI.

## Tech Stack

- Frontend: React, Vite, TypeScript, Chart.js, Tailwind v4, shadcn/ui
- Data pipeline: TypeScript scripts (`tsx`)
- Model routing: OpenRouter
- Hosting: GitHub Pages (`npm run publish`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Add API keys in `.env`:

- `OPENROUTER_API_KEY`
- `TMDB_API_KEY`

4. Load environment variables:

```bash
set -a; source .env; set +a
```

## Run

- Full refresh (fetch + benchmark + build data):

```bash
npm run refresh
```

- Frontend dev server:

```bash
npm run dev
```

- Publish to GitHub Pages:

```bash
npm run publish
```

## Methodology

### 1) Movie Selection

- Source: TMDB Discover API
- Window: `2026-01-01` to `2026-02-28`
- Filters:
- English-language originals
- Sorted by revenue descending
- Excludes movies with zero reported revenue
- Keeps top 10 by worldwide revenue

### 2) Feature Construction Per Movie

The benchmark prompt includes:

- Core movie metadata from TMDB:
- title, release date, genres, overview, budget
- director and top-5 cast from credits
- Demand signal from Wikimedia:
- estimated Wikipedia attention in the 30 days and 7 days before release

### 3) Model Inference

- All models are called through OpenRouter with a shared system/user prompt.
- Output format required: JSON
- `{"predicted_gross": <number>, "uncertainty_pct": <number>, "reasoning": "<text>"}`
- Temperature: `0.3`
- Parsing:
- strict JSON parse, markdown-fence parse, then regex fallback for `predicted_gross`

### 4) Scoring

- Per-movie error:
- `abs(predicted - actual) / actual`
- Uncertainty-aware score (used for ranking):
- Convert reported `uncertainty_pct` to interval bounds:
- `L = predicted * (1 - u)` and `U = predicted * (1 + u)` where `u = uncertainty_pct / 100`
- Compute normalized interval score (Winkler score, `alpha = 0.32`):
- `((U - L) + (2/alpha) * max(0, L - actual) + (2/alpha) * max(0, actual - U)) / actual`
- Leaderboard ranking:
- ascending average interval score across movies (lower is better)
- Additional summary:
- average percentage error
- count of movies successfully scored
- average model uncertainty
- share of predictions where actual gross fell within the model's reported uncertainty interval

## Data Sources: What Each One Provides + Pros/Cons

### TMDB (The Movie Database)

Link: https://www.themoviedb.org/

What it provides in this project:

- Candidate movie list for the date window
- Ground-truth worldwide revenue (used as benchmark target)
- Movie metadata (title, release date, overview, genres, budget, poster path)
- Credits (director + top cast)

Pros:

- Broad catalog and convenient API surface for movie + credits
- Includes revenue values needed for scoring
- Simple discover query makes benchmark generation reproducible

Cons:

- Revenue updates can lag or change over time
- Some titles have missing/partial metadata
- Discover ranking quality depends on TMDB data completeness

### Wikimedia APIs (Wikipedia Search + Pageviews)

Links:

- https://en.wikipedia.org/w/api.php
- https://wikimedia.org/api/rest_v1/

What it provides in this project:

- Wikipedia page-title match for each movie
- Pageview totals for:
- 30 days pre-release
- 7 days pre-release

Pros:

- Public, transparent demand signal independent of studio reporting
- Useful for momentum (7d) vs baseline awareness (30d)

Cons:

- Title disambiguation can map to imperfect pages for ambiguous names
- Pageviews capture attention, not sentiment or purchase intent
- Sparse/noisy data for less-covered titles

### OpenRouter

Link: https://openrouter.ai

What it provides in this project:

- Unified API endpoint for running all benchmark models
- Consistent request shape across providers

## Current Model Set

- [`anthropic/claude-opus-4-6`](https://openrouter.ai/anthropic/claude-opus-4-6)
- [`google/gemini-3.1-pro-preview`](https://openrouter.ai/google/gemini-3.1-pro-preview)
- [`openai/gpt-5.2`](https://openrouter.ai/openai/gpt-5.2)
- [`moonshotai/kimi-k2.5`](https://openrouter.ai/moonshotai/kimi-k2.5)
- [`minimax/minimax-m2.5`](https://openrouter.ai/minimax/minimax-m2.5)
- [`x-ai/grok-4.1-fast`](https://openrouter.ai/x-ai/grok-4.1-fast)

## Output Files

- `data/movies.json`: enriched movie dataset used for prompting
- `data/results.json`: cached model predictions
- `public/data.json`: frontend-ready aggregate data (leaderboard + breakdown)

## Notes

- Benchmark cache is versioned via `prompt_version` in `scripts/run-benchmark.ts`.
- If prompt/features change, rerun benchmark so results are regenerated under the new prompt version.

## License

MIT
