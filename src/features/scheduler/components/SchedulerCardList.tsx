"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import EditTaskModal from "./EditTaskModal";

export default function SchedulerCardList({
  tasks,
  mode,
  handleRunTask,
  handleToggleTask,
  handleViewLogs,
  handleDeleteTask,
  refreshTasks,
  tenderTypes,
}: {
  tasks: any[];
  mode: "light" | "dark";
  handleRunTask: (taskId: number, taskName: string) => void;
  handleToggleTask: (taskId: number) => void;
  handleViewLogs: (taskId: number, taskName: string) => void;
  handleDeleteTask: (taskId: number, taskName: string) => void;
  refreshTasks: () => void;
  tenderTypes: string[];
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const openEditModal = (task: any) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <div
          key={task.task_id}
          onClick={() => openEditModal(task)}
          className={`p-6 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer group relative ${
            mode === "dark" ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold">{task.name}</h3>
              <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${task.is_enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {task.is_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <Icon icon="mdi:calendar-clock" width={28} height={28} className={mode === "dark" ? "text-gray-300" : "text-gray-500"} />
          </div>

          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">Tender Type:</span> {task.tender_type}
            </div>
            <div>
              <span className="font-medium">Frequency:</span> {task.frequency}
            </div>
            <div>
              <span className="font-medium">Last Run:</span> {task.last_run ? new Date(task.last_run).toLocaleString() : "N/A"}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
            <ActionButton onClick={(e) => { e.stopPropagation(); handleRunTask(task.task_id, task.name); }} color="green" icon="mdi:play" label="Run" mode={mode} />
            <ActionButton
              onClick={(e) => { e.stopPropagation(); handleToggleTask(task.task_id); }}
              color={task.is_enabled ? "yellow" : "blue"}
              icon={task.is_enabled ? "mdi:toggle-switch-off" : "mdi:toggle-switch"}
              label={task.is_enabled ? "Disable" : "Enable"}
              mode={mode}
            />
            <ActionButton onClick={(e) => { e.stopPropagation(); handleViewLogs(task.task_id, task.name); }} color="gray" icon="mdi:script-text-outline" label="Logs" mode={mode} />
            <ActionButton onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.task_id, task.name); }} color="red" icon="mdi:delete" label="Delete" mode={mode} />
          </div>

          <span className="absolute hidden group-hover:block top-[-40px] left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 z-10">Edit Task</span>
        </div>
      ))}

      {isEditModalOpen && selectedTask && (
        <EditTaskModal isOpen={isEditModalOpen} onClose={closeEditModal} task={selectedTask} mode={mode} tenderTypes={tenderTypes} onTaskUpdated={refreshTasks} />
      )}
    </div>
  );
}

function ActionButton({ onClick, icon, label, color, mode }: { onClick: (e: React.MouseEvent) => void; icon: string; label: string; color: string; mode: "light" | "dark" }) {
  const baseColors: Record<string, { light: string; dark: string }> = {
    green: { light: "bg-green-100 text-green-700 hover:bg-green-200", dark: "bg-green-700 text-white hover:bg-green-600" },
    yellow: { light: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200", dark: "bg-yellow-600 text-white hover:bg-yellow-500" },
    blue: { light: "bg-blue-100 text-blue-700 hover:bg-blue-200", dark: "bg-blue-600 text-white hover:bg-blue-500" },
    gray: { light: "bg-gray-100 text-gray-700 hover:bg-gray-200", dark: "bg-gray-600 text-white hover:bg-gray-500" },
    red: { light: "bg-red-100 text-red-700 hover:bg-red-200", dark: "bg-red-600 text-white hover:bg-red-500" },
  };

  const style = mode === "dark" ? baseColors[color]?.dark : baseColors[color]?.light;

  return (
    <button onClick={onClick} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition duration-200 ${style}`}>
      <Icon icon={icon} width={18} height={18} />
      {label}
    </button>
  );
}
