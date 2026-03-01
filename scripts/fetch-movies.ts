import { writeFileSync, mkdirSync } from "fs";
import { discoverMovies, getMovieDetails } from "./lib/tmdb.js";
import type { MovieData } from "./lib/types.js";

async function main() {
  console.log("Fetching Jan-Feb 2026 movies from TMDB...");

  const discovered = await discoverMovies("2026-01-01", "2026-02-28");
  console.log(`Discovered ${discovered.length} movies`);

  const movies: MovieData[] = [];

  for (const entry of discovered) {
    try {
      const { details, credits } = await getMovieDetails(entry.id);

      // Skip movies with zero revenue (not yet reported)
      if (details.revenue <= 0) {
        console.log(`  Skipping "${details.title}" — no revenue data`);
        continue;
      }

      const director = credits.crew.find((c) => c.job === "Director")?.name ?? "Unknown";
      const cast = credits.cast
        .sort((a, b) => a.order - b.order)
        .slice(0, 5)
        .map((c) => c.name);

      movies.push({
        id: details.id,
        title: details.title,
        release_date: details.release_date,
        overview: details.overview,
        genres: details.genres.map((g) => g.name),
        budget: details.budget,
        revenue: details.revenue,
        director,
        cast,
        poster_path: details.poster_path,
      });

      console.log(`  ✓ ${details.title} — $${(details.revenue / 1_000_000).toFixed(1)}M`);
    } catch (err) {
      console.error(`  ✗ Failed to fetch details for "${entry.title}":`, err);
    }
  }

  mkdirSync("data", { recursive: true });
  writeFileSync("data/movies.json", JSON.stringify(movies, null, 2));
  console.log(`\nSaved ${movies.length} movies to data/movies.json`);
}

main().catch(console.error);
