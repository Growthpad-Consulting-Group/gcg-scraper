"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
import RunFeed from "@/features/overview/components/RunFeed";
import TendersTrendChart from "@/features/overview/components/TendersTrendChart";
import type { RunJob } from "@/features/overview/lib/runFeed";
import { buildTenderTrend, type TenderTrendPoint } from "@/features/overview/lib/tenderTrend";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { nextRunAt, nextRunLabel } from "@/features/scheduler/lib/frequency";

interface ScheduledTask {
  task_id: number;
  name: string;
  tender_type: string | null;
  frequency: string;
  last_run: string | null;
  is_enabled: boolean;
}

export default function OverviewPage() {
  const router = useRouter();
  const { fullName, loading: userLoading } = useUserProfile();

  const [jobs, setJobs] = useState<RunJob[]>([]);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [openTendersToday, setOpenTendersToday] = useState(0);
  const [trendPoints, setTrendPoints] = useState<TenderTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  const fetchData = useCallback(async () => {
    // Only show the full loading state on the very first fetch — the 15s background poll should
    // refresh data silently, not wipe the run feed back to a loading placeholder every time.
    if (!hasLoadedOnce.current) setIsLoading(true);
    try {
      const [jobsRes, tasksRes, tendersRes] = await Promise.all([
        fetch("/api/jobs?limit=20"),
        fetch("/api/scheduled-tasks"),
        fetch("/api/tenders"),
      ]);
      const jobsData = await jobsRes.json();
      const tasksData = await tasksRes.json();
      const tendersData = await tendersRes.json();

      setJobs(jobsData.jobs || []);
      setTasks((tasksData.tasks || []).filter((t: ScheduledTask) => t.is_enabled));

      const today = new Date().toDateString();
      const allTenders = tendersData.tenders || [];
      setOpenTendersToday(allTenders.filter((t: any) => t.scraped_at && new Date(t.scraped_at).toDateString() === today).length);
      setTrendPoints(buildTenderTrend(allTenders, 14));
    } catch (err: any) {
      toast.error("Error loading run feed: " + err.message);
    } finally {
      hasLoadedOnce.current = true;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const runningCount = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const sourcesActive = new Set(jobs.filter((j) => j.status === "running").map((j) => j.kind)).size;
  // Distinct tender_type across enabled scheduled tasks — the actual sources currently in
  // rotation, not a fixed list from whenever this card was first built.
  const activeSourceNames = [...new Set(tasks.map((t) => t.tender_type).filter((v): v is string => !!v))].sort();

  return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-text-hi">
              Welcome back{fullName && !userLoading ? `, ${fullName}` : ""}
            </h1>
            <p className="mt-0.5 text-sm text-text-lo">Here&apos;s what&apos;s running.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tenders">
              <Button size="sm" variant="secondary">
                <Icon icon="solar:document-text-broken" width={16} />
                View Tenders
              </Button>
            </Link>
            <Link href="/run-query">
              <Button size="sm">
                <Icon icon="solar:play-circle-broken" width={16} />
                New Query
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border border-app-border bg-surface px-4 py-3">
          <StatChip label="Open runs" value={runningCount} />
          <StatChip label="Active sources" value={sourcesActive} />
          <StatChip label="Tenders found today" value={openTendersToday} />
          <StatChip label="Scheduled tasks" value={tasks.length} />
        </div>

        <TendersTrendChart points={trendPoints} onSelectDate={(date) => router.push(`/tenders?date=${date}`)} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Nested grid (not flexbox) so the "fill available height" sizing stays scoped to
              this row and matches the sidebar's natural height, instead of a flex-1 reaching up
              into the page shell's own flex layout and filling the whole viewport. */}
          <div className="grid grid-rows-[auto_1fr] rounded-lg border border-app-border bg-surface p-4">
            <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-wide text-text-lo">Run feed</h2>
            <RunFeed jobs={jobs} isLoading={isLoading} onRefresh={fetchData} />
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-app-border bg-surface p-4">
              <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-wide text-text-lo">Scheduled next</h2>
              {tasks.length === 0 ? (
                <p className="text-sm text-text-lo">No active schedules.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {[...tasks]
                    .sort((a, b) => nextRunAt(a).getTime() - nextRunAt(b).getTime())
                    .slice(0, 6)
                    .map((task) => (
                      <li key={task.task_id}>
                        <Link
                          href="/automation"
                          className="-mx-2 flex flex-col gap-0.5 rounded-md px-2 py-1 transition-colors hover:bg-surface-2 hover:text-brand-500"
                        >
                          <span className="truncate text-sm text-text-hi">{task.name}</span>
                          <span className="font-mono text-[11px] text-text-lo">
                            {task.frequency} · next run {nextRunLabel(task)}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-app-border bg-surface p-4">
              <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-wide text-text-lo">Sources</h2>
              {activeSourceNames.length === 0 ? (
                <p className="text-sm text-text-lo">No active sources.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activeSourceNames.map((name) => (
                    <Link key={name} href={`/tenders?type=${encodeURIComponent(name)}`}>
                      <Badge status="neutral" className="cursor-pointer transition-colors hover:border-brand-500/50 hover:text-brand-500">
                        {name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-lg font-semibold text-text-hi">{value}</span>
      <span className="text-xs text-text-lo">{label}</span>
    </div>
  );
}
