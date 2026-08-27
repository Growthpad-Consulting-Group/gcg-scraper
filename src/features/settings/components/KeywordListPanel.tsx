"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
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
  icon,
  title,
  description,
  listUrl,
  itemKey,
  responseKey,
}: {
  icon: string;
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
      toast.success(`"${trimmed}" added`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (item: KeywordRow) => {
    setDeletingId(item.id);
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      const res = await fetch(`${listUrl}/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (err: any) {
      setItems(previous);
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gcg-orange to-gcg-orange-dark shadow-lg shadow-gcg-orange/30">
            <Icon icon={icon} width={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-hi">{title}</p>
            <p className="text-xs text-text-lo">{description}</p>
          </div>
        </div>
        {!isLoading && <Badge status="neutral">{items.length}</Badge>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Icon icon="solar:add-circle-broken" width={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-lo" />
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a new one…"
            className={`${inputClass} w-full pl-9`}
          />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={isAdding || !newValue.trim()}>
          <Icon icon={isAdding ? "mdi:loading" : "solar:add-circle-broken"} width={15} className={isAdding ? "animate-spin" : ""} />
          Add
        </Button>
      </div>

      <div className="relative">
        <Icon icon="solar:magnifer-broken" width={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-lo" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Filter ${items.length} item${items.length === 1 ? "" : "s"}…`}
          className={`${inputClass} w-full pl-9`}
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            aria-label="Clear filter"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-lo hover:text-text-hi"
          >
            <Icon icon="mdi:close" width={14} />
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto rounded-xl border border-app-border bg-canvas/40 p-2.5">
        {isLoading ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="h-6 w-20 animate-pulse rounded-full bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center">
            <Icon icon={items.length === 0 ? "solar:hashtag-broken" : "solar:magnifer-broken"} width={22} className="text-text-lo" />
            <p className="text-xs text-text-lo">{items.length === 0 ? "Nothing here yet — add one above." : "No matches for that filter."}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((item) => (
              <span
                key={item.id}
                className="group flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-2.5 pr-1 text-xs text-text-hi transition-colors hover:bg-surface-2/70"
              >
                {item.value}
                <button
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  aria-label={`Remove ${item.value}`}
                  className="flex items-center justify-center rounded-full p-0.5 text-text-lo transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                >
                  <Icon icon={deletingId === item.id ? "mdi:loading" : "mdi:close"} width={12} className={deletingId === item.id ? "animate-spin" : ""} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      {!isLoading && filter && (
        <p className="-mt-2 text-xs text-text-lo">
          Showing {filtered.length} of {items.length}
        </p>
      )}
    </GlassPanel>
  );
}
