"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Icon } from "@iconify/react";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function TenderStatusDonutChart({
  openTenders,
  expiredTenders,
  mode,
  isLoading,
}: {
  openTenders: number;
  expiredTenders: number;
  mode: "light" | "dark";
  isLoading: boolean;
}) {
  const data = {
    labels: ["Open Tenders", "Expired Tenders"],
    datasets: [
      {
        data: [openTenders, expiredTenders],
        backgroundColor: [mode === "dark" ? "#34D399" : "#10B981", mode === "dark" ? "#F87171" : "#EF4444"],
        borderColor: mode === "dark" ? "#1F2937" : "#FFFFFF",
        borderWidth: 2,
      },
    ],
  };

  const isDark = mode === "dark";

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { color: mode === "dark" ? "#D1D5DB" : "#374151", font: { size: 14 } } },
      tooltip: {
        backgroundColor: mode === "dark" ? "#1F2937" : "#FFFFFF",
        titleColor: mode === "dark" ? "#D1D5DB" : "#374151",
        bodyColor: mode === "dark" ? "#D1D5DB" : "#374151",
        borderColor: mode === "dark" ? "#374151" : "#E5E7EB",
        borderWidth: 1,
      },
    },
    cutout: "60%",
  };

  return (
    <div className={`p-6 h-full rounded-xl shadow-md transition-all duration-300 ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} hover:shadow-xl`}>
      <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${mode === "dark" ? "text-gray-200" : "text-gray-800"}`}>Tender Status Distribution</h2>
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Icon icon="mdi:loading" width={40} height={40} className="animate-spin text-[#f05d23]" />
        </div>
      ) : openTenders + expiredTenders === 0 ? (
        <div className="flex justify-center items-center h-48">
          <p className={`text-center ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>No tender data available</p>
        </div>
      ) : (
        <div className="h-64">
          <Doughnut data={data} options={options} />
        </div>
      )}
    </div>
  );
}
