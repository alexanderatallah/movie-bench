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
    fetch(`${import.meta.env.BASE_URL}data.json`)
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
    <div className="space-y-6 pb-6">
      <header className="flex justify-between items-baseline pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1 shadow-sm">
            <img
              src={`${import.meta.env.BASE_URL}moviebench.png`}
              alt="Movie Bench logo"
              className="h-full w-full rounded-full object-cover"
            />
          </span>
          <h1 className="text-3xl font-bold tracking-wider">Movie Bench</h1>
        </div>
        <div className="flex items-baseline gap-4">
          <a
            href="https://github.com/alexanderatallah/movie-bench"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground text-sm"
          >
            GitHub
          </a>
          <span className="text-muted-foreground text-sm">
            {data.movies.length} movies &middot; {data.leaderboard.length}{" "}
            models
          </span>
          <span className="text-muted-foreground text-sm">
            Generated {new Date(data.generated_at).toLocaleDateString()}
          </span>
        </div>
      </header>

      <Card className="bg-card/90 border-border/70">
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
              budget, plot summary, release date, and Wikipedia pre-release
              pageview signals, then asked to predict worldwide box office
              gross. Models with training data that includes actual results will
              appear to "predict" accurately; those without must genuinely
              estimate.
            </p>
            <p>
              <strong>Movie selection:</strong> The top 10 English-language films
              released January–February 2026, sorted by worldwide revenue via
              {" "}
              <a
                href="https://developer.themoviedb.org/reference/discover-movie"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                TMDB&apos;s Discover API
              </a>
              . Movies with zero reported revenue are
              excluded.
            </p>
            <p>
              <strong>Models &amp; cutoffs:</strong> All models are called
              through{" "}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                OpenRouter
              </a>
              . Each model&apos;s training-data cutoff date is shown
              on the leaderboard. Movies released before a model's cutoff are
              flagged — those predictions reflect memorization, not genuine
              forecasting.
            </p>
            <Separator />
            <p>
              <strong>Prompt design:</strong> A system prompt sets the role of
              "box office analyst." The user message supplies structured movie
              metadata plus Wikipedia pageview demand signals and requests a
              JSON response:
            </p>
            <pre className="bg-muted/50 border border-border rounded-md px-4 py-3 text-xs overflow-x-auto font-mono">
              {`{"predicted_gross": <number>, "reasoning": "<text>"}`}
            </pre>
            <p>Temperature is fixed at 0.3.</p>
            <Separator />
            <p>
              <strong>Scoring:</strong> Per-movie absolute percentage error =
              |predicted − actual| / actual. The leaderboard ranks models by
              average percentage error across all movies (lower is better).
            </p>
            <p>
              <strong>Ground truth:</strong> Worldwide gross revenue from TMDB
              {" "}
              (<a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                The Movie Database
              </a>
              ).
            </p>
            <p>
              <strong>Auxiliary signals:</strong> Wikipedia attention metrics
              come from{" "}
              <a
                href="https://wikimedia.org/api/rest_v1/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Wikimedia Pageviews
              </a>
              .
            </p>
          </CardContent>
        )}
      </Card>

      <Card className="bg-card/90 border-border/70">
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

      <Card className="bg-card/90 border-border/70">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Prediction Error by Movie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChart leaderboard={data.leaderboard} movies={data.movies} />
        </CardContent>
      </Card>

      <Card className="bg-card/90 border-border/70">
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

      <footer className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
        Made by{" "}
        <a
          href="https://x.com/alexatallah"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-4 hover:underline"
        >
          Alex Atallah
        </a>
        {" "}·{" "}
        <a
          href="https://github.com/alexanderatallah/movie-bench"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-4 hover:underline"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
