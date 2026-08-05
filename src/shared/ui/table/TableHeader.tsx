import React from "react";
import { Icon } from "@iconify/react";

import { Column } from "../GenericTable";

interface TableState {
  paged: any[];
  selected: any[];
  sortKey: string | null;
  sortDir: "asc" | "desc";
  selectAll: () => void;
  handleSort: (accessor: string) => void;
}

interface TableHeaderProps {
  mode: "light" | "dark";
  enhancedColumns: Column[];
  table: TableState;
  selectable: boolean;
  actions: any[];
  onEdit?: (row: any) => void;
  onView?: (row: any) => void;
  onDelete?: (row: any) => void;
  stickyHeader?: boolean;
  stickyTopOffset?: string | number;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  mode: _mode,
  enhancedColumns,
  table,
  selectable,
  actions,
  onEdit,
  onView,
  onDelete,
  stickyHeader = true,
  stickyTopOffset = 0
}) => {
  const stickyStyle = stickyHeader ? { top: stickyTopOffset } : {};

  return (
    <thead className="bg-gray-50 dark:bg-gray-800 transition-colors duration-500">
      <tr>
        {selectable && (
          <th
            key="__select__"
            className={`${stickyHeader ? 'sticky z-30' : ''} top-0 left-0 w-12 px-1 sm:px-2 py-3 sm:py-4 text-center bg-gray-50 dark:bg-gray-800 border-r border-slate-200/50 dark:border-gray-700 transition-colors duration-500`}
            style={{ ...stickyStyle }}
          >
            <input
              type="checkbox"
              checked={
                table.paged.length > 0 &&
                table.paged.every((row) =>
                  table.selected.includes(row.id)
                )
              }
              onChange={table.selectAll}
              className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 bg-gray-100 border-gray-300 rounded focus:ring-gray-400/20 focus:ring-4 dark:bg-gray-700 dark:border-gray-600 transition-all cursor-pointer"
            />
          </th>
        )}
        {enhancedColumns.map((col, index) => {
          // Calculate cumulative width for sticky left columns
          let leftOffset = selectable ? 48 : 0; // w-12 is 48px
          if (col.sticky === 'left' || col.sticky === true) {
            for (let i = 0; i < index; i++) {
              const prevCol = enhancedColumns[i];
              if (prevCol.sticky === 'left' || prevCol.sticky === true) {
                // Default to a sensible width if not provided
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
            ? `sticky ${stickySide === 'left' ? 'z-25' : 'z-20'}`
            : "";

          const style: React.CSSProperties = {};
          if (isSticky) {
            if (stickySide === 'left') {
              style.left = leftOffset;
            } else {
              style.right = (actions.length > 0 || onEdit || onView || onDelete) ? 100 : 0; // Simple approximation for actions column
            }
          }
          if (col.width) {
            style.width = col.width;
            style.minWidth = col.width;
          }

          return (
            <th
              key={`${col.accessor}-${index}`}
              className={`${stickyHeader ? 'sticky z-20' : ''} top-0 px-2 sm:px-4 py-3 sm:py-4 ${col.headerClassName || "text-left"
                } bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ${col.sortable !== false
                  ? `cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-white/5`
                  : ""
                } ${col.className || ""} ${stickyClass}`}
              style={{ ...style, ...stickyStyle }}
              onClick={
                col.sortable !== false
                  ? () => table.handleSort(col.accessor)
                  : undefined
              }
            >
              <div
                className={`flex items-center gap-1 sm:gap-2 ${col.headerClassName === "text-center"
                  ? "justify-center"
                  : col.headerClassName === "text-right"
                    ? "justify-end"
                    : "justify-start"
                  }`}
              >
                <span className="truncate">
                  {col.Header
                    ? typeof col.Header === "string"
                      ? col.Header.split(" ")
                        .map(
                          (word) =>
                            // Preserve all-caps words (acronyms like COGS, VAT, ID)
                            word === word.toUpperCase()
                              ? word
                              : word.charAt(0).toUpperCase() +
                                word.slice(1).toLowerCase()
                        )
                        .join(" ")
                      : col.Header
                    : ""}
                </span>
                {col.sortable !== false && (
                  <div className="flex flex-col shrink-0">
                    <Icon
                      icon="solar:alt-arrow-up-broken"
                      className={`w-2 h-2 sm:w-3 sm:h-3 ${table.sortKey === col.accessor &&
                        table.sortDir === "asc"
                        ? "text-gray-700 dark:text-gray-200"
                        : "text-gray-400 dark:text-gray-600"
                        }`}
                    />
                    <Icon
                      icon="solar:alt-arrow-down-broken"
                      className={`w-2 h-2 sm:w-3 sm:h-3 -mt-0.5 sm:-mt-1 ${table.sortKey === col.accessor &&
                        table.sortDir === "desc"
                        ? "text-gray-700 dark:text-gray-200"
                        : "text-gray-400 dark:text-gray-600"
                        }`}
                    />
                  </div>
                )}
              </div>
            </th>
          );
        })}
        {/* Only render actions column if needed */}
        {(actions.length > 0 || onEdit || onView || onDelete) && (
          <th
            className={`${stickyHeader ? 'sticky z-20' : ''} top-0 right-0 px-2 sm:px-4 py-3 sm:py-4 text-left bg-gray-50 dark:bg-gray-800 text-slate-500 dark:text-gray-400 shrink-0`}
            style={{ ...stickyStyle }}
          >
            Actions
          </th>
        )}
      </tr>
    </thead>
  );
};

export default TableHeader;