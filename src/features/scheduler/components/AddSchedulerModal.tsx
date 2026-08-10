"use client";

import { useState, useEffect } from "react";
import TaskForm from "./TaskForm";
import SimpleModal from "@/shared/ui/SimpleModal";
import FormActions from "@/shared/ui/FormActions";
import toast from "react-hot-toast";

export default function AddSchedulerModal({
  isOpen,
  onClose,
  mode,
  tenderTypes,
  onTaskAdded,
  initialSearchTerms,
  initialTenderType,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: "light" | "dark";
  tenderTypes: string[];
  onTaskAdded: (update: any) => void;
  /** Pre-fills the form when opened from a context that already knows what to search for (e.g. Run Query's Schedule button). */
  initialSearchTerms?: string[];
  initialTenderType?: string;
}) {
  const defaultTask = () => ({
    name: "",
    tenderType: (initialTenderType && tenderTypes.includes(initialTenderType) ? initialTenderType : tenderTypes[0]) || "",
    frequency: "Daily",
    priority: "Medium",
    searchTerms: initialSearchTerms ?? ([] as string[]),
    countries: [] as string[],
    emailNotificationsEnabled: false,
    smsNotificationsEnabled: false,
    slackNotificationsEnabled: false,
    customEmails: [] as string[],
    custom_emails: "",
  });

  const [newTask, setNewTask] = useState(defaultTask);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewTask(defaultTask());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenderTypes]);

  const validateTask = () => {
    if (!newTask.name.trim()) {
      toast.error("Task name is required!");
      return false;
    }
    if (newTask.tenderType === "Search Query Tenders") {
      if (newTask.searchTerms.length === 0) {
        toast.error("Please select at least one search term for Search Query Tenders.");
        return false;
      }
    }
    if (newTask.custom_emails) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = newTask.custom_emails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e && !emailRegex.test(e));
      if (invalidEmails.length > 0) {
        toast.error(`Invalid email addresses: ${invalidEmails.join(", ")}`);
        return false;
      }
    }
    return true;
  };

  const handleAddTask = async () => {
    if (!validateTask()) return;
    setIsSaving(true);

    try {
      const payload = {
        name: newTask.name,
        tender_type: newTask.tenderType,
        frequency: newTask.frequency,
        priority: newTask.priority,
        search_terms: newTask.searchTerms,
        countries: newTask.countries,
        email_notifications_enabled: newTask.emailNotificationsEnabled,
        sms_notifications_enabled: newTask.smsNotificationsEnabled,
        slack_notifications_enabled: newTask.slackNotificationsEnabled,
        custom_emails: newTask.custom_emails,
      };

      const res = await fetch("/api/scheduled-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.task) throw new Error(data.error || "Failed to add task");

      toast.success("Task added successfully!");
      onTaskAdded({ task: data.task });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add task.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Add Scheduler" mode={mode} noPadding>
      <TaskForm task={newTask} setTask={setNewTask} mode={mode} tenderTypes={tenderTypes} isLoadingParent={isSaving} />
      <div className="border-t border-app-border p-4">
        <FormActions
          onCancel={onClose}
          onSave={handleAddTask}
          loading={isSaving}
          saveText="Add Task"
          saveIcon="solar:add-circle-broken"
          layout="page-footer"
          fullWidth={false}
        />
      </div>
    </SimpleModal>
  );
}
