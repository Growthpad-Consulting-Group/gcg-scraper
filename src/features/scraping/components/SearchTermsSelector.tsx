"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import type { SearchTerm } from "@/features/scraping/types";

export default function SearchTermsSelector({
  searchTerms,
  setSearchTerms,
  selectedTerms,
  setSelectedTerms,
}: {
  searchTerms: SearchTerm[];
  setSearchTerms?: (updater: (prev: SearchTerm[]) => SearchTerm[]) => void;
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
  mode: "light" | "dark";
}) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const toggleTerm = (term: string) => {
    if (selectedTerms.includes(term)) {
      setSelectedTerms(selectedTerms.filter((t) => t !== term));
    } else {
      setSelectedTerms([...selectedTerms, term]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTerms.length === searchTerms.length) {
      setSelectedTerms([]);
    } else {
      setSelectedTerms(searchTerms.map((t) => t.term));
    }
  };

  const addTerm = async () => {
    const value = draft.trim();
    if (!value || !setSearchTerms) return;
    setAdding(true);
    try {
      const res = await fetch("/api/search-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to add "${value}"`);
      const saved: SearchTerm = data.keyword ?? { id: Date.now(), term: value };
      setSearchTerms((prev) => [...prev, saved]);
      setSelectedTerms([...selectedTerms, saved.term]);
      setDraft("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-text-hi">Search Terms</span>
        <button onClick={toggleSelectAll} className="font-mono text-[11px] uppercase tracking-wide text-brand-500 hover:text-brand-600">
          {selectedTerms.length === searchTerms.length ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="max-h-40 overflow-y-auto rounded-md border border-app-border p-1.5">
        {searchTerms.length === 0 ? (
          <div className="p-2 text-sm text-text-lo">No search terms yet — add one below.</div>
        ) : (
          <div className="flex flex-col">
            {searchTerms.map((term) => (
              <label key={term.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={selectedTerms.includes(term.term)}
                  onChange={() => toggleTerm(term.term)}
                  className="h-4 w-4 accent-brand-500"
                />
                <span className="text-sm text-text-hi">{term.term}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {setSearchTerms && (
        <div className="mt-2 flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTerm()}
            placeholder="Add a search term…"
            className="h-8 flex-1 rounded-md border border-app-border bg-canvas px-2.5 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
          />
          <button onClick={addTerm} disabled={adding} className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">
            <Icon icon={adding ? "mdi:loading" : "mdi:plus"} width={16} className={adding ? "animate-spin" : ""} />
          </button>
        </div>
      )}
    </div>
  );
}
