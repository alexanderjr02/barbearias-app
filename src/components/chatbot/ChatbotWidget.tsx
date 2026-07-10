"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Scissors, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { nextMessageId, randomDelay } from "@/lib/chatWidget";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

const BOT_RESPONSES: Record<string, string[]> = {
  greeting: [
    "Olá! 👋 Bem-vindo à nossa barbearia! Sou o assistente virtual. Como posso ajudar você hoje?",
  ],
  horario: [
    "Nosso horário de funcionamento é:\n\n🕐 Segunda a Sexta: 9h às 20h\n🕐 Sábado: 9h às 18h\n🕐 Domingo: 10h às 16h",
  ],
  servico: [
    "Temos os seguintes serviços:\n\n✂️ Corte de Cabelo - R$ 35\n🪒 Barba - R$ 25\n✂️🪒 Corte + Barba - R$ 55\n💆 Tratamento Capilar - R$ 45\n\nQuer agendar algum serviço?",
  ],
  agendar: [
    "Para agendar, você pode:\n\n1️⃣ Usar nossa agenda online (botão 'Agendar' no site)\n2️⃣ Ligar para nós: (11) 99999-9999\n3️⃣ Nos chamar no WhatsApp\n\nQuer que eu te ajude a fazer o agendamento agora?",
  ],
  preco: [
    "Nossos preços:\n\n✂️ Corte simples: R$ 35\n✂️ Corte degradê: R$ 45\n🪒 Barba: R$ 25\n✂️🪒 Combo corte + barba: R$ 55\n💆 Tratamento: R$ 45\n\nTodos os serviços incluem lavagem e finalização!",
  ],
  default: [
    "Entendi! Para mais informações, você pode:\n\n📞 Nos ligar: (11) 99999-9999\n💬 WhatsApp: (11) 99999-9999\n📍 Nos visitar: Rua das Barbearias, 123\n\nOu clique em 'Agendar' para marcar seu horário agora mesmo!",
  ],
};

function getBotResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.match(/olá|oi|hey|bom dia|boa tarde|boa noite|tudo bem/)) {
    return BOT_RESPONSES.greeting[0];
  }
  if (lower.match(/horário|hora|funciona|abre|fecha|quando/)) {
    return BOT_RESPONSES.horario[0];
  }
  if (lower.match(/serviço|serviços|faz|oferece|que tem|opção/)) {
    return BOT_RESPONSES.servico[0];
  }
  if (lower.match(/agendar|agendamento|marcar|reservar|quero/)) {
    return BOT_RESPONSES.agendar[0];
  }
  if (lower.match(/preço|valor|quanto|custa|custo|tabela/)) {
    return BOT_RESPONSES.preco[0];
  }
  return BOT_RESPONSES.default[0];
}

const QUICK_REPLIES = [
  "Quero agendar",
  "Ver serviços",
  "Preços",
  "Horário de funcionamento",
];

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      content:
        "Olá! 👋 Sou o assistente virtual da barbearia. Como posso te ajudar hoje?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: nextMessageId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const botMessage: Message = {
        id: nextMessageId(),
        role: "bot",
        content: getBotResponse(content),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, randomDelay(1000, 500));
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-yellow-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-black">Assistente CORTIX</p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-black/70">Online agora</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-black/70 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line",
                    msg.role === "user"
                      ? "bg-amber-500 text-black font-medium rounded-tr-sm"
                      : "bg-zinc-800 text-zinc-200 rounded-tl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                onClick={() => sendMessage(reply)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1 rounded-full transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={() => sendMessage(input)}
                className="w-9 h-9 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-xl flex items-center justify-center text-black hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110",
          isOpen
            ? "bg-zinc-800 border border-zinc-700 text-zinc-300"
            : "bg-gradient-to-br from-amber-500 to-yellow-400 text-black"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {!isOpen && (
        <div className="absolute -top-2 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
          <span className="text-xs font-bold text-white">1</span>
        </div>
      )}
    </div>
  );
}
