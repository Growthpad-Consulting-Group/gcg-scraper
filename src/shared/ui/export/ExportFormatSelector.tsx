
import { Icon } from "@iconify/react";
import Select from "react-select";
import { getSelectStyles } from "@/utils/selectStyles";

interface ExportFormatSelectorProps {
  exportFormat: 'csv' | 'xlsx' | 'pdf' | 'email';
  setExportFormat: (format: 'csv' | 'xlsx' | 'pdf' | 'email') => void;
  mode: 'light' | 'dark';
}

export default function ExportFormatSelector({
  exportFormat,
  setExportFormat,
  mode
}: ExportFormatSelectorProps) {
  return (
    <div className={`rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-md ${mode === "dark"
      ? "bg-gray-800/50 border-gray-700/50"
      : "bg-white/80 border-gray-200 shadow-sm"
      }`}>
      <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${mode === "dark" ? "text-gray-200" : "text-gray-900"
        }`}>
        <Icon icon="solar:export-broken" className="w-5 h-5 text-gcg-brown" />
        Export Format
      </label>
      <Select
        value={{
          value: exportFormat,
          label: exportFormat === "xlsx" ? "XLSX (Excel)" : exportFormat.toUpperCase(),
        }}
        onChange={(selectedOption) =>
          setExportFormat((selectedOption?.value as 'csv' | 'xlsx' | 'pdf' | 'email') || "csv")
        }
        options={[
          { value: "csv", label: "CSV" },
          { value: "xlsx", label: "XLSX (Excel)" },
          { value: "pdf", label: "PDF" },
          { value: "email", label: "Email" },
        ]}
        placeholder="Select format..."
        isClearable={false}
        isSearchable={false}
        className="react-select-container"
        classNamePrefix="react-select"
        styles={{
          ...getSelectStyles<any>(mode),
          menuPortal: (base) => ({ ...base, zIndex: 99999 }),
          menu: (base) => ({ ...base, zIndex: 99999 }),
        }}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuPlacement="auto"
      />
    </div>
  );
}
