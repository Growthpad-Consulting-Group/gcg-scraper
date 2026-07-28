import Link from "next/link";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

const ENGINE_ICONS: Record<string, string> = {
  Bing: "mdi:microsoft-bing",
  Yahoo: "mdi:yahoo",
  DuckDuckGo: "simple-icons:duckduckgo",
  Ecosia: "simple-icons:ecosia",
  Startpage: "simple-icons:startpage",
};

export default function PreviewLink({
  mode,
  previewUrls,
}: {
  mode: "light" | "dark";
  previewUrls: { engine: string; url: string }[];
}) {
  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!", { duration: 2000 });
  };

  return (
    <div
      className={`px-4 py-2 rounded-xl shadow-md transition-all duration-300 mb-8 ${
        mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"
      } max-h-[200px] overflow-y-auto`}
    >
      <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
        <Icon icon="mdi:link-variant" width="24" height="24" />
        Search URL Preview
      </h3>
      {previewUrls.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Select options to see the search URL preview.</p>
      ) : (
        <div className="space-y-4">
          {previewUrls.map(({ engine, url }, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform hover:-translate-y-1 ${
                mode === "dark" ? "border-gray-600 bg-gray-700 hover:bg-gray-600" : "border-gray-200 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon icon={ENGINE_ICONS[engine] || "mdi:search-web"} width="24" height="24" className="text-[#f05d23]" />
                <span className="text-sm font-medium">{engine}</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <p className={`text-sm truncate max-w-[300px] md:max-w-[500px] ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{url}</p>
                <div className="flex gap-3">
                  <button onClick={() => handleCopy(url)} className="text-[#f05d23] hover:underline text-sm font-medium flex items-center gap-1">
                    <Icon icon="mdi:content-copy" width="16" height="16" />
                    Copy
                  </button>
                  <Link href={url} target="_blank" rel="noopener noreferrer" className="text-[#f05d23] hover:underline text-sm font-medium flex items-center gap-1">
                    <Icon icon="mdi:open-in-new" width="16" height="16" />
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
