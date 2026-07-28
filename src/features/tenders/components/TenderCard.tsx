import { Icon } from "@iconify/react";
import { formatDate, getTimeStatus } from "@/features/tenders/lib/tenderUtils";

export default function TenderCard({
  tender,
  mode,
  tenderTypeColors,
  onClick,
  onDelete,
  viewMode,
}: {
  tender: any;
  mode: "light" | "dark";
  expanded?: any;
  toggleText?: (id: string) => void;
  tenderTypeColors: Record<string, string>;
  onClick: (tender: any) => void;
  onDelete: (tender: any) => void;
  viewMode: "grid" | "list";
}) {
  const timeStatus = getTimeStatus(tender.closing_date);
  const borderColor = tenderTypeColors[tender.tender_type?.toLowerCase()] || "border-gray-400";
  const hoverBorderColor = borderColor.replace("border-", "hover:border-");

  return (
    <button
      onClick={() => onClick(tender)}
      className={`p-4 rounded-lg shadow-sm border transition-colors duration-200 text-left w-full
        ${mode === "dark" ? "bg-gray-800 text-gray-300" : "bg-white text-gray-800"}
        ${borderColor}
        hover:bg-gray-100 ${mode === "dark" ? "" : "hover:text-black"}
        ${hoverBorderColor}
        dark:hover:border-[#f05d23]
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${viewMode === "grid" ? "flex flex-col" : "flex flex-row items-center"}`}
    >
      <div className={viewMode === "grid" ? "flex items-center justify-between mb-2" : "w-5/12"}>
        <h3 className={`text-lg font-semibold truncate ${viewMode === "grid" ? "flex-1" : ""}`}>{tender.title}</h3>
        {viewMode === "grid" && <Icon icon="mdi:information-outline" width="20" className="text-gray-500" />}
      </div>

      <div className={viewMode === "grid" ? "mt-2" : "w-2/12 flex flex-col items-start"}>
        <p className={`text-sm ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>
          {viewMode === "list" && <span className="font-medium">Deadline: </span>}
          {formatDate(tender.closing_date)}
        </p>
        <p className={`text-sm ${timeStatus.color}`}>{timeStatus.text}</p>
      </div>

      <div className={viewMode === "grid" ? "flex items-center mt-2" : "w-2/12"}>
        {viewMode === "list" && <span className="text-sm font-medium mr-2">Status:</span>}
        <span className={`flex items-center px-2 py-1 rounded-full text-sm ${tender.status?.toLowerCase() === "open" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          <Icon icon={tender.status?.toLowerCase() === "open" ? "mdi:check-circle" : "mdi:close-circle"} width="16" className="mr-1" />
          {tender.status}
        </span>
      </div>

      <div className={viewMode === "grid" ? "flex justify-between items-center mt-4" : "w-3/12 flex justify-end items-center gap-4"}>
        <span className={`flex items-center text-sm ${tender.source_url?.toLowerCase().endsWith(".pdf") || tender.source_url?.toLowerCase().endsWith(".docx") ? "text-blue-600" : "text-gray-400"}`}>
          <Icon
            icon={tender.source_url?.toLowerCase().endsWith(".pdf") ? "mdi:file-pdf-box" : tender.source_url?.toLowerCase().endsWith(".docx") ? "mdi:file-word-box" : "mdi:file-outline"}
            width="16"
            className="mr-1"
          />
          {tender.source_url?.toLowerCase().endsWith(".pdf") ? "PDF" : tender.source_url?.toLowerCase().endsWith(".docx") ? "DOCX" : "Visit Website"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(tender);
          }}
          className="text-red-500 hover:text-red-600"
        >
          <Icon icon="proicons:delete" width="20" />
        </button>
      </div>
    </button>
  );
}
