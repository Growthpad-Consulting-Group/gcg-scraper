'use client';

import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { ReactNode } from "react";
import Image from "next/image";

interface PageHeaderAction {
  label: string;
  icon?: string;
  iconClass?: string;
  variant?: "primary" | "secondary" | "success";
  onClick: () => void | Promise<void | boolean> | Window;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  tooltip?: string;
}

interface PageHeaderSaveAction {
  onSave: () => void | Promise<void | boolean>;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string | ReactNode;
  icon?: string | ReactNode;
  iconBgColor?: string;
  actions?: PageHeaderAction[];
  saveAction?: PageHeaderSaveAction | null;
  children?: ReactNode;
  tabs?: ReactNode;
  variant?: "simple" | "enhanced";
  className?: string;
  canEdit?: boolean;
}

function PageHeader({
  title,
  description,
  icon,
  iconBgColor = "bg-gray-100 dark:bg-gray-600",
  actions = [],
  saveAction = null,
  children,
  tabs,
  variant = "enhanced",
  className = "",
  canEdit = true,
}: PageHeaderProps) {
  if (variant === "enhanced") {
    return (
      <div className={`mb-6 ${className}`}>
        <div className="relative rounded-2xl border border-app-border bg-surface px-6 py-5 shadow-lg shadow-gray-400/10 transition-all duration-300 ease-in-out">
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left — icon + title + description */}
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`w-11 h-11 ${iconBgColor} rounded-xl flex items-center justify-center shrink-0 overflow-hidden`}>
                  {typeof icon === "string" &&
                  (icon.startsWith("http") ||
                    icon.startsWith("/") ||
                    icon.startsWith("blob:")) ? (
                    <Image
                      src={icon}
                      width={44}
                      height={44}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : typeof icon === "string" ? (
                    <Icon icon={icon} className="w-5 h-5 text-orange-600" />
                  ) : (
                    icon
                  )}
                </div>
              )}
              <div>
                <h1 className="font-display text-xl font-semibold text-text-hi">{title}</h1>
                {description && <div className="text-sm mt-0.5 text-text-lo">{description}</div>}
              </div>
            </div>

            {/* Right — tabs or actions */}
            {(actions.length > 0 || saveAction || children || tabs) && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {tabs}
                {children}
                {saveAction && (
                  <button
                    onClick={() => {
                      const result = saveAction.onSave();
                      if (result instanceof Promise) {
                        toast.promise(result, {
                          loading: "Saving...",
                          success: "Saved successfully!",
                          error: "Failed to save",
                        });
                      }
                    }}
                    disabled={saveAction.disabled || saveAction.loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-brand-500 text-white hover:bg-brand-600"
                  >
                    {saveAction.loading ? (
                      <Icon
                        icon="solar:loading-bold"
                        className="w-4 h-4 animate-spin"
                      />
                    ) : (
                      <Icon
                        icon="solar:check-circle-broken"
                        className="w-4 h-4"
                      />
                    )}
                    {saveAction.label ?? "Save Changes"}
                  </button>
                )}
                {actions
                  .filter(
                    (action) => !(!canEdit && action.variant === "primary"),
                  )
                  .map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (action.label === "Refresh") {
                          const result = action.onClick();
                          if (result instanceof Promise) {
                            toast.promise(result, {
                              loading: "Refreshing data...",
                              success: "Data refreshed!",
                              error: "Failed to refresh",
                            });
                          }
                        } else {
                          action.onClick();
                        }
                      }}
                      disabled={action.disabled}
                      className={
                        action.className ||
                        (action.variant === "primary"
                          ? "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          : "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-app-border bg-surface text-text-hi hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed")
                      }
                    >
                      {action.icon && (
                        <Icon
                          icon={action.icon}
                          className={`w-4 h-4 ${action.iconClass || ""}`}
                        />
                      )}
                      {action.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default PageHeader;
