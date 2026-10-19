"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartEvent,
  type ActiveElement,
  type ChartArea,
} from "chart.js";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { StackedChartData } from "@/features/overview/lib/dashboardStats";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

// Canvas gradient factory — called per-render by Chart.js when it has a chartArea
function makeGradient(ctx: CanvasRenderingContext2D, area: ChartArea, color: string): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  gradient.addColorStop(0, color + "55");  // 33% opacity at top
  gradient.addColorStop(0.6, color + "18"); // 9% at 60%
  gradient.addColorStop(1, color + "00");   // transparent at bottom
  return gradient;
}

interface Props {
  data: StackedChartData;
  onNavigate?: (source?: string) => void;
}

export default function GradientAreaChart({ data, onNavigate }: Props) {
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";

  const gridColor  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
  const textColor  = isDark ? "#52555d" : "#a1a1aa";
  const tooltipBg  = isDark ? "#0f1012" : "#ffffff";
  const tooltipTxt = isDark ? "#f4f4f5" : "#18181b";

  const isEmpty = data.datasets.every((ds) => ds.data.every((v) => v === 0));

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color,
      borderWidth: 2,
      // Gradient fill evaluated lazily once chartArea is available
      backgroundColor: (context: { chart: ChartJS }) => {
        const { chart } = context;
        const { ctx, chartArea } = chart;
        if (!chartArea) return ds.color + "22";
        return makeGradient(ctx, chartArea, ds.color);
      },
      fill: true,
      tension: 0.45,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: ds.color,
      pointHoverBorderColor: isDark ? "#131417" : "#ffffff",
      pointHoverBorderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    onClick: (_e: ChartEvent, elements: ActiveElement[]) => {
      if (!onNavigate) return;
      const source = elements.length > 0 ? data.datasets[elements[0].datasetIndex]?.label : undefined;
      onNavigate(source);
    },
    onHover: (event: ChartEvent, elements: ActiveElement[]) => {
      const el = event.native?.target as HTMLElement | undefined;
      if (el) el.style.cursor = elements.length > 0 ? "pointer" : "default";
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTxt,
        bodyColor: isDark ? "#8b8d93" : "#71717a",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
        borderWidth: 1,
        padding: { top: 10, right: 14, bottom: 10, left: 14 },
        cornerRadius: 10,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          title: (items: { label: string }[]) => items[0]?.label ?? "",
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        border: { display: false },
        ticks: { color: textColor, font: { size: 11 }, maxRotation: 0 },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: gridColor, drawTicks: false },
        border: { display: false, dash: [4, 4] },
        ticks: {
          color: textColor,
          font: { size: 11 },
          precision: 0,
          padding: 8,
        },
      },
    },
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Legend — each item navigates to that source */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {data.datasets.map((ds) => (
          <button
            key={ds.label}
            onClick={() => onNavigate?.(ds.label)}
            className="flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:opacity-70"
          >
            <div className="h-[3px] w-5 rounded-full" style={{ backgroundColor: ds.color }} />
            <span className="font-mono text-[11px] text-text-lo">{ds.label}</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height: 220 }}>
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-text-lo/50">
            No scrape data for this period
          </div>
        ) : (
          <Line data={chartData} options={options as any} />
        )}
      </div>
    </div>
  );
}
