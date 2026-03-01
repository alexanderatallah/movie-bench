import { useEffect, useState } from "react";
import type { FrontendData } from "../scripts/lib/types";
import { Leaderboard } from "./components/Leaderboard";
import { MovieBreakdown } from "./components/MovieBreakdown";
import { ErrorChart } from "./components/ErrorChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const MODEL_CUTOFFS: Record<string, string> = {
  "anthropic/claude-opus-4-6": "2025-08",
  "google/gemini-3.1-pro-preview": "2025-01",
  "openai/gpt-5.2": "2025-08",
  "moonshotai/kimi-k2.5": "2024-04",
  "minimax/minimax-m2.5": "2024-06",
  "x-ai/grok-4.1-fast": "2024-11",
};

export default function App() {
  const [data, setData] = useState<FrontendData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  useEffect(() => {
    fetch("/data.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-base">
        Error: {error}
      </div>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-base">
        Loading...
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-baseline pb-4 border-b border-border">
        <h1 className="text-3xl font-bold tracking-wider">Movie Bench</h1>
        <div className="flex items-baseline gap-4">
          <span className="text-muted-foreground text-sm">
            {data.movies.length} movies &middot; {data.leaderboard.length}{" "}
            models
          </span>
          <span className="text-muted-foreground text-sm">
            Generated {new Date(data.generated_at).toLocaleDateString()}
          </span>
        </div>
      </header>

      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setMethodologyOpen(!methodologyOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
              Methodology
            </CardTitle>
            <span className="text-muted-foreground text-xs">
              {methodologyOpen ? "collapse" : "expand"}
            </span>
          </div>
        </CardHeader>
        {methodologyOpen && (
          <CardContent className="text-sm leading-7 space-y-3">
            <p>
              <strong>What this measures:</strong> Each model is given metadata
              about a recently-released movie (title, director, cast, genres,
              budget, plot summary, release date, YouTube trailer engagement
              (views/likes/comments), and Wikipedia pre-release pageview
              signals, then asked to predict worldwide box office gross. Models
              with training data that includes actual results will appear to
              "predict" accurately; those without must genuinely estimate.
            </p>
            <p>
              <strong>Movie selection:</strong> The top 10 English-language films
              released January–February 2026, sorted by worldwide revenue via
              TMDB's discover API. Movies with zero reported revenue are
              excluded.
            </p>
            <p>
              <strong>Models &amp; cutoffs:</strong> All models are called
              through OpenRouter. Each model's training-data cutoff date is shown
              on the leaderboard. Movies released before a model's cutoff are
              flagged — those predictions reflect memorization, not genuine
              forecasting.
            </p>
            <Separator />
            <p>
              <strong>Prompt design:</strong> A system prompt sets the role of
              "box office analyst." The user message supplies structured movie
              metadata plus demand signals (YouTube trailer stats and
              Wikipedia pageviews) and requests a JSON response:
            </p>
            <pre className="bg-muted/50 border border-border rounded-md px-4 py-3 text-xs overflow-x-auto font-mono">
              {`{"predicted_gross": <number>, "reasoning": "<text>"}`}
            </pre>
            <p>Temperature is fixed at 0.3 with a 500-token limit.</p>
            <Separator />
            <p>
              <strong>Scoring:</strong> Per-movie absolute percentage error =
              |predicted − actual| / actual. The leaderboard ranks models by
              average percentage error across all movies (lower is better).
            </p>
            <p>
              <strong>Ground truth:</strong> Worldwide gross revenue from TMDB
              (The Movie Database).
            </p>
            <p>
              <strong>Auxiliary signals:</strong> Trailer engagement metrics come
              from the YouTube Data API; Wikipedia attention metrics come from
              Wikimedia pageviews.
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Leaderboard
          </CardTitle>
          <CardDescription>
            Ranked by average prediction error (lower is better)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Leaderboard entries={data.leaderboard} cutoffs={MODEL_CUTOFFS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Prediction Error by Movie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChart leaderboard={data.leaderboard} movies={data.movies} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Movie Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MovieBreakdown
            leaderboard={data.leaderboard}
            movies={data.movies}
            cutoffs={MODEL_CUTOFFS}
          />
        </CardContent>
      </Card>
    </div>
  );
}
