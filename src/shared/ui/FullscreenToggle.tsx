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
        className="relative z-2 p-2 rounded-full transition-all active:scale-95 hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-100"
      >
        <Icon
          icon={isFullscreen ? "solar:quit-full-screen-broken" : "solar:full-screen-broken"}
          className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
        />
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
