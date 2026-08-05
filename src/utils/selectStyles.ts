import { StylesConfig, GroupBase } from 'react-select';

/**
 * Shared React Select styles for consistent look and feel across the application.
 * Supports both light and dark modes and uses brand colors.
 *
 * Brand Colors:
 * - gcg-orange / brand primary: #f05d23 (orange)
 * - gcg-orange-dark / hover:    #ff7a45 (lighter orange)
 */

export type ThemeMode = 'light' | 'dark';

export interface SelectOption {
  value: string | number;
  label: string;
  [key: string]: any;
}

/**
 * Utility function to safely extract string value from SelectOption
 * @param option - The selected option from React Select
 * @returns String value or empty string if null/undefined
 */
export const getSelectValue = (option: SelectOption | null): string => {
  return option?.value ? String(option.value) : "";
};

/**
 * Utility function to safely extract number value from SelectOption
 * @param option - The selected option from React Select
 * @returns Number value or 0 if null/undefined/NaN
 */
export const getSelectNumberValue = (option: SelectOption | null): number => {
  if (!option?.value) return 0;
  const num = Number(option.value);
  return isNaN(num) ? 0 : num;
};

/**
 * Get React Select styles for consistent theming
 * @param mode - Current theme mode ('light' or 'dark')
 * @returns React Select styles object
 */
// NOTE: intentionally typed as `any` at the call sites (see below), not here. react-select's
// StylesConfig callbacks are contravariant in Option, so returning a generic or widened type
// from this function trips TS's strict function-type checks (or corrupts isMulti inference)
// at nearly every call site, since each caller's <Select> uses a different Option shape.
// Keeping this function's own declared type close to the original generic form, and letting
// each consumer spread the result with `styles={{ ...getSelectStyles(mode) } as any}`,
// isolates the loosening to the assignment rather than polluting react-select's
// isMulti/Option generic inference.
export const getSelectStyles = <
  Option = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(
  mode: ThemeMode = 'light'
): StylesConfig<Option, IsMulti, Group> => {
  const isDark = mode === 'dark';
  const textColor = isDark ? '#F1F5F9' : '#1e293b'; // slate-100 : slate-800
  const borderColor = isDark ? '#1e293b' : '#f1f5f9'; // slate-800 : slate-100
  const hoverBorderColor = isDark ? '#334155' : '#cbd5e1'; // slate-700 : slate-300
  const focusBorderColor = '#f05d23'; // gcg-orange
  const placeholderColor = isDark ? '#475569' : '#94a3b8'; // slate-600 : slate-400
  const optionHoverBg = isDark ? '#1e293b' : '#f8fafc'; // slate-800 : slate-50
  const optionSelectedBg = isDark ? '#d94f1e' : '#f05d23'; // lighter navy in dark mode, gcg-orange in light
  const optionSelectedColor = 'white';

  return {
    control: (provided, state) => ({
      ...provided,
      minHeight: '52px',
      fontSize: '14px',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderColor: state.isFocused ? focusBorderColor : borderColor,
      borderWidth: '1px',
      borderRadius: '1rem',
      boxShadow: 'none',
      '&:hover': {
        borderColor: state.isFocused ? focusBorderColor : hoverBorderColor,
      },
      transition: 'all 0.3s ease',
      fontWeight: '600',
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize: '14px',
      padding: '12px 16px',
      backgroundColor: state.isSelected
        ? optionSelectedBg
        : state.isFocused
          ? optionHoverBg
          : 'transparent',
      color: state.isSelected ? optionSelectedColor : textColor,
      '&:active': {
        backgroundColor: isDark ? '#334155' : '#d94f1e',
      },
      cursor: 'pointer',
      fontWeight: state.isSelected ? '700' : '600',
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 20000,
      backgroundColor: isDark ? '#0f172a' : 'white',
      border: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
      borderRadius: '1.25rem',
      boxShadow: isDark
        ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      padding: '8px',
      overflow: 'hidden',
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 20000,
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '250px',
      padding: '0',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: placeholderColor,
      fontSize: '14px',
      fontWeight: '600',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: textColor,
      fontSize: '14px',
      fontWeight: '600',
    }),
    input: (provided) => ({
      ...provided,
      color: textColor,
      fontSize: '14px',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: placeholderColor,
      '&:hover': {
        color: isDark ? '#cbd5e1' : '#f05d23',
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: placeholderColor,
      '&:hover': {
        color: isDark ? '#cbd5e1' : '#f05d23',
      },
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    loadingIndicator: (provided) => ({
      ...provided,
      color: placeholderColor,
    }),
    groupHeading: (provided) => ({
      ...provided,
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: isDark ? '#64748b' : '#94a3b8',
      padding: '8px 16px 4px',
      marginBottom: '2px',
    }),
    group: (provided) => ({
      ...provided,
      paddingTop: '4px',
      paddingBottom: '4px',
      borderTop: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
      '&:first-of-type': {
        borderTop: 'none',
      },
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: placeholderColor,
      fontSize: '14px',
      fontWeight: '600',
      padding: '20px',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderRadius: '0.5rem',
      padding: '2px 4px',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: textColor,
      fontWeight: '700',
      fontSize: '12px',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: placeholderColor,
      '&:hover': {
        backgroundColor: isDark ? '#334155' : '#d94f1e',
        color: 'white',
      },
    }),
  };
};

// Default export for backward compatibility
export default getSelectStyles;