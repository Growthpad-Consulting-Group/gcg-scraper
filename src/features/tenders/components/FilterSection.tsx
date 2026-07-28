import { Icon } from "@iconify/react";
// @ts-expect-error - react-date-range has no bundled types
import DateRangePicker from "react-date-range/dist/components/Calendar";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

export default function FilterSection({
  filterStatus,
  setFilterStatus,
  dateRange,
  setDateRange,
  showDatePicker,
  setShowDatePicker,
  mode,
  statuses = ["all"],
  fallbackStaticRanges = [],
}: {
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  dateRange: { startDate: Date | null; endDate: Date | null }[];
  setDateRange: (v: any[]) => void;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  mode: "light" | "dark";
  statuses?: string[];
  fallbackStaticRanges?: any[];
}) {
  const handleDateRangeChange = (ranges: any) => {
    setDateRange([{ ...ranges.range1 }]);
  };

  return (
    <div className="space-y-4">
      <label className={`block text-sm font-medium ${mode === "dark" ? "text-gray-200" : "text-[#231812]"}`}>Filters</label>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-1/2">
          <label className={`block text-sm font-medium mb-2 ${mode === "dark" ? "text-gray-200" : "text-[#231812]"}`}>Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f05d23] text-sm ${mode === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-[#231812]"}`}
          >
            {statuses.length > 0 ? (
              statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))
            ) : (
              <option value="all">All</option>
            )}
          </select>
        </div>

        <div className="w-full sm:w-1/2">
          <label className={`block text-sm font-medium mb-2 ${mode === "dark" ? "text-gray-200" : "text-[#231812]"}`}>Filter by Date Range</label>
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`w-full p-2 border rounded-lg text-sm flex items-center justify-between ${mode === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-[#231812]"}`}
            >
              <span>{dateRange[0].startDate ? `${dateRange[0].startDate.toLocaleDateString()} - ${dateRange[0].endDate?.toLocaleDateString() || ""}` : "Select range"}</span>
              <Icon icon="mdi:calendar" width={20} height={20} />
            </button>
            {showDatePicker && (
              <div className="absolute z-10 mt-2">
                <DateRangePicker onChange={handleDateRangeChange} ranges={dateRange} staticRanges={fallbackStaticRanges} inputRanges={[]} className={mode === "dark" ? "text-white" : "text-[#231812]"} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
