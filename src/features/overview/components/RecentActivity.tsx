import { Icon } from "@iconify/react";
import Link from "next/link";

type Activity = { type: "task" | "tender"; description: string; timestamp: string; link: string };

export default function RecentActivity({ activities, mode, isLoading }: { activities: Activity[]; mode: "light" | "dark"; isLoading: boolean }) {
  const isDark = mode === "dark";

  return (
    <div className={`p-6 rounded-xl shadow-md transition-all duration-300 ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} hover:shadow-xl`}>
      <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Icon icon="mdi:loading" width={24} height={24} className="animate-spin text-[#f05d23]" />
        </div>
      ) : activities.length === 0 ? (
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No recent activity to display.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <ul className="space-y-4">
            {activities.map((activity, index) => (
              <li key={index} className="flex items-center gap-3 animate-fade-in-up">
                <Icon icon={activity.type === "task" ? "mdi:clipboard-list-outline" : "mdi:folder-open-outline"} width={20} height={20} className="text-[#f05d23]" />
                <div className="flex-1">
                  <Link href={activity.link}>
                    <span className="text-sm hover:underline cursor-pointer transition-colors duration-200 hover:text-[#f05d23]">{activity.description}</span>
                  </Link>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
