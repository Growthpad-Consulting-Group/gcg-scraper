"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/shared/contexts/ThemeContext";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";

interface TermRow {
  id: number;
  term: string;
  runs: number;
  total_found: number;
  total_rejected: number;
  last_run_at: string | null;
}

function acceptanceRate(row: TermRow): number | null {
  const total = row.total_found + row.total_rejected;
  if (total === 0) return null;
  return Math.round((row.total_found / total) * 100);
}

export default function SearchTermPerformancePanel() {
  const { resolvedMode: mode } = useTheme();
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/search-term-performance");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setTerms(data.terms ?? []);
      } catch (err: any) {
        toast.error("Error loading term performance: " + err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-brand-500/10">
          <Icon icon="solar:chart-broken" width={16} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-hi">Search Term Performance</h2>
          <p className="text-xs text-text-lo">Acceptance rates per keyword — low-yield terms may be worth refining.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-surface-2" />)}
        </div>
      ) : terms.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Icon icon="solar:chart-broken" width={24} className="text-text-lo/30" />
          <p className="text-xs text-text-lo">No data yet — performance is tracked after each scheduled web-search run.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-app-border">
                <th className="pb-2 text-left font-medium text-text-lo">Term</th>
                <th className="pb-2 text-right font-medium text-text-lo">Runs</th>
                <th className="pb-2 text-right font-medium text-text-lo">Found</th>
                <th className="pb-2 text-right font-medium text-text-lo">Rejected</th>
                <th className="pb-2 text-right font-medium text-text-lo">Accept %</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((row) => {
                const rate = acceptanceRate(row);
                const isLowYield = rate !== null && rate < 20 && row.runs >= 5;
                return (
                  <tr key={row.id} className="border-b border-app-border/40 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-1.5">
                        {isLowYield && (
                          <span title="Low yield — fewer than 20% of extracted tenders pass filters over 5+ runs">
                            <Icon icon="solar:danger-triangle-broken" width={12} className="text-status-warning" />
                          </span>
                        )}
                        <span className={`font-medium ${isLowYield ? "text-status-warning" : "text-text-hi"}`}>{row.term}</span>
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-text-lo">{row.runs}</td>
                    <td className="py-2 text-right font-mono text-status-success">{row.total_found}</td>
                    <td className="py-2 text-right font-mono text-status-danger">{row.total_rejected}</td>
                    <td className="py-2 text-right">
                      {rate === null ? (
                        <span className="text-text-lo">—</span>
                      ) : (
                        <span className={`font-mono font-medium ${rate >= 50 ? "text-status-success" : rate >= 20 ? "text-status-warning" : "text-status-danger"}`}>
                          {rate}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassPanel>
  );
}
