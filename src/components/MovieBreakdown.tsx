import type { LeaderboardEntry, MovieData } from "../../scripts/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtDollars(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function formatPct(n: number | null): string {
  if (n === null) return "\u2014";
  return `${(n * 100).toFixed(1)}%`;
}

function errorBadge(pct: number | null) {
  if (pct === null) return <span className="text-muted-foreground">&mdash;</span>;
  if (pct < 0.3)
    return (
      <Badge className="bg-green text-white font-mono tabular-nums text-xs">
        {formatPct(pct)}
      </Badge>
    );
  if (pct < 0.6)
    return (
      <Badge className="bg-yellow text-black font-mono tabular-nums text-xs">
        {formatPct(pct)}
      </Badge>
    );
  return (
    <Badge variant="destructive" className="font-mono tabular-nums text-xs">
      {formatPct(pct)}
    </Badge>
  );
}

function isBeforeCutoff(movieDate: string, cutoff: string | undefined): boolean {
  if (!cutoff) return false;
  // cutoff is "YYYY-MM", movie is "YYYY-MM-DD"
  // A movie released before or during the cutoff month could be in training data
  const movieMonth = movieDate.slice(0, 7);
  return movieMonth <= cutoff;
}

export function MovieBreakdown({
  leaderboard,
  movies,
  cutoffs,
}: {
  leaderboard: LeaderboardEntry[];
  movies: MovieData[];
  cutoffs: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      {movies.map((movie) => (
        <Card key={movie.id} className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{movie.title}</CardTitle>
            <p className="text-muted-foreground text-xs">
              {movie.release_date} &middot; {movie.director} &middot;{" "}
              {movie.genres.join(", ")} &middot; Actual:{" "}
              {fmtDollars(movie.revenue)}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Predicted</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="max-w-[300px]">Reasoning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => {
                  const pred = entry.predictions.find(
                    (p) => p.movie_id === movie.id
                  );
                  const flagged = isBeforeCutoff(
                    movie.release_date,
                    cutoffs[entry.model_id]
                  );
                  return (
                    <TableRow key={entry.model_id}>
                      <TableCell className="font-medium">
                        {entry.model_name}
                        {flagged && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-yellow border-yellow text-[10px]"
                            title="Movie was released before this model's training cutoff — prediction may reflect memorization"
                          >
                            pre-cutoff
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {pred?.predicted ? fmtDollars(pred.predicted) : "\u2014"}
                      </TableCell>
                      <TableCell>
                        {errorBadge(pred?.pct_error ?? null)}
                      </TableCell>
                      <TableCell className="max-w-[300px] text-xs text-muted-foreground truncate">
                        <span title={pred?.reasoning ?? ""}>
                          {pred?.reasoning ?? "\u2014"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
