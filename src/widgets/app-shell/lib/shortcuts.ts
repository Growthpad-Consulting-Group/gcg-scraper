"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** `G` + letter chord targets, mirroring Apify Console — keyed by href from sidebarNavGroups. */
export const NAV_SHORTCUTS: Record<string, string> = {
  "/overview": "h",
  "/tenders": "t",
  "/leads": "l",
  "/run-query": "q",
  "/scheduler": "s",
  "/keyword-manager": "k",
};

/** `G` then a letter jumps to the matching section from anywhere in the app. */
export function useNavShortcuts() {
  const router = useRouter();
  const [chordArmed, setChordArmed] = useState(false);

  useEffect(() => {
    let armedTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && ["INPUT", "TEXTAREA"].includes(target.tagName);
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      if (!chordArmed && e.key.toLowerCase() === "g") {
        setChordArmed(true);
        armedTimer = setTimeout(() => setChordArmed(false), 1200);
        return;
      }

      if (chordArmed) {
        setChordArmed(false);
        if (armedTimer) clearTimeout(armedTimer);
        const match = Object.entries(NAV_SHORTCUTS).find(([, key]) => key === e.key.toLowerCase());
        if (match) router.push(match[0]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (armedTimer) clearTimeout(armedTimer);
    };
  }, [chordArmed, router]);
}
