"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/widgets/app-shell/ui/Sidebar";
import Header from "@/widgets/app-shell/ui/Header";
import PageHeader from "@/shared/ui/PageHeader";
import SimpleFooter from "@/shared/ui/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import toast, { Toaster } from "react-hot-toast";
import { Icon } from "@iconify/react";
import SchedulerTable from "@/features/scheduler/components/SchedulerTable";
import SchedulerCardList from "@/features/scheduler/components/SchedulerCardList";
import AddSchedulerModal from "@/features/scheduler/components/AddSchedulerModal";
import DeleteConfirmationModal from "@/features/scheduler/components/DeleteConfirmationModal";
import LogsModal from "@/features/scheduler/components/LogsModal";
import { useMediaQuery } from "react-responsive";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function SchedulerPage() {
  const { resolvedMode: mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const router = useRouter();
  const { user, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead } = useNotifications();
  const [tasks, setTasks] = useState<any[]>([]);
  const [tenderTypes, setTenderTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [currentTaskName, setCurrentTaskName] = useState("");
  const [logsContent, setLogsContent] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const fetchTenderTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/tender-types");
      const data = await res.json();
      if (Array.isArray(data.tenderTypes)) setTenderTypes(data.tenderTypes);
    } catch (err: any) {
      toast.error("Error fetching tender types: " + err.message);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduled-tasks");
      const data = await res.json();
      if (Array.isArray(data.tasks)) setTasks(data.tasks);
    } catch (err: any) {
      toast.error("Error fetching tasks: " + err.message);
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchTenderTypes(), fetchTasks()]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [fetchTenderTypes, fetchTasks]);

  const handleTaskAdded = (update: { task: any }) => {
    setTasks((prev) => [...prev, update.task]);
  };

  const handleRunTask = async (taskId: number, taskName: string) => {
    const toastId = toast.loading("Redirecting, please wait...");
    try {
      const res = await fetch(`/api/scheduled-tasks/${taskId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.scraping_task_id) throw new Error(data.error || "No scraping_task_id returned");

      router.push(`/run-query?taskId=${data.scraping_task_id}`);
      setTasks((prev) => prev.map((t) => (t.task_id === taskId ? { ...t, last_run: new Date().toISOString() } : t)));
      toast.success("Task started successfully!", { id: toastId, duration: 3000 });
    } catch (err: any) {
      toast.error("Error starting task: " + err.message, { id: toastId });
    }
  };

  const handleToggleTask = async (taskId: number) => {
    const task = tasks.find((t) => t.task_id === taskId);
    const originalIsEnabled = task.is_enabled;
    setTasks((prev) => prev.map((t) => (t.task_id === taskId ? { ...t, is_enabled: !originalIsEnabled } : t)));

    try {
      const res = await fetch(`/api/scheduled-tasks/${taskId}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle task");
      toast.success(`Task "${task.name}" ${!originalIsEnabled ? "enabled" : "disabled"} successfully!`);
    } catch (err: any) {
      toast.error("Error toggling task: " + err.message);
      setTasks((prev) => prev.map((t) => (t.task_id === taskId ? { ...t, is_enabled: originalIsEnabled } : t)));
    }
  };

  const handleDeleteTask = async () => {
    const taskIdToDelete = currentTaskId;
    const taskNameToDelete = currentTaskName;
    setIsDeleteModalOpen(false);
    setCurrentTaskId(null);
    setCurrentTaskName("");
    const toastId = toast.loading(`Deleting task "${taskNameToDelete}"...`);

    try {
      const res = await fetch(`/api/scheduled-tasks/${taskIdToDelete}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete task");
      await fetchTasks();
      toast.success(`Task "${taskNameToDelete}" deleted successfully!`, { id: toastId });
    } catch (err: any) {
      toast.error("Error deleting task: " + err.message, { id: toastId });
    }
  };

  const openDeleteModal = (taskId: number, taskName: string) => {
    setCurrentTaskId(taskId);
    setCurrentTaskName(taskName);
    setIsDeleteModalOpen(true);
  };

  const handleViewLogs = async (taskId: number, taskName: string) => {
    const toastId = toast.loading(`Fetching logs for task "${taskName}"...`);
    try {
      const res = await fetch(`/api/scheduled-tasks/${taskId}/logs`);
      const data = await res.json();
      toast.dismiss(toastId);
      if (!res.ok) throw new Error(data.error || "Failed to fetch logs");

      const logs = (data.logs || []).map((log: any) => `${log.created_at}: ${log.log_entry}`).join("\n");
      setLogsContent(logs || "No logs available.");
      setCurrentTaskName(taskName);
      setIsLogsModalOpen(true);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Error fetching logs: " + err.message);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${mode === "dark" ? "bg-gradient-to-b from-gray-900 to-gray-800" : "bg-gradient-to-b from-gray-50 to-gray-100"}`}>
      <Toaster />
      <div className="flex flex-1">
        <Sidebar isOpen={!!isSidebarOpen} mode={mode} onLogout={handleLogout} toggleSidebar={toggleSidebar} user={user} loading={userLoading} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            toggleSidebar={toggleSidebar}
            isSidebarOpen={!!isSidebarOpen}
            mode={mode}
            toggleMode={toggleMode}
            onLogout={handleLogout}
            user={user}
            loading={userLoading}
            notifications={notifications}
            isLoading={notificationsLoading}
            onMarkAsRead={markNotificationAsRead}
          />
        <div className="h-full flex-1 p-6 transition-all duration-300 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <PageHeader
              title="Scheduler"
              description="Manage automated scraping schedules and view task history."
              icon="akar-icons:schedule"
              mode={mode}
            />

            <div className={mode === "dark" ? "text-white" : "text-[#231812]"}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Scheduled Tasks</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setViewMode((prev) => (prev === "table" ? "card" : "table"))}
                    className={`flex items-center px-4 py-2 rounded-full font-semibold transition-all duration-300 ${mode === "dark" ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-100 text-[#231812] hover:bg-gray-200"}`}
                  >
                    <Icon icon={viewMode === "table" ? "mdi:view-grid" : "mdi:view-list"} width="20" height="20" className="mr-2" />
                    {viewMode === "table" ? "Card View" : "Table View"}
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 rounded-full flex items-center gap-2 transition duration-200 shadow-md hover:shadow-lg bg-[#f05d23] text-white hover:bg-[#d94f1e]"
                  >
                    <Icon icon="mdi:plus" width={20} height={20} />
                    Add Scheduler
                  </button>
                </div>
              </div>
              {isLoading ? (
                <div className="flex justify-center items-center h-64 bg-opacity-50 rounded-lg">
                  <div className="flex flex-col items-center">
                    <Icon icon="mdi:loading" width={40} height={40} className="animate-spin text-[#f05d23]" />
                    <p className={`mt-2 text-lg font-medium animate-pulse ${mode === "dark" ? "text-gray-300" : "text-[#231812]"}`}>Loading, please wait...</p>
                  </div>
                </div>
              ) : isMobile || viewMode === "card" ? (
                <SchedulerCardList
                  tasks={tasks}
                  mode={mode}
                  handleRunTask={handleRunTask}
                  handleToggleTask={handleToggleTask}
                  handleViewLogs={handleViewLogs}
                  handleDeleteTask={openDeleteModal}
                  refreshTasks={fetchTasks}
                  tenderTypes={tenderTypes}
                />
              ) : (
                <SchedulerTable
                  tasks={tasks}
                  mode={mode}
                  handleRunTask={handleRunTask}
                  handleToggleTask={handleToggleTask}
                  handleViewLogs={handleViewLogs}
                  handleDeleteTask={openDeleteModal}
                  refreshTasks={fetchTasks}
                  tenderTypes={tenderTypes}
                />
              )}
            </div>
          </div>
        </div>

          <SimpleFooter mode={mode} />
        </div>
      </div>
      <AddSchedulerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} mode={mode} tenderTypes={tenderTypes} onTaskAdded={handleTaskAdded} />
      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteTask} taskName={currentTaskName} isDark={mode === "dark"} />
      <LogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} logsContent={logsContent} taskName={currentTaskName} isDark={mode === "dark"} />
    </div>
  );
}
