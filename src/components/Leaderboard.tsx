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

function formatScore(n: number): string {
  if (!Number.isFinite(n)) return "\u2014";
  return n.toFixed(3);
}

function formatUncertainty(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  return `${n.toFixed(1)}%`;
}

function neutralBadge(text: string) {
  return (
    <Badge variant="secondary" className="font-mono tabular-nums">
      {text}
    </Badge>
  );
}

function errorText(pct: number) {
  return neutralBadge(formatPct(pct));
}

function uncertaintyBadge(pct: number | null | undefined) {
  if (pct === null || pct === undefined) {
    return neutralBadge("\u2014");
  }
  return neutralBadge(`\u00b1 ${formatUncertainty(pct)}`);
}

function withinRateBadge(rate: number | null | undefined) {
  if (rate === null || rate === undefined) {
    return neutralBadge("\u2014");
  }
  return neutralBadge(formatPct(rate));
}

function intervalScoreBadge(score: number) {
  return neutralBadge(formatScore(score));
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Training Cutoff</TableHead>
          <TableHead>Interval Score</TableHead>
          <TableHead>Avg Error</TableHead>
          <TableHead>Avg Uncertainty</TableHead>
          <TableHead>% Within Range</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, i) => {
          return (
            <TableRow key={entry.model_id}>
              <TableCell>{rankDisplay(i + 1)}</TableCell>
              <TableCell className="font-medium">
                <a
                  href={modelOpenRouterUrl(entry.model_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4"
                >
                  {entry.model_name}
                </a>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatCutoff(cutoffs[entry.model_id])}
              </TableCell>
              <TableCell>{intervalScoreBadge(entry.avg_interval_score)}</TableCell>
              <TableCell>{errorText(entry.avg_pct_error)}</TableCell>
              <TableCell>{uncertaintyBadge(entry.avg_uncertainty_pct)}</TableCell>
              <TableCell>{withinRateBadge(entry.within_uncertainty_rate)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
