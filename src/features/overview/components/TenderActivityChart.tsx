"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { Icon } from "@iconify/react";

export default function TenderActivityChart({ chartData, mode, isLoading }: { chartData: { labels: string[]; values: number[] }; mode: "light" | "dark"; isLoading: boolean }) {
  const isDark = mode === "dark";
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (isLoading || !chartData.labels || !chartData.values || !chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Tenders Found",
            data: chartData.values,
            backgroundColor: isDark ? "rgba(244, 101, 35, 0.7)" : "rgba(244, 101, 35, 0.5)",
            borderColor: "#f05d23",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Tender Activity (Last 7 Days)", color: isDark ? "#fff" : "#231812", font: { size: 16, weight: "bold" }, padding: { top: 10, bottom: 20 } },
        },
        scales: {
          x: { ticks: { color: isDark ? "#d1d5db" : "#4b5563" }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: isDark ? "#d1d5db" : "#4b5563", stepSize: 1 }, grid: { color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" } },
        },
      },
    });

    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, [chartData, isDark, isLoading]);

  return (
    <div className={`p-6 h-full rounded-xl shadow-md transition-all duration-300 ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} hover:shadow-xl`}>
      <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${mode === "dark" ? "text-gray-200" : "text-gray-800"}`}>Tender Activity Chart</h2>
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Icon icon="mdi:loading" width={24} height={24} className="animate-spin text-[#f05d23]" />
        </div>
      ) : (
        <canvas ref={chartRef} className="max-h-64" />
      )}
    </div>
  );
}
