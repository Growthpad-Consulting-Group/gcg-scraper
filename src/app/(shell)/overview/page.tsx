"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import Button from "@/shared/ui/Button";
import RunFeed from "@/features/overview/components/RunFeed";
import GradientAreaChart from "@/features/overview/components/GradientAreaChart";
import AcceptanceGauge from "@/features/overview/components/AcceptanceGauge";
import SourceBreakdown from "@/features/overview/components/SourceBreakdown";
import MiniSparkline from "@/features/overview/components/MiniSparkline";
import RejectedSummary from "@/features/overview/components/RejectedSummary";
import type { RunJob } from "@/features/overview/lib/runFeed";
import {
  buildSourceBreakdown,
  buildStackedTrend,
  buildAcceptanceStats,
  buildDayDeltas,
  buildDailySparkline,
  buildWeekCount,
  buildPendingReview,
  type DashTender,
} from "@/features/overview/lib/dashboardStats";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { nextRunAt, nextRunLabel } from "@/features/scheduler/lib/frequency";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";

interface ScheduledTask {
  task_id: number;
  name: string;
  tender_type: string | null;
  frequency: string;
  run_time?: string | null;
  last_run: string | null;
  is_enabled: boolean;
}

type TrendWindow = 14 | 30;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ─── Gradient orb (decorative background glow) ───────────────────────────────
function GradientOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      aria-hidden
      className={cn("absolute rounded-full blur-[80px]", className)}
      initial={{ opacity: 0.4, scale: 1 }}
      animate={{ opacity: [0.4, 0.65, 0.4], scale: [1, 1.08, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

// ─── Stat panel — polished glass card with gradient icon ─────────────────────
interface StatPanelProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  sparkValues?: number[];
  gradient: string;   // tailwind gradient classes
  icon: string;
  loading?: boolean;
  href?: string;
  delay?: number;
}

function StatPanel({ label, value, delta, deltaLabel, sparkValues, gradient, icon, loading, href, delay = 0 }: StatPanelProps) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-app-border/40 bg-surface p-4 transition-colors duration-200 hover:bg-surface-2/50"
    >

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm", gradient)}>
            {loading
              ? <Icon icon="solar:refresh-broken" width={16} className="animate-spin text-white" />
              : <Icon icon={icon} width={16} className="text-white" />
            }
          </div>
          {loading ? (
            <div className="mb-1 h-7 w-20 animate-pulse rounded-xl bg-surface-2" />
          ) : (
            <div className="text-2xl font-semibold leading-none tracking-tight text-text-hi">
              {typeof value === "number" ? value.toLocaleString() : value}
            </div>
          )}
          <p className="mt-1.5 text-xs font-medium capitalize text-text-lo">{label}</p>
        </div>
        {sparkValues && !loading && (
          <div className="mt-1 shrink-0 opacity-40 transition-opacity group-hover:opacity-70">
            <MiniSparkline values={sparkValues} color="#f05d23" width={56} height={28} />
          </div>
        )}
      </div>

      {(delta !== undefined || deltaLabel) && !loading && (
        <div className="relative mt-3 flex items-center gap-1.5">
          {delta !== undefined && (
            <span className={cn(
              "inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 font-mono text-[10px] font-medium",
              delta > 0 ? "bg-status-success/10 text-status-success"
                : delta < 0 ? "bg-status-danger/10 text-status-danger"
                : "bg-surface-2 text-text-lo"
            )}>
              {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta)}
            </span>
          )}
          {deltaLabel && <span className="text-[10px] text-text-lo">{deltaLabel}</span>}
        </div>
      )}
    </motion.div>
  );

  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

