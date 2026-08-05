'use client';

import React, { useState, useRef, useEffect, MouseEvent, ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import TooltipIconButton from "@/shared/ui/TooltipIconButton";
import { formatDisplayValue, isDateField, formatDateValue, getNestedValue } from "./TableUtils";
import { Column, Action } from "../GenericTable";

// Types
interface TableInstance {
  selected: string[];
  toggleSelect: (id: string) => void;
}

interface TableRowProps<T = any> {
  row: T & { id: string; name?: string };
  index: number;
  mode: 'light' | 'dark';
  enhancedColumns: Column<T>[];
  selectable: boolean;
  table: TableInstance;
  actions: Action<T>[];
  onEdit?: (row: T) => void;
  onView?: (row: T) => void;
  onDelete?: ((row: T) => void) | null;
  handleDeleteAction: (row: T) => void;
  getRowClassName?: ((row: T) => string) | null;
  onRowClick?: (row: T) => void;
  rowClickable?: boolean;
  afterActions?: (row: T) => ReactNode;
}

const TableRow = <T extends Record<string, any> = any>({
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
  getRowClassName,
  onRowClick,
  rowClickable = false,
  afterActions,
}: TableRowProps<T>): React.ReactElement => {
  // Dropdown state + fixed position coords (avoids overflow clipping)
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute fixed position from trigger button's bounding rect
  const openDropdown = useCallback((e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.right - 200, // min-w-[200px] aligned to right edge of trigger
    });
    setShowDropdown(prev => !prev);
  }, []);

  // Close on outside click or scroll
  useEffect(() => {
    if (!showDropdown) return () => {};

    const close = (e: Event) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    };

    const closeOnScroll = () => setShowDropdown(false);

    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [showDropdown]);

  // Helper to render a table row's cells
  const renderRowCells = () => {
    if (!row) return null;

    return (
      <>
        {selectable && (
          <td className={`sticky left-0 z-10 w-12 px-1 sm:px-2 py-3 sm:py-4 text-center border-r border-slate-200/50 dark:border-slate-800/70 transition-colors duration-200 ${index % 2 === 0
            ? 'bg-white/90 dark:bg-zinc-900/60'
            : 'bg-slate-50/90 dark:bg-zinc-800/50'
            } group-hover:bg-[#e8e9ed]! dark:group-hover:bg-gcg-orange/10!`}>
            <input
              type="checkbox"
              checked={table.selected.includes(row.id)}
              onChange={() => table.toggleSelect(row.id)}
              className="w-3.5 h-3.5 text-gcg-orange bg-slate-100 border-slate-300 rounded focus:ring-gcg-orange/20 focus:ring-4 dark:bg-slate-800 dark:border-slate-700 transition-all cursor-pointer"
            />
          </td>
        )}
        {enhancedColumns.map((col, index) => {
          const value = getNestedValue(row, col.accessor);

          // Calculate cumulative width for sticky left columns
          let leftOffset = selectable ? 48 : 0; // w-12 is 48px
          if (col.sticky === 'left' || col.sticky === true) {
            for (let i = 0; i < index; i++) {
              const prevCol = enhancedColumns[i];
              if (prevCol.sticky === 'left' || prevCol.sticky === true) {
                const width = typeof prevCol.width === 'number'
                  ? prevCol.width
                  : (parseInt(prevCol.width as string) || 150);
                leftOffset += width;
              }
            }
          }

          const isSticky = col.sticky === 'left' || col.sticky === true || col.sticky === 'right';
          const stickySide = (col.sticky === 'right') ? 'right' : 'left';

          const stickyClass = isSticky
            ? `sticky ${stickySide === 'left' ? 'z-10' : 'z-10'} transition-colors duration-200 ${index % 2 === 0
              ? 'bg-white/90 dark:bg-zinc-900/60'
              : 'bg-slate-50/90 dark:bg-zinc-800/50'
            } group-hover:bg-[#e8e9ed]! dark:group-hover:bg-gcg-orange/10!`
            : "";

          const style: React.CSSProperties = {};
          if (isSticky) {
            if (stickySide === 'left') {
              style.left = leftOffset;
            } else {
              style.right = (actions.length > 0 || onEdit || onView || onDelete) ? 100 : 0; // Approximating actions width
            }
          }
          if (col.width) {
            style.width = col.width;
            style.minWidth = col.width;
          }

          const commonClassName = `px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-left ${mode === "dark" ? "text-slate-100" : "text-slate-600"} ${col.className || ""} ${stickyClass}`;

          if (typeof col.render === "function" || typeof col.Cell === "function") {
            return (
              <td
                key={`${row.id}-${col.accessor}`}
                className={`${commonClassName} capitalize`}
                style={style}
              >
                {col.render
                  ? col.render(row, value)
                  : col.Cell?.({ value, row: { original: row }, column: col })}
              </td>
            );
          }

          let displayValue: any = value;

          if (isDateField(col.accessor) && value) {
            displayValue = formatDateValue(value);
          } else {
            displayValue = formatDisplayValue(value, col.accessor, col.Header);
          }

          return (
            <td
              key={`${row.id}-${col.accessor}`}
              className={`${commonClassName} whitespace-nowrap`}
              style={style}
            >
              <div className="truncate">
                {displayValue}
              </div>
            </td>
          );
        })}
        {(actions.length > 0 || onEdit || onView || onDelete) && (
          <td className={`sticky right-0 z-10 px-2 sm:px-4 py-3 sm:py-4 transition-colors duration-200 ${index % 2 === 0
            ? 'bg-white/90 dark:bg-zinc-900/60'
            : 'bg-slate-50/90 dark:bg-zinc-800/50'
            } group-hover:bg-[#e8e9ed]! dark:group-hover:bg-gcg-orange/10!`}>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Custom actions */}
              {(() => {
                // Filter visible actions
                const visibleActions = actions.filter((action) => {
                  if (!action) return false;
                  if (typeof action.show === "function" && !action.show(row))
                    return false;
                  return true;
                });

                // If 4 or fewer actions, show all directly
                if (visibleActions.length <= 4) {
                  return visibleActions.map((action, i) => {
                    if (typeof action.render === "function") {
                      return (
                        <React.Fragment key={`action-render-${row.id}-${action.label || action.tooltip || i}`}>
                          {action.render(row)}
                        </React.Fragment>
                      );
                    }
                    if (typeof action.onClick !== "function") return null;

                    const label =
                      typeof action.label === "function"
                        ? action.label(row)
                        : action.label;
                    const icon =
                      typeof action.icon === "function"
                        ? action.icon(row)
                        : action.icon;
                    const isDisabled =
                      typeof action.disabled === "function"
                        ? action.disabled(row)
                        : action.disabled;
                    const tooltip =
                      typeof action.tooltip === "function"
                        ? action.tooltip(row)
                        : action.tooltip;
                    const actionClassName =
                      typeof action.className === "function"
                        ? action.className(row)
                        : action.className;
                    const actionStyle =
                      typeof action.style === "function"
                        ? action.style(row)
                        : action.style;

                    return (
                      <TooltipIconButton
                        key={`action-${row.id}-${label || i}`}
                        icon={icon || "solar:question-circle-broken"}
                        label={tooltip || label || ""}
                        onClick={
                          isDisabled
                            ? undefined
                            : (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              action.onClick(row, e as any);
                            }
                        }
                        mode={mode}
                        className={`${actionClassName || "text-gcg-orange dark:text-blue-400 hover:bg-gcg-orange/10 dark:hover:bg-blue-400/20"} ${isDisabled ? "opacity-30" : ""} transition-all`}
                        style={actionStyle || {}}
                        disabled={isDisabled}
                      />
                    );
                  });
                }

                // If more than 4 actions, show first 3 and dropdown for rest
                const primaryActions = visibleActions.slice(0, 3);
                const overflowActions = visibleActions.slice(3);

                return (
                  <>
                    {/* Primary actions (first 3) */}
                    {primaryActions.map((action, i) => {
                      if (typeof action.render === "function") {
                        return (
                          <React.Fragment key={`primary-action-render-${row.id}-${action.label || i}`}>
                            {action.render(row)}
                          </React.Fragment>
                        );
                      }
                      if (typeof action.onClick !== "function") return null;

                      const label =
                        typeof action.label === "function"
                          ? action.label(row)
                          : action.label;
                      const icon =
                        typeof action.icon === "function"
                          ? action.icon(row)
                          : action.icon;
                      const isDisabled =
                        typeof action.disabled === "function"
                          ? action.disabled(row)
                          : action.disabled;
                      const tooltip =
                        typeof action.tooltip === "function"
                          ? action.tooltip(row)
                          : action.tooltip;
                      const actionClassName =
                        typeof action.className === "function"
                          ? action.className(row)
                          : action.className;
                      const actionStyle =
                        typeof action.style === "function"
                          ? action.style(row)
                          : action.style;

                      return (
                        <TooltipIconButton
                          key={`primary-action-${row.id}-${label || i}`}
                          icon={icon || "solar:question-circle-broken"}
                          label={tooltip || label || ""}
                          onClick={
                            isDisabled
                              ? undefined
                              : (e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                action.onClick(row, e as any);
                              }
                          }
                          mode={mode}
                          className={`${actionClassName || "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"} ${isDisabled ? "opacity-30" : ""
                            } transition-all`}
                          style={actionStyle || {}}
                          disabled={isDisabled}
                        />
                      );
                    })}

                    {/* Overflow dropdown — rendered as a fixed-position portal to escape overflow:hidden/auto clipping */}
                    {overflowActions.length > 0 && (
                      <div ref={triggerRef}>
                        <TooltipIconButton
                          icon="solar:menu-dots-broken"
                          label="More actions"
                          onClick={openDropdown}
                          mode={mode}
                          className="text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all"
                        />
                        {showDropdown && typeof document !== 'undefined' && createPortal(
                          <div
                            ref={dropdownRef}
                            className={`fixed z-[9999] min-w-[200px] rounded-2xl shadow-2xl shadow-black/40 ring-1 backdrop-blur-3xl overflow-hidden ${
                              mode === "dark"
                                ? "bg-slate-950/80 ring-white/10"
                                : "bg-white/90 ring-black/5"
                            }`}
                            style={{
                              top: dropdownPos.top,
                              left: Math.max(8, dropdownPos.left),
                              backdropFilter: 'blur(32px) saturate(180%)',
                            }}
                          >
                            <div className="p-1.5">
                              {overflowActions.map((action, i) => {
                                if (typeof action.render === "function") {
                                  return (
                                    <div key={`overflow-action-render-${row.id}-${action.label || i}`} className="px-2 py-1">
                                      {action.render(row)}
                                    </div>
                                  );
                                }
                                if (typeof action.onClick !== "function") return null;

                                const label =
                                  typeof action.label === "function"
                                    ? action.label(row)
                                    : action.label;
                                const icon =
                                  typeof action.icon === "function"
                                    ? action.icon(row)
                                    : action.icon;
                                const isDisabled =
                                  typeof action.disabled === "function"
                                    ? action.disabled(row)
                                    : action.disabled;
                                const tooltip =
                                  typeof action.tooltip === "function"
                                    ? action.tooltip(row)
                                    : action.tooltip;

                                return (
                                  <button
                                    key={`overflow-action-${row.id}-${label || i}`}
                                    onClick={(e: React.MouseEvent) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!isDisabled) {
                                        action.onClick(row, e as any);
                                      }
                                      setShowDropdown(false);
                                    }}
                                    disabled={isDisabled}
                                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left rounded-xl transition-all duration-200 ${
                                      isDisabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : mode === "dark"
                                          ? "text-slate-100 hover:bg-white/10 hover:translate-x-1"
                                          : "text-slate-700 hover:bg-black/5 hover:translate-x-1"
                                    }`}
                                  >
                                    <Icon icon={icon || "solar:question-circle-broken"} className="w-4 h-4 shrink-0" />
                                    <span className="flex-1 font-medium">{label || tooltip || 'Action'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
              {/* View/Edit/Delete */}
              {onView && (
                <TooltipIconButton
                  icon="solar:eye-broken"
                  label="View Report"
                  onClick={(e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onView(row);
                  }}
                  mode={mode}
                  className="text-gcg-orange dark:text-blue-400 hover:bg-gcg-orange/10 dark:hover:bg-blue-400/20 transition-all"
                />
              )}
              {onEdit && (
                <TooltipIconButton
                  icon="solar:pen-2-broken"
                  label="Edit"
                  onClick={(e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(row);
                  }}
                  mode={mode}
                  className="text-gcg-orange dark:text-blue-400 hover:bg-gcg-orange/10 dark:hover:bg-blue-400/20 transition-all"
                />
              )}
              {/* Only show delete button if not already in actions array */}
              {onDelete !== null &&
                typeof onDelete === "function" &&
                !actions.some(
                  (action) =>
                    action.icon === "mynaui:trash" ||
                    action.icon === "solar:trash-bin-trash-broken"
                ) && (
                  <TooltipIconButton
                    icon="solar:trash-bin-trash-broken"
                    label="Delete"
                    onClick={(e: MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteAction(row);
                    }}
                    mode={mode}
                    className="text-red-500 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/20 transition-all"
                  />
                )}
              {/* Render afterActions if provided */}
              {afterActions && afterActions(row)}
            </div>
          </td>
        )}
      </>
    );
  };

  // Handle row click
  const handleRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    // Don't trigger row click if clicking on action buttons or checkboxes
    if ((e.target as Element).closest('button') || (e.target as Element).closest('input[type="checkbox"]')) {
      return;
    }

    // Only toggle selection on row click if rowClickable is explicitly enabled
    // This prevents accidental selections when just browsing the table
    if (rowClickable && selectable && table) {
      table.toggleSelect(row.id);
      return;
    }

    // Call custom onRowClick handler if provided
    if (rowClickable && onRowClick) {
      onRowClick(row);
    }
  };

  return (
    <tr
      className={`group transition-all duration-200 border-b border-slate-100 dark:border-slate-800/60 ${index % 2 === 0
        ? 'bg-white/50 dark:bg-zinc-900/40'
        : 'bg-slate-100/40 dark:bg-zinc-800/40'
        } hover:bg-gcg-orange/10 dark:hover:bg-gcg-orange/10 ${rowClickable ? "cursor-pointer" : ""} ${getRowClassName ? getRowClassName(row) : ""} ${showDropdown ? "relative z-60" : ""}`}
      onClick={handleRowClick}
    >
      {renderRowCells()}
    </tr>
  );
};

export default TableRow;