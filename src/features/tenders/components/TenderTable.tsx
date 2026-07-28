"use client";

import { useState, useMemo, useEffect } from "react";
import { Icon } from "@iconify/react";
import TenderFilterSidebar from "./TenderFilterSidebar";
import TenderCard from "./TenderCard";
import ExportModal from "./ExportModal";
import TenderDetailsModal from "./TenderDetailsModal";
import toast from "react-hot-toast";

export default function TenderTable({ tenders, isLoading, mode, onDeleteTender }: { tenders: any[]; isLoading: boolean; mode: "light" | "dark"; onDeleteTender: (tender: any) => void }) {
  const itemsPerLoad = 9;

  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: "asc" | "desc" }>({ key: null, direction: "asc" });
  const [filterTenderType, setFilterTenderType] = useState("all");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterClosingSoon, setFilterClosingSoon] = useState(false);
  const [filterOpenTenders, setFilterOpenTenders] = useState(false);
  const [filterClosedTenders, setFilterClosedTenders] = useState(false);
  const [filterDocumentType, setFilterDocumentType] = useState("All Formats");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenderToDelete, setTenderToDelete] = useState<any>(null);
  const [visibleCount, setVisibleCount] = useState(itemsPerLoad);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [lastRunInfo, setLastRunInfo] = useState<{ date: string | null; taskName: string | null }>({ date: null, taskName: null });
  const [nextScheduleInfo, setNextScheduleInfo] = useState<{ date: string | null; taskNames: string[] }>({ date: null, taskNames: [] });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch("/api/scheduled-tasks");
        const data = await res.json();
        if (Array.isArray(data.tasks)) setTasks(data.tasks);
      } catch (err: any) {
        toast.error("Error fetching tasks: " + err.message);
      }
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    if (tasks.length === 0) return;

    let latestLastRun: Date | null = null;
    let lastRunTaskName: string | null = null;
    tasks.forEach((task) => {
      if (task.last_run) {
        const lastRunDate = new Date(task.last_run);
        if (!latestLastRun || lastRunDate > latestLastRun) {
          latestLastRun = lastRunDate;
          lastRunTaskName = task.name;
        }
      }
    });

    setLastRunInfo({ date: latestLastRun ? (latestLastRun as Date).toLocaleString() : "N/A", taskName: lastRunTaskName || "None" });

    const now = new Date();
    let closestNextSchedule: Date | null = null;
    const nextScheduleTasks: string[] = [];

    tasks.forEach((task) => {
      if (task.next_schedule && task.next_schedule !== "N/A") {
        const scheduleDate = new Date(task.next_schedule);
        if (scheduleDate > now) {
          if (!closestNextSchedule || scheduleDate < closestNextSchedule) {
            closestNextSchedule = scheduleDate;
            nextScheduleTasks.length = 0;
            nextScheduleTasks.push(task.name);
          } else if (scheduleDate.getTime() === (closestNextSchedule as Date).getTime()) {
            nextScheduleTasks.push(task.name);
          }
        }
      }
    });

    setNextScheduleInfo({ date: closestNextSchedule ? (closestNextSchedule as Date).toLocaleString() : "N/A", taskNames: nextScheduleTasks.length > 0 ? nextScheduleTasks : ["None"] });
  }, [tasks]);

  const closeModal = () => {
    setSelectedTender(null);
    setIsExportModalOpen(false);
    setIsDeleteModalOpen(false);
    setTenderToDelete(null);
  };

  const sortedAndFilteredTenders = useMemo(() => {
    let result = [...(tenders || [])];

    if (filterTenderType !== "all") {
      result = result.filter((tender) => tender.tender_type?.toLowerCase() === filterTenderType.toLowerCase());
    }
    if (filterLocation && filterLocation !== "All Locations") {
      result = result.filter((tender) => tender.location?.toLowerCase() === filterLocation.toLowerCase());
    }
    if (filterClosingSoon) {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      result = result.filter((tender) => {
        const closingDate = new Date(tender.closing_date);
        return closingDate >= now && closingDate <= sevenDaysFromNow;
      });
    }
    if (filterOpenTenders || filterClosedTenders) {
      result = result.filter((tender) => {
        if (filterOpenTenders && filterClosedTenders) return tender.status === "open" || tender.status === "closed";
        if (filterOpenTenders) return tender.status === "open";
        if (filterClosedTenders) return tender.status === "closed";
        return true;
      });
    }
    if (filterDocumentType !== "All Formats") {
      result = result.filter((tender) => tender.format?.toUpperCase() === filterDocumentType.toUpperCase());
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((tender) => tender.title?.toLowerCase().includes(query) || tender.description?.toLowerCase().includes(query) || tender.status?.toLowerCase().includes(query));
    }
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === "closing_date") {
          return sortConfig.direction === "asc" ? new Date(a.closing_date).getTime() - new Date(b.closing_date).getTime() : new Date(b.closing_date).getTime() - new Date(a.closing_date).getTime();
        }
        const key = sortConfig.key as string;
        return sortConfig.direction === "asc" ? String(a[key]).localeCompare(String(b[key])) : String(b[key]).localeCompare(String(a[key]));
      });
    }

    return result;
  }, [tenders, sortConfig, filterTenderType, filterLocation, filterClosingSoon, filterOpenTenders, filterClosedTenders, filterDocumentType, searchQuery]);

  const paginatedTenders = sortedAndFilteredTenders.slice(0, visibleCount);

  const tenderTypeColors = useMemo(() => {
    const availableColors = ["text-[#f05d23]", "text-blue-500", "text-green-500", "text-yellow-500", "text-purple-500", "text-pink-500", "text-indigo-500", "text-teal-500"];
    const typeColorMap: Record<string, string> = {};
    let colorIndex = 0;
    (tenders || []).forEach((tender) => {
      const type = tender.tender_type?.toLowerCase?.();
      if (type && !typeColorMap[type]) {
        typeColorMap[type] = availableColors[colorIndex % availableColors.length];
        colorIndex++;
      }
    });
    typeColorMap["all"] = "border-gray-400";
    return typeColorMap;
  }, [tenders]);

  const handleDeleteClick = (tender: any) => {
    setTenderToDelete(tender);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteTender = () => {
    if (tenderToDelete) {
      onDeleteTender(tenderToDelete);
      closeModal();
    }
  };

  const filteredTendersCount = filterTenderType === "all" ? tenders.length : tenders.filter((tender) => tender.tender_type?.toLowerCase() === filterTenderType.toLowerCase()).length;

  return (
    <div className="flex flex-col md:flex-row w-full h-auto md:h-[calc(100vh-300px)]">
      <div className={`w-full md:w-[300px] md:block ${sidebarOpen ? "block" : "hidden"} h-[calc(100vh-300px)] overflow-y-auto`}>
        <TenderFilterSidebar
          tenders={tenders}
          mode={mode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterTenderType={filterTenderType}
          setFilterTenderType={setFilterTenderType}
          filterLocation={filterLocation}
          setFilterLocation={setFilterLocation}
          sortConfig={sortConfig}
          setSortConfig={setSortConfig}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          filterClosingSoon={filterClosingSoon}
          setFilterClosingSoon={setFilterClosingSoon}
          filterOpenTenders={filterOpenTenders}
          setFilterOpenTenders={setFilterOpenTenders}
          filterClosedTenders={filterClosedTenders}
          setFilterClosedTenders={setFilterClosedTenders}
          filterDocumentType={filterDocumentType}
          setFilterDocumentType={setFilterDocumentType}
        />
      </div>

      <div className="md:hidden flex p-4">
        <button onClick={() => setSidebarOpen((prev) => !prev)} className="flex items-center gap-2 px-4 py-2 bg-[#f05d23] text-white rounded-full shadow-md">
          <Icon icon="mdi:filter-variant" width="20" height="20" />
          {sidebarOpen ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      <div className={`flex-1 p-4 md:p-6 overflow-y-auto h-full mx-6 ${mode === "dark" ? "bg-[#101827] text-white" : "bg-white text-[#231812]"}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <span className="relative inline-flex items-center justify-center rounded-full font-semibold group cursor-pointer" title={`Last run task: ${lastRunInfo.taskName}`}>
              Last run: {lastRunInfo.date}
            </span>
          </div>
          <span className="font-bold group relative cursor-pointer" title={`Next scheduled tasks: ${nextScheduleInfo.taskNames.join(", ")}`}>
            Next schedule: {nextScheduleInfo.date}
          </span>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold capitalize flex items-center">
            <Icon icon="bytesize:folder-open" width="24" height="24" className="mr-2 text-[#f05d23]" />
            {filterTenderType === "all" ? "All Tenders" : filterTenderType.charAt(0).toUpperCase() + filterTenderType.slice(1)} ({filteredTendersCount})
          </h3>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode((prev) => (prev === "grid" ? "list" : "grid"))}
              className={`flex items-center px-4 py-2 rounded-full font-semibold transition-all duration-300 ${mode === "dark" ? "bg-gray-700 text-white" : "bg-gray-100 text-[#231812] hover:bg-gray-200"}`}
            >
              <Icon icon={viewMode === "grid" ? "mdi:view-list" : "mdi:view-grid"} width="20" height="20" className="mr-2" />
              {viewMode === "grid" ? "List View" : "Grid View"}
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-300 ${mode === "dark" ? "bg-gray-700 text-white hover:text-white" : "bg-[#f05d23] text-white hover:text-black"} hover:bg-gray-200`}
            >
              <Icon icon="material-symbols:export-notes-outline-rounded" width="24" height="24" className="text-inherit" />
              Export Tenders
            </button>
          </div>
        </div>

        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
          {isLoading ? (
            <div className={viewMode === "grid" ? "col-span-3 flex justify-center items-center" : "flex justify-center items-center"}>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[#f05d23] border-t-transparent rounded-full animate-spin" role="status"></div>
                <span className={`mt-2 text-gray-500 dark:text-gray-400 ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>Loading tenders, please wait...</span>
              </div>
            </div>
          ) : paginatedTenders.length === 0 ? (
            <div className={viewMode === "grid" ? "col-span-3 text-center text-gray-500 dark:text-gray-400" : "text-center text-gray-500 dark:text-gray-400"}>No tenders found.</div>
          ) : (
            paginatedTenders.map((tender) => (
              <TenderCard key={tender.source_url} tender={tender} mode={mode} tenderTypeColors={tenderTypeColors} onClick={setSelectedTender} onDelete={handleDeleteClick} viewMode={viewMode} />
            ))
          )}
        </div>

        {isDeleteModalOpen && tenderToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-5 rounded-lg shadow-lg animate-fade-in ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} w-full max-w-sm`}>
              <h3 className="text-lg font-semibold mb-3">Confirm Deletion</h3>
              <p className="mb-3 text-sm">
                Are you sure you want to delete &quot;{tenderToDelete.title}&quot; from {tenderToDelete.tender_type}?
              </p>
              <div className="flex gap-2">
                <button onClick={handleDeleteTender} className="flex-1 px-3 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  Delete
                </button>
                <button
                  onClick={closeModal}
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm ${mode === "dark" ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} focus:outline-none focus:ring-2 focus:ring-gray-400`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {visibleCount < sortedAndFilteredTenders.length && (
          <div className="mt-8 flex justify-center">
            <button onClick={() => setVisibleCount((prev) => prev + itemsPerLoad)} className="px-6 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300">
              View More
            </button>
          </div>
        )}
      </div>

      {selectedTender && <TenderDetailsModal isOpen={!!selectedTender} onClose={closeModal} tender={selectedTender} mode={mode} />}

      {isExportModalOpen && <ExportModal isOpen={isExportModalOpen} onClose={closeModal} tenders={sortedAndFilteredTenders} mode={mode} />}
    </div>
  );
}
