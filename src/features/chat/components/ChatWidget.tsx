"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How many open tenders do we have?",
  "Which tracked sites are overdue for a re-scrape?",
  "What keywords should I try next?",
];

const RUN_QUERY_HINT_KEY = "gcg_chat_hint_seen:run-query";

export default function ChatWidget() {
  const { resolvedMode: mode } = useTheme();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showRunQueryHint, setShowRunQueryHint] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  // One-time nudge on Run Query — never auto-opens the panel, just points at the bubble until
  // dismissed (or the user opens the chat at all, anywhere).
  useEffect(() => {
    if (isOpen || typeof window === "undefined") return;
    if (!pathname?.startsWith("/run-query")) {
      setShowRunQueryHint(false);
      return;
    }
    if (localStorage.getItem(RUN_QUERY_HINT_KEY)) return;
    const t = setTimeout(() => setShowRunQueryHint(true), 1200);
    return () => clearTimeout(t);
  }, [pathname, isOpen]);

  const dismissRunQueryHint = () => {
    setShowRunQueryHint(false);
    localStorage.setItem(RUN_QUERY_HINT_KEY, "1");
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.message || "I don't have an answer for that." }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry — ${err.message}` }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <GlassPanel mode={mode} className="flex h-[520px] w-96 flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon icon="solar:chat-round-dots-broken" width={18} className="text-brand-500" />
              <span className="text-sm font-semibold text-text-hi">Ask about your data</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-text-lo hover:text-text-hi">
              <Icon icon="solar:close-circle-broken" width={18} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Icon icon="solar:chat-round-dots-broken" width={32} className="text-text-lo" />
                <p className="text-sm text-text-lo">Ask about tenders, leads, runs, or schedules.</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-md border border-app-border px-3 py-1.5 text-xs text-text-lo hover:border-brand-500 hover:text-brand-500"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                        m.role === "user" ? "bg-brand-500 text-white" : "bg-surface-2 text-text-hi"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text-lo">
                      <Icon icon="mdi:loading" width={14} className="animate-spin" />
                      Looking that up…
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-app-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="h-9 flex-1 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              <Icon icon="solar:arrow-up-broken" width={16} />
            </button>
          </form>
        </GlassPanel>
      )}

      {showRunQueryHint && (
        <div className="flex items-center gap-2 rounded-lg border border-app-border bg-surface px-3 py-2 text-xs text-text-hi shadow-lg">
          <span>Need help picking keywords or a source? Ask →</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissRunQueryHint();
            }}
            className="text-text-lo hover:text-text-hi"
          >
            <Icon icon="mdi:close" width={12} />
          </button>
        </div>
      )}

      <button
        onClick={() => {
          setIsOpen((o) => !o);
          dismissRunQueryHint();
        }}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        title="Ask about your data"
      >
        {!isOpen && <span className="absolute inset-0 -z-10 animate-chat-pulse rounded-full bg-brand-500" />}
        <Icon icon={isOpen ? "solar:close-circle-broken" : "solar:chat-round-dots-broken"} width={22} />
      </button>
    </div>
  );
}
