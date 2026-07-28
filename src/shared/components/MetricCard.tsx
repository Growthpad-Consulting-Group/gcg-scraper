import { Icon } from "@iconify/react";

const COLORS = {
  blue: { dark: "bg-blue-600/20 border-blue-500", light: "bg-blue-100 border-blue-400" },
  green: { dark: "bg-green-600/20 border-green-500", light: "bg-green-100 border-green-400" },
  yellow: { dark: "bg-yellow-600/20 border-yellow-500", light: "bg-yellow-100 border-yellow-400" },
  red: { dark: "bg-red-600/20 border-red-500", light: "bg-red-100 border-red-400" },
};

export default function MetricCard({
  title,
  value,
  icon,
  mode,
  color,
  onClick,
}: {
  title: string;
  value: number | string;
  icon: string;
  mode: "light" | "dark";
  color: keyof typeof COLORS;
  onClick?: () => void;
}) {
  const isDark = mode === "dark";

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl shadow-md flex items-center gap-4 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-l-4 ${
        COLORS[color][isDark ? "dark" : "light"]
      } ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}
    >
      <Icon icon={icon} width={36} height={36} className="text-[#f05d23] animate-pulse" />
      <div>
        <h3 className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{title}</h3>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
}
