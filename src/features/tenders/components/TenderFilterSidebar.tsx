"use client";

import { Icon } from "@iconify/react";
import { useMemo } from "react";
import toast from "react-hot-toast";

export default function TenderFilterSidebar({
  tenders,
  mode,
  searchQuery,
  setSearchQuery,
  filterTenderType,
  setFilterTenderType,
  filterLocation,
  setFilterLocation,
  sortConfig,
  setSortConfig,
  showFilters,
  setShowFilters,
  filterClosingSoon,
  setFilterClosingSoon,
  filterOpenTenders,
  setFilterOpenTenders,
  filterClosedTenders,
  setFilterClosedTenders,
  filterDocumentType,
  setFilterDocumentType,
}: {
  tenders: any[];
  mode: "light" | "dark";
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterTenderType: string;
  setFilterTenderType: (v: string) => void;
  filterLocation: string;
  setFilterLocation: (v: string) => void;
  sortConfig: { key: string | null; direction: "asc" | "desc" };
  setSortConfig: (v: { key: string | null; direction: "asc" | "desc" }) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  filterClosingSoon: boolean;
  setFilterClosingSoon: (v: boolean) => void;
  filterOpenTenders: boolean;
  setFilterOpenTenders: (v: boolean) => void;
  filterClosedTenders: boolean;
  setFilterClosedTenders: (v: boolean) => void;
  filterDocumentType: string;
  setFilterDocumentType: (v: string) => void;
}) {
  const tenderTypes = useMemo(() => {
    const typeCounts: Record<string, number> = (tenders || []).reduce((acc: Record<string, number>, tender) => {
      const type = tender.tender_type?.toLowerCase();
      if (type) acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return [
      { type: "all", label: "All Tenders", count: tenders?.length || 0 },
      ...[...new Set((tenders || []).map((t) => t.tender_type?.toLowerCase()).filter(Boolean))].map((type) => ({
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        count: typeCounts[type] || 0,
      })),
    ];
  }, [tenders]);

  const locations = useMemo(() => {
    const uniqueLocations = [...new Set((tenders || []).map((t) => t.location?.toLowerCase()).filter(Boolean))];
    return ["All Locations", ...uniqueLocations.sort()];
  }, [tenders]);

  const documentTypes = ["All Formats", "HTML", "PDF"];

  const tenderTypeColors = useMemo(() => {
    const availableColors = ["text-[#f05d23]", "text-blue-500", "text-green-500", "text-yellow-500", "text-purple-500", "text-pink-500", "text-indigo-500", "text-teal-500"];
    const typeColorMap: Record<string, string> = {};
    let colorIndex = 0;
    (tenders || []).forEach((tender) => {
      const type = tender.tender_type?.toLowerCase?.();
      if (type && !typeColorMap[type]) {
        typeColorMap[type] = availableColors[colorIndex % availableColors.length];
        colorIndex++;
      }
    });
    typeColorMap["all"] = "border-gray-400";
    return typeColorMap;
  }, [tenders]);

  const sortTenders = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
  };

  return (
    <div className={`flex flex-col p-4 rounded-lg shadow-md mb-2 ${mode === "dark" ? "bg-[#101827]" : "bg-white"}`}>
      <h2 className="text-lg font-semibold mb-6 flex items-center border-b pb-2">
        <Icon icon="uiw:copy" className="mr-2" width="20" />
        Tenders
      </h2>

      <div className={`flex items-center p-2 mb-4 rounded-lg border ${mode === "dark" ? "bg-gray-700 border-gray-600" : "bg-transparent border-gray-300"}`}>
        <Icon icon="mdi:magnify" className="text-gray-500 mr-2" width="20" />
        <input type="text" placeholder="Search tenders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent focus:outline-none" />
      </div>

      <div className="mb-4">
        <div
          onClick={() => setShowFilters(!showFilters)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setShowFilters(!showFilters);
          }}
          className={`relative flex items-center justify-between p-2 w-full text-left rounded-lg cursor-pointer ${showFilters ? "bg-blue-500 text-white" : mode === "dark" ? "bg-gray-600 text-gray-200 hover:bg-gray-700" : "text-gray-900 hover:bg-gray-200"}`}
        >
          <div className="relative flex items-center">
            <div className="relative mr-2">
              <Icon icon="mdi:filter" width="20" />
            </div>
            <span className="font-semibold text-lg">{showFilters ? "Hide Filters" : "Show Filters"}</span>
          </div>

          {showFilters && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterTenderType("all");
                setFilterLocation("All Locations");
                setSearchQuery("");
                setFilterClosingSoon(false);
                setFilterOpenTenders(false);
                setFilterClosedTenders(false);
                setFilterDocumentType("All Formats");
                setSortConfig({ key: "closing_date", direction: "asc" });
                toast.success("Filters cleared!");
              }}
              className="ml-4 text-sm underline hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className={`mb-4 pb-4 border-b ${mode === "dark" ? "border-gray-600" : "border-gray-300"}`}>
        {showFilters && (
          <div className="mb-4">
            <div className={`mb-4 pb-4 border-b ${mode === "dark" ? "border-gray-600" : "border-gray-300"}`}>
              <h4 className="text-sm font-semibold mb-2">Sort Options</h4>
              <button
                onClick={() => sortTenders("closing_date")}
                className={`flex items-center p-2 w-full text-left rounded-lg mb-2 ${sortConfig.key === "closing_date" ? "bg-blue-500 text-white" : mode === "dark" ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Icon icon="mdi:sort" className="mr-2" width="20" />
                Sort by Date
              </button>
              <button
                onClick={() => sortTenders("title")}
                className={`flex items-center p-2 w-full text-left rounded-lg ${sortConfig.key === "title" ? "bg-blue-500 text-white" : mode === "dark" ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Icon icon="mdi:sort" className="mr-2" width="20" />
                Sort by Title
              </button>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Filter by Status</h4>
              <label className="flex items-center p-2 rounded-lg cursor-pointer">
                <input type="checkbox" checked={filterOpenTenders} onChange={(e) => setFilterOpenTenders(e.target.checked)} className="mr-2 h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded" />
                <span className="text-sm">Open Tenders</span>
              </label>
              <label className="flex items-center p-2 rounded-lg cursor-pointer">
                <input type="checkbox" checked={filterClosedTenders} onChange={(e) => setFilterClosedTenders(e.target.checked)} className="mr-2 h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded" />
                <span className="text-sm">Closed Tenders</span>
              </label>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Filter by Expiry</h4>
              <label className="flex items-center p-2 rounded-lg cursor-pointer">
                <input type="checkbox" checked={filterClosingSoon} onChange={(e) => setFilterClosingSoon(e.target.checked)} className="mr-2 h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded" />
                <span className="text-sm">Closing Soon</span>
              </label>
            </div>

            <h4 className="text-sm font-semibold mt-4 mb-2">Filter by Document Type</h4>
            <select
              value={filterDocumentType}
              onChange={(e) => setFilterDocumentType(e.target.value)}
              className={`w-full p-2 rounded-lg border ${mode === "dark" ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-white border-gray-300 text-gray-700"} focus:outline-none`}
            >
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <h4 className="text-sm font-semibold mt-4 mb-2">Filter by Location</h4>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className={`w-full p-2 rounded-lg border ${mode === "dark" ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-white border-gray-300 text-gray-700"} focus:outline-none`}
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location.charAt(0).toUpperCase() + location.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={mode === "dark" ? "border-gray-600" : "border-gray-300"}>
        <h3 className="text-lg font-bold mb-4 flex items-center mt-4">
          <Icon icon="bytesize:folder-open" className="mr-2" width="20" />
          Tender Directories
        </h3>
        <ul className="border-b mb-4 pb-4">
          {tenderTypes.map(({ type, label, count }) => (
            <li key={type} className="mb-2">
              <button
                onClick={() => setFilterTenderType(type)}
                className={`flex items-center gap-2 p-2 w-full text-left capitalize rounded-lg ${filterTenderType === type ? "bg-blue-500 text-white" : mode === "dark" ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Icon icon="carbon:diamond-solid" width="16" className={tenderTypeColors[type.toLowerCase()] || "text-gray-400"} />
                {label} ({count})
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
