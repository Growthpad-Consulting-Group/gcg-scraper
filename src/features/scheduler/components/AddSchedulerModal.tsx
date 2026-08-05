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
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: "light" | "dark";
  tenderTypes: string[];
  onTaskAdded: (update: any) => void;
}) {
  const defaultTask = () => ({
    name: "",
    tenderType: tenderTypes[0] || "",
    frequency: "Daily",
    priority: "Medium",
    searchTerms: [] as string[],
    emailNotificationsEnabled: false,
    smsNotificationsEnabled: false,
    slackNotificationsEnabled: false,
    customEmails: [] as string[],
    custom_emails: "",
  });

  const [newTask, setNewTask] = useState(defaultTask);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewTask(defaultTask());
      setCurrentSearchTerm("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenderTypes]);

  const handleAddSearchTerm = () => {
    if (currentSearchTerm.trim() && !newTask.searchTerms.includes(currentSearchTerm.trim())) {
      setNewTask({ ...newTask, searchTerms: [...newTask.searchTerms, currentSearchTerm.trim()] });
      setCurrentSearchTerm("");
    }
  };

  const handleRemoveSearchTerm = (term: string) => {
    setNewTask({ ...newTask, searchTerms: newTask.searchTerms.filter((t) => t !== term) });
  };

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
      <TaskForm
        task={newTask}
        setTask={setNewTask}
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
