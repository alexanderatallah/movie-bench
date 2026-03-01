import { useRef, useEffect } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import type { LeaderboardEntry, MovieData } from "../../scripts/lib/types";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = [
  "#58a6ff",
  "#3fb950",
  "#d29922",
  "#f85149",
  "#bc8cff",
  "#f0883e",
];

export function ErrorChart({
  leaderboard,
  movies,
}: {
  leaderboard: LeaderboardEntry[];
  movies: MovieData[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = movies.map((m) => {
      const short = m.title.length > 20 ? m.title.slice(0, 18) + "..." : m.title;
      return short;
    });

    const datasets = leaderboard.map((entry, i) => ({
      label: entry.model_name,
      data: movies.map((movie) => {
        const pred = entry.predictions.find((p) => p.movie_id === movie.id);
        return pred?.pct_error !== null && pred?.pct_error !== undefined
          ? +(pred.pct_error * 100).toFixed(1)
          : 0;
      }),
      backgroundColor: COLORS[i % COLORS.length],
      borderRadius: 2,
    }));

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#8b949e", font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}% error`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#8b949e", font: { size: 11 } },
            grid: { color: "rgba(48, 54, 61, 0.5)" },
          },
          y: {
            ticks: {
              color: "#8b949e",
              font: { size: 11 },
              callback: (v) => `${v}%`,
            },
            grid: { color: "rgba(48, 54, 61, 0.5)" },
            title: {
              display: true,
              text: "% Error",
              color: "#8b949e",
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [leaderboard, movies]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}
