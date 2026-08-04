"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";

export interface LogLine {
  text: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

const TONE_CLASSES: Record<NonNullable<LogLine["tone"]>, string> = {
  default: "text-zinc-300",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
  info: "text-status-info",
};

interface LogPanelProps {
  lines: LogLine[];
  className?: string;
  emptyLabel?: string;
  autoScroll?: boolean;
}

/** Dark terminal-style monospace panel with auto-scroll, e.g. run detail logs and Run Query streaming. */
export default function LogPanel({ lines, className, emptyLabel = "waiting for output…", autoScroll = true }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, autoScroll]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "h-full min-h-[240px] overflow-y-auto rounded-lg border border-zinc-800 bg-[#0b0c0e] p-3 font-mono text-xs leading-relaxed",
        className
      )}
    >
      {lines.length === 0 ? (
        <span className="text-zinc-600">{emptyLabel}</span>
      ) : (
        lines.map((line, i) => (
          <div key={i} className={cn("whitespace-pre-wrap", TONE_CLASSES[line.tone ?? "default"])}>
            {line.text}
          </div>
        ))
      )}
    </div>
  );
}
