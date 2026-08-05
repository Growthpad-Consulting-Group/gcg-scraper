import React from "react";
import { Icon } from "@iconify/react";
import { components, OptionProps, SingleValueProps } from "react-select";

export interface OptionData {
  value: string;
  label: string;
  icon?: string;
}

// Custom option component with icons
export const CustomOption: React.FC<OptionProps<OptionData, false>> = (props) => {
  const { data } = props;
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        {data.icon && <Icon icon={data.icon} className="w-4 h-4" />}
        <span>{data.label}</span>
      </div>
    </components.Option>
  );
};

// Custom single value component with icons
export const CustomSingleValue: React.FC<SingleValueProps<OptionData, false>> = (props) => {
  const { data } = props;
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2">
        {data.icon && <Icon icon={data.icon} className="w-4 h-4" />}
        <span>{data.label}</span>
      </div>
    </components.SingleValue>
  );
};

// Sort options with icons (simplified - removed time-based options that overlap with date filter)
export const sortOptions: OptionData[] = [
  { value: "asc", label: "Ascending (A-Z)", icon: "solar:sort-from-top-to-bottom-broken" },
  { value: "desc", label: "Descending (Z-A)", icon: "solar:sort-from-bottom-to-top-broken" }
];

// Page size options
export const pageSizeOptions: Array<{ value: number; label: string }> = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: -1, label: "All" }
];