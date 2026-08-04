"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { sidebarNav } from "@/shared/lib/nav";
import { NAV_SHORTCUTS } from "@/widgets/app-shell/lib/shortcuts";

/** ⌘K command palette for jumping between sections. Search-by-name wiring lands with Tenders/Leads. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
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

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <Command
        className="w-full max-w-lg overflow-hidden rounded-lg border border-app-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        shouldFilter
      >
        <div className="flex items-center gap-2 border-b border-app-border px-3">
          <Icon icon="solar:magnifer-broken" width={16} className="text-text-lo" />
          <Command.Input
            autoFocus
            placeholder="Jump to a section, search tenders/leads…"
            className="h-11 flex-1 bg-transparent text-sm text-text-hi outline-none placeholder:text-text-lo"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-2 py-6 text-center text-sm text-text-lo">No results.</Command.Empty>
          <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-lo">
            {sidebarNav.map((item) => (
              <Command.Item
                key={item.href}
                value={item.label}
                onSelect={() => go(item.href)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-text-hi data-[selected=true]:bg-surface-2"
              >
                <Icon icon={item.icon} width={16} className="text-text-lo" />
                <span className="flex-1">{item.label}</span>
                {NAV_SHORTCUTS[item.href] && (
                  <span className="font-mono text-[10px] uppercase text-text-lo/70">G {NAV_SHORTCUTS[item.href]}</span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
