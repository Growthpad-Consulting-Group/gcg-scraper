import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A generic data row – intentionally loose so callers can pass any record. */
export type DataRow = Record<string, unknown>;

export interface Field {
  label: string;
  key: string;
  icon?: string;
}

export type SortOrder = "none" | "name-asc" | "name-desc";

export type SelectedFields = Record<string, boolean>;

// ---------------------------------------------------------------------------
// Sort data
// ---------------------------------------------------------------------------

export const sortData = <T extends DataRow>(data: T[], sortOrder: SortOrder): T[] => {
  if (sortOrder === "none" || !data || data.length === 0) return data;

  const sorted = [...data];

  switch (sortOrder) {
    case "name-asc":
      return sorted.sort((a, b) => {
        const nameA = String(a.name ?? a.title ?? "").toLowerCase();
        const nameB = String(b.name ?? b.title ?? "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
    case "name-desc":
      return sorted.sort((a, b) => {
        const nameA = String(a.name ?? a.title ?? "").toLowerCase();
        const nameB = String(b.name ?? b.title ?? "").toLowerCase();
        return nameB.localeCompare(nameA);
      });
    default:
      return sorted;
  }
};

// ---------------------------------------------------------------------------
// Format date to DD-MM-YYYY
// ---------------------------------------------------------------------------

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    if (dateString.includes("/")) {
      const [datePart] = dateString.split(",");
      const [day, month, year] = datePart.split("/");
      return `${day}-${month}-${year}`;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

// ---------------------------------------------------------------------------
// Sanitise a single value for spreadsheet/CSV output
// ---------------------------------------------------------------------------

function sanitiseValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value !== "object") return String(value);

  // React internals — skip rendering them
  const obj = value as Record<string, unknown>;
  if (obj.$$typeof || obj._owner || obj.__reactFiber$) {
    return "[React Component]";
  }

  if (Array.isArray(value)) return `Array(${value.length})`;

  if (obj.name) return String(obj.name);

  try {
    return JSON.stringify(value);
  } catch {
    return "[Complex Object]";
  }
}

// ---------------------------------------------------------------------------
// Format row data for export: normalises booleans/dates and flattens every
// value down to a string so the output is always spreadsheet/CSV-safe.
// ---------------------------------------------------------------------------

export const formatRowData = (rows: DataRow[]): DataRow[] => {
  return rows.map((row) => {
    const formatted: DataRow = { ...row };

    if (formatted.is_active !== undefined) {
      formatted.is_active = formatted.is_active ? "Active" : "Inactive";
    }

    for (const dateField of ["created_at", "updated_at", "last_login", "date"] as const) {
      if (formatted[dateField]) {
        formatted[dateField] = formatDate(String(formatted[dateField]));
      }
    }

    // Sanitise all values so the output is always a flat string record
    const safe: DataRow = {};
    for (const [key, value] of Object.entries(formatted)) {
      safe[key] = sanitiseValue(value);
    }

    return safe;
  });
};

// ---------------------------------------------------------------------------
// Validate that at least one field is selected
// ---------------------------------------------------------------------------

export const validateSelectedFields = (selectedFields: SelectedFields): boolean => {
  if (Object.values(selectedFields).every((v) => !v)) {
    toast.error("Please select at least one field to export!");
    return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// Export XLSX file
// ---------------------------------------------------------------------------

export const exportXLSX = async (
  formattedRows: DataRow[],
  fieldsOrder: Field[],
  selectedFields: SelectedFields,
  modalTitle: string | undefined,
  isZReport: boolean
): Promise<void> => {
  if (!validateSelectedFields(selectedFields)) return;

  try {
    const XLSX = await import("xlsx");

    const selectedKeys = fieldsOrder
      .filter((f) => selectedFields[f.key])
      .map((f) => f.key);

    const exportData = formattedRows.map((row) => {
      const filteredRow: Record<string, string> = {};
      selectedKeys.forEach((key) => {
        const field = fieldsOrder.find((f) => f.key === key);
        if (field) {
          filteredRow[field.label] = String(row[key] ?? "");
        }
      });
      return filteredRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet["!cols"] = selectedKeys.map(() => ({ wch: 20 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export Data");

    const date = new Date().toISOString().split("T")[0];
    const filename = isZReport
      ? `report_export_${date}.xlsx`
      : `${modalTitle?.toLowerCase().replace(/\s+/g, "_") ?? "data"}_export_${date}.xlsx`;

    XLSX.writeFile(workbook, filename);
    toast.success("XLSX exported successfully!");
  } catch (error) {
    console.error("XLSX export error:", error);
    toast.error("Failed to export XLSX file");
  }
};
