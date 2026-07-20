"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, X, Send, TrendingUp, UserX, CalendarCheck, CheckCircle2, Package, Loader2, Mic, SquarePen, History, Volume2, VolumeX, Undo2 } from "lucide-react";
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
interface CopilotAction {
  id: string;
  label: string;
}
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  actions?: CopilotAction[];
  done?: boolean;
  undo?: { id: string; label: string };
  undone?: boolean;
}
interface ChatResponse {
  reply: string;
  undo?: { id: string; label: string };
  aiPowered: boolean;
  note: string;
  suggestions: string[];
  actions?: CopilotAction[];
}

const ICONS: Record<string, typeof TrendingUp> = {
  trending: TrendingUp,
  ghost: UserX,
  calendar: CalendarCheck,
  check: CheckCircle2,
  box: Package,
};

// One-tap shortcuts to the Copiloto's heaviest superpowers — the "10 segundos
// que valem horas" commands, for gestores who'd rather tap than type.
const POWER_CHIPS: { icon: string; label: string; prompt: string }[] = [
  { icon: "💸", label: "Onde perco dinheiro", prompt: "Onde estou perdendo dinheiro? Me dá o plano." },
  { icon: "🧮", label: "Fecha o mês", prompt: "Fecha o meu mês: faturamento, comissão de cada barbeiro e lucro." },
  { icon: "🧩", label: "Otimiza a agenda", prompt: "Otimiza minha agenda de hoje: onde tem tempo morto?" },
  { icon: "🔮", label: "E se subir 10%", prompt: "E se eu subir os preços em 10%? Simula o impacto." },
  { icon: "📅", label: "Escala da semana", prompt: "Monta a escala da semana pela demanda real." },
  { icon: "⭐", label: "Responder avaliações", prompt: "Como está minha reputação? Me ajuda a responder as avaliações." },
];

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
  const [note, setNote] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [conversations, setConversations] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [speak, setSpeak] = useState(false);

  const { data: briefing, refetch: refetchBriefing } = useQuery({
    queryKey: ["copilot-briefing"],
    queryFn: () => apiGet<{ cards: BriefingCard[]; locked?: boolean }>("/api/copilot/briefing"),
    enabled: open,
  });

  const [loadedHistory, setLoadedHistory] = useState(false);
  useEffect(() => {
    if (!open || loadedHistory) return;
    setLoadedHistory(true);
    apiGet<{ messages: ChatMsg[]; conversationId: string | null }>("/api/copilot/history")
      .then((r) => {
        if (r.messages?.length) {
          setMessages(r.messages);
          setConversationId(r.conversationId ?? `c${Date.now()}`);
        } else {
          setConversationId(`c${Date.now()}`);
        }
      })
      .catch(() => setConversationId(`c${Date.now()}`));
  }, [open, loadedHistory]);

  const loadConversations = async () => {
    try {
      const r = await apiGet<{ conversations: { id: string; title: string; updatedAt: string }[] }>("/api/copilot/conversations");
      setConversations(r.conversations ?? []);
    } catch {
      setConversations([]);
    }
  };

  const openConversation = async (id: string) => {
    setShowHistory(false);
    try {
      const r = await apiGet<{ messages: ChatMsg[] }>(`/api/copilot/history?conversationId=${encodeURIComponent(id)}`);
      setMessages(r.messages ?? []);
      setConversationId(id);
      setActionMsg(null);
    } catch {
      // ignore
    }
  };

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
      const cid = conversationId || `c${Date.now()}`;
      if (!conversationId) setConversationId(cid);
      const res = await apiPost<ChatResponse>("/api/copilot/chat", { messages: next, conversationId: cid });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, actions: res.actions, undo: res.undo }]);
      setNote(res.aiPowered ? null : res.note);
      if (speak && typeof window !== "undefined" && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(res.reply);
        u.lang = "pt-BR";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
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

  const runChatAction = async (idx: number, id: string) => {
    setBusyAction(id);
    try {
      const res = await apiPost<{ message: string }>("/api/copilot/action", { action: id });
      setMessages((m) => [...m.map((msg, i) => (i === idx ? { ...msg, done: true } : msg)), { role: "assistant" as const, content: `Feito! ${res.message}` }]);
      refetchBriefing();
    } catch {
      setActionMsg("Não foi possível executar.");
    } finally {
      setBusyAction(null);
      scrollToEnd();
    }
  };

  // Desfazer a última ação que o Copiloto executou. A confirmação aparece como
  // uma nova mensagem dele, para o gestor ver o que voltou ao normal.
  const undoAction = async (idx: number, undoId: string) => {
    setBusyAction(undoId);
    try {
      const res = await apiPost<{ message: string }>("/api/copilot/undo", { id: undoId });
      setMessages((m) => [...m.map((msg, i) => (i === idx ? { ...msg, undone: true } : msg)), { role: "assistant" as const, content: `Desfeito. ${res.message}` }]);
      refetchBriefing();
    } catch {
      setMessages((m) => [...m, { role: "assistant" as const, content: "Não consegui desfazer — o prazo pode ter passado ou algo mudou depois." }]);
    } finally {
      setBusyAction(null);
      scrollToEnd();
    }
  };

  const startNewChat = () => {
    // New thread — keeps the old conversation in history.
    setMessages([]);
    setActionMsg(null);
    setShowHistory(false);
    setConversationId(`c${Date.now()}`);
    refetchBriefing();
  };

  const toggleMic = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setActionMsg("Seu navegador não suporta ditado por voz.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setInput(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const cards = briefing?.cards ?? [];

  return (
    <>
      {/* Panel */}
      <div
        style={{ width: 400, maxWidth: "calc(100vw - 2rem)" }}
        className={cn(
          "fixed bottom-24 right-6 z-50 origin-bottom-right transition-all duration-200 ease-out",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <div className="flex h-[600px] max-h-[82vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-black">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight text-white">Copiloto</p>
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> online
              </p>
            </div>
            <button
              onClick={() => {
                const n = !speak;
                setSpeak(n);
                if (!n && typeof window !== "undefined") window.speechSynthesis?.cancel();
              }}
              className={cn("rounded-lg p-1.5 transition hover:bg-white/5", speak ? "text-amber-400" : "text-zinc-400 hover:text-white")}
              title={speak ? "Voz ligada" : "Ler respostas em voz alta"}
              aria-label="Voz de resposta"
            >
              {speak ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
            </button>
            <button
              onClick={() => {
                const n = !showHistory;
                setShowHistory(n);
                if (n) loadConversations();
              }}
              className={cn("rounded-lg p-1.5 transition hover:bg-white/5", showHistory ? "text-amber-400" : "text-zinc-400 hover:text-white")}
              title="Conversas"
              aria-label="Histórico de conversas"
            >
              <History className="h-[18px] w-[18px]" />
            </button>
            <button onClick={startNewChat} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white" title="Nova conversa" aria-label="Nova conversa">
              <SquarePen className="h-[18px] w-[18px]" />
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-3">
              {conversations.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-zinc-500">Nenhuma conversa salva ainda.</p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className={cn("flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition hover:bg-white/5", c.id === conversationId && "bg-white/[0.04]")}
                    >
                      <span className="truncate text-sm text-zinc-200">{c.title}</span>
                      <span className="mt-0.5 text-[10px] text-zinc-500">{new Date(c.updatedAt).toLocaleDateString("pt-BR")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {/* Estado inicial — limpo, estilo ChatGPT/Claude */}
            {messages.length === 0 && (
              <div className="px-4 py-6">
                {briefing?.locked ? (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm text-amber-200">
                    🔒 O Copiloto faz parte do plano <b>Pro</b>. Faça upgrade pra desbloquear.
                  </div>
                ) : (
                  <>
                    <div className="mb-6 mt-6 flex flex-col items-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/20">
                        <Sparkles className="h-7 w-7" />
                      </div>
                      <p className="text-lg font-semibold text-white">Como posso ajudar?</p>
                    </div>
                    {/* Atalhos dos superpoderes — 1 toque, pra quem não quer digitar */}
                    <div className="mb-6 flex flex-wrap justify-center gap-2">
                      {POWER_CHIPS.map((c) => (
                        <button
                          key={c.label}
                          onClick={() => send(c.prompt)}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200"
                        >
                          {c.icon} {c.label}
                        </button>
                      ))}
                    </div>
                    {cards.length > 0 && (
                      <div className="space-y-2">
                        <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Resumo de hoje</p>
                        {cards.map((c) => {
                          const Icon = ICONS[c.icon] ?? Sparkles;
                          return (
                            <div key={c.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
                              <div className="flex gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                                  <Icon className="h-[18px] w-[18px]" />
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
                                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-60"
                                >
                                  {busyAction === c.action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : c.action.label}
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {actionMsg && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{actionMsg}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Mensagens — estilo GPT/Claude (assistente em linha, usuário em balão sutil) */}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end px-4 py-1.5">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-zinc-800 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-100">{m.content}</div>
                </div>
              ) : (
                <div key={i} className="flex gap-3 px-4 py-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-black">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{m.content}</div>
                    {m.undo && !m.undone && (
                      <button
                        onClick={() => undoAction(i, m.undo!.id)}
                        disabled={!!busyAction}
                        className="mt-2 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                        title={m.undo.label}
                      >
                        {busyAction === m.undo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                        Desfazer
                      </button>
                    )}
                    {m.undone && <p className="mt-2 text-[11px] text-zinc-600">Ação desfeita.</p>}
                    {m.actions && !m.done && m.actions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {m.actions.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => runChatAction(i, a.id)}
                            disabled={!!busyAction}
                            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-60"
                          >
                            {busyAction === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>⚡</span>} {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            {sending && (
              <div className="flex gap-3 px-4 py-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-black">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
                </div>
              </div>
            )}
          </div>
          )}

          {note && <p className="px-4 pt-2 text-[11px] text-zinc-500">{note}</p>}

          {/* Input — caixa estilo ChatGPT */}
          <div className="p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-800 px-2 py-1.5 transition focus-within:border-amber-500/50">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={listening ? "Ouvindo…" : "Envie uma mensagem…"}
                className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
              <button
                onClick={toggleMic}
                title="Falar"
                aria-label="Ditar por voz"
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                  listening ? "bg-red-500/20 text-red-400" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Mic className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={() => send()}
                disabled={sending || !input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 px-5 text-black shadow-xl shadow-amber-500/40 ring-1 ring-white/20 transition-all hover:scale-105 hover:shadow-amber-500/60"
        aria-label="Copiloto"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6 transition-transform group-hover:rotate-12" />}
        {!open && <span className="text-sm font-bold">Copiloto</span>}
      </button>
    </>
  );
}
