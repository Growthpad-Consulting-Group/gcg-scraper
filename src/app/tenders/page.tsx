"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import AppShell from "@/widgets/app-shell/ui/AppShell";
import PageHeader from "@/shared/ui/PageHeader";
import Button from "@/shared/ui/Button";
import RunFilterBanner from "@/shared/ui/RunFilterBanner";
import TendersTable from "@/features/tenders/components/TendersTable";

const PAGE_SIZE = 500;

function TendersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobFilter = searchParams?.get("job") || null;

  const [tenders, setTenders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchTenders = useCallback(async () => {
    setIsLoading(true);
    try {
      const jobParam = jobFilter ? `&job=${jobFilter}` : "";
      const res = await fetch(`/api/tenders?limit=${PAGE_SIZE}&offset=0${jobParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tenders");
      setTenders(data.tenders || []);
      setTotal(data.total ?? (data.tenders || []).length);
    } catch (err: any) {
      toast.error("Error fetching tenders: " + err.message);
      setTenders([]);
    } finally {
      setIsLoading(false);
    }
  }, [jobFilter]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const jobParam = jobFilter ? `&job=${jobFilter}` : "";
      const res = await fetch(`/api/tenders?limit=${PAGE_SIZE}&offset=${tenders.length}${jobParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tenders");
      setTenders((prev) => [...prev, ...(data.tenders || [])]);
    } catch (err: any) {
      toast.error("Error loading more tenders: " + err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [tenders.length, jobFilter]);

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
        <PageHeader
          title="Tenders"
          description="Every tender found, with provenance back to the run that scraped it."
          icon="solar:case-minimalistic-broken"
          actions={[
            {
              label: "Add Source",
              icon: "solar:upload-broken",
              onClick: () => router.push("/upload-website"),
            },
          ]}
        />

        {jobFilter && (
          <RunFilterBanner
            jobId={jobFilter}
            onClear={() => router.push("/tenders")}
            resultsNoun="tenders"
          />
        )}

        <TendersTable
          tenders={tenders}
          isLoading={isLoading}
          onDeleteTender={handleDeleteTender}
          onRefresh={fetchTenders}
        />

        {!isLoading && tenders.length < total && (
          <Button
            size="sm"
            variant="secondary"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="self-center"
          >
            <Icon
              icon={isLoadingMore ? "mdi:loading" : "mdi:chevron-down"}
              width={16}
              className={isLoadingMore ? "animate-spin" : ""}
            />
            Load more ({tenders.length} of {total})
          </Button>
        )}
      </div>
    </AppShell>
  );
}

export default function TendersPage() {
  return (
    <Suspense fallback={null}>
      <TendersContent />
    </Suspense>
  );
}
