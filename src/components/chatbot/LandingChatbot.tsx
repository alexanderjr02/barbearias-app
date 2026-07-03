"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Scissors, Bot, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
}

const RESPONSES: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["preço", "valor", "quanto", "custa", "plano", "planos", "mensalidade"],
    answer: "Temos 3 planos:\n\n🆓 **Starter** — Grátis para sempre\n• 50 agendamentos/mês • 1 barbeiro • Chatbot básico\n\n⚡ **Pro** — R$ 97/mês\n• Agendamentos ilimitados • 10 barbeiros • Chatbot personalizável • WhatsApp • Relatórios avançados\n\n👑 **Enterprise** — R$ 197/mês\n• Tudo do Pro + múltiplas unidades, API, domínio próprio\n\nTodos têm **14 dias grátis**! Quer saber mais sobre algum?",
  },
  {
    keywords: ["funcionalidade", "recurso", "o que faz", "features", "o que tem", "inclui"],
    answer: "O CORTIX oferece tudo que sua barbearia precisa:\n\n✂️ **Agendamento online** — página personalizada 24/7\n💬 **Chatbot inteligente** — no site e WhatsApp\n💰 **Financeiro** — receitas, despesas e comissões\n📊 **Relatórios** — análises completas do negócio\n👥 **Clientes** — histórico, VIPs e programa de fidelidade\n👨‍💼 **Equipe** — controle de barbeiros e comissões\n📦 **Estoque** — alertas automáticos\n📣 **Marketing** — campanhas WhatsApp, Email e SMS\n\nQuer ver uma demonstração ao vivo?",
  },
  {
    keywords: ["whatsapp", "integração", "api", "mensagem automática"],
    answer: "Sim! No plano **Pro e Enterprise** você tem integração completa com WhatsApp Business API:\n\n• Confirmação automática de agendamentos\n• Lembretes 24h e 2h antes\n• Chatbot responde no WhatsApp automaticamente\n• Campanhas para clientes via WhatsApp\n• Mensagens personalizadas com o nome e branding da sua barbearia\n\nTudo configurável no painel de administração sem precisar de TI!",
  },
  {
    keywords: ["teste", "grátis", "free", "trial", "experimentar", "começar"],
    answer: "Ótimo! Você pode começar de duas formas:\n\n**1. Plano Starter (grátis para sempre)**\nSem cartão de crédito. Perfeito para testar.\n\n**2. Plano Pro — 14 dias grátis**\nAcesso a todos os recursos premium por 2 semanas.\n\n👉 Clique em **Começar grátis** no topo da página para criar sua conta em menos de 2 minutos!\n\nPrecisa de ajuda durante o cadastro?",
  },
  {
    keywords: ["cardápio", "configurar", "personalizar", "logo", "cor", "aparência"],
    answer: "Cada barbearia tem sua identidade visual única no CORTIX:\n\n🎨 **Personalize** cores, logo e capa\n🔗 **URL própria** — ex: cortix.app/sua-barbearia\n⚙️ **Configure** serviços, preços e horários\n🤖 **Chatbot** com nome e respostas customizadas\n\nTudo pelo painel de administração, sem precisar de programação. Em menos de 10 minutos sua página de agendamento está no ar!",
  },
  {
    keywords: ["suporte", "ajuda", "problema", "contato", "falar"],
    answer: "Estamos aqui para ajudar! 🙋‍♂️\n\n📧 **Email:** suporte@cortix.app\n💬 **WhatsApp:** (11) 99999-0000\n📚 **Documentação:** docs.cortix.app\n\nNo plano **Pro**, você tem suporte prioritário com resposta em até 2 horas.\n\nNo plano **Enterprise**, inclui gerente de conta dedicado.\n\nO que mais posso ajudar?",
  },
  {
    keywords: ["segurança", "dados", "lgpd", "privacidade", "criptografia"],
    answer: "O CORTIX leva a segurança muito a sério:\n\n🔒 **Criptografia SSL** em todas as conexões\n🛡️ **LGPD compliant** — seus dados e dos clientes protegidos\n☁️ **Backup automático** diário\n🏦 **Pagamentos** processados via gateway certificado PCI DSS\n\nNenhum dado de clientes é compartilhado com terceiros.",
  },
  {
    keywords: ["múltiplas", "unidades", "franquia", "rede", "várias"],
    answer: "Para redes de barbearia, o plano **Enterprise** (R$ 197/mês) foi feito para você:\n\n🏪 Múltiplas unidades em um só painel\n📊 Relatórios consolidados da rede\n🔀 Transferência entre unidades\n💳 Split de pagamentos\n🌐 Domínio próprio\n👔 Gerente de conta dedicado\n\nFale com nossa equipe comercial para um plano personalizado para redes grandes: **vendas@cortix.app**",
  },
];

const DEFAULT_RESPONSE = "Obrigado pela sua pergunta! 🙏\n\nPara responder melhor, você pode:\n\n• Perguntar sobre **planos e preços**\n• Saber mais sobre as **funcionalidades**\n• Entender a **integração com WhatsApp**\n• Começar seu **período de teste grátis**\n\nOu fale direto com nossa equipe: **suporte@cortix.app**";

const QUICK_QUESTIONS = [
  "Quais são os planos?",
  "Como integra com WhatsApp?",
  "Tem período de teste?",
  "Como personalizar?",
];

function getBotResponse(text: string): string {
  const lower = text.toLowerCase();
  const match = RESPONSES.find(r => r.keywords.some(k => lower.includes(k)));
  return match?.answer ?? DEFAULT_RESPONSE;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isBot = msg.role === "bot";
  return (
    <div className={cn("flex gap-2", isBot ? "items-start" : "items-start justify-end")}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-black" />
        </div>
      )}
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        isBot ? "bg-zinc-800 text-zinc-200 rounded-tl-sm" : "bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-medium rounded-tr-sm"
      )}>
        {msg.content.split("\n").map((line, i) => (
          <span key={i}>
            {line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)
              .split(/(\*\*.*?\*\*)/).map((part, j) =>
                part.startsWith("**") && part.endsWith("**")
                  ? <strong key={j}>{part.slice(2, -2)}</strong>
                  : part
              )}
            {i < msg.content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LandingChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: "0", role: "bot",
    content: "Olá! 👋 Sou o assistente do **CORTIX**.\n\nPosso te ajudar com informações sobre planos, funcionalidades e como começar. O que você quer saber?",
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "bot", content: getBotResponse(text) }]);
      setTyping(false);
    }, 900 + Math.random() * 600);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => { setOpen(true); setHasUnread(false); }}
        className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/40 hover:scale-110 transition-all"
      >
        {open ? <X className="w-6 h-6 text-black" /> : <MessageCircle className="w-6 h-6 text-black" />}
        {hasUnread && !open && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-black text-white text-[9px] font-bold flex items-center justify-center">1</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-36 right-3 left-3 z-40 sm:left-auto sm:right-6 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "min(78dvh, 520px)" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="font-bold text-black text-sm">Assistente CORTIX</p>
              <p className="text-black/70 text-xs">Suporte comercial • Online agora</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-black/60 hover:text-black transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "320px" }}>
            {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
            {typing && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-black" />
                </div>
                <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full hover:border-amber-500/50 hover:text-amber-400 transition-all flex items-center gap-1">
                  {q} <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Digite sua pergunta..."
              className="flex-1 h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
            <button onClick={() => send(input)} disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90">
              <Send className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
