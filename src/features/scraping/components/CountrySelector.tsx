"use client";

import { useMemo } from "react";
import Select from "react-select";
import { getSelectStyles, getSelectValue } from "@/utils/selectStyles";
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

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1 text-text-hi">Select Country</label>
      <Select<Option>
        value={selectedCountry ? { label: selectedCountry, value: selectedCountry } : null}
        onChange={(selectedOption) => setSelectedCountry(getSelectValue(selectedOption))}
        options={sortedCountries}
        placeholder="Select a country"
        isSearchable
        isClearable
        styles={getSelectStyles<Option>(mode)}
        className="block w-full"
        classNamePrefix="react-select"
      />
    </div>
  );
}
