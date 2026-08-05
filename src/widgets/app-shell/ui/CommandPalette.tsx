"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { sidebarNav } from "@/shared/lib/nav";
import { NAV_SHORTCUTS } from "@/widgets/app-shell/lib/shortcuts";
import { tenderHref } from "@/shared/lib/slug";

const RESULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

interface TenderResult {
  id: string | number;
  title: string;
}

interface LeadResult {
  id: string | number;
  business_name?: string;
  full_name?: string;
}

/** ⌘K command palette — jump between sections, or search live across tenders and leads. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tenders, setTenders] = useState<TenderResult[]>([]);
  const [gmbLeads, setGmbLeads] = useState<LeadResult[]>([]);
  const [linkedinLeads, setLinkedinLeads] = useState<LeadResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTenders([]);
      setGmbLeads([]);
      setLinkedinLeads([]);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setTenders([]);
      setGmbLeads([]);
      setLinkedinLeads([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const qs = `query=${encodeURIComponent(trimmed)}&limit=${RESULT_LIMIT}`;
        const [tendersRes, gmbRes, linkedinRes] = await Promise.all([
          fetch(`/api/tenders?${qs}`, { signal: controller.signal }),
          fetch(`/api/leads?query=${encodeURIComponent(trimmed)}`, { signal: controller.signal }),
          fetch(`/api/linkedin-leads?query=${encodeURIComponent(trimmed)}`, { signal: controller.signal }),
        ]);
        const [tendersData, gmbData, linkedinData] = await Promise.all([tendersRes.json(), gmbRes.json(), linkedinRes.json()]);
        setTenders((tendersData.tenders || []).slice(0, RESULT_LIMIT));
        setGmbLeads((gmbData.leads || []).slice(0, RESULT_LIMIT));
        setLinkedinLeads((linkedinData.leads || []).slice(0, RESULT_LIMIT));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setTenders([]);
          setGmbLeads([]);
          setLinkedinLeads([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  if (!open) return null;

  const isSearchMode = query.trim().length >= MIN_QUERY_LENGTH;
  const hasResults = tenders.length > 0 || gmbLeads.length > 0 || linkedinLeads.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <Command
        className="w-full max-w-lg overflow-hidden rounded-lg border border-app-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        shouldFilter={!isSearchMode}
      >
        <div className="flex items-center gap-2 border-b border-app-border px-3">
          <Icon icon={isSearching ? "mdi:loading" : "solar:magnifer-broken"} width={16} className={`text-text-lo ${isSearching ? "animate-spin" : ""}`} />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Jump to a section, search tenders/leads…"
            className="h-11 flex-1 bg-transparent text-sm text-text-hi outline-none placeholder:text-text-lo"
          />
        </div>
        <Command.List className="max-h-96 overflow-y-auto p-2">
          {isSearchMode ? (
            <>
              {!isSearching && !hasResults && (
                <Command.Empty className="px-2 py-6 text-center text-sm text-text-lo">No matches for &quot;{query.trim()}&quot;.</Command.Empty>
              )}
              {tenders.length > 0 && (
                <Command.Group heading="Tenders" className={groupHeadingClass}>
                  {tenders.map((tender) => (
                    <Command.Item
                      key={`tender-${tender.id}`}
                      value={`tender-${tender.id}`}
                      onSelect={() => go(tenderHref(tender))}
                      className={itemClass}
                    >
                      <Icon icon="solar:case-minimalistic-broken" width={16} className="text-text-lo" />
                      <span className="flex-1 truncate">{tender.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {gmbLeads.length > 0 && (
                <Command.Group heading="Business leads" className={groupHeadingClass}>
                  {gmbLeads.map((lead) => (
                    <Command.Item
                      key={`gmb-${lead.id}`}
                      value={`gmb-${lead.id}`}
                      onSelect={() => go("/leads?tab=gmb")}
                      className={itemClass}
                    >
                      <Icon icon="solar:map-point-broken" width={16} className="text-text-lo" />
                      <span className="flex-1 truncate">{lead.business_name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {linkedinLeads.length > 0 && (
                <Command.Group heading="LinkedIn leads" className={groupHeadingClass}>
                  {linkedinLeads.map((lead) => (
                    <Command.Item
                      key={`linkedin-${lead.id}`}
                      value={`linkedin-${lead.id}`}
                      onSelect={() => go("/leads?tab=linkedin")}
                      className={itemClass}
                    >
                      <Icon icon="mdi:linkedin" width={16} className="text-text-lo" />
                      <span className="flex-1 truncate">{lead.full_name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          ) : (
            <>
              <Command.Empty className="px-2 py-6 text-center text-sm text-text-lo">No results.</Command.Empty>
              <Command.Group heading="Go to" className={groupHeadingClass}>
                {sidebarNav.map((item) => (
                  <Command.Item key={item.href} value={item.label} onSelect={() => go(item.href)} className={itemClass}>
                    <Icon icon={item.icon} width={16} className="text-text-lo" />
                    <span className="flex-1">{item.label}</span>
                    {NAV_SHORTCUTS[item.href] && (
                      <span className="font-mono text-[10px] uppercase text-text-lo/70">G {NAV_SHORTCUTS[item.href]}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-lo";

const itemClass = "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-text-hi data-[selected=true]:bg-surface-2";
