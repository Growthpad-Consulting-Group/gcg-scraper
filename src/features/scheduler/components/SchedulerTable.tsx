"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import EditTaskModal from "./EditTaskModal";

export default function SchedulerTable({
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
  const isDark = mode === "dark";
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: "asc" | "desc" }>({ key: null, direction: "asc" });

  const openEditModal = (task: any) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTask(null);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "string") {
      return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="overflow-x-auto rounded-lg shadow-sm max-h-[500px] overflow-y-auto">
      <table className={`min-w-full text-sm text-left sticky-header ${isDark ? "text-white" : "text-gray-800"}`}>
        <thead className="sticky top-0 z-10">
          <tr className={`text-base font-bold capitalize tracking-wider ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
            <Th mode={mode} onClick={() => handleSort("name")} isActive={sortConfig.key === "name"} direction={sortConfig.direction}>
              Name
            </Th>
            <Th mode={mode} onClick={() => handleSort("tender_type")} isActive={sortConfig.key === "tender_type"} direction={sortConfig.direction}>
              Tender Type
            </Th>
            <Th mode={mode} onClick={() => handleSort("frequency")} isActive={sortConfig.key === "frequency"} direction={sortConfig.direction}>
              Frequency
            </Th>
            <Th mode={mode} onClick={() => handleSort("is_enabled")} isActive={sortConfig.key === "is_enabled"} direction={sortConfig.direction}>
              Status
            </Th>
            <Th mode={mode} onClick={() => handleSort("last_run")} isActive={sortConfig.key === "last_run"} direction={sortConfig.direction}>
              Last Run
            </Th>
            <Th mode={mode}>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task, index) => (
            <tr
              key={task.task_id}
              onClick={() => openEditModal(task)}
              className={`transition-all duration-150 cursor-pointer relative ${
                isDark ? (index % 2 === 0 ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-800 hover:bg-gray-700") : index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <Td mode={mode}>{task.name}</Td>
              <Td mode={mode}>{task.tender_type}</Td>
              <Td mode={mode}>{task.frequency}</Td>
              <Td mode={mode}>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${task.is_enabled ? (isDark ? "bg-green-600 text-white" : "bg-green-100 text-green-700") : isDark ? "bg-red-600 text-white" : "bg-red-100 text-red-700"}`}>
                  {task.is_enabled ? "Enabled" : "Disabled"}
                </span>
              </Td>
              <Td mode={mode}>{task.last_run ? new Date(task.last_run).toLocaleString() : "N/A"}</Td>
              <Td mode={mode} onClick={(e: any) => e.stopPropagation()}>
                <div className="flex gap-2 flex-wrap">
                  <ActionButton icon="mdi:play" tooltip="Run Task" onClick={(e) => { e.stopPropagation(); handleRunTask(task.task_id, task.name); }} color="green" isDark={isDark} />
                  <ActionButton
                    icon={task.is_enabled ? "mdi:toggle-switch-off" : "mdi:toggle-switch"}
                    tooltip={task.is_enabled ? "Disable" : "Enable"}
                    onClick={(e) => { e.stopPropagation(); handleToggleTask(task.task_id); }}
                    color={task.is_enabled ? "yellow" : "blue"}
                    isDark={isDark}
                  />
                  <ActionButton icon="mdi:script-text-outline" tooltip="View Logs" onClick={(e) => { e.stopPropagation(); handleViewLogs(task.task_id, task.name); }} color="gray" isDark={isDark} />
                  <ActionButton icon="mdi:delete" tooltip="Delete Task" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.task_id, task.name); }} color="red" isDark={isDark} />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {isEditModalOpen && selectedTask && (
        <EditTaskModal isOpen={isEditModalOpen} onClose={closeEditModal} task={selectedTask} mode={mode} tenderTypes={tenderTypes} onTaskUpdated={refreshTasks} />
      )}
    </div>
  );
}

const Th = ({ children, mode, onClick, isActive, direction }: { children: React.ReactNode; mode: "light" | "dark"; onClick?: () => void; isActive?: boolean; direction?: "asc" | "desc" }) => (
  <th className={`px-5 py-3 text-sm font-semibold ${mode === "dark" ? "text-gray-200" : "text-gray-800"}`} onClick={onClick} style={{ cursor: onClick ? "pointer" : undefined }}>
    <div className="flex items-center gap-1">
      {children}
      {isActive && <Icon icon={direction === "asc" ? "mdi:arrow-up" : "mdi:arrow-down"} width={14} height={14} className="text-gray-600 dark:text-gray-200" />}
    </div>
  </th>
);

const Td = ({ children, mode, onClick }: { children: React.ReactNode; mode: "light" | "dark"; onClick?: (e: React.MouseEvent) => void }) => (
  <td className={`px-5 py-4 whitespace-normal text-sm ${mode === "dark" ? "text-white" : "text-gray-700"}`} style={{ maxWidth: "200px", wordBreak: "break-word" }} onClick={onClick}>
    {children}
  </td>
);

function ActionButton({ icon, tooltip, onClick, color, isDark }: { icon: string; tooltip: string; onClick: (e: React.MouseEvent) => void; color: string; isDark: boolean }) {
  const baseStyles = "p-2 rounded-full transition duration-150";
  const colors: Record<string, string> = {
    green: isDark ? "bg-green-600 hover:bg-green-500 text-white" : "bg-green-100 text-green-700 hover:bg-green-200",
    yellow: isDark ? "bg-yellow-600 hover:bg-yellow-500 text-white" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    blue: isDark ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-blue-100 text-blue-700 hover:bg-blue-200",
    red: isDark ? "bg-red-600 hover:bg-red-500 text-white" : "bg-red-100 text-red-700 hover:bg-red-200",
    gray: isDark ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300",
  };

  return (
    <div className="relative group">
      <button onClick={onClick} className={`${baseStyles} ${colors[color]}`}>
        <Icon icon={icon} width={18} height={18} />
      </button>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 whitespace-nowrap shadow-md">{tooltip}</div>
    </div>
  );
}
