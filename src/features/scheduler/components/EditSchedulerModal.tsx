"use client";

import { useState, useEffect } from "react";
import TaskForm from "./TaskForm";
import SimpleModal from "@/shared/ui/SimpleModal";
import FormActions from "@/shared/ui/FormActions";
import toast from "react-hot-toast";

export default function EditSchedulerModal({
  isOpen,
  onClose,
  mode,
  tenderTypes,
  task,
  onTaskUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: "light" | "dark";
  tenderTypes: string[];
  task: any;
  onTaskUpdated: (task: any) => void;
}) {
  const [editedTask, setEditedTask] = useState<any>(null);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setEditedTask({
        ...task,
        tenderType: task.tender_type || "",
        searchTerms: Array.isArray(task.search_terms) ? task.search_terms : [],
        emailNotificationsEnabled: task.email_notifications_enabled ?? false,
        smsNotificationsEnabled: task.sms_notifications_enabled ?? false,
        slackNotificationsEnabled: task.slack_notifications_enabled ?? false,
        customEmails: (task.custom_emails || "").split(",").filter(Boolean),
      });
      setCurrentSearchTerm("");
    }
  }, [isOpen, task]);

  const handleAddSearchTerm = () => {
    if (currentSearchTerm.trim() && !editedTask.searchTerms.includes(currentSearchTerm.trim())) {
      setEditedTask((prev: any) => ({ ...prev, searchTerms: [...prev.searchTerms, currentSearchTerm.trim()] }));
      setCurrentSearchTerm("");
    }
  };

  const handleRemoveSearchTerm = (term: string) => {
    setEditedTask((prev: any) => ({ ...prev, searchTerms: prev.searchTerms.filter((t: string) => t !== term) }));
  };

  const handleSave = async () => {
    if (!editedTask.name?.trim()) {
      toast.error("Task name is required.");
      return;
    }
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
          email_notifications_enabled: editedTask.emailNotificationsEnabled,
          sms_notifications_enabled: editedTask.smsNotificationsEnabled,
          slack_notifications_enabled: editedTask.slackNotificationsEnabled,
          custom_emails: Array.isArray(editedTask.customEmails) ? editedTask.customEmails.join(",") : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");
      toast.success("Task updated successfully!");
      onTaskUpdated(data.task);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update task.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!editedTask) return null;

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Edit Scheduler" mode={mode} noPadding>
      <TaskForm
        task={editedTask}
        setTask={setEditedTask}
        currentSearchTerm={currentSearchTerm}
        setCurrentSearchTerm={setCurrentSearchTerm}
        tenderTypes={tenderTypes}
        handleAddSearchTerm={handleAddSearchTerm}
        handleRemoveSearchTerm={handleRemoveSearchTerm}
        isLoadingParent={isSaving}
      />
      <div className="border-t border-app-border p-4">
        <FormActions
          onCancel={onClose}
          onSave={handleSave}
          loading={isSaving}
          saveText="Save Changes"
          saveIcon="solar:pen-broken"
          layout="page-footer"
          fullWidth={false}
        />
      </div>
    </SimpleModal>
  );
}
