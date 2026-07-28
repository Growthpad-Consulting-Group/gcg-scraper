import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

export default function TaskModalWrapper({
  isOpen,
  onClose,
  title,
  children,
  mode,
  onSave,
  saveLabel,
  isSaving,
  isSaveDisabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  mode: "light" | "dark";
  onSave: () => void;
  saveLabel: string;
  isSaving: boolean;
  isSaveDisabled?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100]">
      <div className={`rounded-xl max-w-2xl w-full mx-0 shadow-2xl transform transition-all duration-300 animate-fade-in flex flex-col max-h-[80vh] ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}>
        <div className="bg-[#f05d23] rounded-t-xl p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Icon icon="mdi:clock-outline" className="w-8 h-8 text-white mr-3" />
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition duration-200">
            <Icon icon="mdi:close" width={24} height={24} />
          </button>
        </div>
        {children}
        <div className={`sticky bottom-0 p-4 border-t rounded-b-xl shadow-md ${mode === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              disabled={isSaving}
              className={`px-6 py-2 rounded-full flex items-center gap-2 transition duration-200 shadow-md hover:shadow-lg ${mode === "dark" ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-[#231812] hover:bg-gray-300"}`}
            >
              <Icon icon="mdi:close" width={20} height={20} />
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving || isSaveDisabled}
              className={`px-6 py-2 rounded-full flex items-center gap-2 transition duration-200 shadow-md hover:shadow-lg ${
                isSaving || isSaveDisabled ? "bg-gray-400 cursor-not-allowed text-white" : "bg-[#f05d23] text-white hover:bg-[#d94f1e]"
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="mdi:check" width={20} height={20} />
                  {saveLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
