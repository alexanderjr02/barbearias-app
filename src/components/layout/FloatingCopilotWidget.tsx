"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, X, Send, TrendingUp, UserX, CalendarCheck, CheckCircle2, Package, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

interface BriefingCard {
  id: string;
  kind: string;
  icon: string;
  title: string;
  body: string;
  action?: { id: string; label: string };
  count: number;
}
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}
interface ChatResponse {
  reply: string;
  aiPowered: boolean;
  note: string;
  suggestions: string[];
}

const ICONS: Record<string, typeof TrendingUp> = {
  trending: TrendingUp,
  ghost: UserX,
  calendar: CalendarCheck,
  check: CheckCircle2,
  box: Package,
};

// The Copiloto — a business assistant surfaced as an always-reachable floating
// chat, replacing the old support bubble (support now lives in the sidebar).
// Shows the proactive daily briefing with one-tap actions plus a chat that
// answers about the business. Works in "simulated" mode until an Anthropic key
// is configured server-side.
export function FloatingCopilotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(["Quanto faturei essa semana?", "Quais clientes sumiram?", "Tenho horário vazio hoje?"]);
  const [note, setNote] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: briefing, refetch: refetchBriefing } = useQuery({
    queryKey: ["copilot-briefing"],
    queryFn: () => apiGet<{ cards: BriefingCard[]; locked?: boolean }>("/api/copilot/briefing"),
    enabled: open,
  });

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || sending) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setSending(true);
    scrollToEnd();
    try {
      const res = await apiPost<ChatResponse>("/api/copilot/chat", { messages: next });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.suggestions?.length) setSuggestions(res.suggestions);
      setNote(res.aiPowered ? null : res.note);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Não consegui responder agora. Tente de novo." }]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  const runAction = async (id: string) => {
    setBusyAction(id);
    setActionMsg(null);
    try {
      const res = await apiPost<{ message: string }>("/api/copilot/action", { action: id });
      setActionMsg(res.message);
      refetchBriefing();
    } catch {
      setActionMsg("Não foi possível executar.");
    } finally {
      setBusyAction(null);
    }
  };

  const cards = briefing?.cards ?? [];

  return (
    <>
      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] origin-bottom-right transition-all duration-200",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"
        )}
      >
        <div className="flex h-[560px] max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-3 text-black">
            <Sparkles className="h-5 w-5" />
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">Copiloto</p>
              <p className="text-[11px] opacity-70">Seu assistente de negócio</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-black/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {briefing?.locked && messages.length === 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                <span className="text-lg">🔒</span>
                <p>O Copiloto faz parte do plano <b>Pro</b>. Faça upgrade pra desbloquear o resumo do dia e o assistente com IA.</p>
              </div>
            )}
            {/* Briefing */}
            {cards.length > 0 && messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400">Seu resumo de hoje</p>
                {cards.map((c) => {
                  const Icon = ICONS[c.icon] ?? Sparkles;
                  return (
                    <div key={c.id} className="rounded-xl border border-zinc-700/60 bg-zinc-800/50 p-3">
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{c.title}</p>
                          <p className="mt-0.5 text-xs leading-snug text-zinc-400">{c.body}</p>
                        </div>
                      </div>
                      {c.action && (
                        <button
                          onClick={() => runAction(c.action!.id)}
                          disabled={busyAction === c.action.id}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-1.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-60"
                        >
                          {busyAction === c.action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : c.action.label}
                        </button>
                      )}
                    </div>
                  );
                })}
                {actionMsg && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{actionMsg}</p>}
              </div>
            )}

            {messages.length === 0 && (
              <p className="pt-1 text-xs text-zinc-500">Pergunte em português — eu leio os dados reais da sua barbearia.</p>
            )}

            {/* Chat */}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                    m.role === "user" ? "rounded-br-sm bg-amber-500 text-black" : "rounded-bl-sm border border-zinc-700/60 bg-zinc-800 text-zinc-100"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> pensando…
              </div>
            )}
          </div>

          {/* Suggestions */}
          {!sending && (
            <div className="flex gap-2 overflow-x-auto border-t border-zinc-800 px-3 py-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400 hover:bg-amber-500/20"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {note && <p className="px-4 pt-1 text-[11px] text-zinc-500">{note}</p>}

          {/* Input */}
          <div className="flex items-center gap-2 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pergunte algo…"
              className="flex-1 rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
            <button
              onClick={() => send()}
              disabled={sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 px-5 text-black shadow-lg shadow-amber-500/40 transition-transform hover:scale-105"
        aria-label="Copiloto"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        {!open && <span className="text-sm font-bold">Copiloto</span>}
      </button>
    </>
  );
}
