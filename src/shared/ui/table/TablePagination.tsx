import React from "react";
import { Icon } from "@iconify/react";
import Select from "react-select";
import { getSelectStyles } from "@/utils/selectStyles";
import { pageSizeOptions } from "./SelectComponents";

// Safe document access for SSR
const getPortalTarget = () => typeof document !== 'undefined' ? document.body : undefined;

interface TableState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  setPageSize: (size: number) => void;
  handlePage: (page: number) => void;
}

interface TablePaginationProps {
  mode: "light" | "dark";
  table: TableState;
  // Server-side pagination props
  serverSidePagination?: boolean;
  totalRecords?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  mode,
  table,
  serverSidePagination = false,
  totalRecords = 0,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onPageSizeChange
}) => {
  // Use server-side values if in server-side mode, otherwise use table state
  const isServerSide = serverSidePagination && onPageChange;
  const activePage = isServerSide ? currentPage : table.page;
  const activePageSize = isServerSide ? pageSize : table.pageSize;
  const activeTotalItems = isServerSide ? totalRecords : table.totalItems;
  const activeTotalPages = isServerSide
    ? Math.ceil(totalRecords / pageSize)
    : table.totalPages;

  const handlePageChange = (newPage: number) => {
    if (isServerSide && onPageChange) {
      onPageChange(newPage);
    } else {
      table.handlePage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (isServerSide && onPageSizeChange) {
      // Reset to page 1 when page size changes
      onPageSizeChange(newSize);
    } else {
      table.setPageSize(newSize);
    }
  };

  return (
    <div className="px-3 sm:px-6 py-4 border shadow-xl shadow-slate-200/50 dark:shadow-black/20 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm ${
            mode === "dark" ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <div className="text-center sm:text-left">
            {activePageSize === -1 ? (
              <>
                Showing{" "}
                <span className="font-medium">all {activeTotalItems}</span>{" "}
                results
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-medium">
                  {(activePage - 1) * activePageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(activePage * activePageSize, activeTotalItems)}
                </span>{" "}
                of <span className="font-medium">{activeTotalItems}</span>{" "}
                results
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Show:</span>
            <div className="w-20">
              <Select
                value={{
                  value: activePageSize,
                  label:
                    activePageSize === -1 ? "All" : activePageSize.toString(),
                }}
                onChange={(selectedOption) => {
                  if (isServerSide) {
                    handlePageSizeChange(Number(selectedOption?.value));
                  } else {
                    table.setPageSize(Number(selectedOption?.value));
                  }
                }}
                options={pageSizeOptions}
                isClearable={false}
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (provided, state) => ({
                    ...getSelectStyles<any>(mode).control!(provided, state),
                    minHeight: "32px",
                    fontSize: "12px",
                  }),
                  option: (provided, state) => ({
                    ...getSelectStyles<any>(mode).option!(provided, state),
                    fontSize: "12px",
                    padding: "4px 8px",
                  }),
                  singleValue: (provided) => {
                    const baseStyles = getSelectStyles<any>(mode).singleValue as any;
                    return {
                      ...(baseStyles ? baseStyles(provided) : provided),
                      fontSize: "12px",
                    };
                  },
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  menu: (base, state) => ({
                    ...(getSelectStyles<any>(mode).menu
                      ? getSelectStyles<any>(mode).menu!(base, state)
                      : base),
                    zIndex: 9999,
                  }),
                }}
                menuPortalTarget={getPortalTarget()}
                menuPosition="fixed"
                menuPlacement="auto"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap justify-center gap-1 sm:gap-2">
          <button
            onClick={() => handlePageChange(activePage - 1)}
            disabled={activePage === 1}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Icon
              icon="solar:alt-arrow-left-broken"
              className="w-3 h-3 sm:w-4 sm:h-4"
            />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, activeTotalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                    activePage === pageNum
                      ? "bg-gcg-orange text-white shadow-sm"
                      : `${
                          mode === "dark"
                            ? "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        } border`
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(activePage + 1)}
            disabled={activePage === activeTotalPages}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="hidden sm:inline">Next</span>
            <Icon
              icon="solar:alt-arrow-right-broken"
              className="w-3 h-3 sm:w-4 sm:h-4"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;