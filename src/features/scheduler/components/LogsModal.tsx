import SimpleModal from "@/shared/ui/SimpleModal";
import Button from "@/shared/ui/Button";

export default function LogsModal({
  isOpen,
  onClose,
  taskName,
  logsContent,
}: {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
  logsContent: string;
}) {
  const formattedLogs = logsContent.split("\n").map((log, index) => {
    const timestamp = log.split(" ")[0];
    const action = log.slice(timestamp.length).trim();
    return (
      <div key={index} className="mb-2 rounded bg-surface-2 p-2">
        <div className="text-xs text-text-lo">{timestamp}</div>
        <div className="text-sm text-text-hi">{action}</div>
      </div>
    );
  });

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title={`Logs for Task "${taskName}"`} width="max-w-3xl">
      <div className="mb-4 max-h-80 overflow-y-auto rounded-lg border border-app-border p-3 text-sm">{formattedLogs}</div>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </SimpleModal>
  );
}
