"use client";

import { useState, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import FieldSelector from "./FieldSelector";
import FilterSection from "./FilterSection";
import PreviewTable from "./PreviewTable";
import useExportFilters from "@/features/tenders/hooks/useExportFilters";

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function ExportModal({ isOpen, onClose, tenders, mode }: { isOpen: boolean; onClose: () => void; tenders: any[]; mode: "light" | "dark" }) {
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    title: true,
    description: true,
    closing_date: true,
    status: true,
    source_url: false,
  });
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [previewRows, setPreviewRows] = useState(3);
  const [fieldsOrder, setFieldsOrder] = useState([
    { label: "Title", key: "title", icon: "mdi:text" },
    { label: "Description", key: "description", icon: "mdi:note" },
    { label: "Closing Date", key: "closing_date", icon: "mdi:calendar" },
    { label: "Status", key: "status", icon: "mdi:tag" },
    { label: "Source URL", key: "source_url", icon: "mdi:link" },
  ]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statuses] = useState(["all", "open", "closed"]);

  const { filterStatus, setFilterStatus, dateRange, setDateRange, filteredTenders } = useExportFilters(tenders || []);

  const formattedTenders = useMemo(() => (filteredTenders ? filteredTenders.map((tender) => ({ ...tender, closing_date: formatDate(tender.closing_date) })) : []), [filteredTenders]);

  const fallbackStaticRanges = useMemo(
    () => [
      { label: "All Time", range: () => ({ startDate: null, endDate: null }), isSelected: () => !dateRange[0].startDate },
      {
        label: "Today",
        range: () => {
          const today = new Date();
          return { startDate: today, endDate: today };
        },
        isSelected: (range: any) => range.startDate?.toDateString() === new Date().toDateString() && range.endDate?.toDateString() === new Date().toDateString(),
      },
      {
        label: "Last 7 Days",
        range: () => {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 6);
          return { startDate: start, endDate: end };
        },
        isSelected: (range: any) => {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 6);
          return range.startDate?.toDateString() === start.toDateString() && range.endDate?.toDateString() === end.toDateString();
        },
      },
    ],
    [dateRange]
  );

  const handleFieldToggle = useCallback((key: string) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedFields(Object.fromEntries(fieldsOrder.map((f) => [f.key, true])));
    toast.success("All fields selected", { icon: "✅" });
  }, [fieldsOrder]);

  const handleSelectNone = useCallback(() => {
    setSelectedFields(Object.fromEntries(fieldsOrder.map((f) => [f.key, false])));
    toast.success("All fields deselected", { icon: "✅" });
  }, [fieldsOrder]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const reorderedFields = Array.from(fieldsOrder);
      const [movedField] = reorderedFields.splice(result.source.index, 1);
      reorderedFields.splice(result.destination.index, 0, movedField);
      setFieldsOrder(reorderedFields);
      toast.success("Fields reordered", { icon: "✅" });
    },
    [fieldsOrder]
  );

  const csvHeaders = fieldsOrder.filter((f) => selectedFields[f.key]).map((f) => ({ label: f.label, key: f.key }));

  const exportPDF = useCallback(() => {
    const selectedKeys = fieldsOrder.filter((f) => selectedFields[f.key]).map((f) => f.key);
    if (selectedKeys.length === 0) {
      toast.error("Please select at least one field to export!", { icon: "⚠️" });
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Tenders Export", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    autoTable(doc, {
      head: [selectedKeys.map((key) => fieldsOrder.find((f) => f.key === key)!.label)],
      body: formattedTenders.map((tender) => selectedKeys.map((key) => tender[key] || "-")),
      startY: 30,
      theme: "striped",
      headStyles: { fillColor: [240, 93, 35], textColor: [255, 255, 255] },
      styles: { textColor: mode === "dark" ? [255, 255, 255] : [0, 0, 0], fillColor: mode === "dark" ? [50, 50, 50] : [255, 255, 255], cellPadding: 2 },
      margin: { top: 30 },
    });
    doc.save("tenders_export.pdf");
    toast.success("PDF exported successfully!", { icon: "✅" });
  }, [selectedFields, formattedTenders, fieldsOrder, mode]);

  const handleExportClick = useCallback(() => {
    if (Object.values(selectedFields).every((v) => !v)) {
      toast.error("Please select at least one field to export!", { icon: "⚠️" });
      return false;
    }
    toast.success("CSV exported successfully!", { icon: "✅" });
    return true;
  }, [selectedFields]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex justify-center items-center z-[100]">
      <div className={`rounded-xl max-w-2xl w-full mx-0 shadow-2xl transform transition-all duration-300 animate-fade-in flex flex-col max-h-[80vh] ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}>
        <div className="bg-[#f05d23] rounded-t-xl p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Icon icon="mdi:export" className="w-8 h-8 text-white mr-3" />
            <h2 className="text-2xl font-bold text-white">Export Tenders</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition duration-200">
            <Icon icon="mdi:close" width={24} height={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#f05d23] scrollbar-track-gray-200 relative">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`block text-sm font-medium ${mode === "dark" ? "text-gray-200 bg-gray-800" : "text-[#231812] bg-white"}`}>Select Fields to Export</label>
                <div className="flex gap-2">
                  <button onClick={handleSelectAll} className={`text-xs px-2 py-1 rounded-full ${mode === "dark" ? "bg-gray-700 text-[#f05d23] hover:bg-gray-600" : "bg-gray-200 text-[#f05d23] hover:bg-gray-300"}`}>
                    All
                  </button>
                  <button onClick={handleSelectNone} className={`text-xs px-2 py-1 rounded-full ${mode === "dark" ? "bg-gray-700 text-[#f05d23] hover:bg-gray-600" : "bg-gray-200 text-[#f05d23] hover:bg-gray-300"}`}>
                    None
                  </button>
                </div>
              </div>
              <DragDropContext onDragEnd={onDragEnd}>
                <FieldSelector fieldsOrder={fieldsOrder} selectedFields={selectedFields} handleFieldToggle={handleFieldToggle} mode={mode} />
              </DragDropContext>
            </div>
            <FilterSection
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              dateRange={dateRange}
              setDateRange={setDateRange}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
              mode={mode}
              statuses={statuses}
              fallbackStaticRanges={fallbackStaticRanges}
            />
            <div>
              <label className={`block text-sm font-medium mb-2 ${mode === "dark" ? "text-gray-200 bg-gray-800" : "text-[#231812] bg-white"}`}>Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "csv" | "pdf")}
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f05d23] text-sm ${mode === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-[#231812]"}`}
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${mode === "dark" ? "text-gray-200 bg-gray-800" : "text-[#231812] bg-white"}`}>Preview Rows</label>
              <select
                value={previewRows}
                onChange={(e) => setPreviewRows(Number(e.target.value))}
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f05d23] text-sm ${mode === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-[#231812]"}`}
              >
                <option value={3}>3 Rows</option>
                <option value={5}>5 Rows</option>
                <option value={10}>10 Rows</option>
              </select>
              <PreviewTable filteredTenders={formattedTenders} csvHeaders={csvHeaders} previewRows={previewRows} mode={mode} />
            </div>
          </div>
        </div>
        <div className={`sticky bottom-0 p-4 border-t rounded-b-xl shadow-md ${mode === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="flex justify-end gap-4">
            <button onClick={onClose} className={`px-6 py-2 rounded-full flex items-center gap-2 transition duration-200 shadow-md hover:shadow-lg ${mode === "dark" ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-[#231812] hover:bg-gray-300"}`}>
              <Icon icon="mdi:close" width={20} height={20} />
              Cancel
            </button>
            {exportFormat === "csv" ? (
              <CSVLink data={formattedTenders} headers={csvHeaders} filename="tenders_export.csv" onClick={handleExportClick} className="px-6 py-2 rounded-full flex items-center gap-2 transition duration-200 shadow-md hover:shadow-lg bg-[#f05d23] text-white hover:bg-[#d94f1e]">
                <Icon icon="mdi:download" width={20} height={20} />
                Export CSV
              </CSVLink>
            ) : (
              <button onClick={exportPDF} className="px-6 py-2 rounded-full flex items-center gap-2 transition duration-200 shadow-md hover:shadow-lg bg-[#f05d23] text-white hover:bg-[#d94f1e]">
                <Icon icon="mdi:download" width={20} height={20} />
                Export PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
