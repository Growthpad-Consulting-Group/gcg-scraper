import { useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
// @ts-ignore - react-date-range doesn't have types
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import Select from "react-select";
import { getSelectStyles } from "@/utils/selectStyles";

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  key: string;
}

interface FilterSectionProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  dateRange: DateRange[];
  setDateRange: (range: DateRange[]) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  mode: 'light' | 'dark';
  statuses: string[];
  fallbackStaticRanges: any[];
}

export default function FilterSection({
  filterStatus,
  setFilterStatus,
  dateRange,
  setDateRange,
  showDatePicker,
  setShowDatePicker,
  mode,
  statuses,
  fallbackStaticRanges,
}: FilterSectionProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!showDatePicker) return undefined;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDatePicker, setShowDatePicker]);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <label
          className={`block text-sm font-medium mb-2 ${mode === "dark" ? "text-gray-200" : "text-gray-900"
            }`}
        >
          Filter by Status
        </label>
        <Select
          value={{ value: filterStatus, label: filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1) }}
          onChange={(selectedOption) => setFilterStatus((selectedOption?.value as string) || "all")}
          options={statuses.map(status => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }))}
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
      <div className="flex-1 relative" ref={pickerRef}>
        <label
          className={`block text-sm font-medium mb-2 ${mode === "dark" ? "text-gray-200" : "text-gray-900"
            }`}
        >
          Filter by Date Range
        </label>
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`w-full p-2 rounded-lg flex items-center justify-between transition duration-200 shadow-md ${mode === "dark"
            ? "bg-gray-800 text-white hover:bg-gray-700"
            : "bg-white text-gray-700 hover:bg-gray-300 border border-gray-300"
            }`}
          style={mode === "dark" ? { backgroundColor: "#1f2937" } : {}}
        >
          <span className={mode === "dark" ? "text-white" : "text-gray-900"}>
            {dateRange[0].startDate && dateRange[0].endDate
              ? `${dateRange[0].startDate.toLocaleDateString()} - ${dateRange[0].endDate.toLocaleDateString()}`
              : "Select Date Range"}
          </span>
          <Icon
            icon={showDatePicker ? "solar:alt-arrow-up-broken" : "solar:alt-arrow-down-broken"}
            className={`w-5 h-5 ${mode === "dark" ? "text-blue-400" : "text-blue-600"
              }`}
          />
        </button>
        {showDatePicker && (
          <div
            className={`absolute left-0 top-full mt-2 w-[calc(100%+2rem)] -ml-40 rounded-lg shadow-lg border z-50 ${mode === "dark"
              ? "bg-gray-800 border-gray-700 text-white dark-mode-datepicker"
              : "bg-white border-gray-200 text-[#231812]"
              }`}
          >
            <DateRangePicker
              ranges={dateRange.map((r) => ({
                startDate: r.startDate ?? undefined,
                endDate: r.endDate ?? undefined,
                key: r.key,
              }))}
              onChange={(item: any) => setDateRange([item.selection])}
              className="w-full"
              inputRanges={[]}
              staticRanges={fallbackStaticRanges}
            />
            <div className={`flex justify-end gap-2 px-4 py-3 border-t ${mode === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <button
                onClick={() => {
                  setDateRange([{ startDate: null, endDate: null, key: "selection" }]);
                  setShowDatePicker(false);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Clear
              </button>
              <button
                onClick={() => setShowDatePicker(false)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gcg-orange text-white hover:bg-gcg-orange-dark transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
