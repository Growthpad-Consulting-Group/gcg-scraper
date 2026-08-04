"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AppShell from "@/widgets/app-shell/ui/AppShell";
import Button from "@/shared/ui/Button";
import { Icon } from "@iconify/react";
import SchedulerListV2 from "@/features/scheduler/components/SchedulerListV2";
import AddSchedulerModal from "@/features/scheduler/components/AddSchedulerModal";
import DeleteConfirmationModal from "@/features/scheduler/components/DeleteConfirmationModal";
import LogsModal from "@/features/scheduler/components/LogsModal";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function SchedulerPage() {
  const { resolvedMode: mode } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [tenderTypes, setTenderTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [currentTaskName, setCurrentTaskName] = useState("");
  const [logsContent, setLogsContent] = useState("");

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
    <AppShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-text-hi">Scheduler</h1>
            <p className="mt-0.5 text-sm text-text-lo">Automated scraping schedules and run history.</p>
          </div>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Icon icon="mdi:plus" width={16} height={16} />
            Add Scheduler
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-app-border bg-surface">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="mdi:loading" width={32} height={32} className="animate-spin text-brand-500" />
              <p className="text-sm text-text-lo">Loading, please wait…</p>
            </div>
          </div>
        ) : (
          <SchedulerListV2
            tasks={tasks}
            handleRunTask={handleRunTask}
            handleToggleTask={handleToggleTask}
            handleViewLogs={handleViewLogs}
            handleDeleteTask={openDeleteModal}
          />
        )}
      </div>

      <AddSchedulerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} mode={mode} tenderTypes={tenderTypes} onTaskAdded={handleTaskAdded} />
      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteTask} taskName={currentTaskName} isDark={mode === "dark"} />
      <LogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} logsContent={logsContent} taskName={currentTaskName} isDark={mode === "dark"} />
    </AppShell>
  );
}
