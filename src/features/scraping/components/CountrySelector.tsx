"use client";

import { useMemo } from "react";
import Select, { StylesConfig } from "react-select";
import type { Country } from "@/features/scraping/types";

type Option = { label: string; value: string };

export default function CountrySelector({
  countries,
  selectedCountry,
  setSelectedCountry,
  mode,
}: {
  countries: Country[];
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  mode: "light" | "dark";
}) {
  const sortedCountries = useMemo(() => {
    return [...countries]
      .filter((country) => country && country.id && country.country_name)
      .sort((a, b) => a.country_name.localeCompare(b.country_name))
      .map((country) => ({ label: country.country_name, value: country.country_name }));
  }, [countries]);

  const customStyles: StylesConfig<Option, false> = {
    control: (provided) => ({
      ...provided,
      backgroundColor: mode === "dark" ? "#374151" : "#ffffff",
      borderColor: mode === "dark" ? "#4b5563" : "#d1d5db",
      color: mode === "dark" ? "#ffffff" : "#1f2937",
      boxShadow: "none",
    }),
    menu: (provided) => ({ ...provided, backgroundColor: mode === "dark" ? "#374151" : "#ffffff", zIndex: 20 }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#f05d23" : state.isFocused ? (mode === "dark" ? "#4b5563" : "#f3f4f6") : mode === "dark" ? "#374151" : "#ffffff",
      color: state.isSelected ? "#ffffff" : mode === "dark" ? "#ffffff" : "#1f2937",
    }),
    singleValue: (provided) => ({ ...provided, color: mode === "dark" ? "#ffffff" : "#1f2937" }),
    placeholder: (provided) => ({ ...provided, color: mode === "dark" ? "#9ca3af" : "#6b7280" }),
    input: (provided) => ({ ...provided, color: mode === "dark" ? "#ffffff" : "#1f2937" }),
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">Select Country</label>
      <Select<Option>
        value={selectedCountry ? { label: selectedCountry, value: selectedCountry } : null}
        onChange={(selectedOption) => setSelectedCountry(selectedOption ? selectedOption.value : "")}
        options={sortedCountries}
        placeholder="Select a country"
        isSearchable
        isClearable
        styles={customStyles}
        className="block w-full"
        classNamePrefix="react-select"
      />
    </div>
  );
}