// ─── Glass card ───────────────────────────────────────────────────────────────
function Card({
  title,
  icon,
  children,
  className,
  action,
  delay = 0,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-app-border/40 bg-surface p-5",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600">
          <Icon icon={icon} width={12} className="text-white" />
        </div>
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-text-lo/70">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </motion.div>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const router = useRouter();
  const { fullName, loading: userLoading } = useUserProfile();

  const [jobs, setJobs] = useState<RunJob[]>([]);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [tenders, setTenders] = useState<DashTender[]>([]);
  const [totalTenders, setTotalTenders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [trendWindow, setTrendWindow] = useState<TrendWindow>(14);
  const hasLoadedOnce = useRef(false);

  const fetchData = useCallback(async () => {
    if (!hasLoadedOnce.current) setIsLoading(true);
    try {
      const [jobsRes, tasksRes, tendersRes] = await Promise.all([
        fetch("/api/jobs?limit=50"),
        fetch("/api/scheduled-tasks"),
        fetch("/api/tenders?limit=2000"),
      ]);
      const [jobsData, tasksData, tendersData] = await Promise.all([
        jobsRes.json(), tasksRes.json(), tendersRes.json(),
      ]);
      setJobs(jobsData.jobs || []);
      setTasks((tasksData.tasks || []).filter((t: ScheduledTask) => t.is_enabled));
      setTenders(tendersData.tenders || []);
      setTotalTenders(tendersData.total ?? tendersData.tenders?.length ?? 0);
    } catch (err: any) {
      toast.error("Error loading dashboard: " + err.message);
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

  // Derived stats
  const sourceBreakdown = buildSourceBreakdown(tenders);
  const stackedData     = buildStackedTrend(tenders, trendWindow, sourceBreakdown);
  const acceptance      = buildAcceptanceStats(jobs);
  const { today: tendersToday, delta: todayDelta, yesterday } = buildDayDeltas(tenders);
  const weekCount       = buildWeekCount(tenders);
  const spark14         = buildDailySparkline(tenders, 14);
  const runningCount    = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const pendingReview   = buildPendingReview(tenders);
  const activeSourceNames = [...new Set(tasks.map((t) => t.tender_type).filter(Boolean) as string[])].sort();
  const nextTask        = [...tasks].sort((a, b) => nextRunAt(a).getTime() - nextRunAt(b).getTime())[0];

  usePageHeader({
    title: "Overview",
    description: "Live dashboard — tenders, runs & sources",
    icon: "solar:chart-broken",
    actions: [
      {
        label: "New Run",
        icon: "solar:play-broken",
        variant: "primary",
        onClick: () => router.push("/run-query"),
      },
    ],
  });

  return (
    <div className="relative mx-auto flex max-w-7xl flex-col gap-6">

      {/* ── Background gradient orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
        <GradientOrb className="right-0 top-0 h-96 w-96 bg-gradient-to-br from-brand-500/20 to-brand-600/10" delay={0} />
        <GradientOrb className="-bottom-20 -left-20 h-80 w-80 bg-gradient-to-br from-status-info/10 to-status-info/5" delay={5} />
      </div>

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0f0a] to-[#231812] p-6"
      >
        {/* Decorative icon watermark */}
        <div className="pointer-events-none absolute right-6 top-4 opacity-5">
          <Icon icon="solar:document-text-broken" width={120} className="text-white" />
        </div>
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-brand-500/10 blur-2xl" />

        <div className="relative">
          {/* Greeting + name */}
          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-500/80">{greeting()}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-white">
            {fullName && !userLoading ? fullName : "Dashboard"}
          </h1>

          {/* Hero metric + actions row */}
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-3">
              {isLoading ? (
                <div className="h-14 w-36 animate-pulse rounded-xl bg-white/10" />
              ) : (
                <span
                  className="font-display font-black leading-none text-white"
                  style={{
                    fontSize: "clamp(2.75rem, 5.5vw, 4rem)",
                    textShadow: "0 0 48px rgba(240,93,35,0.5)",
                  }}
                >
                  {totalTenders.toLocaleString()}
                </span>
              )}
              <div className="mb-1">
                <p className="text-sm font-medium text-white/80">total tenders</p>
                {!isLoading && nextTask && (
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-status-success" />
                    <p className="font-mono text-[10px] text-white/60">
                      Next: <span className="text-brand-500">{nextRunLabel(nextTask)}</span>
                      {" · "}{nextTask.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link href="/automation">
                <Button size="md" variant="secondary">
                  <Icon icon="solar:clock-circle-broken" width={16} />
                  Schedules
                </Button>
              </Link>
              <Link href="/tenders">
                <Button size="md" variant="secondary">
                  <Icon icon="solar:document-text-broken" width={16} />
                  Tenders
                </Button>
              </Link>
              <Link href="/run-query">
                <Button size="md">
                  <Icon icon="solar:play-circle-broken" width={16} />
                  New Query
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </motion.div>

      {/* ── Stat panels ── */}
      <div className="relative z-10 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Found today — acquisition pulse */}
        <StatPanel
          label="Found today"
          value={isLoading ? "—" : tendersToday}
          delta={isLoading ? undefined : todayDelta}
          deltaLabel={`vs ${yesterday} yesterday`}
          sparkValues={spark14.slice(-7)}
          gradient="from-emerald-500 to-emerald-400"
          icon="solar:document-add-broken"
          loading={isLoading}
          href="/tenders"
          delay={0.05}
        />
        {/* 2. This week — trend */}
        <StatPanel
          label="This week"
          value={isLoading ? "—" : weekCount}
          sparkValues={spark14}
          gradient="from-blue-500 to-blue-400"
          icon="solar:calendar-broken"
          loading={isLoading}
          href="/tenders"
          delay={0.1}
        />
        {/* 3. Acceptance rate — quality signal */}
        <StatPanel
          label="Acceptance rate"
          value={isLoading ? "—" : acceptance.rate !== null ? `${acceptance.rate}%` : "—"}
          gradient={
            acceptance.rate === null || isLoading ? "from-teal-500 to-teal-400"
              : acceptance.rate >= 75 ? "from-emerald-500 to-emerald-400"
              : acceptance.rate >= 50 ? "from-amber-500 to-amber-400"
              : "from-red-500 to-red-400"
          }
          icon="solar:check-circle-broken"
          loading={isLoading}
          delay={0.15}
        />
        {/* 4. Pending review — actionable backlog */}
        <StatPanel
          label="Pending review"
          value={isLoading ? "—" : pendingReview}
          gradient="from-violet-500 to-violet-400"
          icon="solar:eye-broken"
          loading={isLoading}
          href="/tenders"
          delay={0.2}
        />
        {/* 5. Active runs — pipeline health */}
        <StatPanel
          label="Active runs"
          value={isLoading ? "—" : runningCount}
          deltaLabel={isLoading ? undefined : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} scheduled`}
          gradient="from-amber-500 to-amber-400"
          icon="solar:play-circle-broken"
          loading={isLoading}
          href={runningCount > 0 ? "/run-query" : "/automation"}
          delay={0.25}
        />
      </div>

      {/* ── Gradient area chart (full width) ── */}
      <div className="relative z-10">
        <Card
          title={`Tenders by source — last ${trendWindow} days`}
          icon="solar:chart-broken"
          delay={0.15}
          action={
            <div className="flex overflow-hidden rounded-xl border border-app-border/50">
              {([14, 30] as TrendWindow[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setTrendWindow(w)}
                  className={cn(
                    "px-3 py-1 font-mono text-[11px] transition-colors",
                    trendWindow === w
                      ? "bg-brand-500 text-white"
                      : "text-text-lo hover:text-text-hi"
                  )}
                >
                  {w}d
                </button>
              ))}
            </div>
          }
        >
          <GradientAreaChart data={stackedData} onNavigate={() => router.push("/tenders")} />
        </Card>
      </div>

      {/* ── Analytics row ── */}
      <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Tenders by source" icon="solar:layers-broken" delay={0.1}>
          <SourceBreakdown sources={sourceBreakdown} loading={isLoading} />
        </Card>

        <Card title="Acceptance rate" icon="solar:check-circle-broken" delay={0.15}>
          <AcceptanceGauge stats={acceptance} loading={isLoading} />
          {acceptance.rate === null && !isLoading && (
            <p className="mt-3 text-center text-[11px] text-text-lo">
              Rate appears once runs with candidate data complete.
            </p>
          )}
        </Card>

        <Card
          title="Rejected candidates"
          icon="solar:danger-triangle-broken"
          delay={0.2}
          action={
            <Link href="/rejected-candidates" className="font-mono text-[10px] text-text-lo transition-colors hover:text-brand-500">
              View all →
            </Link>
          }
        >
          <RejectedSummary />
        </Card>
      </div>

      {/* ── Activity ── */}
      <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-[4fr_2fr]">
        <Card title="Run feed" icon="solar:history-broken" delay={0.1}>
          <RunFeed jobs={jobs} isLoading={isLoading} onRefresh={fetchData} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Scheduled next" icon="solar:calendar-broken" delay={0.15}>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Icon icon="solar:calendar-broken" width={22} className="text-text-lo/30" />
                <p className="text-xs text-text-lo">No active schedules.</p>
                <Link href="/automation">
                  <Button size="sm" variant="secondary">Set up automation</Button>
                </Link>
              </div>
            ) : (
              <ul className="flex max-h-[200px] flex-col overflow-y-auto">
                {[...tasks]
                  .sort((a, b) => nextRunAt(a).getTime() - nextRunAt(b).getTime())
                  .slice(0, 7)
                  .map((task) => (
                    <li key={task.task_id} className="-mx-2">
                      <Link
                        href="/automation"
                        className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
                      >
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-success" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-text-hi">{task.name}</p>
                          <p className="text-[10px] text-text-lo">{nextRunLabel(task)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          {activeSourceNames.length > 0 && (
            <Card title="Active sources" icon="solar:global-broken" delay={0.2}>
              <div className="flex max-h-[200px] flex-col overflow-y-auto">
                {activeSourceNames.map((name) => {
                  const src = sourceBreakdown.find((s) => s.name === name);
                  return (
                    <Link
                      key={name}
                      href={`/tenders?type=${encodeURIComponent(name)}`}
                      className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: src?.color ?? "#64748b" }} />
                      <span className="min-w-0 flex-1 truncate text-xs text-text-hi">{name}</span>
                      {src && <span className="text-[10px] text-text-lo">{src.count.toLocaleString()}</span>}
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
