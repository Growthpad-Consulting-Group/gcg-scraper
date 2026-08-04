"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface PopoverProps {
  trigger: (open: boolean) => ReactNode;
  children: ReactNode;
  className?: string;
}

/** Lightweight click-to-toggle popover — click outside or Escape closes it. */
export default function Popover({ trigger, children, className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}>
        {trigger(open)}
      </button>
      {open && (
        <div className={cn("absolute left-0 top-[calc(100%+6px)] z-20 rounded-lg border border-app-border bg-surface p-3 shadow-xl", className)}>
          {children}
        </div>
      )}
    </div>
  );
}
