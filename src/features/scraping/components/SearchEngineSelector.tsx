import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

const ENGINES = [
  { name: "Bing", icon: "mdi:microsoft-bing" },
  { name: "Yahoo", icon: "mdi:yahoo" },
  { name: "DuckDuckGo", icon: "simple-icons:duckduckgo" },
  { name: "Ecosia", icon: "simple-icons:ecosia" },
  { name: "Startpage", icon: "simple-icons:startpage" },
];

export default function SearchEngineSelector({
  selectedEngines,
  setSelectedEngines,
  mode,
}: {
  selectedEngines: string[];
  setSelectedEngines: (engines: string[]) => void;
  mode: "light" | "dark";
}) {
  const isDark = mode === "dark";

  const toggleEngine = (engine: string) => {
    if (selectedEngines.includes(engine)) {
      setSelectedEngines(selectedEngines.filter((e) => e !== engine));
      toast.success(`${engine} deselected`);
    } else {
      setSelectedEngines([...selectedEngines, engine]);
      toast.success(`${engine} selected`);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEngines.length === ENGINES.length) {
      setSelectedEngines([]);
      toast.success("All engines deselected");
    } else {
      setSelectedEngines(ENGINES.map((e) => e.name));
      toast.success("All engines selected");
    }
  };

  return (
    <div className="space-y-2">
      <label className={`text-lg font-semibold ${isDark ? "text-white" : "text-[#231812]"}`}>Select Search Engines:</label>
      <div className="flex flex-wrap gap-3">
        {ENGINES.map((engine) => {
          const isSelected = selectedEngines.includes(engine.name);
          return (
            <label key={engine.name} className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={isSelected} onChange={() => toggleEngine(engine.name)} className="hidden" />
              <div
                className={`p-2 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? "border-[#f05d23] bg-[#f05d23] text-white"
                    : isDark
                    ? "border-gray-600 bg-gray-800 text-white hover:border-white"
                    : "border-gray-300 bg-white text-[#231812] hover:border-[#231812]"
                }`}
              >
                <Icon icon={engine.icon} width="20" height="20" />
              </div>
              <span className={`text-sm font-medium ${isDark ? "text-white" : "text-[#231812]"}`}>{engine.name}</span>
            </label>
          );
        })}

        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" checked={selectedEngines.length === ENGINES.length} onChange={toggleSelectAll} className="hidden" />
          <div
            className={`p-2 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
              selectedEngines.length === ENGINES.length
                ? "border-[#f05d23] bg-[#f05d23] text-white"
                : isDark
                ? "border-gray-600 bg-gray-800 text-white hover:border-white"
                : "border-gray-300 bg-white text-[#231812] hover:border-[#231812]"
            }`}
          >
            <Icon icon="mdi:check-all" width="20" height="20" />
          </div>
          <span className={`text-sm font-medium ${isDark ? "text-white" : "text-[#231812]"}`}>All</span>
        </label>
      </div>
    </div>
  );
}
