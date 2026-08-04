"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import AppShell from "@/widgets/app-shell/ui/AppShell";
import Button from "@/shared/ui/Button";
import TenderTableV2 from "@/features/tenders/components/TenderTableV2";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function TendersPage() {
  const { resolvedMode: mode } = useTheme();
  const [tenders, setTenders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTenders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tenders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tenders");
      setTenders(data.tenders || []);
    } catch (err: any) {
      toast.error("Error fetching tenders: " + err.message);
      setTenders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  const handleDeleteTender = async (tender: any) => {
    const loadingToastId = toast.loading("Deleting tender...");
    try {
      setTenders((prev) => prev.filter((t) => t.id !== tender.id));
      const res = await fetch(`/api/tenders/${tender.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete tender");
      toast.success("Tender deleted successfully!", { id: loadingToastId });
    } catch (err: any) {
      await fetchTenders();
      toast.error("Failed to delete tender. Please try again.", { id: loadingToastId });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-text-hi">Tenders</h1>
            <p className="mt-0.5 text-sm text-text-lo">Every tender found, with provenance back to the run that scraped it.</p>
          </div>
          <Link href="/upload-website">
            <Button size="sm" variant="secondary">
              <Icon icon="solar:upload-broken" width={16} />
              Add Source
            </Button>
          </Link>
        </div>
        <TenderTableV2 tenders={tenders} isLoading={isLoading} mode={mode} onDeleteTender={handleDeleteTender} />
      </div>
    </AppShell>
  );
}
