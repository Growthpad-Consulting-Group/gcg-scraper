'use client';

import { useState, useMemo, useEffect, ReactNode, memo, Fragment, useRef } from "react";
import { Icon } from "@iconify/react";
import { parseISO, isWithinInterval } from "date-fns";
import ExportModal from "./export/ExportModal";
import TooltipIconButton from "@/shared/ui/TooltipIconButton";
import toast from "react-hot-toast";
import StatusPill from "@/shared/ui/StatusPill";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { TableSkeleton } from "@/shared/ui/LoadingStates";

// Import refactored components
import { useTable } from "@/shared/model/useTable";
import { hasColumnData, getAutoStatusContext, getNestedValue } from "./table/TableUtils";
import TableFilters from "./table/TableFilters";
import TableHeader from "./table/TableHeader";
import TableRow from "./table/TableRow";
import MobileCard from "./table/MobileCard";
import TabletCard from "./table/TabletCard";
import TablePagination from "./table/TablePagination";
import GenericEmptyState from '@/shared/ui/EmptyState';
import { useTheme } from "@/shared/contexts/ThemeContext";



// Types
export interface Column<T = any> {
  Header: string;
  accessor: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (row: T, value?: any) => ReactNode;
  Cell?: (props: { value: any, row: { original: T }, column: Column<T> }) => ReactNode;
  type?: string;
  sticky?: "left" | "right" | boolean;
  width?: string | number;
}

export interface Action<T = any> {
  icon: string | ((row: T) => string);
  tooltip: string | ((row: T) => string);
  onClick: (row: T, event?: any) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'info';
  className?: string | ((row: T) => string);
  style?: any | ((row: T) => any);
  show?: (row: T) => boolean;
  render?: (row: T) => ReactNode;
  label?: string | ((row: T) => string);
  disabled?: boolean | ((row: T) => boolean);
}

export interface BulkAction<T = any> {
  icon?: string;
  label: string;
  onClick: (selectedItems: T[]) => void;
  className?: string;
  show?: (selectedItems: T[]) => boolean;
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

export interface DeleteConfirmationProps {
  message?: (item: any) => string;
  title?: string;
  itemType?: string;
  confirmText?: string;
  cancelText?: string;
  warning?: string;
  suppressToast?: boolean;
}

export interface GenericTableProps<T = any> {
  data?: T[];
  columns?: Column<T>[];
  onEdit?: (row: T) => void;
  onView?: (row: T) => void;
  onDelete?: (row: T) => void;
  onDeleteSelected?: (selectedIds: string[]) => void;
  onReorder?: () => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  title?: string;
  emptyMessage?: string;
  selectable?: boolean;
  searchable?: boolean;
  enableDragDrop?: boolean;
  actions?: Action<T>[];
  onImport?: () => void;
  customRowRender?: (row: T, index: number, defaultRow: ReactNode) => ReactNode;
  importType?: string;
  enableDateFilter?: boolean;
  enableSortFilter?: boolean;
  enableRefresh?: boolean;
  onExport?: () => void;
  onRowClick?: (row: T) => void;
  rowClickable?: boolean;
  exportType?: string;
  exportTitle?: string;
  statusOptions?: Array<{ value: string; label: string }> | string[] | null;
  onRefresh?: () => void;
  getFieldsOrder?: () => any[];
  getDefaultFields?: () => Record<string, boolean>;
  mode?: 'light' | 'dark' | 'system';
  hideEmptyColumns?: boolean;
  enableStatusPills?: boolean;
  statusContext?: string;
  canEdit?: boolean;
  statusColumnPatterns?: string[];
  statusPillSize?: 'xs' | 'sm' | 'md' | 'lg';
  statusPillVariant?: string;
  customStatusContexts?: Record<string, any>;
  extraFilters?: ReactNode;
  rightContent?: ReactNode;
  onFilteredDataChange?: (data: any[]) => void;
  allowedDateRanges?: string[];
  customFilter?: ((row: T, searchTerm: string) => boolean) | null;
  statusFilter?: string;
  onStatusFilter?: ((status: string) => void) | null;
  onSelectionChange?: ((selected: string[]) => void) | null;
  showBulkBar?: boolean;
  onClearSelection?: (() => void) | 'clear' | null;
  confirmDelete?: boolean;
  bulkActions?: BulkAction<T>[];
  loading?: boolean;
  deleteConfirmationProps?: DeleteConfirmationProps;
  getRowClassName?: ((row: T) => string) | null;
  // Controlled date range (optional - if provided, disables internal state)
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange) => void;
  // Server-side pagination
  serverSidePagination?: boolean;
  totalRecords?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  showPagination?: boolean;
  showExportButton?: boolean;
  stickyHeader?: boolean;
  stickyTopOffset?: string | number;
  tableMaxHeight?: string | number;
  fullPageHeight?: boolean;
  afterActions?: (row: T) => ReactNode;
}

