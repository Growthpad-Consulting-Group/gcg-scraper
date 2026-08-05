
import { Icon } from "@iconify/react";
import Select from "react-select";
import { getSelectStyles } from "@/utils/selectStyles";

interface PreviewRowsSelectorProps {
  previewRows: number;
  setPreviewRows: (rows: number) => void;
  mode: 'light' | 'dark';
}

export default function PreviewRowsSelector({
  previewRows,
  setPreviewRows,
  mode
}: PreviewRowsSelectorProps) {
  return (
    <div className={`rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-md ${mode === "dark"
      ? "bg-gray-800/50 border-gray-700/50"
      : "bg-white/80 border-gray-200 shadow-sm"
      }`}>
      <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${mode === "dark" ? "text-gray-200" : "text-gray-900"
        }`}>
        <Icon icon="solar:eye-broken" className="w-5 h-5 text-gcg-brown" />
        Preview Rows
      </label>
      <Select
        value={{ value: previewRows, label: previewRows.toString() }}
        onChange={(selectedOption) =>
          setPreviewRows(Number(selectedOption?.value) || 3)
        }
        options={[
          { value: 3, label: "3" },
          { value: 5, label: "5" },
          { value: 10, label: "10" },
          { value: 20, label: "20" },
          { value: 50, label: "50" },
        ]}
        placeholder="Select rows..."
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
