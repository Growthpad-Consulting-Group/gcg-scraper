'use client';

import React, { useRef, useEffect } from "react";
import { DateRange } from "react-date-range";
import { format } from "date-fns";
import ReactDOM from "react-dom";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

interface DateRangeSelection {
  startDate: Date | null;
  endDate: Date | null;
  key: string;
}

interface PopoverPosition {
  top: number;
  left: number;
}

interface DateFilterProps {
  mode: "light" | "dark";
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  dateRange: DateRangeSelection[];
  setDateRange: (range: DateRangeSelection[]) => void;
  popoverPosition: PopoverPosition;
}

const DateFilter: React.FC<DateFilterProps> = ({ 
  mode, 
  showDatePicker, 
  setShowDatePicker, 
  dateRange, 
  setDateRange, 
  popoverPosition 
}) => {
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDatePicker, setShowDatePicker]);

  if (!showDatePicker) return null;

  return ReactDOM.createPortal(
    <div
      ref={datePickerRef}
      className={`date-filter-glass z-[9999] absolute border rounded-2xl shadow-2xl backdrop-blur-2xl p-4 ${
        mode === "dark"
          ? "dark bg-gray-950/60 border-white/10"
          : "bg-white/70 border-white/20"
      }`}
      style={{
        top: popoverPosition.top,
        left: popoverPosition.left,
      }}
    >
      <DateRange
        ranges={dateRange.map((r) => ({
          startDate: r.startDate ?? undefined,
          endDate: r.endDate ?? undefined,
          key: r.key,
        }))}
        onChange={(ranges: any) =>
          setDateRange([ranges.selection])
        }
        moveRangeOnFirstSelection={false}
        showDateDisplay={true}
        editableDateInputs={true}
        maxDate={new Date()}
      />
      <div className="flex justify-end mt-2 gap-2">
        <button
          className={`px-3 py-1 rounded ${
            mode === "dark"
              ? "bg-white/10 text-gray-100 hover:bg-white/20"
              : "bg-black/5 text-gray-700 hover:bg-black/10"
          }`}
          onClick={() => {
            setDateRange([
              {
                startDate: null,
                endDate: null,
                key: "selection",
              },
            ]);
            setShowDatePicker(false);
          }}
        >
          Clear
        </button>
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setShowDatePicker(false)}
        >
          Apply
        </button>
      </div>
      {dateRange[0].startDate && dateRange[0].endDate && (
        <div
          className={`mt-2 text-xs ${
            mode === "dark"
              ? "text-gray-300"
              : "text-gray-600"
          }`}
        >
          Showing from{" "}
          {format(dateRange[0].startDate, "yyyy-MM-dd")} to{" "}
          {format(dateRange[0].endDate, "yyyy-MM-dd")}
        </div>
      )}
    </div>,
    document.body
  );
};

export default DateFilter;