import React from 'react';
import { Icon } from '@iconify/react';

// Types
interface FormActionsProps {
  onCancel: () => void;
  onSave?: (e: React.FormEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  mode?: "light" | "dark" | "system";
  saveText?: string;
  cancelText?: string;
  showSave?: boolean;
  variant?: "primary" | "secondary" | "success" | "danger" | "warning";
  saveIcon?: string | null;
  cancelIcon?: string | null;
  size?: "small" | "default" | "large";
  layout?: "horizontal" | "vertical" | "reverse" | "page-footer";
  fullWidth?: boolean;
  saveTooltip?: string | null;
  cancelTooltip?: string | null;
  className?: string;
  [key: string]: any; // For additional props
}

type SizeClasses = {
  [K in "small" | "default" | "large"]: string;
};

type VariantClasses = {
  [K in "primary" | "secondary" | "success" | "danger" | "warning"]: string;
};

type LayoutClasses = {
  [K in "horizontal" | "vertical" | "reverse" | "page-footer"]: string;
};

/**
 * Enhanced FormActions with modern styling and micro-interactions
 * Provides consistent Cancel/Save button pairs across the application
 */
const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  onSave,
  loading = false,
  disabled = false,
  saveText = "Save",
  cancelText = "Cancel",
  showSave = true,
  variant = "primary",
  saveIcon = null,
  cancelIcon = null,
  size = "default",
  layout = "horizontal",
  fullWidth = true,
  saveTooltip = null,
  cancelTooltip = null,
  className = "",
  // ...props - removed unused spread
}) => {
  const isPageFooter = layout === "page-footer";

  const sizeClasses: SizeClasses = {
    small: "px-3 py-1.5 text-xs",
    default: "px-4 py-2 text-sm",
    large: "px-5 py-2.5 text-sm"
  };

  const variantClasses: VariantClasses = {
    primary: "bg-gcg-orange text-white hover:bg-gcg-orange-dark focus:ring-gcg-orange/50",
    secondary: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-300/50",
    success: "bg-gcg-orange text-white hover:bg-gcg-orange-dark focus:ring-gcg-orange/50",
    danger: "border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:ring-red-500/50",
    warning: "border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 focus:ring-amber-500/50",
  };

  const cancelClasses = `
    rounded-lg font-medium border border-gray-200 dark:border-gray-700
    transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700
    focus:ring-gray-300/50
    ${fullWidth ? (isPageFooter ? "w-full sm:w-auto" : "w-full") : ""}
    ${sizeClasses[size]}
  `;

  const saveClasses = `
    rounded-lg font-medium
    transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? (isPageFooter ? "w-full sm:w-auto" : "w-full") : ""}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
  `;

  const layoutClasses: LayoutClasses = {
    horizontal: "grid grid-cols-1 sm:grid-cols-2 gap-3",
    vertical: "flex flex-col gap-3",
    reverse: "grid grid-cols-1 sm:grid-cols-2 gap-3",
    "page-footer": "flex flex-col sm:flex-row sm:justify-end gap-3"
  };

  const createButton = (
    text: string,
    icon: string | null,
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void,
    tooltip: string | null,
    classes: string,
    isLoading: boolean = false,
    buttonDisabled?: boolean
  ): React.ReactNode => {
    const isDisabled = buttonDisabled !== undefined ? buttonDisabled : (loading || isLoading || disabled);
    const buttonElement = (
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className={classes}
      >
        <div className="flex items-center justify-center gap-2">
          {isLoading ? (
            <Icon icon="solar:wheel-angle-broken" className="animate-spin w-4 h-4" />
          ) : icon ? (
            <Icon icon={icon} className="w-4 h-4" />
          ) : null}
          <span>{text}</span>
        </div>
      </button>
    );

    // Wrap with tooltip if provided
    if (tooltip) {
      return (
        <div className="relative group/tooltip">
          {buttonElement}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      );
    }

    return buttonElement;
  };

  // Cancel is only disabled while submitting (loading); never by validation (disabled)
  const cancelButton = createButton(
    cancelText,
    cancelIcon,
    onCancel,
    cancelTooltip,
    cancelClasses,
    false,
    loading // cancel disabled only when loading
  );

  const saveButton = showSave ? createButton(
    saveText,
    saveIcon,
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!loading && typeof onSave === 'function') onSave(e);
    },
    saveTooltip,
    saveClasses,
    loading,
    loading || disabled // save disabled when submitting or validation fails
  ) : <div />; // Empty div to maintain grid layout

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {layout === "reverse" ? (
        <>
          {saveButton}
          {cancelButton}
        </>
      ) : (
        <>
          {cancelButton}
          {saveButton}
        </>
      )}
    </div>
  );
};

export default FormActions;