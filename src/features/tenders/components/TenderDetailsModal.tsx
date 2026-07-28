"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import PdfModal from "./PdfModal";
import { formatDate, getTimeStatus } from "@/features/tenders/lib/tenderUtils";

export default function TenderDetailsModal({
  isOpen,
  onClose,
  tender,
  mode,
}: {
  isOpen: boolean;
  onClose: () => void;
  tender: any;
  mode: "light" | "dark";
}) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  if (!isOpen || !tender) return null;

  const isDocument = tender.source_url?.toLowerCase().endsWith(".pdf") || tender.source_url?.toLowerCase().endsWith(".docx");
  const documentType = tender.source_url?.toLowerCase().endsWith(".pdf") ? "PDF" : tender.source_url?.toLowerCase().endsWith(".docx") ? "DOCX" : null;
  const timeStatus = getTimeStatus(tender.closing_date);

  const handleDocumentClick = () => {
    if (documentType === "PDF") setIsPdfModalOpen(true);
    else if (documentType === "DOCX") window.open(tender.source_url, "_blank", "noopener,noreferrer");
  };

  const handleWebsiteClick = () => {
    if (tender.source_url) window.open(tender.source_url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className={`relative w-full max-w-5xl rounded-2xl shadow-2xl p-8 transform transition-all duration-500 border-t-4 ${
            mode === "dark" ? "bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100 border border-gray-700/50 backdrop-blur-xl" : "bg-gradient-to-br from-white to-gray-50 text-gray-900 border border-gray-200/50 backdrop-blur-xl"
          } ${isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
          style={{ borderTopColor: "#f05d23" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-300 ${mode === "dark" ? "text-gray-300 hover:bg-gray-700/50 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          >
            <Icon icon="mdi:close" width="24" />
          </button>

          <div className="flex items-center mb-6">
            <Icon icon="carbon:document" width="36" className="text-indigo-500 mr-4" />
            <h2 className="text-2xl font-extrabold tracking-tight">{tender.title}</h2>
          </div>

          <div className="space-y-8">
            <div className="relative py-2 rounded-xl bg-opacity-50 backdrop-blur-sm transition-all duration-300">
              <p className={`text-sm leading-relaxed ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{tender.description || "No description available."}</p>
            </div>

            <div className="border-b"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative p-6 rounded-xl bg-opacity-50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center mb-3">
                  <Icon icon="mdi:information-outline" width="20" className="text-indigo-400 mr-3" />
                  <h3 className="text-lg font-semibold">Status</h3>
                </div>
                <div className="flex items-center">
                  <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium shadow-sm transition-all duration-300 ${tender.status?.toLowerCase() === "open" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-rose-100 text-rose-800 hover:bg-rose-200"}`}>
                    <Icon icon={tender.status?.toLowerCase() === "open" ? "mdi:check-circle" : "mdi:close-circle"} width="16" className="mr-2" />
                    {tender.status}
                  </span>
                </div>
              </div>

              <div className="relative p-6 rounded-xl bg-opacity-50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center mb-3">
                  <Icon icon="mdi:calendar-clock" width="20" className="text-indigo-400 mr-3" />
                  <h3 className="text-lg font-semibold">Deadline</h3>
                </div>
                <p className={`text-sm ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{formatDate(tender.closing_date)}</p>
                <p className={`text-sm font-medium ${timeStatus.color}`}>{timeStatus.text}</p>
              </div>

              <div className="relative p-6 rounded-xl bg-opacity-50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center mb-3">
                  <Icon icon="mdi:file-document-outline" width="20" className="text-indigo-400 mr-3" />
                  <h3 className="text-lg font-semibold">Document / Website</h3>
                </div>
                {tender.source_url ? (
                  <div className="flex items-center">
                    <Icon icon={isDocument ? (documentType === "PDF" ? "mdi:file-pdf-box" : "mdi:file-word-box") : "mdi:link"} width="24" className="text-indigo-500 mr-3" />
                    <button
                      onClick={isDocument ? handleDocumentClick : handleWebsiteClick}
                      className="group flex items-center px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <Icon icon={isDocument ? "mdi:eye-outline" : "mdi:open-in-new"} width="16" className="mr-2 group-hover:scale-110 transition-transform duration-300" />
                      {isDocument ? `View ${documentType}` : "Visit Website"}
                    </button>
                  </div>
                ) : (
                  <p className={`text-sm ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>No document or website available.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className={`px-5 py-2 rounded-lg font-semibold text-base shadow-md transition-all duration-300 ${
                mode === "dark" ? "bg-gradient-to-r from-gray-700 to-gray-600 text-gray-100 hover:from-gray-600 hover:to-gray-500" : "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-900 hover:from-gray-300 hover:to-gray-400"
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {isPdfModalOpen && <PdfModal selectedTender={{ url: tender.source_url, title: tender.title }} closeModal={() => setIsPdfModalOpen(false)} mode={mode} />}
    </>
  );
}
