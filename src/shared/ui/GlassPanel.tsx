"use client";

import { useEffect, useRef } from "react";

// Inject the SVG filter into <body> once, shared by all GlassPanel instances.
function useGlassFilter() {
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current || document.getElementById("glass-distortion-filter")) return;
    injected.current = true;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "glass-distortion-filter");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.overflow = "hidden";
    svg.innerHTML = `
      <defs>
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="2" seed="8" result="noise"/>
          <feGaussianBlur in="noise" stdDeviation="2" result="blurred"/>
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="18" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>`;
    document.body.appendChild(svg);
  }, []);
}

interface GlassPanelProps {
  mode?: "light" | "dark";
  className?: string;
  children: React.ReactNode;
  /** Shadow applied to the outer wrapper — defaults to the standard glass shadow */
  shadow?: string;
}

/**
 * Apple-style liquid glass panel.
 * Renders 3 stacked layers (distortion warp, tint, specular ring) behind children.
 * The SVG filter is injected into <body> once and shared across all instances.
 */
export default function GlassPanel({ mode = "light", className = "", shadow, children }: GlassPanelProps) {
  useGlassFilter();

  const defaultShadow =
    mode === "dark" ? "shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]" : "shadow-[0_8px_32px_0_rgba(31,38,135,0.12)]";

  return (
    <div className={`relative flex flex-col ${shadow ?? defaultShadow} ${className}`}>
      {/* overflow-hidden scoped to glass layers only so children (dropdowns) can escape */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
        {/* Layer 1: distortion warp */}
        <div aria-hidden style={{ filter: "url(#glass-distortion)" }} className="absolute inset-0 rounded-[inherit] backdrop-blur-[3px]" />
        {/* Layer 2: tint */}
        <div aria-hidden className={`absolute inset-0 rounded-[inherit] backdrop-saturate-[180%] ${mode === "dark" ? "bg-gray-900/30" : "bg-white/5"}`} />
        {/* Layer 3: specular border */}
        <div
          aria-hidden
          className={`absolute inset-0 rounded-[inherit] ${
            mode === "dark"
              ? "border border-white/[0.03] ring-0"
              : "border ring-inset border-white/10 ring-white/40"
          }`}
        />
      </div>
      <div className="relative flex flex-col min-h-0 flex-1 gap-4">{children}</div>
    </div>
  );
}
