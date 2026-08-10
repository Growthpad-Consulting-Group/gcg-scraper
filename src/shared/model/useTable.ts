'use client';

/**
 * Enhanced useTable hook for table management with sorting, filtering, and pagination
 */

import { useState, useMemo, useEffect } from "react";
import { getNestedValue } from "@/utils/tableHelpers";

export interface UseTableOptions<T = any> {
  onSelectionChange?: ((selected: string[]) => void) | null;
  customFilter?: ((row: T, searchTerm: string) => boolean) | null;
}

export interface UseTableReturn<T = any> {
  paged: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  sortKey: string | null;
  sortDir: "asc" | "desc";
  selected: string[];
  searchTerm: string;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  handleSort: (key: string) => void;
  handlePage: (newPage: number) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  setSearchTerm: (term: string) => void;
  totalItems: number;
  filteredData: T[];
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  isMobile: boolean;
  isTablet: boolean;
  clearSelection: () => void;
}

export function useTable<T extends { id: string;[key: string]: any }>(
  data: T[],
  initialPageSize = 10,
  statusOptions: string[] | Array<{ value: string; label: string }> | null = null,
  options: UseTableOptions<T> = {}
): UseTableReturn<T> {
  const { onSelectionChange, customFilter } = options || {};
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTermRaw] = useState<string>("");

  // Reset to page 1 whenever the search term changes
  const setSearchTerm = (term: string) => {
    setSearchTermRaw(term);
    setPage(1);
  };
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isTablet, setIsTablet] = useState<boolean>(false);

  // Check device type
  useEffect(() => {
    const checkDeviceType = (): void => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1280);
    };

    checkDeviceType();
    window.addEventListener("resize", checkDeviceType);
    return () => window.removeEventListener("resize", checkDeviceType);
  }, []);

  // Optimized filtering with memoized search terms
  const searchTermLower = useMemo(
    () => searchTerm?.toLowerCase() || "",
    [searchTerm]
  );

  // Combined filtering and sorting for maximum performance
  const processedData = useMemo(() => {
    if (!data.length) return [];

    // 1. Filter
    let result = data;

    if (typeof customFilter === "function") {
      result = result.filter((row) => customFilter(row, searchTerm));
    }

    if (statusFilter && statusFilter !== "all" && statusOptions) {
      result = result.filter((row) => row.status === statusFilter);
    }

    if (sortBy === "last_month") {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      result = result.filter(
        (row) => row.created_at && new Date(row.created_at) >= lastMonth
      );
    } else if (sortBy === "last_7_days") {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(
        (row) => row.created_at && new Date(row.created_at) >= last7Days
      );
    }

    if (searchTermLower) {
      const commonFields = [
        "title", "name", "full_name", "business_name", "headline",
        "description", "url", "source", "keyword", "email", "phone",
        "company", "current_company", "category", "status", "buyer",
        "reference", "job_id", "id",
      ];

      const deepSearch = (obj: any, term: string, depth = 0): boolean => {
        if (depth > 3) return false; // Safety limit
        if (!obj) return false;

        if (typeof obj === "string") {
          return obj.toLowerCase().includes(term);
        }

        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            if (deepSearch(obj[i], term, depth + 1)) return true;
          }
          return false;
        }

        if (typeof obj === "object") {
          const values = Object.values(obj);
          for (let i = 0; i < values.length; i++) {
            if (deepSearch(values[i], term, depth + 1)) return true;
          }
          return false;
        }

        return String(obj).toLowerCase().includes(term);
      };

      result = result.filter((row) => {
        for (const field of commonFields) {
          const value = row[field];
          if (value !== undefined && value !== null && String(value).toLowerCase().includes(searchTermLower)) {
            return true;
          }
        }

        // Only do deep search if common fields don't match
        return deepSearch(row, searchTermLower);
      });
    }

    // 2. Initial Sort
    if (sortBy === "recent") {
      const getDate = (item: any) => item.created_at || item.scraped_at || item.last_run || item.last_scraped_at || 0;
      result = [...result].sort(
        (a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()
      );
    } else if (sortBy === "asc") {
      result = [...result].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    } else if (sortBy === "desc") {
      result = [...result].sort((a, b) =>
        (b.name || "").localeCompare(a.name || "")
      ).reverse();
    }

    // 3. Column Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aValue: any = getNestedValue(a, sortKey);
        let bValue: any = getNestedValue(b, sortKey);

        if (aValue === null || aValue === undefined) aValue = "";
        if (bValue === null || bValue === undefined) bValue = "";

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDir === "asc" ? aValue - bValue : bValue - aValue;
        }

        if (aValue instanceof Date && bValue instanceof Date) {
          return sortDir === "asc" ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
        }

        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, searchTermLower, statusFilter, sortBy, statusOptions, customFilter, sortKey, sortDir]);

  const totalPages =
    pageSize === -1 ? 1 : Math.ceil(processedData.length / pageSize);
  const paged =
    pageSize === -1
      ? processedData
      : processedData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string): void => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handlePage = (newPage: number): void => {
    setPage(Math.max(1, Math.min(totalPages, newPage)));
  };

  const toggleSelect = (id: string): void => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = (): void => {
    setSelected(
      selected.length === paged.length ? [] : paged.map((row) => row.id)
    );
  };

  useEffect(() => {
    if (typeof onSelectionChange === "function") {
      onSelectionChange(selected);
    }
  }, [selected, onSelectionChange]);

  const clearSelection = (): void => {
    setSelected([]);
  };

  return {
    paged,
    page,
    pageSize,
    totalPages,
    sortKey,
    sortDir,
    selected,
    searchTerm,
    setPage,
    setPageSize,
    handleSort,
    handlePage,
    toggleSelect,
    selectAll,
    setSearchTerm,
    totalItems: processedData.length,
    filteredData: processedData,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    isMobile,
    isTablet,
    clearSelection,
  };
}

export default useTable;
