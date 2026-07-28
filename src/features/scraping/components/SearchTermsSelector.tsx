import type { SearchTerm } from "@/features/scraping/types";

export default function SearchTermsSelector({
  searchTerms,
  selectedTerms,
  setSelectedTerms,
  mode,
}: {
  searchTerms: SearchTerm[];
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
  mode: "light" | "dark";
}) {
  const toggleTerm = (term: string) => {
    if (selectedTerms.includes(term)) {
      setSelectedTerms(selectedTerms.filter((t) => t !== term));
    } else {
      setSelectedTerms([...selectedTerms, term]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTerms.length === searchTerms.length) {
      setSelectedTerms([]);
    } else {
      setSelectedTerms(searchTerms.map((t) => t.term));
    }
  };

  const isDark = mode === "dark";

  return (
    <div className="space-y-2 flex-1">
      <div className="flex items-center justify-between">
        <label className={`text-lg font-semibold ${isDark ? "text-white" : "text-[#231812]"}`}>Select Search Terms:</label>
        <button
          onClick={toggleSelectAll}
          className={`text-sm px-3 py-1 rounded-full border-2 transition-all duration-300 font-medium ${
            selectedTerms.length === searchTerms.length
              ? "border-[#f05d23] bg-[#f05d23] text-white"
              : isDark
              ? "border-gray-600 text-white hover:border-white"
              : "border-gray-300 text-[#231812] hover:border-[#231812]"
          }`}
        >
          {selectedTerms.length === searchTerms.length ? "Deselect All" : "Select All"}
        </button>
      </div>

      <div className={`max-h-40 overflow-y-auto pr-2 rounded-md ${isDark ? "bg-gray-700" : "bg-white"}`}>
        <div className="grid grid-cols-2 gap-4 p-2">
          {searchTerms.map((term) => (
            <label key={term.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTerms.includes(term.term)}
                onChange={() => toggleTerm(term.term)}
                className="form-checkbox h-5 w-5 text-[#f05d23] border-gray-300 dark:border-gray-600"
              />
              <span className={`text-sm ${isDark ? "text-white" : "text-gray-700"}`}>{term.term}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
