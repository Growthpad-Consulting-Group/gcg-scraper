"use client";

import { useState, useEffect, FC } from "react";
import { Icon } from "@iconify/react";

interface FullscreenToggleProps {
  mode: "light" | "dark";
}

const FullscreenToggle: FC<FullscreenToggleProps> = ({ mode }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
        className={`focus:outline-none p-2 rounded-xl transition-all duration-300 backdrop-blur-md border ring-1 ring-inset ring-white/20 shadow-sm hover:shadow-md active:scale-95 ${
          mode === "dark" ? "bg-gray-700/50 border-white/10 text-gray-100 hover:bg-gray-600/60" : "bg-white/60 border-white/50 text-gray-700 hover:bg-white/80"
        }`}
      >
        <Icon icon={isFullscreen ? "solar:quit-full-screen-broken" : "solar:full-screen-broken"} className="h-5 w-5" />
      </button>

      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max bg-white text-gray-900 text-xs py-1 px-3 rounded-md shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 ease-in-out pointer-events-none ${
          mode === "dark" ? "text-gray-200" : "text-gray-900"
        } before:content-[''] before:absolute before:-top-1.5 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-white`}
      >
        {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      </div>
    </div>
  );
};

export default FullscreenToggle;
