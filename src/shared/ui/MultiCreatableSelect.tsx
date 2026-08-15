"use client";

import CreatableSelect from "react-select/creatable";
import { Icon } from "@iconify/react";
import { getSelectStyles } from "@/utils/selectStyles";

type Option = { label: string; value: string };

/** Multi-select that lets the user pick from existing options or type a new one — used for
 * scheduler keywords/countries so they follow the same react-select pattern as CountrySelector
 * instead of a bespoke free-text pill input.
 *
 * Selected values render as a separate, height-capped chip list below the control instead of
 * react-select's default inline pills — confirmed live that a task with 228 keywords (GCG's
 * keyword library backstop list) or a dozen literal search queries made the control itself grow
 * to hundreds of pixels tall, since react-select renders every selected value inline by default
 * with no built-in cap. `controlShouldRenderValue={false}` keeps the input row itself always a
 * single compact line regardless of selection count. */
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
    <div>
      <CreatableSelect<Option, true>
        isMulti
        controlShouldRenderValue={false}
        value={value.map((v) => ({ label: v, value: v }))}
        onChange={(selected) => onChange((selected || []).map((s) => s.value))}
        options={selectOptions}
        placeholder={value.length ? `${value.length} selected — type to add more...` : placeholder || "Select or type to add..."}
        isLoading={isLoading}
        styles={getSelectStyles<Option, true>(mode)}
        className="block w-full"
        classNamePrefix="react-select"
      />
      {value.length > 0 && (
        <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-app-border p-2">
          {value.map((v) => (
            <span key={v} className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-sm text-text-hi transition-colors hover:border-brand-500/50 hover:bg-brand-500/5 border border-transparent">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="text-text-lo hover:text-text-hi" aria-label={`Remove ${v}`}>
                <Icon icon="solar:close-circle-broken" width={14} height={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
