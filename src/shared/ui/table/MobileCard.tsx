'use client';

import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import TooltipIconButton from "@/shared/ui/TooltipIconButton";
import { formatDisplayValue, isDateField, formatDateValue, getNestedValue } from "./TableUtils";

interface Column {
  accessor: string;
  Header?: string;
  type?: string;
  render?: (row: any, value: any, index: number) => React.ReactNode;
}

interface TableAction {
  label?: string | ((row: any) => string);
  icon?: string | ((row: any) => string);
  onClick?: (row: any, e?: React.MouseEvent) => void;
  show?: (row: any) => boolean;
  disabled?: boolean | ((row: any) => boolean);
  tooltip?: string | ((row: any) => string);
  className?: string | ((row: any) => string);
  style?: React.CSSProperties | ((row: any) => React.CSSProperties);
  render?: (row: any) => React.ReactNode;
}

interface TableState {
  selected: any[];
  toggleSelect: (id: any) => void;
}

interface MobileCardProps {
  row: any;
  index: number;
  mode: "light" | "dark";
  enhancedColumns: Column[];
  selectable: boolean;
  table: TableState;
  actions: TableAction[];
  onEdit?: (row: any) => void;
  onView?: (row: any) => void;
  onDelete?: (row: any) => void;
  handleDeleteAction: (row: any) => void;
  onRowClick?: (row: any) => void;
  rowClickable?: boolean;
}

