import { writeFileSync, mkdirSync } from "fs";
import { discoverMovies, getMovieDetails } from "./lib/tmdb.js";
import { getYouTubeVideoStats } from "./lib/youtube.js";
import { getWikimediaPageviewStats } from "./lib/wikimedia.js";
import type { MovieData } from "./lib/types.js";

const TARGET_MOVIES = 10;

function pickYouTubeTrailer(
  videos: Array<{
    site: string;
    type: string;
    official: boolean;
    key: string;
    name: string;
    published_at: string;
  }>
) {
  const youtubeVideos = videos.filter((v) => v.site === "YouTube");
  if (youtubeVideos.length === 0) return null;

  const trailers = youtubeVideos.filter((v) => v.type === "Trailer");
  if (trailers.length === 0) return youtubeVideos[0];

  trailers.sort((a, b) => Number(b.official) - Number(a.official));
  return trailers[0];
}

async function main() {
  console.log("Fetching Jan-Feb 2026 movies from TMDB...");

  const discovered = await discoverMovies("2026-01-01", "2026-02-28");
  console.log(`Discovered ${discovered.length} movies`);

  const movies: MovieData[] = [];

  for (const entry of discovered) {
    if (movies.length >= TARGET_MOVIES) break;

    try {
      const { details, credits, videos } = await getMovieDetails(entry.id);

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

      const trailer = pickYouTubeTrailer(videos.results);
      let youtubeTrailer: MovieData["youtube_trailer"] = null;
      if (trailer) {
        try {
          const stats = await getYouTubeVideoStats(trailer.key);
          youtubeTrailer = {
            video_id: trailer.key,
            title: trailer.name,
            published_at: trailer.published_at,
            view_count: stats?.view_count ?? null,
            like_count: stats?.like_count ?? null,
            comment_count: stats?.comment_count ?? null,
          };
        } catch (err) {
          console.warn(`  ! YouTube stats unavailable for "${details.title}"`);
          youtubeTrailer = {
            video_id: trailer.key,
            title: trailer.name,
            published_at: trailer.published_at,
            view_count: null,
            like_count: null,
            comment_count: null,
          };
        }
      }

      const wikimediaPageviews = await getWikimediaPageviewStats(
        details.title,
        details.release_date
      );

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
        youtube_trailer: youtubeTrailer,
        wikimedia_pageviews: wikimediaPageviews,
      });

      console.log(`  ✓ ${details.title} — $${(details.revenue / 1_000_000).toFixed(1)}M`);
    } catch (err) {
      console.error(`  ✗ Failed to fetch details for "${entry.title}":`, err);
    }
  }

  // Keep the benchmark fixed to the top 10 by worldwide revenue.
  movies.sort((a, b) => b.revenue - a.revenue);
  const topMovies = movies.slice(0, TARGET_MOVIES);

  mkdirSync("data", { recursive: true });
  writeFileSync("data/movies.json", JSON.stringify(topMovies, null, 2));
  console.log(`\nSaved ${topMovies.length} movies to data/movies.json (top ${TARGET_MOVIES} by revenue)`);
}

main().catch(console.error);
