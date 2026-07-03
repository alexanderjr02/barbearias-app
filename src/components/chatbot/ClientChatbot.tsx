"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, ChevronRight, Phone, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
}

export interface ChatbotConfig {
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  faqItems: { question: string; answer: string }[];
  whatsapp?: string;
  address?: string;
  hours?: string;
}

const DEFAULT_CONFIG: ChatbotConfig = {
  name: "Assistente",
  welcomeMessage: "Olá! 👋 Como posso te ajudar hoje?\n\nPosso responder sobre horários, serviços, preços e agendamentos!",
  primaryColor: "#D4AF37",
  faqItems: [],
  whatsapp: "(11) 99999-9999",
  address: "Rua das Barbearias, 123 — São Paulo, SP",
  hours: "Seg–Sex: 9h–20h | Sáb: 9h–18h",
};

function buildResponder(config: ChatbotConfig) {
  const allFaq = [
    ...config.faqItems,
    {
      question: "horário funcionamento hora abre fecha quando",
      answer: config.hours
        ? `⏰ Nosso horário de funcionamento:\n\n${config.hours}\n\nPrecisa agendar? Clique em qualquer serviço acima!`
        : "Por favor, entre em contato para saber nosso horário de funcionamento.",
    },
    {
      question: "endereço localização onde fica bairro rua",
      answer: config.address
        ? `📍 Estamos em:\n\n${config.address}\n\nComo posso te ajudar mais?`
        : "Nosso endereço está disponível no site.",
    },
    {
      question: "whatsapp contato telefone ligar falar",
      answer: config.whatsapp
        ? `📱 Entre em contato pelo WhatsApp:\n\n**${config.whatsapp}**\n\nOu clique no botão do WhatsApp para falar diretamente conosco!`
        : "Use o botão de contato para falar com a gente.",
    },
    {
      question: "cancelar cancela desmarca agendamento muda",
      answer: "Para cancelar ou reagendar, entre em contato pelo WhatsApp com pelo menos 2 horas de antecedência. Sem problema! 😊",
    },
    {
      question: "pagamento pagar forma pix cartão dinheiro",
      answer: "Aceitamos:\n\n💳 Cartão de débito e crédito\n💰 PIX\n💵 Dinheiro\n\nPagamento na hora, ao final do serviço!",
    },
    {
      question: "criança infantil filho menino",
      answer: "Sim, atendemos crianças! 👦\n\nCorte infantil disponível com barbeiros experientes. Recomendamos agendar com antecedência, especialmente aos fins de semana.",
    },
  ];

  return (text: string): string => {
    const lower = text.toLowerCase();
    const match = allFaq.find(item =>
      item.question.split(" ").some(k => lower.includes(k))
    );
    return match?.answer ?? "Desculpe, não entendi sua pergunta. 😅\n\nVocê pode perguntar sobre:\n• Horários de funcionamento\n• Endereço\n• Serviços e preços\n• Formas de pagamento\n• Como agendar\n\nOu entre em contato pelo WhatsApp!";
  };
}

function MessageBubble({ msg, primaryColor }: { msg: Message; primaryColor: string }) {
  const isBot = msg.role === "bot";
  return (
    <div className={cn("flex gap-2", isBot ? "items-start" : "items-start justify-end")}>
      {isBot && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}
      <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
        isBot ? "bg-zinc-100 text-zinc-800 rounded-tl-sm" : "text-white rounded-tr-sm font-medium"
      )} style={isBot ? {} : { backgroundColor: primaryColor }}>
        {msg.content.split("\n").map((line, i, arr) => (
          <span key={i}>
            {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  slug?: string;
  barbershopName?: string;
  primaryColor?: string;
}

export function ClientChatbot({ slug, barbershopName = "Barbearia", primaryColor = "#D4AF37" }: Props) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ChatbotConfig>({ ...DEFAULT_CONFIG, primaryColor });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`cortix_chatbot_config`);
    const cfg = stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored), primaryColor } : { ...DEFAULT_CONFIG, primaryColor };
    setConfig(cfg);
    setMessages([{ id: "0", role: "bot", content: cfg.welcomeMessage }]);
  }, [primaryColor]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const respond = buildResponder(config);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(p => [...p, { id: Date.now().toString(), role: "user", content: text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "bot", content: respond(text) }]);
      setTyping(false);
    }, 800 + Math.random() * 500);
  };

  const quickReplies = [
    "Horário de funcionamento",
    "Como agendar?",
    "Formas de pagamento",
    "Onde fica?",
  ];

  const initials = barbershopName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => { setOpen(true); setHasUnread(false); }}
        className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all"
        style={{ backgroundColor: config.primaryColor, boxShadow: `0 8px 30px ${config.primaryColor}55` }}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {hasUnread && !open && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-white text-[9px] font-bold flex items-center justify-center">1</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-36 right-3 left-3 z-40 sm:left-auto sm:right-6 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200" style={{ maxHeight: "min(78dvh, 500px)" }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ backgroundColor: config.primaryColor }}>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
            <div>
              <p className="font-bold text-sm">{config.name}</p>
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-green-300" />
                Online agora
              </div>
            </div>
            {config.whatsapp && (
              <a href={`https://wa.me/55${config.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-xs px-2 py-1 rounded-full">
                <Phone className="w-3 h-3" /> WhatsApp
              </a>
            )}
            <button onClick={() => setOpen(false)} className={cn("text-white/70 hover:text-white transition-colors", config.whatsapp ? "ml-1" : "ml-auto")}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50" style={{ maxHeight: "300px" }}>
            {messages.map(m => <MessageBubble key={m.id} msg={m} primaryColor={config.primaryColor} />)}
            {typing && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.primaryColor }}>
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-zinc-50 border-t border-zinc-200">
              {quickReplies.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-full hover:border-zinc-400 transition-all flex items-center gap-1 shadow-sm">
                  {q} <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-zinc-200 bg-white flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Digite uma mensagem..."
              className="flex-1 h-9 px-3 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-800 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-all"
              style={{ "--tw-ring-color": config.primaryColor + "66" } as any}
            />
            <button onClick={() => send(input)} disabled={!input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90 text-white"
              style={{ backgroundColor: config.primaryColor }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
