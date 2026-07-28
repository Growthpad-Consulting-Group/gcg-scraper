import { Icon } from "@iconify/react";

export default function WelcomeCard({
  userName,
  loading,
  totalTasks,
  openTenders,
  mode,
}: {
  userName: string;
  loading: boolean;
  totalTasks: number;
  openTenders: number;
  mode: "light" | "dark";
}) {
  const isDark = mode === "dark";

  return (
    <div className={`relative p-8 rounded-xl shadow-lg overflow-hidden transform transition-all duration-500 hover:shadow-2xl ${isDark ? "bg-gradient-to-r from-gray-800 to-gray-700 text-white" : "bg-gradient-to-r from-white to-gray-100 text-[#231812]"}`}>
      <div className="absolute inset-0 bg-opacity-30 bg-gradient-to-br from-[#f05d23] to-transparent opacity-20" />

      <div className="relative flex flex-col md:flex-row justify-between items-center">
        <div className="mb-6 md:mb-0">
          <h2 className="text-3xl font-bold animate-fade-in-down">{loading ? "Loading..." : `Welcome, ${userName || "User"}!`}</h2>
          <p className={`mt-2 text-lg ${isDark ? "text-gray-300" : "text-gray-600"} animate-fade-in-up`}>Monitor and manage your tender scraping tasks with ease.</p>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-3 bg-opacity-80 p-4 rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-opacity-100">
            <Icon icon="mdi:clipboard-list-outline" width={28} height={28} className="text-[#f05d23]" />
            <div>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>Total Tasks</p>
              <p className="text-xl font-semibold">{loading ? "..." : totalTasks}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-opacity-80 p-4 rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-opacity-100">
            <Icon icon="mdi:folder-open-outline" width={28} height={28} className="text-[#f05d23]" />
            <div>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>Open Tenders</p>
              <p className="text-xl font-semibold">{loading ? "..." : openTenders}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