const DEFAULT_STATUS_PATTERNS = [
  "status", "state", "condition", "health",
  "run_status", "job_status", "scrape_status", "task_status",
  "user_status", "account_status", "approval_status",
  "verification_status", "completion_status", "progress_status",
];

const GenericTableComponent = function GenericTable<T extends { id?: string } = any>({
  data = [],
  columns = [],
  onEdit,
  onView,
  onDelete,
  onAddNew,
  addNewLabel = "Add New",
  title,
  emptyMessage = "No data available",
  selectable = true,
  searchable = true,
  actions = [],
  customRowRender,
  enableDateFilter = true, // Date range filter (Today, Last 7 Days, etc.)
  enableSortFilter = false, // Alphabetical sort dropdown (A-Z, Z-A, Recently Added)
  enableRefresh = false,
  onExport,
  onRowClick,
  rowClickable = false,
  exportType = "default",
  exportTitle,
  statusOptions = null,
  onRefresh,
  getFieldsOrder,
  getDefaultFields,
  hideEmptyColumns = true,
  enableStatusPills = false,
  statusContext = "default",
  canEdit = true,
  statusColumnPatterns = DEFAULT_STATUS_PATTERNS,
  statusPillSize = "sm",
  statusPillVariant = "default",
  customStatusContexts = {},
  extraFilters = null,
  rightContent = null,
  onFilteredDataChange,
  allowedDateRanges,
  customFilter = null,
  statusFilter = "all",
  onStatusFilter = null,
  onSelectionChange = null,
  showBulkBar = true,
  onClearSelection = null,
  confirmDelete = true,
  bulkActions = [],
  loading = false,
  deleteConfirmationProps = {},
  getRowClassName = null,
  // Controlled date range
  dateRange: controlledDateRange,
  onDateRangeChange,
  // Server-side pagination
  serverSidePagination = false,
  totalRecords = 0,
  pageSize = 20,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  searchPlaceholder = "Search...",
  onSearch,
  showPagination = true,
  showExportButton = true,
  stickyHeader,
  stickyTopOffset = "var(--header-height)",
  tableMaxHeight: propTableMaxHeight,
  fullPageHeight = true,
  afterActions,
  onImport,
}: GenericTableProps<T>) {
  const { resolvedMode } = useTheme();
  const displayMode = resolvedMode; // Always use resolvedMode for child components

  // Final table max height calculation
  const tableMaxHeight = useMemo(() => {
    if (propTableMaxHeight) return propTableMaxHeight;
    if (fullPageHeight) return "calc(100vh - var(--header-height) - 180px)"; // Adjust 180px based on title/tabs/etc.
    return undefined;
  }, [propTableMaxHeight, fullPageHeight]);

  // Determine if the header should be sticky based on either explicit prop or height configuration
  const derivedStickyHeader = useMemo(() => {
    if (stickyHeader !== undefined) return stickyHeader;
    // By default, only make header sticky if we're controlling the scrolling container's height
    return !!(fullPageHeight || propTableMaxHeight);
  }, [stickyHeader, fullPageHeight, propTableMaxHeight]);

  // Smart sticky offset: if the container is scrolling (tableMaxHeight is set), top should be 0.
  // If the window is scrolling, top should be the provided/default stickyTopOffset.
  const effectiveStickyTopOffset = useMemo(() => {
    if (tableMaxHeight) return 0;
    return stickyTopOffset;
  }, [tableMaxHeight, stickyTopOffset]);
  // Use a stable initial page size - if server-side, we don't want client-side pagination
  const initialPageSize = useMemo(() => {
    if (serverSidePagination) return -1;
    return pageSize;
  }, [serverSidePagination, pageSize]);

  // State management
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [internalDateRange, setInternalDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
    label: "All Time",
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [serverSearchValue, setServerSearchValue] = useState(''); // tracks input value in server-side mode

  // Use controlled dateRange if provided, otherwise use internal state
  const dateRange = controlledDateRange || internalDateRange;
  const setDateRange = onDateRangeChange || setInternalDateRange;

  // Ensure data is never null or undefined
  const safeData = useMemo(() => {
    return Array.isArray(data) ? data.filter((item) => item != null) : [];
  }, [data]);

  // Filter columns based on data if hideEmptyColumns is enabled
  const filteredColumns = useMemo(() => {
    if (!hideEmptyColumns) return columns;
    return columns.filter((column) =>
      hasColumnData(column.accessor, (row: T) => {
        const value = getNestedValue(row, column.accessor);
        if (column.render) return column.render(row, value);
        if (column.Cell) return column.Cell({ value, row: { original: row }, column });
        return value;
      }, safeData)
    );
  }, [columns, safeData, hideEmptyColumns]);

  // Enhance columns with automatic status pill rendering
  const enhancedColumns = useMemo(() => {
    if (!enableStatusPills) return filteredColumns;

    return filteredColumns.map((column) => {
      const isStatusColumn = statusColumnPatterns.some(
        (pattern) =>
          column.accessor.toLowerCase().includes(pattern.toLowerCase()) ||
          (column.Header &&
            column.Header.toLowerCase().includes(pattern.toLowerCase()))
      );

      if (isStatusColumn && !column.render && !column.Cell) {
        const autoContext = getAutoStatusContext(
          column,
          safeData,
          customStatusContexts,
          statusContext
        );

        return {
          ...column,
          render: (_row: T, value: any) => {
            let processedStatus = value;

            if (value === null || value === undefined || value === "") {
              processedStatus = "n/a";
            } else if (typeof value === "string") {
              const normalizedValue = value.toLowerCase().trim();
              if (
                normalizedValue === "n/a" ||
                normalizedValue === "na" ||
                normalizedValue === "not available" ||
                normalizedValue === "unavailable" ||
                normalizedValue === "none" ||
                normalizedValue === "unknown"
              ) {
                processedStatus = "n/a";
              }
            }

            return (
              <StatusPill
                status={processedStatus}
                context={autoContext || statusContext}
                size={statusPillSize}
                variant={statusPillVariant as any}
                mode={displayMode}
              />
            );
          },
        };
      }

      return column;
    }).map((column, index) => {
      // Default the first column to be sticky if no sticky property is explicitly set on any column
      const hasExplicitSticky = filteredColumns.some(c => c.sticky !== undefined);
      if (index === 0 && !hasExplicitSticky) {
        return { ...column, sticky: true };
      }
      return column;
    });
  }, [
    filteredColumns,
    enableStatusPills,
    statusContext,
    statusColumnPatterns,
    safeData,
    statusPillSize,
    statusPillVariant,
    customStatusContexts,
  ]);

  // Filter data by date range
  const filteredByDate = useMemo(() => {
    if (!enableDateFilter) return safeData;
    const { startDate, endDate } = dateRange;
    if (!startDate || !endDate) return safeData;

    return safeData.filter((row: any) => {
      const dateFields = [
        'created_at', 'updated_at', 'scraped_at', 'published_at',
        'deadline', 'date', 'timestamp',
      ];
      let dateValue = null;

      for (const field of dateFields) {
        if (row[field]) {
          dateValue = row[field];
          break;
        }
      }

      if (!dateValue) return false;

      try {
        let parsedDate: Date;

        if (typeof dateValue === 'string') {
          parsedDate = parseISO(dateValue);
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(dateValue);
          }
        } else if (typeof dateValue === 'number') {
          parsedDate = new Date(dateValue);
        } else if (dateValue instanceof Date) {
          parsedDate = dateValue;
        } else {
          throw new Error('Unsupported date format');
        }

        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date');
        }

        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        return isWithinInterval(parsedDate, { start: startOfDay, end: endOfDay });
      } catch (error) {
        console.warn('Failed to parse date:', dateValue, error);
        return false;
      }
    });
  }, [safeData, dateRange, enableDateFilter]);

  // Use filtered data for table
  const table = useTable(filteredByDate as any, initialPageSize, statusOptions, {
    onSelectionChange,
    customFilter: customFilter as any,
  });

  // Notify parent when the fully-filtered data changes (date + search + status + custom)
  // Use a ref for the callback to avoid it being a dependency (state setters are stable
  // but inline functions from parent renders are not). Compare by reference to avoid
  // firing when filteredData is a new array with the same contents.
  const onFilteredDataChangeRef = useRef(onFilteredDataChange);
  onFilteredDataChangeRef.current = onFilteredDataChange;

  const prevFilteredDataRef = useRef<any[]>([]);
  useEffect(() => {
    if (typeof onFilteredDataChangeRef.current !== 'function') return;
    const prev = prevFilteredDataRef.current;
    const next = table.filteredData;
    // Only fire if the actual data changed (length or identity of first/last item)
    if (
      prev.length !== next.length ||
      prev[0] !== next[0] ||
      prev[prev.length - 1] !== next[next.length - 1]
    ) {
      prevFilteredDataRef.current = next;
      onFilteredDataChangeRef.current(next);
    }
  }, [table.filteredData]);

  // Sync internal page size ONLY if the prop actually changes from the outside
  const lastPageSizeProp = useRef(pageSize);
  useEffect(() => {
    if (pageSize !== lastPageSizeProp.current) {
      table.setPageSize(pageSize);
      lastPageSizeProp.current = pageSize;
    }
  }, [pageSize, table]);

  // Ensure table internal page size is -1 when serverSidePagination is enabled
  useEffect(() => {
    if (serverSidePagination && table.pageSize !== -1) {
      table.setPageSize(-1);
    }
  }, [serverSidePagination, table.pageSize]);

  // Setup effects before loading check
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(table.selected);
    }
  }, [table.selected, onSelectionChange]);

  useEffect(() => {
    if (table.selected.length > 0 && safeData.length < table.selected.length) {
      clearSelection();
    }
  }, [safeData.length]);

  useEffect(() => {
    if (onClearSelection === "clear") {
      clearSelection();
    }
  }, [onClearSelection]);

  // Show loading skeleton if loading is true
  if (loading) {
    return (
      <div
        className="mx-auto rounded-xl shadow-lg border overflow-hidden bg-surface border-app-border"
      >
        {(title || searchable || onAddNew || enableDateFilter) && (
          <div
            className="p-3 sm:p-6 border-b border-app-border bg-surface-2"
          >
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
              {title && (
                <div className="w-48 h-6 bg-gray-200 rounded animate-pulse"></div>
              )}
              <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                {searchable && (
                  <div className="w-full sm:w-56 md:w-64 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                )}
                {statusOptions && (
                  <div className="w-full sm:w-auto md:w-32 h-10 bg-gray-200 rounded-md animate-pulse"></div>
                )}
                {enableSortFilter && (
                  <div className="w-full sm:w-auto md:w-40 h-10 bg-gray-200 rounded-md animate-pulse"></div>
                )}
                {enableDateFilter && (
                  <div className="w-full sm:w-auto h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                )}
                {enableRefresh && (
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                )}
              </div>
              <div className="w-24 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        )}
        <TableSkeleton rows={5} columns={columns.length || 4} />
        <div
          className="px-3 sm:px-6 py-4 border-t bg-surface-2 border-app-border"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const TableBody = "tbody";

  // Delete handlers
  const handleOpenConfirm = (item: any) => {
    setDeleteItem(item);
    setShowConfirmDelete(true);
  };

  const handleCloseConfirm = () => {
    setShowConfirmDelete(false);
    setDeleteItem(null);
  };

  const handleDelete = async () => {
    if (!deleteItem || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteItem);
      if (!deleteConfirmationProps?.suppressToast) {
        toast.success(`${title || "Item"} archived successfully`);
      }

      if (table.selected.includes(deleteItem.id)) {
        const newSelected = table.selected.filter((id: string) => id !== deleteItem.id);
        if (onSelectionChange) {
          onSelectionChange(newSelected);
        }
      }

      handleCloseConfirm();
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error(error.message || "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAction = (row: T) => {
    if (!onDelete) return;

    if (confirmDelete === false) {
      onDelete(row);
      return;
    }

    handleOpenConfirm(row);
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      table.setPage(1);
      table.setSearchTerm("");
      table.setStatusFilter("all");
      table.setSortBy("recent");
      setDateRange({ startDate: null, endDate: null, label: "All Time" });
      table.selected = [];
    }
    toast.success("Table data refreshed successfully!");
  };

  const handleBulkDelete = () => {
    const selectedItems = table?.selected || [];
    if (selectedItems.length === 0 || !onDelete) return;

    const itemToDelete = {
      id: "bulk",
      name: `${selectedItems.length} selected item${selectedItems.length > 1 ? "s" : ""
        }`,
      selected: [...selectedItems],
    };
    setDeleteItem(itemToDelete);
    setShowConfirmDelete(true);
  };

  const handleBulkDeleteConfirm = async () => {
    const selectedItems = deleteItem?.selected || [];
    if (
      !deleteItem ||
      deleteItem.id !== "bulk" ||
      selectedItems.length === 0 ||
      !onDelete
    ) {
      handleCloseConfirm();
      return;
    }

    try {
      setIsDeleting(true);
      await Promise.all(selectedItems.map((id: string) => onDelete({ id } as T)));
      toast.success(
        `Successfully deleted ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""
        }`
      );

      if (table?.clearSelection) {
        table.clearSelection();
      }
      if (onSelectionChange) {
        onSelectionChange([]);
      }

      handleCloseConfirm();
    } catch (error: any) {
      console.error("Error deleting items:", error);
      toast.error(error.message || "Failed to delete selected items");
    } finally {
      setIsDeleting(false);
    }
  };

  const clearSelection = () => {
    table.clearSelection();
    if (onSelectionChange) {
      onSelectionChange([]);
    }
    if (typeof onClearSelection === "function") {
      onClearSelection();
    }
  };

  return (
    <div
      className="w-full max-w-full rounded-2xl border overflow-visible transition-all duration-500 bg-surface dark:backdrop-blur-xl border-app-border shadow-xl"
      style={{
        // @ts-ignore
        "--select-z-index": "9999",
      }}
    >
      {(title || searchable || onAddNew || enableDateFilter || showExportButton) && (
        <div
          className="px-0 p-4 sm:p-6 border-b transition-colors duration-500 border-app-border"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center  gap-4">
            {/* Left Side - Title */}
            {title && (
              <div className="flex-shrink-0 mb-2 lg:mb-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">
                  {title}
                </h3>
              </div>
            )}

            {/* Toolbar — filters left, actions right */}
            <div className="flex flex-row flex-wrap items-center gap-3 w-full justify-between">

              {/* LEFT: Filters */}
              <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
                <TableFilters
                  mode={displayMode}
                  table={table}
                  statusOptions={statusOptions}
                  onStatusFilter={onStatusFilter || table.setStatusFilter}
                  statusFilter={onStatusFilter ? statusFilter : table.statusFilter}
                  enableSortFilter={enableSortFilter}
                  extraFilters={extraFilters}
                  enableDateFilter={enableDateFilter}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  allowedDateRanges={allowedDateRanges}
                />

              </div>

              {/* RIGHT: Actions */}
              <div className="flex flex-row flex-wrap items-center gap-2 justify-end">
                {searchable && (
                  <div className={`relative group transition-all duration-300 ease-in-out ${isSearchExpanded || table.searchTerm || serverSearchValue ? 'w-full sm:w-56 md:w-64' : 'w-10'}`}>
                    <Icon
                      icon="solar:magnifer-broken"
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10 pointer-events-none transition-colors duration-300 ${isSearchExpanded || table.searchTerm || serverSearchValue ? "text-gray-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600"}`}
                    />
                    <input
                      type="text"
                      placeholder={isSearchExpanded || table.searchTerm || serverSearchValue ? searchPlaceholder : ""}
                      value={serverSidePagination && onSearch ? serverSearchValue : table.searchTerm}
                      onFocus={() => setIsSearchExpanded(true)}
                      onBlur={() => {
                        if (!table.searchTerm && !serverSearchValue) {
                          setIsSearchExpanded(false);
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!serverSidePagination || !onSearch) {
                          table.setSearchTerm(value);
                        } else {
                          setServerSearchValue(value);
                        }
                        if (onSearch) onSearch(value);
                      }}
                      className={`pl-10 py-2 w-full border rounded-lg outline-none transition-all duration-300 ${isSearchExpanded || table.searchTerm
                          ? "pr-8 cursor-text border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                          : "pr-0 cursor-pointer border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800/60 text-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 hover:shadow-sm"
                        }`}
                    />
                    {(isSearchExpanded || table.searchTerm || serverSearchValue) && (table.searchTerm || serverSearchValue) && (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!serverSidePagination || !onSearch) {
                            table.setSearchTerm("");
                          } else {
                            setServerSearchValue("");
                          }
                          if (onSearch) onSearch("");
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-20"
                      >
                        <Icon icon="solar:close-circle-broken" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                {enableRefresh && (
                  <div className="relative group w-10">
                    <TooltipIconButton
                      label="Refresh Data"
                      onClick={handleRefresh}
                      mode={displayMode}
                      className="w-10 h-10 border rounded-lg outline-none transition-all duration-300 cursor-pointer flex items-center justify-center p-0! border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100! dark:hover:bg-gray-700! hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <Icon
                        icon="solar:refresh-broken"
                        className="w-4 h-4 transition-colors duration-300"
                      />
                    </TooltipIconButton>
                  </div>
                )}

                {showExportButton && (
                  <div className="relative group w-10">
                    <TooltipIconButton
                      label="Export Data"
                      mode={displayMode}
                      onClick={() => {
                        if (onExport) {
                          onExport();
                        } else {
                          setShowExportModal(true);
                        }
                      }}
                      className="w-10 h-10 border rounded-lg outline-none transition-all duration-300 cursor-pointer flex items-center justify-center p-0! border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100! dark:hover:bg-gray-700! hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <Icon
                        icon="solar:export-broken"
                        className="w-4 h-4 transition-colors duration-300"
                      />
                    </TooltipIconButton>
                  </div>
                )}

                {onImport && canEdit && (
                  <button
                    onClick={onImport}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm bg-surface border border-app-border text-text-hi rounded-lg hover:bg-surface-2 transition-all duration-200 whitespace-nowrap"
                  >
                    <Icon icon="solar:import-broken" className="w-4 h-4 sm:w-4 sm:h-4" />
                    Import
                  </button>
                )}

                {onAddNew && canEdit && (
                  <button
                    onClick={onAddNew}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm bg-gcg-orange text-white rounded-lg hover:bg-gcg-orange-dark transition-all duration-300 hover:shadow-lg hover:shadow-gcg-orange/20 focus:ring-4 focus:ring-gcg-orange/20 whitespace-nowrap"
                  >
                    <Icon icon="solar:add-circle-broken" className="w-4 h-4 sm:w-4 sm:h-4" />
                    {addNewLabel}
                  </button>
                )}

                {rightContent && (
                  <div className="flex-none">{rightContent}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkBar && selectable && table.selected.length > 0 && (
        <div
          className="px-3 sm:px-6 py-3 border-b bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <span
              className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300"
            >
              {table.selected.length} item
              {table.selected.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Render custom bulk actions */}
              {bulkActions?.filter((action) => {
                const selectedItems = data?.filter((row: any) =>
                  table.selected.includes(row.id)
                ) || [];
                return !action.show || action.show(selectedItems);
              }).map((action, index) => {
                const selectedItems = data?.filter((row: any) =>
                  table.selected.includes(row.id)
                ) || [];

                return (
                  <button
                    key={`bulk-action-${index}-${action.label}`}
                    type="button"
                    onClick={() => action.onClick(selectedItems)}
                    className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${action.className || "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"}`}
                  >
                    {action.icon && <Icon icon={action.icon} className="w-3 h-3" />}
                    {action.label}
                  </button>
                );
              })}

              {onDelete && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  <Icon icon="solar:trash-bin-trash-broken" className="w-3 h-3" />
                  Delete Selected
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {table.isMobile ? (
        <div className="bg-surface">
          {table.paged.length === 0 ? (
            <GenericEmptyState
              icon="solar:magnifer-broken"
              title="No Results Found"
              description={emptyMessage}
              className="py-12"
            />

          ) : (

            (table.paged as any[]).map((row: T, index: number) => (
              <MobileCard
                key={`mobile-${(row as any).id || `row-${index}`}`}
                row={row}
                index={index}
                mode={displayMode}
                enhancedColumns={enhancedColumns}
                selectable={selectable}
                table={table}
                actions={actions}
                onEdit={canEdit ? onEdit : undefined}
                onView={onView ? onView : undefined}
                onDelete={canEdit ? onDelete : undefined}
                handleDeleteAction={handleDeleteAction}
                onRowClick={onRowClick}
                rowClickable={rowClickable}
              />
            ))
          )}
        </div>
      ) : table.isTablet ? (
        <div
          className="overflow-hidden bg-surface"
        >
          {table.paged.length === 0 ? (
            <GenericEmptyState
              icon="solar:magnifer-broken"
              title="No Results Found"
              description={emptyMessage}
              className="py-12"
            />

          ) : (

            (table.paged as any[]).map((row: T, index: number) => (
              <TabletCard
                key={`tablet-${(row as any).id || `row-${index}`}`}
                row={row}
                index={index}
                mode={displayMode}
                enhancedColumns={enhancedColumns}
                selectable={selectable}
                table={table}
                actions={actions}
                onEdit={canEdit ? onEdit : undefined}
                onView={onView}
                onDelete={canEdit ? onDelete : undefined}
                handleDeleteAction={handleDeleteAction}
                onRowClick={onRowClick}
                rowClickable={rowClickable}
              />
            ))
          )}
        </div>
      ) : (
        <div
          className={`w-full ${tableMaxHeight ? 'overflow-auto' : 'overflow-x-auto overflow-y-visible'} scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent`}
          style={tableMaxHeight ? { maxHeight: tableMaxHeight } : {}}
        >
          <table className="min-w-full w-auto border-collapse">
            <colgroup>
              {selectable && <col className="" />}
              {enhancedColumns.map((_col, index) => (
                <col key={index} className="" />
              ))}
              {(actions.length > 0 || onEdit || onView || onDelete) && <col />}
            </colgroup>

            <TableHeader
              mode={displayMode}
              enhancedColumns={enhancedColumns}
              table={table}
              selectable={selectable}
              actions={actions}
              onEdit={canEdit ? onEdit : undefined}
              onView={onView ? onView : undefined}
              onDelete={canEdit ? onDelete : undefined}
              stickyHeader={derivedStickyHeader}
              stickyTopOffset={effectiveStickyTopOffset}
            />

            <TableBody
              className="bg-surface"
            >
              {table.paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      enhancedColumns.length +
                      (selectable ? 1 : 0) +
                      (actions.length > 0 || onEdit || onView || onDelete ? 1 : 0)
                    }
                    className="px-4 py-12"
                  >
                    <GenericEmptyState
                      icon="solar:magnifer-broken"
                      title="No Results Found"
                      description={emptyMessage}
                      className="py-0"
                    />
                  </td>
                </tr>
              ) : (

                (table.paged as any[]).map((row: T, index: number) => {
                  const rowKey = `table-${(row as any).id || `row-${index}`}`;
                  const defaultRow = (
                    <TableRow
                      row={row as any}
                      index={index}
                      mode={displayMode}
                      enhancedColumns={enhancedColumns}
                      selectable={selectable}
                      table={table}
                      actions={actions}
                      onEdit={canEdit ? onEdit : undefined}
                      onView={onView ? onView : undefined}
                      onDelete={canEdit ? onDelete : undefined}
                      handleDeleteAction={handleDeleteAction}
                      getRowClassName={getRowClassName}
                      onRowClick={onRowClick}
                      rowClickable={rowClickable}
                      afterActions={afterActions}
                    />
                  );
                  return customRowRender
                    ? <Fragment key={rowKey}>{customRowRender(row, index, defaultRow)}</Fragment>
                    : <Fragment key={rowKey}>{defaultRow}</Fragment>;
                })
              )}

            </TableBody>
          </table>
        </div>
      )}

      {showPagination && (
        <TablePagination
          mode={displayMode}
          table={table}
          serverSidePagination={serverSidePagination}
          totalRecords={totalRecords}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}

      <ConfirmDeleteModal
        isOpen={showConfirmDelete}
        onClose={handleCloseConfirm}
        onConfirm={
          deleteItem?.id === "bulk" ? handleBulkDeleteConfirm : handleDelete
        }
        itemName={
          deleteConfirmationProps?.message
            ? deleteConfirmationProps.message(deleteItem)
            : deleteItem?.name ||
            deleteItem?.title ||
            (deleteItem?.id === "bulk"
              ? `${table.selected.length} selected items`
              : "this item")
        }
        mode={displayMode}
        itemId={deleteItem?.id}
        itemType={
          deleteItem?.id === "bulk"
            ? "selected items"
            : deleteConfirmationProps?.itemType ||
            (typeof title === "string" ? title.toLowerCase() : "item") ||
            "item"
        }
        productCount={
          deleteItem?.id === "bulk" ? deleteItem?.selected?.length || 0 : 0
        }
        isDeleting={isDeleting}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        users={filteredByDate}
        mode={displayMode}
        type={exportType}
        title={exportTitle ? `Export ${exportTitle} Data` : `Export ${title || "Data"}`}
        getFieldsOrder={getFieldsOrder}
        getDefaultFields={getDefaultFields}
      />
    </div>
  );
};

// memo() erases the generic type parameter. Re-cast so consumers can write
// <GenericTable<MyType> ... /> and get proper column/action inference.
const GenericTable = memo(GenericTableComponent) as typeof GenericTableComponent;
(GenericTable as any).displayName = 'GenericTable';

export default GenericTable;
