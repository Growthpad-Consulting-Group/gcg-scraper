
import { Icon } from "@iconify/react";
import Select from "react-select";
import { getSelectStyles } from "@/utils/selectStyles";

type SortOrder = 'none' | 'name-asc' | 'name-desc';

interface SortOrderSelectorProps {
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  mode: 'light' | 'dark';
}

export default function SortOrderSelector({
  sortOrder,
  setSortOrder,
  mode
}: SortOrderSelectorProps) {
  const getLabel = (order: SortOrder): string => {
    switch (order) {
      case "none": return "No Sorting";
      case "name-asc": return "Name (A-Z)";
      case "name-desc": return "Name (Z-A)";
      default: return "No Sorting";
    }
  };

  return (
    <div className={`rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-md ${mode === "dark"
      ? "bg-gray-800/50 border-gray-700/50"
      : "bg-white/80 border-gray-200 shadow-sm"
      }`}>
      <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${mode === "dark" ? "text-gray-200" : "text-gray-900"
        }`}>
        <Icon icon="solar:sort-broken" className="w-5 h-5 text-gcg-brown" />
        Sort Order
      </label>
      <Select
        value={{
          value: sortOrder,
          label: getLabel(sortOrder),
        }}
        onChange={(selectedOption) =>
          setSortOrder((selectedOption?.value as SortOrder) || "none")
        }
        options={[
          { value: "none", label: "No Sorting" },
          { value: "name-asc", label: "Name (A-Z)" },
          { value: "name-desc", label: "Name (Z-A)" },
        ]}
        placeholder="Select sort order..."
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
