import type { WikimediaPageviewStats } from "./types.js";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIMEDIA_PAGEVIEWS_API = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article";
const USER_AGENT = "movie-bench/1.0 (https://github.com/movie-bench)";

interface WikipediaSearchResponse {
  query?: {
    search?: Array<{
      title: string;
    }>;
  };
}

interface WikimediaPageviewsResponse {
  items?: Array<{
    views: number;
  }>;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatWikiDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}00`;
}

function scoreWikipediaTitle(candidateTitle: string, movieTitle: string, releaseYear: string): number {
  const candidate = candidateTitle.toLowerCase();
  let score = 0;

  if (candidate.includes(movieTitle)) score += 50;
  if (candidate.includes("film")) score += 20;
  if (candidate.includes(releaseYear)) score += 30;

  const yearMatch = candidateTitle.match(/\b(19|20)\d{2}\b/);
  if (yearMatch && yearMatch[0] !== releaseYear) score -= 15;

  return score;
}

async function searchWikipediaPage(title: string, releaseDate: string): Promise<string | null> {
  const year = releaseDate.slice(0, 4);
  const normalizedTitle = title.replace(/"/g, "").toLowerCase();
  const queries = [`${title} ${year} film`, `${title} film`, title];

  for (const query of queries) {
    const url = `${WIKIPEDIA_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&srlimit=5`;
    const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!resp.ok) continue;
    const data = (await resp.json()) as WikipediaSearchResponse;
    const results = data.query?.search ?? [];
    if (results.length === 0) continue;

    const preferred = [...results].sort(
      (a, b) =>
        scoreWikipediaTitle(b.title, normalizedTitle, year) -
        scoreWikipediaTitle(a.title, normalizedTitle, year)
    )[0];

    if (preferred?.title) return preferred.title;
  }

  return null;
}

async function fetchPageviews(
  pageTitle: string,
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  const article = encodeURIComponent(pageTitle.replace(/\s+/g, "_"));
  const start = formatWikiDate(startDate);
  const end = formatWikiDate(endDate);
  const url = `${WIKIMEDIA_PAGEVIEWS_API}/en.wikipedia/all-access/user/${article}/daily/${start}/${end}`;

  const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!resp.ok) return null;
  const data = (await resp.json()) as WikimediaPageviewsResponse;
  const items = data.items ?? [];
  if (items.length === 0) return null;
  return items.reduce((sum, item) => sum + item.views, 0);
}

export async function getWikimediaPageviewStats(
  title: string,
  releaseDate: string
): Promise<WikimediaPageviewStats | null> {
  const release = new Date(`${releaseDate}T00:00:00Z`);
  if (Number.isNaN(release.getTime())) return null;

  try {
    const pageTitle = await searchWikipediaPage(title, releaseDate);
    if (!pageTitle) return null;

    const dayBeforeRelease = addDays(release, -1);
    const thirtyDaysBefore = addDays(release, -30);
    const sevenDaysBefore = addDays(release, -7);

    const [views30d, views7d] = await Promise.all([
      fetchPageviews(pageTitle, thirtyDaysBefore, dayBeforeRelease),
      fetchPageviews(pageTitle, sevenDaysBefore, dayBeforeRelease),
    ]);

    return {
      page_title: pageTitle,
      views_30d_pre_release: views30d,
      views_7d_pre_release: views7d,
    };
  } catch {
    return null;
  }
}
