import { formatCurrency, formatNumber } from "@/utils/formatters";
import { getNestedValue } from "@/utils/tableHelpers";
export { getNestedValue };
import React from "react";

// Helper function to detect and format monetary values
export const formatDisplayValue = (value: any, columnAccessor?: string, columnHeader?: string): any => {
  if (value === null || value === undefined || value === '') return value;

  const accessor = columnAccessor?.toLowerCase() || '';
  const header = columnHeader?.toLowerCase() || '';

  // Fields that should never be formatted (identifiers, codes, etc.)
  const noFormatPatterns = [
    'code', 'id', 'reference', 'serial', 'slug', 'url'
  ];

  // Check if this field should not be formatted
  const isNoFormatField = noFormatPatterns.some(pattern =>
    accessor.includes(pattern) || header.includes(pattern)
  );

  if (isNoFormatField) {
    return value;
  }

  // Currency field patterns
  const currencyPatterns = [
    'price', 'cost', 'amount', 'total', 'value', 'revenue', 'budget',
    'fee', 'charge',
  ];

  // Check if this is a currency field
  const isCurrencyField = currencyPatterns.some(pattern =>
    accessor.includes(pattern) || header.includes(pattern)
  );

  // Check if value looks like a monetary amount (number > 0.01 or contains decimal)
  const numValue = parseFloat(value);

  // Format as currency if it's a currency field or looks like money
  if (isCurrencyField && !isNaN(numValue)) {
    return formatCurrency(numValue);
  }

  // For other numeric values, add commas but no currency symbol
  if (!isNaN(numValue) && (numValue >= 1000 || String(value).includes('.'))) {
    return formatNumber(numValue, String(value).includes('.') ? 2 : 0);
  }

  return value;
};

interface Column {
  accessor: string;
  Header?: string;
  render?: (row: any) => React.ReactNode;
}

// Function to check if a column has any non-empty data
export const hasColumnData = (accessor: string, render?: (row: any) => React.ReactNode, safeData?: any[]): boolean => {
  if (!safeData || safeData.length === 0) return true; // Show all columns if no data

  return safeData.some((row) => {
    if (render) {
      // For columns with custom render functions, check the rendered value
      const renderedValue = render(row);
      if (React.isValidElement && React.isValidElement(renderedValue)) {
        // For React elements, check if it's not just a dash or empty
        return (
          (renderedValue.props as any).children !== "-" &&
          (renderedValue.props as any).children !== "" &&
          !(renderedValue.props as any).className?.includes("text-gray-400")
        );
      }
      // For date columns, be more lenient - show even if some dates are invalid
      if (
        accessor === "timestamp" ||
        accessor === "created_at" ||
        accessor === "updated_at"
      ) {
        return renderedValue !== "-" && renderedValue !== "";
      }
      return renderedValue !== "-" && renderedValue !== "";
    }

    // For regular columns, check the actual value
    const value = getNestedValue(row, accessor);
    return (
      value !== null && value !== undefined && value !== "" && value !== 0
    );
  });
};

// Function to automatically determine the best status context
export const getAutoStatusContext = (
  column: Column,
  data: any[],
  customStatusContexts: Record<string, string>,
  statusContext?: string
): string | undefined => {
  const columnName = column.accessor.toLowerCase();
  const headerName = column.Header?.toLowerCase() || "";

  // Check custom status contexts first
  if (customStatusContexts[column.accessor]) {
    return customStatusContexts[column.accessor];
  }

  // Check for specific patterns in column names
  if (
    columnName.includes("user") ||
    columnName.includes("account") ||
    headerName.includes("user") ||
    headerName.includes("account")
  ) {
    return "user";
  }

  // Check data patterns to infer context
  if (data.length > 0) {
    const sampleValues = data
      .slice(0, 10)
      .map((row) => getNestedValue(row, column.accessor))
      .filter(Boolean);
    const uniqueValues = [
      ...new Set(sampleValues.map((v) => v.toString().toLowerCase())),
    ];

    // Check for user-related values
    if (
      uniqueValues.some((v) =>
        ["active", "inactive", "suspended", "pending"].includes(v)
      )
    ) {
      return "user";
    }
  }

  // Default fallback
  return statusContext;
};

// Check if a field is a date field
export const isDateField = (accessor: string): boolean => {
  return (
    accessor === "timestamp" ||
    accessor === "created_at" ||
    accessor === "updated_at" ||
    accessor === "deleted_at" ||
    accessor === "date" ||
    accessor === "due_date" ||
    accessor === "expiry_date" ||
    accessor === "published_at" ||
    accessor === "scraped_at" ||
    accessor === "start_date" ||
    accessor === "end_date" ||
    !!accessor && accessor.toLowerCase().includes("date") ||
    !!accessor && accessor.toLowerCase().includes("time")
  );
};

// Format date values
export const formatDateValue = (value: any): any => {
  if (!value) return value;

  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Format as DD/MM/YYYY HH:MM
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
  } catch (e) {
    // Keep original value if date parsing fails
  }
  return value;
};