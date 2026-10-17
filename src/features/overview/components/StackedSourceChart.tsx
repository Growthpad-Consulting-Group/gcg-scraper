"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartEvent,
  type ActiveElement,
} from "chart.js";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { StackedChartData } from "@/features/overview/lib/dashboardStats";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  data: StackedChartData;
  totalTenders: number;
  onSelectDate?: (label: string) => void;
}

export default function StackedSourceChart({ data, totalTenders, onSelectDate }: Props) {
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";
  const gridColor = isDark ? "#26282c" : "#e4e4e7";
  const textColor = isDark ? "#8b8d93" : "#71717a";
  const tooltipBg = isDark ? "#131417" : "#ffffff";
  const tooltipText = isDark ? "#f4f4f5" : "#18181b";

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.color,
      borderRadius: 3,
      borderSkipped: false,
      maxBarThickness: 28,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    onClick: (_e: ChartEvent, elements: ActiveElement[]) => {
      if (!onSelectDate || elements.length === 0) return;
      const label = data.labels[elements[0].index];
      if (label) onSelectDate(label);
    },
    onHover: (event: ChartEvent, elements: ActiveElement[]) => {
      const target = event.native?.target as HTMLElement | undefined;
      if (target) target.style.cursor = onSelectDate && elements.length > 0 ? "pointer" : "default";
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipText,
        bodyColor: tooltipText,
        borderColor: gridColor,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items: { label: string }[]) => items[0].label,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: textColor, font: { size: 11 } },
        border: { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: textColor, precision: 0, font: { size: 11 } },
        grid: { color: gridColor },
        border: { display: false },
      },
    },
  };

  const isEmpty = data.datasets.every((ds) => ds.data.every((v) => v === 0));

  return (
    <div className="flex flex-col h-full">
      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.datasets.map((ds) => (
          <div key={ds.label} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ds.color }} />
            <span className="font-mono text-[11px] text-text-lo">{ds.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0" style={{ height: "200px" }}>
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-text-lo">No data for this period</div>
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
}
