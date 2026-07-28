export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  taskName,
  isDark,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskName: string;
  isDark: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className={`relative p-5 rounded-lg shadow-lg animate-fade-in ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} w-full max-w-sm`}>
        <h3 className="text-lg font-semibold mb-3">Confirm Deletion</h3>
        <p className="mb-3 text-sm">Are you sure you want to delete the task &quot;{taskName}&quot;?</p>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="flex-1 px-3 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
            Delete
          </button>
          <button
            onClick={onClose}
            className={`flex-1 px-3 py-2 rounded-md font-medium text-sm ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} focus:outline-none focus:ring-2 focus:ring-gray-400`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
