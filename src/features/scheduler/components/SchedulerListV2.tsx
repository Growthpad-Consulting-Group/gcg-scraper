"use client";

import { Icon } from "@iconify/react";
import Badge from "@/shared/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/shared/ui/Table";

interface ScheduledTask {
  task_id: number;
  name: string;
  tender_type?: string;
  frequency: string;
  is_enabled: boolean;
  last_run: string | null;
}

interface SchedulerListV2Props {
  tasks: ScheduledTask[];
  handleRunTask: (taskId: number, taskName: string) => void;
  handleToggleTask: (taskId: number) => void;
  handleViewLogs: (taskId: number, taskName: string) => void;
  handleDeleteTask: (taskId: number, taskName: string) => void;
}

function ActionIcon({ icon, tooltip, onClick, danger }: { icon: string; tooltip: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-text-lo hover:bg-surface-2 ${danger ? "hover:text-status-danger" : "hover:text-text-hi"}`}
    >
      <Icon icon={icon} width={14} />
    </button>
  );
}

export default function SchedulerListV2({ tasks, handleRunTask, handleToggleTask, handleViewLogs, handleDeleteTask }: SchedulerListV2Props) {
  if (tasks.length === 0) {
    return <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">No scheduled tasks yet.</div>;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableTh>Task</TableTh>
          <TableTh>Recurrence</TableTh>
          <TableTh>Status</TableTh>
          <TableTh>Last run</TableTh>
          <TableTh className="w-32">Actions</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.task_id}>
            <TableTd className="font-medium text-text-hi">{task.name}</TableTd>
            <TableTd>
              <div className="flex flex-col">
                <span className="text-text-hi">{task.frequency}</span>
                {task.tender_type && <span className="font-mono text-[11px] text-text-lo">{task.tender_type}</span>}
              </div>
            </TableTd>
            <TableTd>
              <Badge status={task.is_enabled ? "success" : "neutral"}>{task.is_enabled ? "enabled" : "disabled"}</Badge>
            </TableTd>
            <TableTd mono>{task.last_run ? new Date(task.last_run).toLocaleString() : "never"}</TableTd>
            <TableTd>
              <div className="flex items-center gap-0.5">
                <ActionIcon icon="solar:play-circle-broken" tooltip="Run now" onClick={() => handleRunTask(task.task_id, task.name)} />
                <ActionIcon
                  icon={task.is_enabled ? "solar:pause-circle-broken" : "solar:play-circle-broken"}
                  tooltip={task.is_enabled ? "Disable" : "Enable"}
                  onClick={() => handleToggleTask(task.task_id)}
                />
                <ActionIcon icon="solar:document-text-broken" tooltip="View logs" onClick={() => handleViewLogs(task.task_id, task.name)} />
                <ActionIcon icon="solar:trash-bin-trash-broken" tooltip="Delete" onClick={() => handleDeleteTask(task.task_id, task.name)} danger />
              </div>
            </TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
