"use client";

import CreatableSelect from "react-select/creatable";
import { getSelectStyles } from "@/utils/selectStyles";

type Option = { value: string; label: string };

/**
 * Styled like the rest of the app's react-select fields (CountrySelector, table filters), but
 * Creatable so it stays free text — location isn't always a bare country (e.g. "Nairobi, Kenya"),
 * it just suggests known countries instead of forcing a browser-native <datalist> dropdown.
 */
export default function LocationInput({
  value,
  onChange,
  countries = [],
  placeholder = "Location (optional)",
  mode,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  countries?: string[];
  placeholder?: string;
  mode?: "light" | "dark";
  className?: string;
}) {
  const options: Option[] = countries.map((c) => ({ value: c, label: c }));
  const baseStyles = getSelectStyles<Option>(mode ?? "light");
  // The shared styles are tuned for GenericTable's larger filter bar — override height/radius to
  // fit this form's compact h-9 inputs instead.
  const compactStyles = {
    ...baseStyles,
    control: (base: any, state: any) => ({ ...(baseStyles.control as any)(base, state), minHeight: "36px", borderRadius: "0.375rem" }),
    menu: (base: any) => ({ ...(baseStyles.menu as any)(base), borderRadius: "0.5rem" }),
    valueContainer: (base: any) => ({ ...base, padding: "0 8px" }),
  } as any;

  return (
    <div className={className}>
      <CreatableSelect<Option>
        value={value ? { value, label: value } : null}
        onChange={(opt) => onChange(opt ? opt.value : "")}
        options={options}
        placeholder={placeholder}
        isClearable
        isSearchable
        formatCreateLabel={(input) => `Use "${input}"`}
        styles={compactStyles}
        classNamePrefix="react-select"
      />
    </div>
  );
}
