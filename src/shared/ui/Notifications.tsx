import { Icon } from "@iconify/react";
import type { Notification } from "@/shared/contexts/NotificationsContext";

export default function Notifications({
  notifications,
  mode,
  isLoading,
  onMarkAsRead,
  onClearAll,
}: {
  notifications: Notification[];
  mode: "light" | "dark";
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onClearAll?: () => void;
}) {
  const isDark = mode === "dark";
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div
      className={`p-6 rounded-xl shadow-md transition-all duration-300 ${
        isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"
      } hover:shadow-xl`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Notifications</h3>
        {hasUnread && (
          <button
            onClick={onClearAll}
            className="text-sm px-3 py-1 rounded-full transition-colors duration-200 bg-[#f05d23] text-white hover:bg-[#d94f1e]"
          >
            Clear All
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Icon icon="mdi:loading" width={24} height={24} className="animate-spin text-[#f05d23]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="space-y-2">
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No notifications to display.</p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <ul className="space-y-4">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  notification.read ? (isDark ? "bg-gray-700" : "bg-gray-100") : isDark ? "bg-gray-600" : "bg-gray-200"
                } animate-fade-in-up`}
              >
                <Icon icon="mdi:bell-outline" width={20} height={20} className="text-[#f05d23]" />
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    onClick={() => onMarkAsRead(notification.id)}
                    className={`text-sm px-3 py-1 rounded-full transition-colors duration-200 ${
                      isDark ? "bg-gray-500 text-white hover:bg-gray-400" : "bg-gray-300 text-[#231812] hover:bg-gray-400"
                    }`}
                  >
                    Mark as Read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
