"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Select from "react-select";
import PageHeader from "@/shared/ui/PageHeader";
import Badge from "@/shared/ui/Badge";
import { Icon } from "@iconify/react";
import GenericTable, { type Column, type Action } from "@/shared/ui/GenericTable";
import AddSchedulerModal from "@/features/scheduler/components/AddSchedulerModal";
import EditSchedulerModal from "@/features/scheduler/components/EditSchedulerModal";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import LogsModal, { type TaskLogEntry } from "@/features/scheduler/components/LogsModal";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getSourceConfig } from "@/features/tenders/api/sourceConfigs";
import { getSelectStyles, getSelectValue } from "@/utils/selectStyles";

interface ScheduledTask {
  task_id: number;
  name: string;
  tender_type?: string;
  frequency: string;
  run_time?: string | null;
  is_enabled: boolean;
  last_run: string | null;
}

interface ScheduledTaskRow extends Omit<ScheduledTask, "task_id"> {
  id: string;
}

export default function AutomationPage() {
  const { resolvedMode: mode } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [tenderTypes, setTenderTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [currentTaskName, setCurrentTaskName] = useState("");
  const [currentTask, setCurrentTask] = useState<ScheduledTask | null>(null);
  const [logs, setLogs] = useState<TaskLogEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

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

  const handleTaskUpdated = (updated: any) => {
    setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
  };

  const handleRunTask = async (taskId: number, taskName: string) => {
    // The /run-query progress page is built for the interactive "Search Query Tenders" flow
    // (visited/total URL counts as it goes). Fixed-source and website scrapes are a single
    // Firecrawl call with no such incremental progress to report, so redirecting there just
    // shows a permanently-stuck "0 results queued" screen. There's no job list on this page
    // itself to point at either — the run feed only lives on /overview — so link there directly
    // instead of a vague "check below" that has nothing to check "below".
    const task = tasks.find((t) => t.task_id === taskId);
    const tenderType = task?.tender_type;
    const isFixedSource = tenderType === "Website Tenders" || (tenderType && !!getSourceConfig(tenderType));

    const toastId = toast.loading(isFixedSource ? "Starting task..." : "Redirecting, please wait...");
    try {
      const res = await fetch(`/api/scheduled-tasks/${taskId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.scraping_task_id) throw new Error(data.error || "No scraping_task_id returned");

      setTasks((prev) => prev.map((t) => (t.task_id === taskId ? { ...t, last_run: new Date().toISOString() } : t)));
      if (isFixedSource) {
        toast.success(
          (t) => (
            <span>
              {`"${taskName}" started — `}
              <button
                className="font-medium text-brand-500 underline"
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push("/overview");
                }}
              >
                view status on Overview
              </button>
            </span>
          ),
          { id: toastId, duration: 6000 }
        );
      } else {
        router.push(`/run-query?taskId=${data.scraping_task_id}`);
        toast.success("Task started successfully!", { id: toastId, duration: 3000 });
      }
    } catch (err: any) {
      toast.error("Error starting task: " + err.message, { id: toastId });
    }
  };

  const handleToggleTask = async (taskId: number) => {
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task) return;
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

  const columns: Column<ScheduledTaskRow>[] = [
    { Header: "Task", accessor: "name", sortable: true, className: "font-medium text-text-hi" },
    {
      Header: "Recurrence",
      accessor: "frequency",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-text-hi">
            {row.frequency}
            {row.run_time && <span className="font-mono text-[11px] text-text-lo"> · {row.run_time} UTC</span>}
          </span>
          {row.tender_type && <span className="font-mono text-[11px] text-text-lo">{row.tender_type}</span>}
        </div>
      ),
    },
    {
      Header: "Status",
      accessor: "is_enabled",
      sortable: true,
      render: (row) => <Badge status={row.is_enabled ? "success" : "neutral"}>{row.is_enabled ? "enabled" : "disabled"}</Badge>,
    },
    {
      Header: "Last run",
      accessor: "last_run",
      sortable: true,
      render: (row) => <span className="font-mono">{row.last_run ? new Date(row.last_run).toLocaleString() : "never"}</span>,
    },
  ];

  const actions: Action<ScheduledTaskRow>[] = [
    {
      icon: "solar:play-circle-broken",
      tooltip: "Run now",
      onClick: (row) => handleRunTask(Number(row.id), row.name),
    },
    {
      icon: (row) => (row.is_enabled ? "solar:pause-circle-broken" : "solar:play-circle-broken"),
      tooltip: (row) => (row.is_enabled ? "Disable" : "Enable"),
      onClick: (row) => handleToggleTask(Number(row.id)),
    },
    {
      icon: "solar:pen-broken",
      tooltip: "Edit",
      onClick: (row) => {
        const task = tasks.find((t) => t.task_id === Number(row.id));
        if (task) { setCurrentTask(task); setIsEditModalOpen(true); }
      },
    },
    {
      icon: "solar:document-text-broken",
      tooltip: "View logs",
      onClick: (row) => handleViewLogs(Number(row.id), row.name),
    },
    {
      icon: "solar:trash-bin-trash-broken",
      tooltip: "Delete",
      variant: "danger",
      onClick: (row) => openDeleteModal(Number(row.id), row.name),
    },
  ];

  const handleViewLogs = async (taskId: number, taskName: string) => {
    const toastId = toast.loading(`Fetching logs for task "${taskName}"...`);
    try {
      const res = await fetch(`/api/scheduled-tasks/${taskId}/logs`);
      const data = await res.json();
      toast.dismiss(toastId);
      if (!res.ok) throw new Error(data.error || "Failed to fetch logs");

      setLogs(data.logs || []);
      setCurrentTaskName(taskName);
      setIsLogsModalOpen(true);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Error fetching logs: " + err.message);
    }
  };

  const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Disabled" },
  ];

  // Derived from the tasks actually present, not the full /api/tender-types list — a type with
  // no scheduled task yet shouldn't show up as a filter option with nothing to filter to.
  const typeOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.tender_type).filter((t): t is string => !!t))].sort(),
    [tasks]
  );
  const filteredTasks = typeFilter ? tasks.filter((t) => t.tender_type === typeFilter) : tasks;

  const handleDeleteTaskItem = async (task: ScheduledTaskRow) => {
    const res = await fetch(`/api/scheduled-tasks/${task.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete task");
    setTasks((prev) => prev.filter((t) => String(t.task_id) !== String(task.id)));
  };

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Automation"
          description="Automated scraping schedules and run history."
          icon="solar:calendar-broken"
          actions={[
            {
              label: "Add Automation",
              icon: "mdi:plus",
              variant: "primary",
              onClick: () => setIsAddModalOpen(true),
            },
          ]}
        />

        <GenericTable<ScheduledTaskRow>
          data={filteredTasks.map((t) => ({
            ...t,
            id: String(t.task_id),
            status: t.is_enabled ? "enabled" : "disabled",
          }))}
          columns={columns}
          loading={isLoading}
          title="Scheduled Tasks"
          emptyMessage="No scheduled tasks yet."
          searchable
          searchPlaceholder="Search tasks…"
          selectable
          showBulkBar
          showExportButton
          exportType="scheduled-tasks"
          exportTitle="Scheduled Tasks"
          enableDateFilter
          statusOptions={statusOptions}
          extraFilters={
            <Select
              value={typeFilter ? { value: typeFilter, label: typeFilter } : null}
              onChange={(opt) => setTypeFilter(getSelectValue(opt) || null)}
              options={typeOptions.map((t) => ({ value: t, label: t }))}
              placeholder="Filter by type…"
              isClearable
              isSearchable
              noOptionsMessage={() => "No types found"}
              className="react-select-container"
              classNamePrefix="react-select"
              styles={getSelectStyles<{ value: string; label: string }>(mode)}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />
          }
          enableRefresh
          onRefresh={fetchTasks}
          onDelete={handleDeleteTaskItem}
          confirmDelete
          deleteConfirmationProps={{
            itemType: "task",
            message: (item) => `"${item?.name || "this task"}"`,
          }}
          hideEmptyColumns={false}
          fullPageHeight={true}
          actions={actions}
        />
      </div>

      <AddSchedulerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} mode={mode} tenderTypes={tenderTypes} onTaskAdded={handleTaskAdded} />
      <EditSchedulerModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} mode={mode} tenderTypes={tenderTypes} task={currentTask} onTaskUpdated={handleTaskUpdated} />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTask}
        itemName={currentTaskName}
        itemType="scheduled task"
        mode={mode}
      />
      <LogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} logs={logs} taskName={currentTaskName} />
    </>
  );
}
