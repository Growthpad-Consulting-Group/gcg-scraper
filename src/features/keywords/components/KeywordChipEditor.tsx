"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

type KeywordRecord = { id: number | string; created_at?: string; tender_type?: string; [key: string]: any };

/**
 * Type-to-add, click-to-remove chip editor grouped by category (docs/UI_REDESIGN.md §8),
 * replacing the raw list+form table. Optimistic add/delete straight against the keyword API.
 */
export default function KeywordChipEditor({
  title,
  description,
  keywords,
  setKeywords,
  apiEndpoint,
  keywordKey = "keyword",
  additionalFields = [],
  tenderTypeOptions = [],
}: {
  title: string;
  description: string;
  keywords: KeywordRecord[];
  setKeywords: (updater: (prev: KeywordRecord[]) => KeywordRecord[]) => void;
  apiEndpoint: string;
  keywordKey?: string;
  additionalFields?: string[];
  tenderTypeOptions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Record<string | number, boolean>>({});
  const tenderTypes = tenderTypeOptions.length > 0 ? tenderTypeOptions : ["Search Query Tenders"];
  const needsTenderType = additionalFields.includes("tender_type");
  const [draftTenderType, setDraftTenderType] = useState(tenderTypes[0]);

  const submit = async () => {
    const value = draft.trim();
    if (!value) return;
    setDraft("");

    const tempId = Date.now();
    const optimistic: KeywordRecord = {
      id: tempId,
      [keywordKey]: value,
      tender_type: needsTenderType ? draftTenderType : undefined,
      created_at: new Date().toISOString(),
    };
    setKeywords((prev) => [...prev, optimistic]);
    setPending((prev) => ({ ...prev, [tempId]: true }));

    const payload: Record<string, string> = { [keywordKey]: value };
    if (needsTenderType) payload.tender_type = draftTenderType;

    try {
      const res = await fetch(apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to add "${value}"`);
      const saved = data.keyword ?? data;
      setKeywords((prev) => prev.map((k) => (k.id === tempId ? saved : k)));
    } catch (err: any) {
      setKeywords((prev) => prev.filter((k) => k.id !== tempId));
      toast.error(err.message);
    } finally {
      setPending((prev) => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
    }
  };

  const remove = async (keyword: KeywordRecord) => {
    setKeywords((prev) => prev.filter((k) => k.id !== keyword.id));
    setPending((prev) => ({ ...prev, [keyword.id]: true }));

    try {
      const res = await fetch(`${apiEndpoint}/${keyword.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to delete "${keyword[keywordKey]}"`);
    } catch (err: any) {
      setKeywords((prev) => [...prev, keyword]);
      toast.error(err.message);
    } finally {
      setPending((prev) => {
        const next = { ...prev };
        delete next[keyword.id];
        return next;
      });
    }
  };

  return (
    <div className="rounded-lg border border-app-border bg-surface p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium text-text-hi">{title}</h2>
        <span className="font-mono text-[11px] text-text-lo">{keywords.length}</span>
      </div>
      <p className="mb-3 text-xs text-text-lo">{description}</p>

      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={keywordKey === "term" ? "Type a term and press Enter…" : "Type a keyword and press Enter…"}
          className="h-8 flex-1 rounded-md border border-app-border bg-canvas px-2.5 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
        />
        {needsTenderType && (
          <select
            value={draftTenderType}
            onChange={(e) => setDraftTenderType(e.target.value)}
            className="h-8 rounded-md border border-app-border bg-canvas px-2 text-xs text-text-hi"
          >
            {tenderTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        <button onClick={submit} className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-white hover:bg-brand-600">
          <Icon icon="solar:add-circle-broken" width={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {keywords.length === 0 && <span className="text-sm text-text-lo">No {title.toLowerCase()} yet.</span>}
        {keywords.map((keyword) => (
          <span
            key={keyword.id}
            className="inline-flex items-center gap-1.5 rounded-md border border-app-border bg-surface-2 px-2 py-1 text-sm text-text-hi"
          >
            {keyword[keywordKey]}
            {needsTenderType && keyword.tender_type && (
              <span className="font-mono text-[10px] uppercase text-text-lo">{keyword.tender_type}</span>
            )}
            {pending[keyword.id] ? (
              <Icon icon="mdi:loading" width={12} className="animate-spin text-text-lo" />
            ) : (
              <button onClick={() => remove(keyword)} className="text-text-lo hover:text-status-danger" aria-label={`Remove ${keyword[keywordKey]}`}>
                <Icon icon="solar:close-circle-broken" width={12} />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
