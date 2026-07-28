"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

export default function LeadSearchForm({
  mode,
  isRunning,
  onSubmit,
}: {
  mode: "light" | "dark";
  isRunning: boolean;
  onSubmit: (searchTerm: string, location: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    onSubmit(searchTerm.trim(), location.trim());
  };

  const inputClass = `w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#f05d23] ${
    mode === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-[#231812]"
  }`;

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-6 rounded-xl shadow-md border-t-4 border-[#f05d23] ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}
    >
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-[#f05d23]">
        <Icon icon="mdi:map-marker-radius" width="24" height="24" className="text-[#f05d23]" />
        Find Business Leads (Google Maps)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Business type / search term</label>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="e.g. car dealerships" className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Nairobi, Kenya" className={inputClass} />
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
