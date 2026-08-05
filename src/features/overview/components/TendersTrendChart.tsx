"use client";

import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, type ChartEvent, type ActiveElement } from "chart.js";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { TenderTrendPoint } from "@/features/overview/lib/tenderTrend";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function TendersTrendChart({ points, onSelectDate }: { points: TenderTrendPoint[]; onSelectDate?: (date: string) => void }) {
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
    onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
      if (!onSelectDate || elements.length === 0) return;
      const point = points[elements[0].index];
      if (point) onSelectDate(point.date);
    },
    onHover: (event: ChartEvent, elements: ActiveElement[]) => {
      const target = event.native?.target as HTMLElement | undefined;
      if (target) target.style.cursor = onSelectDate && elements.length > 0 ? "pointer" : "default";
    },
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
        <h2 className="font-mono text-xs font-medium uppercase tracking-wide text-text-lo">
          Tenders scraped — last {points.length} days
          {onSelectDate && <span className="ml-2 normal-case text-text-lo/70">· click a bar to view that day</span>}
        </h2>
        <span className="font-mono text-xs text-text-lo">{total} total</span>
      </div>
      <div className="h-48">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
