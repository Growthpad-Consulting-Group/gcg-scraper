export default function LogsModal({
  isOpen,
  onClose,
  taskName,
  logsContent,
  isDark,
}: {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
  logsContent: string;
  isDark: boolean;
}) {
  if (!isOpen) return null;

  const formattedLogs = logsContent.split("\n").map((log, index) => {
    const timestamp = log.split(" ")[0];
    const action = log.slice(timestamp.length).trim();
    return (
      <div key={index} className="mb-2 p-2 rounded bg-gray-200 dark:bg-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">{timestamp}</div>
        <div className="text-sm">{action}</div>
      </div>
    );
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className={`relative p-5 rounded-lg shadow-lg animate-fade-in ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} w-full max-w-3xl`}>
        <h3 className="text-xl font-semibold mb-3">Logs for Task &quot;{taskName}&quot;</h3>
        <div className={`mb-3 text-sm max-h-80 overflow-y-auto p-3 rounded ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>{formattedLogs}</div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-md font-medium text-sm ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} focus:outline-none focus:ring-2 focus:ring-gray-400`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
