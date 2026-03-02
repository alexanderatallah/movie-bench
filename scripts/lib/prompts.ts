import type { MovieData } from "./types.js";

export const SYSTEM_PROMPT = `You are a box office analyst. Given metadata about an upcoming Hollywood movie, predict its worldwide box office gross revenue in USD. Consider factors like genre, cast star power, director track record, budget, release timing, and plot appeal.

Respond with ONLY valid JSON in this exact format:
{"predicted_gross": <number>, "uncertainty_pct": <number>, "reasoning": "<brief explanation>"}

The predicted_gross should be a number in USD (e.g., 150000000 for $150M). Be specific — do not round to the nearest $100M.`;

function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "Unknown";
  return n.toLocaleString();
}

export function buildMoviePrompt(movie: MovieData): string {
  const budget = movie.budget > 0
    ? `$${(movie.budget / 1_000_000).toFixed(0)}M`
    : "Unknown";
  const wiki = movie.wikimedia_pageviews;
  const wikiSignal = wiki
    ? `Page: ${wiki.page_title}; 30d pre-release views: ${formatCount(wiki.views_30d_pre_release)}; 7d pre-release views: ${formatCount(wiki.views_7d_pre_release)}`
    : "No Wikipedia pageview stats available";

  return `Predict the worldwide box office gross for this movie:

Title: ${movie.title}
Release Date: ${movie.release_date}
Director: ${movie.director}
Cast: ${movie.cast.join(", ")}
Genres: ${movie.genres.join(", ")}
Budget: ${budget}
Plot: ${movie.overview}
Wikipedia Pre-release Attention: ${wikiSignal}

Respond with JSON only: {"predicted_gross": <number>, "uncertainty_pct": <number>, "reasoning": "<text>"}.
Set uncertainty_pct as a percentage (e.g. 25 means +/-25% around predicted_gross).`;
}
