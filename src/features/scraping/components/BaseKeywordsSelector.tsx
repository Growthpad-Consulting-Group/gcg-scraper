"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import type { BaseKeyword } from "@/features/scraping/types";

export default function BaseKeywordsSelector({
  baseKeywords,
  setBaseKeywords,
  selectedBaseKeywords,
  setSelectedBaseKeywords,
}: {
  baseKeywords: BaseKeyword[];
  setBaseKeywords?: (updater: (prev: BaseKeyword[]) => BaseKeyword[]) => void;
  selectedBaseKeywords: string[];
  setSelectedBaseKeywords: (keywords: string[]) => void;
  mode: "light" | "dark";
}) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const toggleKeyword = (keyword: string) => {
    if (selectedBaseKeywords.includes(keyword)) {
      setSelectedBaseKeywords(selectedBaseKeywords.filter((kw) => kw !== keyword));
    } else {
      setSelectedBaseKeywords([...selectedBaseKeywords, keyword]);
    }
  };

  const addKeyword = async () => {
    const value = draft.trim();
    if (!value || !setBaseKeywords) return;
    setAdding(true);
    try {
      const res = await fetch("/api/base-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to add "${value}"`);
      const saved: BaseKeyword = data.keyword ?? { id: Date.now(), keyword: value };
      setBaseKeywords((prev) => [...prev, saved]);
      setSelectedBaseKeywords([...selectedBaseKeywords, saved.keyword]);
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
        <span className="text-sm font-medium text-text-hi">Base Keywords</span>
        <span className="font-mono text-[11px] text-text-lo">{selectedBaseKeywords.length} selected</span>
      </div>

      <div className="max-h-40 overflow-y-auto rounded-md border border-app-border">
        {baseKeywords.length === 0 ? (
          <div className="p-3 text-sm text-text-lo">No base keywords yet — add one below.</div>
        ) : (
          baseKeywords.map((keywordObj) => (
            <div
              key={keywordObj.id}
              onClick={() => toggleKeyword(keywordObj.keyword)}
              className={`flex cursor-pointer items-center gap-2 border-b border-app-border px-3 py-2 last:border-b-0 hover:bg-surface-2 ${
                selectedBaseKeywords.includes(keywordObj.keyword) ? "bg-brand-500/10" : ""
              }`}
            >
              <Icon
                icon={selectedBaseKeywords.includes(keywordObj.keyword) ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline"}
                width={16}
                className={selectedBaseKeywords.includes(keywordObj.keyword) ? "text-brand-500" : "text-text-lo"}
              />
              <span className="text-sm text-text-hi">{keywordObj.keyword}</span>
            </div>
          ))
        )}
      </div>

      {setBaseKeywords && (
        <div className="mt-2 flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            placeholder="Add a base keyword…"
            className="h-8 flex-1 rounded-md border border-app-border bg-canvas px-2.5 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
          />
          <button onClick={addKeyword} disabled={adding} className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">
            <Icon icon={adding ? "mdi:loading" : "mdi:plus"} width={16} className={adding ? "animate-spin" : ""} />
          </button>
        </div>
      )}
    </div>
  );
}
