"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Sidebar from "@/widgets/app-shell/ui/Sidebar";
import Header from "@/widgets/app-shell/ui/Header";
import SimpleFooter from "@/shared/ui/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import WelcomeCard from "@/features/overview/components/WelcomeCard";
import MetricCard from "@/shared/ui/MetricCard";
import RecentActivity from "@/features/overview/components/RecentActivity";
import TaskStatusSummary from "@/features/overview/components/TaskStatusSummary";
import Notifications from "@/shared/ui/Notifications";
import TenderActivityChart from "@/features/overview/components/TenderActivityChart";
import TenderStatusDonutChart from "@/features/overview/components/TenderStatusDonutChart";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function OverviewPage() {
  const { resolvedMode: mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { user, fullName, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead, clearAllNotifications } = useNotifications();

  const [metrics, setMetrics] = useState({ totalTasks: 0, openTenders: 0, closedTenders: 0, tasksRunning: 0, expiredTenders: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksRes, tendersRes] = await Promise.all([fetch("/api/scheduled-tasks"), fetch("/api/tenders")]);
      const tasksData = await tasksRes.json();
      const tendersData = await tendersRes.json();
      const allTasks = tasksData.tasks || [];
      const allTenders = tendersData.tenders || [];

      setTasks(allTasks.slice(0, 5));
      setMetrics({
        totalTasks: allTasks.length,
        openTenders: allTenders.filter((t: any) => t.status === "open").length,
        closedTenders: allTenders.filter((t: any) => t.status === "closed").length,
        // scheduled_tasks has no live "is_running" flag in the current schema; Phase 2 job-queue
        // work will surface real in-flight counts via scrape_jobs.
        tasksRunning: 0,
        expiredTenders: allTenders.filter((t: any) => t.closing_date && new Date(t.closing_date) < new Date()).length,
      });

      const recentTasks = allTasks.slice(0, 5).map((task: any) => ({
        type: "task" as const,
        description: `Task "${task.name}" ran`,
        timestamp: task.last_run || new Date().toISOString(),
        link: `/scheduler`,
      }));

      const recentTenders = allTenders.slice(0, 5).map((tender: any) => ({
        type: "tender" as const,
        description: `Open tender "${tender.title}" found`,
        timestamp: tender.scraped_at || new Date().toISOString(),
        link: `/tenders`,
      }));

      const combinedActivity = [...recentTasks, ...recentTenders].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
      setRecentActivity(combinedActivity);
    } catch (err: any) {
      toast.error("Error loading dashboard data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    setIsChartLoading(true);
    try {
      const res = await fetch("/api/tenders");
      const data = await res.json();
      const tenders = data.tenders || [];

      const today = new Date();
      const chartLabels: string[] = [];
      const chartValues: number[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const label = date.toLocaleDateString();
        chartLabels.push(label);

        const count = tenders.filter((t: any) => t.scraped_at && new Date(t.scraped_at).toLocaleDateString() === label).length;
        chartValues.push(count);
      }

      setChartData({ labels: chartLabels, values: chartValues });
    } catch (err) {
      console.error("Chart error:", err);
    } finally {
      setIsChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchChartData();
  }, [fetchDashboardData, fetchChartData]);

  return (
    <div className={`min-h-screen flex flex-col ${mode === "dark" ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700" : "bg-gradient-to-br from-gray-100 via-gray-50 to-white"}`}>
      <div className="flex flex-1">
        <Sidebar isOpen={!!isSidebarOpen} mode={mode} onLogout={handleLogout} toggleSidebar={toggleSidebar} user={user} loading={userLoading} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header
            toggleSidebar={toggleSidebar}
            isSidebarOpen={!!isSidebarOpen}
            mode={mode}
            toggleMode={toggleMode}
            onLogout={handleLogout}
            user={user}
            loading={userLoading}
            notifications={notifications}
            isLoading={notificationsLoading}
            onMarkAsRead={markNotificationAsRead}
            onClearAll={clearAllNotifications}
          />

        <div className="flex-1 p-6 md:p-8 transition-all duration-300 overflow-hidden">
          <div className="max-w-7xl mx-auto space-y-8">
            <WelcomeCard mode={mode} userName={fullName} loading={userLoading} totalTasks={metrics.totalTasks} openTenders={metrics.openTenders} />

            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <Icon icon="mdi:loading" width={40} height={40} className="animate-spin text-[#f05d23]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <MetricCard title="Total Scraping Tasks" value={metrics.totalTasks} icon="mdi:clipboard-list-outline" mode={mode} color="blue" />
                <MetricCard title="Open Tenders" value={metrics.openTenders} icon="mdi:folder-open-outline" mode={mode} color="green" />
                <MetricCard title="Tasks Running" value={metrics.tasksRunning} icon="mdi:play-circle-outline" mode={mode} color="yellow" />
                <MetricCard title="Expired Tenders" value={metrics.expiredTenders} icon="mdi:archive-outline" mode={mode} color="red" />
              </div>
            )}

            <div className="flex flex-wrap gap-4 py-2">
              <Link href="/scheduler">
                <button className="px-5 py-3 rounded-full bg-gradient-to-r from-[#f05d23] to-[#d94f1e] text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2">
                  <Icon icon="mdi:plus" width={20} height={20} />
                  Add New Task
                </button>
              </Link>
              <Link href="/tenders">
                <button className={`px-5 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 ${mode === "dark" ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-[#231812] hover:bg-gray-300"}`}>
                  <Icon icon="mdi:folder-outline" width={20} height={20} />
                  View All Tenders
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              <div className="space-y-8">
                <TenderActivityChart chartData={chartData} mode={mode} isLoading={isChartLoading} />
              </div>
              <div className="space-y-8">
                <TenderStatusDonutChart openTenders={metrics.openTenders} expiredTenders={metrics.expiredTenders} mode={mode} isLoading={isLoading} />
              </div>
            </div>

            <div className="space-y-8 py-4">
              <TaskStatusSummary tasks={tasks} mode={mode} isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <div className="space-y-8 flex flex-col h-full">
                <RecentActivity activities={recentActivity} mode={mode} isLoading={isLoading} />
              </div>
              <div className="space-y-8 flex flex-col h-full">
                <Notifications notifications={notifications} mode={mode} isLoading={notificationsLoading} onMarkAsRead={markNotificationAsRead} onClearAll={clearAllNotifications} />
              </div>
            </div>
          </div>
        </div>

          <SimpleFooter mode={mode} />
        </div>
      </div>
    </div>
  );
}
