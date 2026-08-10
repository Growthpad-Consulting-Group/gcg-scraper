import SimpleModal from "@/shared/ui/SimpleModal";
import Button from "@/shared/ui/Button";
import LogPanel, { type LogLine } from "@/shared/ui/LogPanel";

export interface TaskLogEntry {
  created_at: string;
  log_entry: string;
}

/** Pretty-prints an embedded JSON error body (e.g. a Firecrawl error response tacked onto the
 * end of a "Run failed: ..." message) instead of leaving it as one unbroken line — the JSON
 * portion is detected as the first `{` through the last `}` in the message. Falls back to the
 * raw text untouched if that substring isn't actually valid JSON. */
function formatLogText(message: string): string {
  const start = message.indexOf("{");
  const end = message.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return message;

  try {
    const parsed = JSON.parse(message.slice(start, end + 1));
    return `${message.slice(0, start).trim()}\n${JSON.stringify(parsed, null, 2)}`;
  } catch {
    return message;
  }
}

function toneFor(message: string): LogLine["tone"] {
  const lower = message.toLowerCase();
  if (lower.includes("failed") || lower.includes("error")) return "danger";
  if (lower.includes("started")) return "info";
  if (lower.includes("finished") || lower.includes("completed")) return "success";
  return "default";
}

export default function LogsModal({
  isOpen,
  onClose,
  taskName,
  logs,
}: {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
  logs: TaskLogEntry[];
}) {
  const lines: LogLine[] = logs.length
    ? logs.flatMap((log) => [
        { text: new Date(log.created_at).toLocaleString(), tone: "info" as const },
        { text: formatLogText(log.log_entry), tone: toneFor(log.log_entry) },
      ])
    : [{ text: "No logs available.", tone: "default" }];

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title={`Logs for Task "${taskName}"`} width="max-w-3xl">
      <div className="mb-4">
        <LogPanel lines={lines} className="max-h-96" autoScroll={false} />
      </div>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </SimpleModal>
  );
}
