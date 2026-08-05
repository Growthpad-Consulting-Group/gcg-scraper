import React from "react";
import { Icon } from "@iconify/react";

interface BulkAction {
  label: string;
  icon?: string;
  onClick: (selected: any[]) => void;
  show?: (selected: any[]) => boolean;
  className?: string;
}

interface BulkActionsProps {
  mode: "light" | "dark";
  showBulkBar: boolean;
  selectable: boolean;
  selected: any[];
  bulkActions: BulkAction[];
  onBulkDelete: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ 
  mode, 
  showBulkBar, 
  selectable, 
  selected, 
  bulkActions, 
  onBulkDelete 
}) => {
  if (!showBulkBar || !selectable || selected.length === 0) {
    return null;
  }

  return (
    <div
      className={`px-3 sm:px-6 py-3 border-b ${
        mode === "dark"
          ? "bg-blue-900/20 border-blue-800"
          : "bg-blue-50 border-blue-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <span
          className={`text-xs sm:text-sm font-medium ${
            mode === "dark" ? "text-blue-300" : "text-blue-700"
          }`}
        >
          {selected.length} item
          {selected.length !== 1 ? "s" : ""} selected
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {bulkActions.map((action, index) => {
            if (action.show && !action.show(selected)) return null;
            return (
              <button
                key={index}
                type="button"
                onClick={() => action.onClick(selected)}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                  action.className ||
                  (mode === "dark"
                    ? "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200")
                }`}
              >
                {action.icon && (
                  <Icon icon={action.icon} className="w-3 h-3" />
                )}
                {action.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onBulkDelete}
            className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
              mode === "dark"
                ? "bg-red-900/30 text-red-300 hover:bg-red-900/50"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            <Icon icon="solar:trash-bin-trash-broken" className="w-3 h-3" />
            Delete Selected
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;