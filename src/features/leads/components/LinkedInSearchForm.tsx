"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

export default function LinkedInSearchForm({
  mode,
  isRunning,
  onSubmit,
}: {
  mode: "light" | "dark";
  isRunning: boolean;
  onSubmit: (searchQuery: string, location: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onSubmit(searchQuery.trim(), location.trim());
  };

  const inputClass = `w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#f05d23] ${
    mode === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-[#231812]"
  }`;

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-6 rounded-xl shadow-md border-t-4 border-[#f05d23] ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}
    >
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-[#f05d23]">
        <Icon icon="mdi:linkedin" width="24" height="24" className="text-[#f05d23]" />
        Find People Leads (LinkedIn)
      </h3>
      <p className={`text-xs mb-4 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
        Searches public LinkedIn profiles only (no login used). Results can be partial or occasionally empty — LinkedIn search coverage varies by query.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Job title / search query</label>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. procurement manager" className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kenya" className={inputClass} />
        </div>
      </div>
      <button
        type="submit"
        disabled={isRunning}
        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
          isRunning ? "bg-gray-500 cursor-not-allowed" : "bg-[#f05d23] hover:bg-[#d04e1e]"
        }`}
      >
        <Icon icon={isRunning ? "mdi:loading" : "mdi:magnify"} className={isRunning ? "animate-spin" : ""} width="24" height="24" />
        {isRunning ? "Searching..." : "Find Leads"}
      </button>
    </form>
  );
}
