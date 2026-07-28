"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { BaseKeyword } from "@/features/scraping/types";

export default function BaseKeywordsSelector({
  baseKeywords,
  selectedBaseKeywords,
  setSelectedBaseKeywords,
  mode,
}: {
  baseKeywords: BaseKeyword[];
  selectedBaseKeywords: string[];
  setSelectedBaseKeywords: (keywords: string[]) => void;
  mode: "light" | "dark";
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleKeyword = (keyword: string) => {
    if (selectedBaseKeywords.includes(keyword)) {
      setSelectedBaseKeywords(selectedBaseKeywords.filter((kw) => kw !== keyword));
      toast.success(`${keyword} deselected`);
    } else {
      setSelectedBaseKeywords([...selectedBaseKeywords, keyword]);
      toast.success(`${keyword} selected`);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">Select Base Keywords</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 rounded-lg border cursor-pointer flex items-center justify-between ${
          mode === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
        }`}
      >
        <span>{selectedBaseKeywords.length > 0 ? selectedBaseKeywords.join(", ") : "Select base keywords"}</span>
        <Icon icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"} width="20" height="20" />
      </div>

      <Link href="/keyword-manager">
        <span className="text-[#f05d23] hover:underline cursor-pointer font-medium text-sm italic ml-1">Click here to modify keywords</span>
      </Link>

      {isOpen && (
        <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto ${mode === "dark" ? "bg-gray-700 text-white" : "bg-white text-gray-900"}`}>
          {baseKeywords.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No base keywords available</div>
          ) : (
            baseKeywords.map((keywordObj) => (
              <div
                key={keywordObj.id}
                onClick={() => toggleKeyword(keywordObj.keyword)}
                className={`p-3 flex items-center gap-2 cursor-pointer hover:bg-gray-400 hover:text-white ${
                  selectedBaseKeywords.includes(keywordObj.keyword) ? "bg-gray-500 text-white" : ""
                }`}
              >
                <Icon icon={selectedBaseKeywords.includes(keywordObj.keyword) ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline"} width="20" height="20" />
                <span>{keywordObj.keyword}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
