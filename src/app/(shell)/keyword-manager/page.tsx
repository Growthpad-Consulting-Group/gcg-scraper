"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/shared/ui/PageHeader";
import KeywordChipEditor from "@/features/keywords/components/KeywordChipEditor";
import { Icon } from "@iconify/react";

const CACHE_DURATION = 1000 * 60 * 60;

function readCache(key: string) {
  const cached = localStorage.getItem(key);
  const timestamp = localStorage.getItem(`${key}_timestamp`);
  if (cached && timestamp && Date.now() - Number(timestamp) < CACHE_DURATION) {
    return JSON.parse(cached);
  }
  return null;
}

function writeCache(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
  localStorage.setItem(`${key}_timestamp`, Date.now().toString());
}

export default function KeywordManagerPage() {
  const [relevantKeywords, setRelevantKeywords] = useState<any[]>([]);
  const [closingKeywords, setClosingKeywords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWithCache = useCallback(async (endpoint: string, cacheKey: string, unwrap?: (body: any) => any[]) => {
    const cached = readCache(cacheKey);
    if (cached) return cached;
    const res = await fetch(endpoint);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `Failed to load ${endpoint}`);
    const data = unwrap ? unwrap(body) : body;
    writeCache(cacheKey, data);
    return data;
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [relevant, closing] = await Promise.all([
          fetchWithCache("/api/relevant-keywords", "relevant_keywords"),
          fetchWithCache("/api/closing-keywords", "closing_keywords"),
        ]);
        setRelevantKeywords(relevant);
        setClosingKeywords(closing);
      } catch (err: any) {
        setError(`Failed to load keyword data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [fetchWithCache]);

  return (
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Keyword Manager"
          description="Filters applied after scraping — relevance and closing-date detection. Base keywords and search terms now live in Run Query."
          icon="solar:tag-broken"
        />

        {error && <div className="rounded-md bg-status-danger/10 p-4 text-sm text-status-danger">{error}</div>}

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-app-border bg-surface">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="mdi:loading" width={32} height={32} className="animate-spin text-brand-500" />
              <p className="text-sm text-text-lo">Loading keywords…</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <KeywordChipEditor
              title="Relevant Keywords"
              description="Filters used to refine results, keeping only the most relevant tenders."
              keywords={relevantKeywords}
              setKeywords={setRelevantKeywords}
              apiEndpoint="/api/relevant-keywords"
              additionalFields={["tender_type"]}
            />
            <KeywordChipEditor
              title="Closing Keywords"
              description="Phrases like 'due by' or 'deadline' used to identify tender closing dates."
              keywords={closingKeywords}
              setKeywords={setClosingKeywords}
              apiEndpoint="/api/closing-keywords"
            />
          </div>
        )}
      </div>
  );
}
