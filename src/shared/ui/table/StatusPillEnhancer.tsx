'use client';

import React, { useMemo } from "react";
import StatusPill from "@/shared/ui/StatusPill";
import { getAutoStatusContext } from "./TableUtils";

// Status column patterns for automatic detection
export const DEFAULT_STATUS_PATTERNS = [
  "status",
  "state",
  "condition",
  "health",
  "run_status",
  "job_status",
  "scrape_status",
  "task_status",
  "user_status",
  "account_status",
  "approval_status",
  "verification_status",
  "completion_status",
  "progress_status",
];

interface Column {
  accessor: string;
  Header?: string;
  render?: (row: any, value?: any) => React.ReactNode;
}

interface UseStatusPillEnhancerProps {
  columns: Column[];
  enableStatusPills: boolean;
  statusContext?: string;
  statusColumnPatterns?: string[];
  statusPillSize?: "sm" | "md" | "lg";
  statusPillVariant?: string;
  customStatusContexts?: Record<string, string>;
  data?: any[];
}

// Hook to enhance columns with automatic status pill rendering
export const useStatusPillEnhancer = ({
  columns,
  enableStatusPills,
  statusContext,
  statusColumnPatterns = DEFAULT_STATUS_PATTERNS,
  statusPillSize = "sm",
  statusPillVariant = "default",
  customStatusContexts = {},
  data = []
}: UseStatusPillEnhancerProps) => {
  return useMemo(() => {
    if (!enableStatusPills) return columns;

    return columns.map((column) => {
      // Check if this column should be treated as a status column
      const isStatusColumn = statusColumnPatterns.some(
        (pattern) =>
          column.accessor.toLowerCase().includes(pattern.toLowerCase()) ||
          (column.Header &&
            column.Header.toLowerCase().includes(pattern.toLowerCase()))
      );

      // If it's a status column and doesn't already have a custom render function
      if (isStatusColumn && !column.render) {
        // Auto-detect the best context based on column name and data
        const autoContext = getAutoStatusContext(column, data, customStatusContexts, statusContext);

        return {
          ...column,
          render: (row: any) => {
            const value = (row as any)[column.accessor];
            // Preprocess status values for better handling
            let processedStatus = value;

            // Handle null, undefined, empty, and "N/A" variations
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
              />
            );
          },
        };
      }

      return column;
    });
  }, [
    columns,
    enableStatusPills,
    statusContext,
    statusColumnPatterns,
    data,
    statusPillSize,
    statusPillVariant,
    customStatusContexts,
  ]);
};