import React, { ReactNode } from "react";
import Select from "react-select";
import { getSelectStyles, getSelectValue } from "@/utils/selectStyles";
import TooltipIconButton from "@/shared/ui/TooltipIconButton";
import { Icon } from "@iconify/react";
import DateRangePicker, { DateRangeValue } from "@/shared/ui/DateRangePicker";
import { CustomOption, CustomSingleValue, sortOptions, OptionData } from "./SelectComponents";

// Safe document access for SSR
const getPortalTarget = () => typeof document !== 'undefined' ? document.body : undefined;

interface StatusOption {
  value: string;
  label: string;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

interface Table {
  sortBy: string;
  setSortBy: (sortBy: string) => void;
}

interface TableFiltersProps {
  mode: "light" | "dark";
  table: Table;
  statusOptions?: StatusOption[] | string[] | null;
  onStatusFilter?: ((status: string) => void) | null;
  statusFilter?: string;
  enableSortFilter?: boolean;
  enableRefresh?: boolean;
  onRefresh?: () => void;
  extraFilters?: ReactNode;
  enableDateFilter?: boolean;
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange) => void;
  allowedDateRanges?: string[];
  rightContent?: ReactNode;
}

const TableFilters: React.FC<TableFiltersProps> = ({
  mode,
  table,
  statusOptions,
  onStatusFilter,
  statusFilter,
  enableSortFilter,
  enableRefresh,
  onRefresh,
  extraFilters,
  enableDateFilter,
  dateRange,
  onDateRangeChange,
  allowedDateRanges,
  rightContent,
}) => {
  return (
    <div className="flex flex-1 flex-wrap gap-2 sm:gap-3 items-center">
      {/* Status Filter */}
      {statusOptions && (
        <div className="flex-1 min-w-[140px] sm:flex-none sm:w-auto md:w-40">
          <Select
            value={(() => {
              // Handle both string array and object array formats
              if (statusOptions.length === 0) return null;

              if (typeof statusOptions[0] === 'string') {
                // Legacy string array format
                const stringOptions = (statusOptions as string[]).map(opt => ({
                  value: opt,
                  label: opt.charAt(0).toUpperCase() + opt.slice(1)
                }));
                return stringOptions.find(option => option.value === (statusFilter || "all"));
              } else {
                // New object array format
                return (statusOptions as StatusOption[]).find(option => option.value === (statusFilter || "all"));
              }
            })()}
            onChange={(selectedOption) => onStatusFilter?.(getSelectValue(selectedOption))}
            options={(() => {
              // Handle both string array and object array formats
              if (statusOptions.length === 0) return [];

              if (typeof statusOptions[0] === 'string') {
                // Legacy string array format - convert to objects
                return (statusOptions as string[]).map(opt => ({
                  value: opt,
                  label: opt.charAt(0).toUpperCase() + opt.slice(1)
                }));
              } else {
                // New object array format
                return statusOptions as StatusOption[];
              }
            })()}
            placeholder="Filter by status..."
            isClearable={false}
            isSearchable={true}
            noOptionsMessage={() => "No status options found"}
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              ...getSelectStyles<any>(mode),
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              menu: (base, state) => ({
                ...(getSelectStyles<any>(mode).menu ? getSelectStyles<any>(mode).menu!(base, state) : base),
                zIndex: 9999
              })
            }}
            menuPortalTarget={getPortalTarget()}
            menuPosition="fixed"
            menuPlacement="auto"
          />
        </div>
      )}

      {/* Extra Filters Slot */}
      {extraFilters && (
        <div className="flex-1 min-w-[140px] sm:flex-none sm:w-auto">{extraFilters}</div>
      )}

      {/* Sort By Filter - Simplified (alphabetical sorting only, time-based filtering handled by date filter) */}
      {enableSortFilter && (
        <div className="flex-1 min-w-[140px] sm:flex-none sm:w-auto md:w-40">
          <Select<OptionData, false>
            value={{
              value: table.sortBy,
              label: sortOptions.find(opt => opt.value === table.sortBy)?.label || "Sort By"
            }}
            onChange={(selectedOption) => table.setSortBy(getSelectValue(selectedOption))}
            options={sortOptions}
            placeholder="Sort by..."
            isClearable={false}
            isSearchable={false}
            noOptionsMessage={() => "No sort options found"}
            className="react-select-container"
            classNamePrefix="react-select"
            components={{
              Option: CustomOption,
              SingleValue: CustomSingleValue
            }}
            styles={{
              ...getSelectStyles<any>(mode),
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              menu: (base, state) => ({
                ...(getSelectStyles<any>(mode).menu ? getSelectStyles<any>(mode).menu!(base, state) : base),
                zIndex: 9999
              })
            }}
            menuPortalTarget={getPortalTarget()}
            menuPosition="fixed"
            menuPlacement="auto"
          />
        </div>
      )}

      {/* Date Filter */}
      {enableDateFilter && dateRange && onDateRangeChange && (
        <DateRangePicker
          value={dateRange}
          onChange={(value: DateRangeValue) =>
            onDateRangeChange?.({
              startDate: value.startDate,
              endDate: value.endDate,
              label: value.label ?? "Custom Range",
            })
          }
          mode={mode}
          className="flex-1 min-w-[200px] sm:flex-none sm:w-auto"
          allowedRanges={allowedDateRanges}
        />
      )}

      {/* Refresh Button */}
      {enableRefresh && (
        <div className="relative group w-10 flex-none">
          <TooltipIconButton
            icon="solar:refresh-broken"
            label="Refresh Data"
            onClick={onRefresh}
            mode={mode}
            className={`pl-10 py-2 w-10 h-10 border rounded-lg outline-none transition-all duration-300 cursor-pointer flex items-center justify-center !p-0 ${mode === "dark"
              ? "border-gray-600 bg-gray-800 text-gray-400 hover:!bg-gray-700 hover:text-gray-200"
              : "border-gray-200 bg-gray-50 text-gray-500 hover:!bg-gray-100 hover:text-gray-700"
              } !rounded-lg`}
          >
            <Icon
              icon="solar:refresh-broken"
              className="w-4 h-4 transition-colors duration-300"
            />
          </TooltipIconButton>
        </div>
      )}

      {/* Right-aligned content slot */}
      {rightContent && (
        <div className="ml-auto flex-none">{rightContent}</div>
      )}
    </div>
  );
};

export default TableFilters;