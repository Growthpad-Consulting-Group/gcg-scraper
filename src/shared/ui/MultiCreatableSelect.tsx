"use client";

import CreatableSelect from "react-select/creatable";
import { getSelectStyles } from "@/utils/selectStyles";

type Option = { label: string; value: string };

/** Multi-select that lets the user pick from existing options or type a new one — used for
 * scheduler keywords/countries so they follow the same react-select pattern as CountrySelector
 * instead of a bespoke free-text pill input. */
export default function MultiCreatableSelect({
  value,
  onChange,
  options,
  placeholder,
  mode,
  isLoading,
}: {
  value: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  mode: "light" | "dark";
  isLoading?: boolean;
}) {
  const selectOptions: Option[] = options.map((o) => ({ label: o, value: o }));

  return (
    <CreatableSelect<Option, true>
      isMulti
      value={value.map((v) => ({ label: v, value: v }))}
      onChange={(selected) => onChange((selected || []).map((s) => s.value))}
      options={selectOptions}
      placeholder={placeholder || "Select or type to add..."}
      isLoading={isLoading}
      styles={getSelectStyles<Option, true>(mode)}
      className="block w-full"
      classNamePrefix="react-select"
    />
  );
}
