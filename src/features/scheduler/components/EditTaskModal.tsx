"use client";

import { useState, useEffect } from "react";
import TaskForm from "./TaskForm";
import TaskModalWrapper from "./TaskModalWrapper";
import toast from "react-hot-toast";

function normalizeTask(task: any) {
  return {
    name: task.name || "",
    tenderType: task.tender_type || "",
    tender_type: task.tender_type || "",
    frequency: task.frequency || "Daily",
    priority: task.priority || "Medium",
    searchTerms: task.search_terms || [],
    engines: task.engines || [],
    emailNotificationsEnabled: task.email_notifications_enabled || false,
    smsNotificationsEnabled: task.sms_notifications_enabled || false,
    slackNotificationsEnabled: task.slack_notifications_enabled || false,
    customEmails: Array.isArray(task.custom_emails)
      ? task.custom_emails.filter((e: string) => e && e.trim())
      : typeof task.custom_emails === "string" && task.custom_emails
      ? task.custom_emails.split(",").filter((e: string) => e.trim())
      : [],
    custom_emails: Array.isArray(task.custom_emails)
      ? task.custom_emails.filter((e: string) => e && e.trim()).join(",")
      : typeof task.custom_emails === "string"
      ? task.custom_emails
      : "",
  };
}

export default function EditTaskModal({
  isOpen,
  onClose,
  task,
  mode,
  tenderTypes,
  onTaskUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  mode: "light" | "dark";
  tenderTypes: string[];
  onTaskUpdated?: (task: any) => void;
}) {
  const [editedTask, setEditedTask] = useState(() => normalizeTask(task));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedTask(normalizeTask(task));
  }, [task]);

  const validateTask = () => {
    if (!editedTask.name.trim()) {
      toast.error("Task name is required!");
      return false;
    }
    if (editedTask.engines.length === 0) {
      toast.error("Please select at least one search engine.");
      return false;
    }
    if (editedTask.tenderType === "Search Query Tenders" && editedTask.searchTerms.length === 0) {
      toast.error("Please select at least one search term for Search Query Tenders.");
      return false;
    }
    if (editedTask.custom_emails) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = editedTask.custom_emails
        .split(",")
        .map((e: string) => e.trim())
        .filter((e: string) => e && !emailRegex.test(e));
      if (invalidEmails.length > 0) {
        toast.error(`Invalid email addresses: ${invalidEmails.join(", ")}`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateTask()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/scheduled-tasks/${task.task_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedTask.name,
          tender_type: editedTask.tenderType,
          frequency: editedTask.frequency,
          priority: editedTask.priority,
          search_terms: editedTask.searchTerms,
          engines: editedTask.engines,
          email_notifications_enabled: editedTask.emailNotificationsEnabled,
          sms_notifications_enabled: editedTask.smsNotificationsEnabled,
          slack_notifications_enabled: editedTask.slackNotificationsEnabled,
          custom_emails: editedTask.custom_emails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");

      toast.success("Task updated successfully!");
      onTaskUpdated?.(data.task);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error updating task");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TaskModalWrapper isOpen={isOpen} onClose={onClose} title="Edit Task" mode={mode} onSave={handleSave} saveLabel="Save" isSaving={isSaving}>
      <TaskForm task={editedTask} setTask={setEditedTask} tenderTypes={tenderTypes} mode={mode} handleRemoveSearchTerm={() => {}} isLoadingParent={isSaving} />
    </TaskModalWrapper>
  );
}
