"use client";

import { Icon } from "@iconify/react";
import { useKeywordTable } from "@/features/keywords/hooks/useKeywordTable";
import { useEffect, useMemo } from "react";

type KeywordRecord = { id: number | string; created_at?: string; tender_type?: string; [key: string]: any };

export default function GenericKeywordTable({
  title,
  keywords,
  setKeywords,
  apiEndpoint,
  mode,
  keywordKey = "keyword",
  additionalFields = [],
  tenderTypeOptions = [],
}: {
  title: string;
  keywords: KeywordRecord[];
  setKeywords: (updater: (prev: KeywordRecord[]) => KeywordRecord[]) => void;
  apiEndpoint: string;
  mode: "light" | "dark";
  keywordKey?: string;
  additionalFields?: string[];
  tenderTypeOptions?: string[];
}) {
  const isDark = mode === "dark";
  const {
    searchTerm,
    setSearchTerm,
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isBulkDeleteModalOpen,
    setIsBulkDeleteModalOpen,
    currentKeyword,
    setCurrentKeyword,
    selectedKeywords,
    toggleSelectKeyword,
    toggleSelectAll,
    newKeyword,
    setNewKeyword,
    sortField,
    sortOrder,
    toggleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedKeywords,
    handleAddKeyword,
    handleEditKeyword,
    handleDeleteKeyword,
    handleBulkDelete,
    pendingOperations,
  } = useKeywordTable({ initialKeywords: keywords, setKeywords, apiEndpoint, keywordKey, title });

  const tenderTypes = useMemo(() => {
    const defaultTenderType = "Search Query Tenders";
    return tenderTypeOptions.length > 0 ? tenderTypeOptions : [defaultTenderType];
  }, [tenderTypeOptions]);

  useEffect(() => {
    if (additionalFields.includes("tender_type") && !newKeyword.tender_type) {
      setNewKeyword((prev) => ({ ...prev, tender_type: tenderTypes[0] }));
    }
  }, [newKeyword.tender_type, tenderTypes, additionalFields, setNewKeyword]);

  const handleRowClick = (keywordId: number | string, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.tagName === "BUTTON" || target.closest("svg")) return;
    toggleSelectKeyword(keywordId);
  };

  return (
    <div
      className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 border-t-2 border-[#f05d23] ${
        isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"
      }`}
      role="region"
      aria-label={`${title} table`}
    >
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-[#231812]"}`}>{title}</h2>
        <div className="flex gap-2">
          {selectedKeywords.length > 0 && (
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Icon icon="mdi:delete" width="18" height="18" />
              Delete Selected ({selectedKeywords.length})
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1 bg-[#f05d23] text-white rounded-md font-medium hover:bg-[#d04e1e] transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#f05d23]"
          >
            <Icon icon="mdi:plus" width="18" height="18" />
            Add
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`flex-1 p-2 rounded-md border text-sm ${isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-100 text-[#231812] border-gray-300"} focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
        />
        <div className="flex gap-2">
          <select
            value={sortField}
            onChange={(e) => toggleSort(e.target.value)}
            className={`p-2 rounded-md border text-sm ${isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-100 text-[#231812] border-gray-300"} focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
          >
            <option value={keywordKey}>{keywordKey === "term" ? "Term" : "Keyword"}</option>
            <option value="created_at">Date Added</option>
          </select>
          <button
            onClick={() => toggleSort(sortField)}
            className={`px-3 py-1 rounded-md font-medium text-sm ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
          >
            <Icon
              icon={sortOrder === "asc" ? (sortField === "created_at" ? "mdi:sort-calendar-ascending" : "mdi:sort-ascending") : sortField === "created_at" ? "mdi:sort-calendar-descending" : "mdi:sort-descending"}
              width="18"
              height="18"
            />
            Sort
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={`${isDark ? "bg-gray-700" : "bg-gray-200"} font-medium`}>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={selectedKeywords.length === paginatedKeywords.length && paginatedKeywords.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-[#f05d23] focus:ring-[#f05d23]"
                />
              </th>
              <th className="p-2">{keywordKey === "term" ? "Term" : "Keyword"}</th>
              {additionalFields.includes("tender_type") && <th className="p-2">Tender Type</th>}
              <th className="p-2">Created At</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedKeywords.length === 0 ? (
              <tr>
                <td colSpan={additionalFields.length + 4} className={`p-2 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  No {title.toLowerCase()} found.
                </td>
              </tr>
            ) : (
              paginatedKeywords.map((keyword) => {
                const createdAtDate = new Date(keyword.created_at || "");
                const displayDate = createdAtDate.toString() === "Invalid Date" ? "N/A" : createdAtDate.toLocaleDateString();
                return (
                  <tr
                    key={keyword.id}
                    onClick={(e) => handleRowClick(keyword.id, e)}
                    className={`border-t cursor-pointer ${isDark ? "border-gray-700" : "border-gray-200"} hover:bg-[#f05d23] hover:bg-opacity-10 transition-colors duration-200 ${
                      selectedKeywords.includes(keyword.id) ? "bg-[#f05d23] bg-opacity-5" : ""
                    }`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedKeywords.includes(keyword.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectKeyword(keyword.id);
                        }}
                        className="rounded border-gray-300 text-[#f05d23] focus:ring-[#f05d23]"
                      />
                    </td>
                    <td className="p-2 flex items-center">
                      {keyword[keywordKey]}
                      {pendingOperations[keyword.id] && <Icon icon="mdi:loading" className="inline-block ml-2 animate-spin text-gray-500" width="16" height="16" />}
                    </td>
                    {additionalFields.includes("tender_type") && <td className="p-2">{keyword.tender_type}</td>}
                    <td className="p-2">{displayDate}</td>
                    <td className="p-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentKeyword(keyword);
                          setNewKeyword({ [keywordKey]: keyword[keywordKey], tender_type: keyword.tender_type || tenderTypes[0] });
                          setIsEditModalOpen(true);
                        }}
                        className="text-[#f05d23] hover:text-[#d04e1e] focus:outline-none focus:ring-2 focus:ring-[#f05d23]"
                      >
                        <Icon icon="mdi:pencil" width="18" height="18" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentKeyword(keyword);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <Icon icon="mdi:delete" width="18" height="18" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-3 text-sm">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md font-medium ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
          >
            <Icon icon="mdi:chevron-left" width="18" height="18" />
            Prev
          </button>
          <span className={isDark ? "text-gray-300" : "text-gray-600"}>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md font-medium ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
          >
            Next
            <Icon icon="mdi:chevron-right" width="18" height="18" />
          </button>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-5 rounded-lg shadow-lg animate-fade-in ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} w-full max-w-sm`}>
            <h3 className="text-lg font-semibold mb-3">Add {title}</h3>
            <input
              type="text"
              placeholder={keywordKey === "term" ? "Enter term" : "Enter keyword"}
              value={newKeyword[keywordKey]}
              onChange={(e) => setNewKeyword({ ...newKeyword, [keywordKey]: e.target.value })}
              className={`w-full p-2 mb-3 rounded-md border text-sm ${isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-100 text-[#231812] border-gray-300"} focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
            />
            {additionalFields.includes("tender_type") && (
              <select
                value={newKeyword.tender_type || tenderTypes[0]}
                onChange={(e) => setNewKeyword({ ...newKeyword, tender_type: e.target.value })}
                className={`w-full p-2 mb-3 rounded-md border text-sm ${isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-100 text-[#231812] border-gray-300"} focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
              >
                {tenderTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={handleAddKeyword} className="flex-1 px-3 py-2 bg-[#f05d23] text-white rounded-md font-medium hover:bg-[#d04e1e] transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#f05d23]">
                Add
              </button>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`flex-1 px-3 py-2 rounded-md font-medium text-sm ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} focus:outline-none focus:ring-2 focus:ring-gray-400`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-5 rounded-lg shadow-lg animate-fade-in ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} w-full max-w-sm`}>
            <h3 className="text-lg font-semibold mb-3">Edit {title}</h3>
            <input
              type="text"
              placeholder={keywordKey === "term" ? "Enter term" : "Enter keyword"}
              value={newKeyword[keywordKey]}
              onChange={(e) => setNewKeyword({ ...newKeyword, [keywordKey]: e.target.value })}
              className={`w-full p-2 mb-3 rounded-md border text-sm ${isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-100 text-[#231812] border-gray-300"} focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
            />
            {additionalFields.includes("tender_type") && (
              <select
                value={newKeyword.tender_type || tenderTypes[0]}
                onChange={(e) => setNewKeyword({ ...newKeyword, tender_type: e.target.value })}
                className={`w-full p-2 mb-3 rounded-md border text-sm ${isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-100 text-[#231812] border-gray-300"} focus:outline-none focus:ring-2 focus:ring-[#f05d23]`}
              >
                {tenderTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={handleEditKeyword} className="flex-1 px-3 py-2 bg-[#f05d23] text-white rounded-md font-medium hover:bg-[#d04e1e] transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#f05d23]">
                Save
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className={`flex-1 px-3 py-2 rounded-md font-medium text-sm ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} focus:outline-none focus:ring-2 focus:ring-gray-400`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-lg z-40"></div>
          <div className={`relative p-5 rounded-lg shadow-lg animate-fade-in ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} w-full max-w-sm`}>
            <h3 className="text-lg font-semibold mb-3">Confirm Deletion</h3>
            <p className="mb-3 text-sm">
              Are you sure you want to delete &quot;{currentKeyword ? currentKeyword[keywordKey] : ""}&quot; from {title}?
            </p>
            <div className="flex gap-2">
              <button onClick={handleDeleteKeyword} className="flex-1 px-3 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                Delete
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className={`flex-1 px-3 py-2 rounded-md font-medium text-sm ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} focus:outline-none focus:ring-2 focus:ring-gray-400`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-5 rounded-lg shadow-lg animate-fade-in ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} w-full max-w-sm`}>
            <h3 className="text-lg font-semibold mb-3">Confirm Bulk Deletion</h3>
            <p className="mb-3 text-sm">
              Are you sure you want to delete {selectedKeywords.length} selected {title.toLowerCase()}?
            </p>
            <div className="flex gap-2">
              <button onClick={handleBulkDelete} className="flex-1 px-3 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                Delete
              </button>
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className={`flex-1 px-3 py-2 rounded-md font-medium text-sm ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} focus:outline-none focus:ring-2 focus:ring-gray-400`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
