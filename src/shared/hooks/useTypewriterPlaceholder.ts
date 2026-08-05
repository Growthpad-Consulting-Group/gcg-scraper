"use client";

import { useEffect, useState } from "react";

const TYPE_MS = 55;
const DELETE_MS = 30;
const PAUSE_AFTER_TYPE_MS = 1400;
const PAUSE_AFTER_DELETE_MS = 300;

/**
 * Cycles through `examples`, typing and deleting each one, Firecrawl-playground style.
 * Purely cosmetic placeholder text — pass `active: false` (e.g. while the field has a value
 * or is focused) to freeze it so it doesn't fight the user's own input.
 */
export default function useTypewriterPlaceholder(examples: string[], active: boolean = true): string {
  const [text, setText] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "deleting">("typing");

  useEffect(() => {
    if (!active || examples.length === 0) return;
    const current = examples[exampleIndex % examples.length];

    if (phase === "typing") {
      if (text.length < current.length) {
        const t = setTimeout(() => setText(current.slice(0, text.length + 1)), TYPE_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("deleting"), PAUSE_AFTER_TYPE_MS);
      return () => clearTimeout(t);
    }

    // deleting
    if (text.length > 0) {
      const t = setTimeout(() => setText(current.slice(0, text.length - 1)), DELETE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setExampleIndex((i) => (i + 1) % examples.length);
      setPhase("typing");
    }, PAUSE_AFTER_DELETE_MS);
    return () => clearTimeout(t);
  }, [active, examples, exampleIndex, phase, text]);

  return text;
}
