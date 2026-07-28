import { Icon } from "@iconify/react";

export default function PdfModal({
  selectedTender,
  closeModal,
  mode,
}: {
  selectedTender: { url: string; title: string };
  closeModal: () => void;
  mode: "light" | "dark";
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
      <div
        className={`p-6 rounded-lg shadow-2xl max-w-4xl w-full h-[80vh] flex flex-col ${mode === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${mode === "dark" ? "text-white" : "text-[#231812]"}`}>{selectedTender.title}</h2>
          <div className="flex items-center gap-3">
            <a
              href={selectedTender.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Icon icon="mdi:download" className="mr-1" />
              Download
            </a>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Icon icon="mdi:close" width="24" />
            </button>
          </div>
        </div>

        <iframe
          src={`https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(selectedTender.url)}`}
          className="w-full h-full border-0 rounded-lg"
          title="Tender PDF Viewer"
        ></iframe>
      </div>
    </div>
  );
}
