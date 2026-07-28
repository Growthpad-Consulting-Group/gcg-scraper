"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type KeywordRecord = { id: number | string; created_at?: string; tender_type?: string; [key: string]: any };

export function useKeywordTable({
  initialKeywords,
  setKeywords,
  apiEndpoint,
  keywordKey,
  title,
}: {
  initialKeywords: KeywordRecord[];
  setKeywords: (updater: (prev: KeywordRecord[]) => KeywordRecord[]) => void;
  apiEndpoint: string;
  keywordKey: string;
  title: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState<KeywordRecord | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<(number | string)[]>([]);
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({ [keywordKey]: "", tender_type: "" });
  const [sortField, setSortField] = useState(keywordKey);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingOperations, setPendingOperations] = useState<Record<string | number, string>>({});
  const itemsPerPage = 10;

  const filteredKeywords = initialKeywords.filter((keyword) => keyword[keywordKey]?.toLowerCase().includes(searchTerm.toLowerCase()));

  const sortedKeywords = [...filteredKeywords].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (sortField === "created_at") {
      return sortOrder === "asc" ? new Date(aValue).getTime() - new Date(bValue).getTime() : new Date(bValue).getTime() - new Date(aValue).getTime();
    }
    return sortOrder === "asc" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
  });

  const totalPages = Math.ceil(sortedKeywords.length / itemsPerPage);
  const paginatedKeywords = sortedKeywords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const toggleSelectKeyword = (id: number | string) => {
    setSelectedKeywords((prev) => (prev.includes(id) ? prev.filter((kid) => kid !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedKeywords.length === paginatedKeywords.length) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords(paginatedKeywords.map((k) => k.id));
    }
  };

  const handleAddKeyword = () => {
    const toastId = toast.loading(`Adding "${newKeyword[keywordKey]}"...`);
    const tempId = Date.now();
    const optimisticKeyword: KeywordRecord = {
      id: tempId,
      [keywordKey]: newKeyword[keywordKey],
      tender_type: title === "Relevant Keywords" ? newKeyword.tender_type : undefined,
      created_at: new Date().toUTCString(),
    };
    setKeywords((prev) => [...prev, optimisticKeyword]);
    setPendingOperations((prev) => ({ ...prev, [tempId]: "add" }));
    setNewKeyword({ [keywordKey]: "", tender_type: "" });
    setIsAddModalOpen(false);

    const payload: Record<string, string> = { [keywordKey]: newKeyword[keywordKey] };
    if (title === "Relevant Keywords") payload.tender_type = newKeyword.tender_type;

    fetch(apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to add "${newKeyword[keywordKey]}"`);
        if (data.keyword) {
          setKeywords((prev) => prev.map((k) => (k.id === tempId ? data.keyword : k)));
        }
        toast.success(`"${newKeyword[keywordKey]}" added successfully!`, { id: toastId });
      })
      .catch((error: Error) => {
        setKeywords((prev) => prev.filter((k) => k.id !== tempId));
        toast.error(error.message, { id: toastId });
      })
      .finally(() => {
        setPendingOperations((prev) => {
          const updated = { ...prev };
          delete updated[tempId];
          return updated;
        });
      });
  };

  const handleEditKeyword = () => {
    if (!currentKeyword) return;
    const toastId = toast.loading(`Updating "${currentKeyword[keywordKey]}"...`);
    const originalKeyword = { ...currentKeyword };
    const updatedKeyword = {
      ...currentKeyword,
      [keywordKey]: newKeyword[keywordKey],
      ...(title === "Relevant Keywords" && { tender_type: newKeyword.tender_type }),
    };
    setKeywords((prev) => prev.map((k) => (k.id === currentKeyword.id ? updatedKeyword : k)));
    setPendingOperations((prev) => ({ ...prev, [currentKeyword.id]: "edit" }));
    setIsEditModalOpen(false);

    const payload: Record<string, string> = { [keywordKey]: newKeyword[keywordKey] };
    if (title === "Relevant Keywords") payload.tender_type = newKeyword.tender_type;

    fetch(`${apiEndpoint}/${currentKeyword.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to update "${newKeyword[keywordKey]}"`);
        toast.success(`"${newKeyword[keywordKey]}" updated successfully!`, { id: toastId });
      })
      .catch((error: Error) => {
        setKeywords((prev) => prev.map((k) => (k.id === currentKeyword.id ? originalKeyword : k)));
        toast.error(error.message, { id: toastId });
      })
      .finally(() => {
        setPendingOperations((prev) => {
          const updated = { ...prev };
          delete updated[currentKeyword.id];
          return updated;
        });
      });
  };

  const handleDeleteKeyword = () => {
    if (!currentKeyword) return;
    const toastId = toast.loading(`Deleting "${currentKeyword[keywordKey]}"...`);
    const deletedKeyword = { ...currentKeyword };
    setKeywords((prev) => prev.filter((k) => k.id !== currentKeyword.id));
    setPendingOperations((prev) => ({ ...prev, [currentKeyword.id]: "delete" }));
    setIsDeleteModalOpen(false);
    setSelectedKeywords([]);

    fetch(`${apiEndpoint}/${currentKeyword.id}`, { method: "DELETE" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to delete "${currentKeyword[keywordKey]}"`);
        toast.success(`"${currentKeyword[keywordKey]}" deleted successfully!`, { id: toastId });
      })
      .catch((error: Error) => {
        setKeywords((prev) => [...prev, deletedKeyword]);
        toast.error(error.message, { id: toastId });
      })
      .finally(() => {
        setPendingOperations((prev) => {
          const updated = { ...prev };
          delete updated[currentKeyword.id];
          return updated;
        });
      });
  };

  const handleBulkDelete = () => {
    const toastId = toast.loading(`Deleting ${selectedKeywords.length} selected ${title.toLowerCase()}...`);
    const deletedKeywords = initialKeywords.filter((k) => selectedKeywords.includes(k.id));
    setKeywords((prev) => prev.filter((k) => !selectedKeywords.includes(k.id)));
    setPendingOperations((prev) => {
      const updated = { ...prev };
      selectedKeywords.forEach((id) => (updated[id] = "bulkDelete"));
      return updated;
    });
    setIsBulkDeleteModalOpen(false);
    const idsToDelete = [...selectedKeywords];
    setSelectedKeywords([]);

    fetch(apiEndpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: idsToDelete }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to delete selected ${title.toLowerCase()}`);
        toast.success("Selected keywords deleted successfully!", { id: toastId });
      })
      .catch((error: Error) => {
        setKeywords((prev) => [...prev, ...deletedKeywords]);
        toast.error(error.message, { id: toastId });
      })
      .finally(() => {
        setPendingOperations((prev) => {
          const updated = { ...prev };
          idsToDelete.forEach((id) => delete updated[id]);
          return updated;
        });
      });
  };

  return {
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
  };
}
