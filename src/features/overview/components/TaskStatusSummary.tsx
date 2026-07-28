import { Icon } from "@iconify/react";

export default function TaskStatusSummary({ tasks, mode, isLoading }: { tasks: any[]; mode: "light" | "dark"; isLoading: boolean }) {
  const isDark = mode === "dark";

  return (
    <div className={`p-6 rounded-xl shadow-md transition-all duration-300 ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} hover:shadow-xl`}>
      <h3 className="text-xl font-bold mb-4">Task Status Summary</h3>
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Icon icon="mdi:progress-download" width={24} height={24} className="animate-spin text-[#f05d23]" />
        </div>
      ) : tasks.length === 0 ? (
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No tasks to display.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? "bg-gray-700" : "bg-gray-100"}>
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-left font-semibold">Last Run</th>
                  <th className="px-4 py-2 text-left font-semibold">Next Run</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={task.task_id} className={`transition-all duration-200 ${isDark ? (index % 2 === 0 ? "bg-gray-800" : "bg-gray-700") : index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-opacity-80`}>
                    <td className="px-4 py-3">{task.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${task.is_enabled ? (isDark ? "bg-green-600 text-white" : "bg-green-100 text-green-700") : isDark ? "bg-red-600 text-white" : "bg-red-100 text-red-700"}`}>
                        {task.is_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{task.last_run ? new Date(task.last_run).toLocaleString() : "N/A"}</td>
                    <td className="px-4 py-3">{task.next_schedule && task.next_schedule !== "N/A" ? new Date(task.next_schedule).toLocaleString() : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
