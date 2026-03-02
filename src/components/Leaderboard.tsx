import type { LeaderboardEntry } from "../../scripts/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function errorBadge(pct: number) {
  if (pct < 0.3)
    return (
      <Badge className="bg-green text-white font-mono tabular-nums">
        {formatPct(pct)}
      </Badge>
    );
  if (pct < 0.6)
    return (
      <Badge className="bg-yellow text-black font-mono tabular-nums">
        {formatPct(pct)}
      </Badge>
    );
  return (
    <Badge variant="destructive" className="font-mono tabular-nums">
      {formatPct(pct)}
    </Badge>
  );
}

function rankDisplay(rank: number) {
  if (rank === 1) return <span className="text-[#f0c000] font-bold">{rank}</span>;
  if (rank === 2) return <span className="text-[#aaa] font-bold">{rank}</span>;
  if (rank === 3) return <span className="text-[#cd7f32] font-bold">{rank}</span>;
  return <span className="text-muted-foreground font-bold">{rank}</span>;
}

function formatCutoff(cutoff: string | undefined) {
  if (!cutoff) return <span className="text-muted-foreground">Unknown</span>;
  const [year, month] = cutoff.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function modelOpenRouterUrl(modelId: string): string {
  return `https://openrouter.ai/${modelId}`;
}

export function Leaderboard({
  entries,
  cutoffs,
}: {
  entries: LeaderboardEntry[];
  cutoffs: Record<string, string>;
}) {
  const maxError = Math.max(...entries.map((e) => e.avg_pct_error));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Cutoff</TableHead>
          <TableHead>Avg Error</TableHead>
          <TableHead>Median Error</TableHead>
          <TableHead className="w-[140px]">Error</TableHead>
          <TableHead>Scored</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, i) => {
          const scored = entry.predictions.filter(
            (p) => p.pct_error !== null
          ).length;
          const barWidth =
            maxError > 0 ? (entry.avg_pct_error / maxError) * 100 : 0;
          return (
            <TableRow key={entry.model_id}>
              <TableCell>{rankDisplay(i + 1)}</TableCell>
              <TableCell className="font-medium">
                <a
                  href={modelOpenRouterUrl(entry.model_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground/95 underline-offset-4 hover:underline hover:text-foreground"
                >
                  {entry.model_name}
                </a>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatCutoff(cutoffs[entry.model_id])}
              </TableCell>
              <TableCell>{errorBadge(entry.avg_pct_error)}</TableCell>
              <TableCell>{errorBadge(entry.median_pct_error)}</TableCell>
              <TableCell className="w-[140px]">
                <div className="bg-muted rounded-sm h-5 relative overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-primary/60 transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {scored}/{entry.predictions.length}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