const MobileCard: React.FC<MobileCardProps> = ({
  row,
  index,
  mode,
  enhancedColumns,
  selectable,
  table,
  actions,
  onEdit,
  onView,
  onDelete,
  handleDeleteAction,
  onRowClick,
  rowClickable = false
}) => {
  // Dropdown state management
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showDropdown]);


  // Helper function to process column value
  const processColumnValue = (col: Column, value: any) => {
    let displayValue = value;

    if (isDateField(col.accessor) && value && typeof col.render !== "function") {
      displayValue = formatDateValue(value);
    } else {
      // Auto-format monetary and numeric values for mobile cards
      displayValue = formatDisplayValue(value, col.accessor, col.Header);
    }

    return displayValue;
  };

  // Get primary columns (first 2) and secondary columns (rest)
  const primaryColumns = enhancedColumns.slice(0, 2);
  const secondaryColumns = enhancedColumns.slice(2);

  // Handle card click
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on action buttons or checkboxes
    if ((e.target as Element).closest('button') || (e.target as Element).closest('input[type="checkbox"]')) {
      return;
    }

    if (rowClickable && onRowClick) {
      onRowClick(row);
    }
  };

  return (
    <div
      key={row.id || index}
      className={`px-5 py-5 border-b border-gray-200/60 dark:border-gray-700/40 transition-all duration-200 ${index % 2 === 0
        ? 'bg-white/50 dark:bg-zinc-900/40'
        : 'bg-slate-100/40 dark:bg-zinc-800/40'
        } hover:bg-gcg-orange/10 dark:hover:bg-gcg-orange/20 ${rowClickable ? "cursor-pointer" : ""
        }`}
      onClick={handleCardClick}
    >
      {/* Header section with status, ID, and actions */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1 overflow-hidden">
          {selectable && (
            <div className="pt-1">
              <input
                type="checkbox"
                checked={table.selected.includes(row.id)}
                onChange={() => table.toggleSelect(row.id)}
                className="w-4.5 h-4.5 text-gcg-orange bg-gray-100 border-gray-300 rounded-md focus:ring-gcg-orange focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-all cursor-pointer"
              />
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-hidden">
            {primaryColumns.map((col) => {
              const value = getNestedValue(row, col.accessor);
              const displayValue = processColumnValue(col, value);
              return (
                <div key={col.accessor} className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">
                    {col.Header || col.accessor}
                  </span>
                  <div className={`text-base font-bold truncate ${mode === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                    {typeof col.render === "function" ? (
                      col.render(row, value, index)
                    ) : (
                      <span className="truncate block">{displayValue || "-"}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Bucket */}
        <div className="flex items-start gap-1 shrink-0 p-1 rounded-xl">
          {(() => {
            const visibleActions = actions.filter((action) => {
              if (!action) return false;
              if (typeof action.show === "function" && !action.show(row))
                return false;
              return true;
            });

            // For mobile, we usually show view/edit directly if they exist, and a dropdown for the rest
            const hasStaticActions = !!(onView || onEdit || onDelete);
            const maxVisibleActions = hasStaticActions ? 1 : 2;

            if (visibleActions.length <= maxVisibleActions) {
              return visibleActions.map((action, i) => {
                if (typeof action.render === "function") {
                  return (
                    <React.Fragment key={i}>
                      {action.render(row)}
                    </React.Fragment>
                  );
                }
                const icon = typeof action.icon === "function" ? action.icon(row) : action.icon;
                const isDisabled = typeof action.disabled === "function" ? action.disabled(row) : action.disabled;
                const tooltip = typeof action.tooltip === "function" ? action.tooltip(row) : action.tooltip;

                return (
                  <TooltipIconButton
                    key={i}
                    icon={icon || "solar:question-circle-broken"}
                    label={tooltip || ""}
                    onClick={isDisabled ? undefined : (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      action.onClick!(row, e);
                    }}
                    mode={mode}
                    className={`${isDisabled ? "opacity-30" : "hover:bg-gcg-orange/10 dark:hover:bg-blue-400/20 text-slate-600 dark:text-slate-400"} transition-all`}
                    disabled={isDisabled}
                  />
                );
              });
            }

            return (
              <div className="relative" ref={dropdownRef}>
                <TooltipIconButton
                  icon="solar:menu-dots-bold"
                  label="Actions"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  mode={mode}
                  className="text-slate-500 dark:text-slate-400 hover:bg-gcg-orange/10 dark:hover:bg-blue-400/20"
                />
                {showDropdown && (
                  <div className="absolute right-0 top-10 z-[100] min-w-[180px] rounded-2xl shadow-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-1.5 overflow-hidden">
                    {visibleActions.map((action, i) => {
                      const label = typeof action.label === "function" ? action.label(row) : action.label;
                      const icon = typeof action.icon === "function" ? action.icon(row) : action.icon;
                      const isDisabled = typeof action.disabled === "function" ? action.disabled(row) : action.disabled;

                      return (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isDisabled) action.onClick!(row, e);
                            setShowDropdown(false);
                          }}
                          disabled={isDisabled}
                          className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-xl transition-all ${isDisabled ? "opacity-40" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                        >
                          <Icon icon={icon || "solar:question-circle-broken"} className="w-5 h-5 opacity-70" />
                          {label || 'Action'}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="h-6 w-[1px] bg-slate-400/20 mx-0.5 my-auto" />

          {onView && (
            <TooltipIconButton
              icon="solar:eye-broken"
              label="View"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onView(row); }}
              mode={mode}
              className="text-gcg-orange dark:text-blue-400 hover:bg-gcg-orange/10 dark:hover:bg-blue-400/20 transition-all"
            />
          )}
          {onEdit && (
            <TooltipIconButton
              icon="solar:pen-2-broken"
              label="Edit"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(row); }}
              mode={mode}
              className="text-gcg-orange dark:text-blue-400 hover:bg-gcg-orange/10 dark:hover:bg-blue-400/20 transition-all"
            />
          )}
          {onDelete && (
            <TooltipIconButton
              icon="solar:trash-bin-trash-broken"
              label="Delete"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteAction(row); }}
              mode={mode}
              className="text-red-500 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/20 transition-all"
            />
          )}
        </div>
      </div>

      {/* Secondary columns in an improved grid layout */}
      {secondaryColumns.length > 0 && (
        <div className="grid grid-cols-2 gap-4 pl-7">
          {secondaryColumns.map((col) => {
            const value = getNestedValue(row, col.accessor);
            const displayValue = processColumnValue(col, value);
            return (
              <div key={col.accessor} className="min-w-0">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">
                  {col.Header || col.accessor}
                </span>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
                  {typeof col.render === "function" ? (
                    col.render(row, value, index)
                  ) : (
                    <span>{displayValue || "-"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileCard;