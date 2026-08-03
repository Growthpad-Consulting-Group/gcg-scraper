"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/widgets/app-shell/ui/Sidebar";
import Header from "@/widgets/app-shell/ui/Header";
import PageHeader from "@/shared/ui/PageHeader";
import SimpleFooter from "@/shared/ui/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import BaseKeywordsTable from "@/features/keywords/components/BaseKeywordsTable";
import RelevantKeywordsTable from "@/features/keywords/components/RelevantKeywordsTable";
import ClosingKeywordsTable from "@/features/keywords/components/ClosingKeywordsTable";
import SearchTermsTable from "@/features/keywords/components/SearchTermsTable";
import { Icon } from "@iconify/react";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import MetricCard from "@/shared/ui/MetricCard";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { motion } from "framer-motion";

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
  const { resolvedMode: mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { user, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead } = useNotifications();

  const [baseKeywords, setBaseKeywords] = useState<any[]>([]);
  const [relevantKeywords, setRelevantKeywords] = useState<any[]>([]);
  const [closingKeywords, setClosingKeywords] = useState<any[]>([]);
  const [searchTerms, setSearchTerms] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("base");
  const [loading, setLoading] = useState(true);

  const fetchWithCache = useCallback(
    async (endpoint: string, cacheKey: string, unwrap?: (body: any) => any[]) => {
      const cached = readCache(cacheKey);
      if (cached) return cached;
      const res = await fetch(endpoint);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Failed to load ${endpoint}`);
      const data = unwrap ? unwrap(body) : body;
      writeCache(cacheKey, data);
      return data;
    },
    []
  );

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [base, relevant, closing, terms] = await Promise.all([
          fetchWithCache("/api/base-keywords", "base_keywords"),
          fetchWithCache("/api/relevant-keywords", "relevant_keywords"),
          fetchWithCache("/api/closing-keywords", "closing_keywords"),
          fetchWithCache("/api/search-terms", "search_terms", (body) => body.search_terms),
        ]);
        setBaseKeywords(base);
        setRelevantKeywords(relevant);
        setClosingKeywords(closing);
        setSearchTerms(terms);
      } catch (err: any) {
        setError(`Failed to load keyword data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [fetchWithCache]);

  const tabs = [
    {
      id: "base",
      label: "Base Keywords",
      description: "Define core keywords like 'rfp,' 'rfq,' and 'tender' that are included in every search query to ensure comprehensive results.",
      icon: "mdi:database",
      component: BaseKeywordsTable,
      props: { keywords: baseKeywords, setKeywords: setBaseKeywords, mode },
    },
    {
      id: "search",
      label: "Search Terms",
      description: 'Custom search phrases used to query tenders across the web. These may include industry-specific combinations like "Web Development rfp" or "animation tender Kenya."',
      icon: "mdi:magnify",
      component: SearchTermsTable,
      props: { keywords: searchTerms, setKeywords: setSearchTerms, mode },
    },
    {
      id: "directory",
      label: "Relevant Keywords",
      description: "Specify keywords used to filter and refine search results, ensuring only the most relevant tenders are stored.",
      icon: "mdi:folder-search",
      component: RelevantKeywordsTable,
      props: { keywords: relevantKeywords, setKeywords: setRelevantKeywords, mode },
    },
    {
      id: "closing",
      label: "Closing Keywords",
      description: "Configure keywords like 'due by' or 'deadline' to identify and track the closing dates of tender documents.",
      icon: "mdi:check-circle",
      component: ClosingKeywordsTable,
      props: { keywords: closingKeywords, setKeywords: setClosingKeywords, mode },
    },
  ];

  const handleTabChange = (tabId: string) => setActiveTab(tabId);

  return (
    <div className={`min-h-screen flex flex-col ${mode === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"}`}>
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
          />
        <div className="flex-1 transition-all duration-300 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            <PageHeader
              title="Keyword Manager"
              description="Monitor and manage your keyword collection."
              icon="mdi:tag"
              mode={mode}
            />

            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 mb-10">
                <MetricCard title="Base Keywords" value={baseKeywords.length} icon="mdi:database" color="blue" mode={mode} onClick={() => handleTabChange("base")} />
                <MetricCard title="Search Terms" value={searchTerms.length} icon="mdi:magnify" color="red" mode={mode} onClick={() => handleTabChange("search")} />
                <MetricCard title="Relevant Keywords" value={relevantKeywords.length} icon="mdi:folder-search" color="green" mode={mode} onClick={() => handleTabChange("directory")} />
                <MetricCard title="Closing Keywords" value={closingKeywords.length} icon="mdi:check-circle" color="yellow" mode={mode} onClick={() => handleTabChange("closing")} />
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Icon icon="mdi:alert-circle" className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className={`flex justify-center items-center h-64 rounded-xl ${mode === "dark" ? "bg-gray-800" : "bg-white"} shadow-lg`}>
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-300 border-opacity-30 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-[#f05d23] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                  </div>
                  <p className={`mt-4 text-lg font-medium ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>Loading keywords...</p>
                </div>
              </div>
            ) : (
              <div className={`bg-opacity-80 rounded-xl shadow-xl overflow-hidden ${mode === "dark" ? "bg-gray-800" : "bg-white"}`}>
                <div className={`px-4 sm:px-6 ${mode === "dark" ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex overflow-x-auto py-3 gap-2 scrollbar-hide">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center px-5 py-3 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                          activeTab === tab.id
                            ? `bg-[#f05d23] bg-opacity-10 text-[#f05d23] ${mode === "dark" ? "ring-1 ring-[#f05d23] ring-opacity-40" : "shadow-sm"}`
                            : `hover:bg-opacity-5 ${mode === "dark" ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"}`
                        }`}
                      >
                        <Icon icon={tab.icon} className="w-5 h-5 mr-2" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`border-t ${mode === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="p-4 sm:p-6">
                    <div className="animate-fade-in">
                      {tabs.map((tab) =>
                        activeTab === tab.id ? (
                          <div key={tab.id}>
                            <motion.p
                              className={`mb-6 text-sm font-medium flex items-center space-x-2 ${mode === "dark" ? "text-gray-300 bg-gray-800/50" : "text-gray-600 bg-gray-100"} p-3 rounded-md`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Icon icon="mdi:information-outline" className="w-4 h-4" />
                              <span>{tab.description}</span>
                            </motion.p>
                            <tab.component {...(tab.props as any)} />
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

          <SimpleFooter mode={mode} />
        </div>
      </div>
    </div>
  );
}
