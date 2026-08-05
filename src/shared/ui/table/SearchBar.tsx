import React from "react";
import { Icon } from "@iconify/react";

interface SearchBarProps {
  mode: "light" | "dark";
  searchable: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  mode, 
  searchable, 
  searchTerm, 
  setSearchTerm, 
  onAddNew, 
  addNewLabel 
}) => {
  if (!searchable) return null;

  return (
    <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
      <div className="relative w-full sm:w-56 md:w-64">
        <Icon
          icon="solar:magnifer-broken"
          className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            mode === "dark" ? "text-gray-400" : "text-gray-400"
          }`}
        />
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
            mode === "dark"
              ? "border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400"
              : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
          }`}
        />
      </div>
      {onAddNew && (
        <button
          onClick={onAddNew}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gcg-orange text-white rounded-lg hover:bg-gcg-orange-dark transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
        >
          <Icon icon="solar:add-circle-broken" className="w-3 h-3 sm:w-4 sm:h-4" />
          {addNewLabel}
        </button>
      )}
    </div>
  );
};

export default SearchBar;