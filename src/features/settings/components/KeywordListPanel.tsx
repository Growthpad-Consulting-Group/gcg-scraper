"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Button from "@/shared/ui/Button";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface KeywordRow {
  id: number;
  value: string;
}

/**
 * Generic add/filter/delete manager for the app's simple keyword-list tables (search_terms,
 * linkedin_search_phrases) — same {id, <key>, created_at} shape, same CRUD API already backing
 * TaskForm's creatable selects (features/keywords/api/crud.ts), just with no page that let anyone
 * actually review or prune the full list until now.
 */
export default function KeywordListPanel({
  title,
  description,
  listUrl,
  itemKey,
  responseKey,
}: {
  title: string;
  description: string;
  /** e.g. "/api/search-terms" — its [id] sibling route must support DELETE. */
  listUrl: string;
  /** The column name the API uses for the keyword text — "term" or "phrase". */
  itemKey: string;
  /** The key the GET response wraps the array in — "search_terms" or "linkedin_search_phrases". */
  responseKey: string;
}) {
  const { resolvedMode: mode } = useTheme();
  const [items, setItems] = useState<KeywordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const inputClass = "h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(listUrl);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        const rows: any[] = data[responseKey] || [];
        setItems(rows.map((r) => ({ id: r.id, value: r[itemKey] })));
      } catch (err: any) {
        toast.error(`Error loading ${title.toLowerCase()}: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.value.toLowerCase().includes(q));
  }, [items, filter]);

  const handleAdd = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (items.some((i) => i.value.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Already in the list");
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch(listUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [itemKey]: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setItems((prev) => [...prev, { id: data.keyword.id, value: data.keyword[itemKey] }].sort((a, b) => a.value.localeCompare(b.value)));
      setNewValue("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`${listUrl}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (err: any) {
      setItems(previous);
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-3 rounded-lg p-4">
      <div>
        <p className="text-sm font-medium text-text-hi">{title}</p>
        <p className="text-xs text-text-lo">{description}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a new one…"
          className={`${inputClass} flex-1`}
        />
        <Button size="sm" onClick={handleAdd} disabled={isAdding || !newValue.trim()}>
          <Icon icon={isAdding ? "mdi:loading" : "solar:add-circle-broken"} width={15} className={isAdding ? "animate-spin" : ""} />
          Add
        </Button>
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={`Filter ${items.length} item${items.length === 1 ? "" : "s"}…`}
        className={inputClass}
      />

      <div className="max-h-72 overflow-y-auto rounded-md border border-app-border p-2">
        {isLoading ? (
          <p className="p-2 text-xs text-text-lo">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-2 text-xs text-text-lo">{items.length === 0 ? "Nothing here yet — add one above." : "No matches for that filter."}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((item) => (
              <span key={item.id} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-2.5 pr-1 text-xs text-text-hi">
                {item.value}
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  aria-label={`Remove ${item.value}`}
                  className="flex items-center justify-center rounded-full p-0.5 text-text-lo hover:bg-status-danger/10 hover:text-status-danger"
                >
                  <Icon icon={deletingId === item.id ? "mdi:loading" : "mdi:close"} width={12} className={deletingId === item.id ? "animate-spin" : ""} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
