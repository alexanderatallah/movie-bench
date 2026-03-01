import type { MovieData } from "./types.js";

export const SYSTEM_PROMPT = `You are a box office analyst. Given metadata about an upcoming Hollywood movie, predict its worldwide box office gross revenue in USD. Consider factors like genre, cast star power, director track record, budget, release timing, and plot appeal.

Respond with ONLY valid JSON in this exact format:
{"predicted_gross": <number>, "reasoning": "<brief explanation>"}

The predicted_gross should be a number in USD (e.g., 150000000 for $150M). Be specific — do not round to the nearest $100M.`;

export function buildMoviePrompt(movie: MovieData): string {
  const budget = movie.budget > 0
    ? `$${(movie.budget / 1_000_000).toFixed(0)}M`
    : "Unknown";

  return `Predict the worldwide box office gross for this movie:

Title: ${movie.title}
Release Date: ${movie.release_date}
Director: ${movie.director}
Cast: ${movie.cast.join(", ")}
Genres: ${movie.genres.join(", ")}
Budget: ${budget}
Plot: ${movie.overview}

Respond with JSON only: {"predicted_gross": <number>, "reasoning": "<text>"}`;
}
