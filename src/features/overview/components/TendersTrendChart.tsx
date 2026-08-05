"use client";

import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { TenderTrendPoint } from "@/features/overview/lib/tenderTrend";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function TendersTrendChart({ points }: { points: TenderTrendPoint[] }) {
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";
  const gridColor = isDark ? "#26282c" : "#e4e4e7";
  const textColor = isDark ? "#8b8d93" : "#71717a";

  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        data: points.map((p) => p.count),
        backgroundColor: "#f05d23",
        borderRadius: 4,
        maxBarThickness: 24,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: isDark ? "#131417" : "#ffffff",
        titleColor: isDark ? "#f4f4f5" : "#18181b",
        bodyColor: isDark ? "#f4f4f5" : "#18181b",
        borderColor: gridColor,
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        callbacks: { title: (items: { label: string }[]) => items[0].label, label: (item: { parsed: { y: number } }) => `${item.parsed.y} tenders` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
      y: { beginAtZero: true, ticks: { color: textColor, precision: 0, font: { size: 11 } }, grid: { color: gridColor } },
    },
  };

  const total = points.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="rounded-lg border border-app-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-xs font-medium uppercase tracking-wide text-text-lo">Tenders scraped — last {points.length} days</h2>
        <span className="font-mono text-xs text-text-lo">{total} total</span>
      </div>
      <div className="h-48">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
