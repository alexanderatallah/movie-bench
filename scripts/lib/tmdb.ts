const TMDB_BASE = "https://api.themoviedb.org/3";

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY not set");
  return key;
}

interface TMDBDiscoverResult {
  results: { id: number; title: string; release_date: string }[];
  total_pages: number;
}

interface TMDBMovieDetails {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  genres: { id: number; name: string }[];
  budget: number;
  revenue: number;
  poster_path: string | null;
}

interface TMDBCredits {
  cast: { name: string; order: number }[];
  crew: { name: string; job: string }[];
}

interface TMDBVideos {
  results: Array<{
    site: string;
    type: string;
    official: boolean;
    key: string;
    name: string;
    published_at: string;
  }>;
}

export async function discoverMovies(
  startDate: string,
  endDate: string
): Promise<{ id: number; title: string; release_date: string }[]> {
  const apiKey = getApiKey();
  const allMovies: { id: number; title: string; release_date: string }[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 5) {
    const url = `${TMDB_BASE}/discover/movie?api_key=${apiKey}&primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&sort_by=revenue.desc&with_original_language=en&page=${page}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`TMDB discover error: ${resp.status}`);
    const data = (await resp.json()) as TMDBDiscoverResult;
    allMovies.push(...data.results);
    totalPages = data.total_pages;
    page++;
  }

  return allMovies;
}

export async function getMovieDetails(
  movieId: number
): Promise<{ details: TMDBMovieDetails; credits: TMDBCredits; videos: TMDBVideos }> {
  const apiKey = getApiKey();

  const [detailsResp, creditsResp, videosResp] = await Promise.all([
    fetch(`${TMDB_BASE}/movie/${movieId}?api_key=${apiKey}`),
    fetch(`${TMDB_BASE}/movie/${movieId}/credits?api_key=${apiKey}`),
    fetch(`${TMDB_BASE}/movie/${movieId}/videos?api_key=${apiKey}`),
  ]);

  if (!detailsResp.ok) throw new Error(`TMDB details error: ${detailsResp.status}`);
  if (!creditsResp.ok) throw new Error(`TMDB credits error: ${creditsResp.status}`);
  if (!videosResp.ok) throw new Error(`TMDB videos error: ${videosResp.status}`);

  const details = (await detailsResp.json()) as TMDBMovieDetails;
  const credits = (await creditsResp.json()) as TMDBCredits;
  const videos = (await videosResp.json()) as TMDBVideos;

  return { details, credits, videos };
}
