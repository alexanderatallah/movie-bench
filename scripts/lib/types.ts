export interface WikimediaPageviewStats {
  page_title: string;
  views_30d_pre_release: number | null;
  views_7d_pre_release: number | null;
}

export interface MovieData {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  genres: string[];
  budget: number;
  revenue: number; // TMDB worldwide revenue (ground truth)
  director: string;
  cast: string[]; // top 5
  poster_path: string | null;
  wikimedia_pageviews: WikimediaPageviewStats | null;
}

export interface ModelPrediction {
  model_id: string;
  model_name: string;
  movie_id: number;
  prompt_version?: string;
  predicted_gross: number | null;
  uncertainty_pct?: number | null;
  reasoning: string;
  raw_response: string;
  success: boolean;
  error?: string;
}

export interface BenchmarkResults {
  generated_at: string;
  movies: MovieData[];
  predictions: ModelPrediction[];
}

// Frontend data shape (public/data.json)
export interface LeaderboardEntry {
  model_id: string;
  model_name: string;
  avg_pct_error: number;
  median_pct_error: number;
  avg_interval_score: number;
  avg_uncertainty_pct: number | null;
  within_uncertainty_rate: number | null;
  predictions: {
    movie_id: number;
    movie_title: string;
    predicted: number | null;
    uncertainty_pct: number | null;
    within_uncertainty: boolean | null;
    interval_score: number | null;
    actual: number;
    pct_error: number | null;
    reasoning: string;
  }[];
}

export interface FrontendData {
  generated_at: string;
  movies: MovieData[];
  leaderboard: LeaderboardEntry[];
}
