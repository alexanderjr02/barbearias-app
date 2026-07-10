"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Zap, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { nextMessageId, pickRandom, randomDelay } from "@/lib/chatWidget";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
}

const INSIGHTS = [
  "💡 Sua receita esta semana está **12% acima** da média. Considere abrir mais horários no sábado!",
  "📊 **3 clientes** não visitam há mais de 30 dias. Envie uma campanha de reativação para recuperá-los.",
  "⭐ João Silva tem a **maior avaliação** da equipe (4.9). Considere uma comissão bônus para motivar!",
  "🎯 O serviço **Corte + Barba** representa 35% da receita. Vale criar uma promoção para impulsioná-lo.",
];

const RESPONSES: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["agendar", "agendamento", "novo agendamento", "criar"],
    answer: "Para criar um novo agendamento:\n\n1. Clique no botão **+ Novo Agendamento** no topo da tela\n2. Ou acesse **Agendamentos** no menu lateral\n3. Preencha serviço, barbeiro, data/hora e dados do cliente\n\nVocê também pode deixar o cliente agendar direto pela sua **página pública** — compartilhe o link com seus clientes!",
  },
  {
    keywords: ["relatório", "receita", "financeiro", "dinheiro", "quanto ganhei"],
    answer: "Seus números desta semana:\n\n💰 **Receita:** R$ 4.540\n📅 **Agendamentos:** 85\n🎯 **Ticket médio:** R$ 53\n📈 **Crescimento:** +12% vs semana anterior\n\nPara análises mais detalhadas, acesse **Relatórios** no menu lateral (plano Pro).\n\nQuer que eu explique como interpretar os dados?",
  },
  {
    keywords: ["cliente", "clientes", "vip", "fidelidade"],
    answer: "Sobre seus clientes:\n\n👥 **342 clientes** ativos no total\n⭐ **28 VIPs** (>10 visitas ou >R$ 500 gastos)\n🆕 **7 novos** este mês\n🔄 **91.8%** de taxa de retenção\n\n**Dica:** Configure automações de aniversário e reativação em **Marketing** para aumentar o retorno!",
  },
  {
    keywords: ["barbeiro", "equipe", "funcionário", "comissão", "adicionar"],
    answer: "Para gerenciar sua equipe:\n\n1. Acesse **Equipe** no menu lateral\n2. Clique em **Adicionar barbeiro**\n3. Configure nome, especialidades e % de comissão\n\nNo plano **Starter** você pode ter até 3 barbeiros. No **Pro**, até 10. No **White Label**, ilimitados!\n\n📊 Dica: Acompanhe a performance de cada barbeiro na aba de **Relatórios**.",
  },
  {
    keywords: ["chatbot", "bot", "automatizar", "mensagem", "whatsapp"],
    answer: "Seu chatbot pode ser personalizado no **plano Pro**:\n\n1. Vá em ⚙️ **Configurações**\n2. Acesse a aba **Chatbot**\n3. Edite o nome, mensagem de boas-vindas e FAQs\n4. Configure a integração com **WhatsApp Business**\n\nO chatbot responde automaticamente 24/7 tanto no app quanto no WhatsApp dos seus clientes!",
  },
  {
    keywords: ["serviço", "serviços", "adicionar serviço", "preço", "valor"],
    answer: "Para gerenciar serviços:\n\n1. Acesse **Serviços** no menu lateral\n2. Clique em **Novo serviço**\n3. Defina nome, categoria, duração e preço\n4. Ative/desative serviços conforme necessário\n\n💡 Dica: Crie combos (ex: Corte + Barba) com preço diferenciado para aumentar o ticket médio!",
  },
  {
    keywords: ["marketing", "campanha", "promoção", "email", "sms"],
    answer: "Para criar campanhas de marketing:\n\n1. Acesse **Marketing** no menu lateral\n2. Escolha o tipo: WhatsApp, Email ou SMS\n3. Selecione o público (todos, VIPs, inativos)\n4. Escreva a mensagem e agende o envio\n\n🎯 Automações disponíveis:\n• Lembrete 24h antes\n• Mensagem de aniversário\n• Reativação de clientes inativos",
  },
  {
    keywords: ["plano", "upgrade", "pro", "premium", "assinar"],
    answer: "Você está no **plano Starter**.\n\nUpgrade para o **Pro (R$ 79/mês)** e desbloqueie:\n✅ Customização de cores e logo\n✅ Chatbot com IA básica\n✅ Análises detalhadas\n✅ Fidelização avançada\n✅ Até 10 barbeiros\n✅ Suporte prioritário\n\nClique em **Fazer upgrade** no menu lateral para assinar com 14 dias grátis!",
  },
  {
    keywords: ["estoque", "produto", "compras"],
    answer: "Para gerenciar o estoque:\n\n1. Acesse **Estoque** no menu lateral\n2. Adicione produtos com código, preço e quantidade mínima\n3. O sistema alerta automaticamente quando o estoque estiver baixo\n\n⚠️ Você tem **3 produtos** com estoque abaixo do mínimo. Acesse Estoque para ver quais são!",
  },
  {
    keywords: ["configuração", "configurar", "cor", "logo", "aparência"],
    answer: "Para personalizar sua barbearia:\n\n1. Acesse **Configurações** no menu\n2. Aba **Barbearia**: nome, endereço, contatos\n3. Aba **Aparência**: cores, logo e prévia da página\n4. Aba **Horários**: dias e horários de funcionamento\n\nSua página pública de agendamento atualiza automaticamente com as mudanças!",
  },
];

const DEFAULT = "Não entendi exatamente, mas posso ajudar com:\n\n📅 **Agendamentos** — como criar e gerenciar\n📊 **Relatórios** — análise da receita\n👥 **Clientes** — VIPs e fidelidade\n✂️ **Serviços** — cadastro e preços\n💬 **Chatbot** — personalização\n📣 **Marketing** — campanhas\n\nPergunta algo específico!";

function getResponse(text: string): string {
  const lower = text.toLowerCase();
  return RESPONSES.find(r => r.keywords.some(k => lower.includes(k)))?.answer ?? DEFAULT;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isBot = msg.role === "bot";
  return (
    <div className={cn("flex gap-2", isBot ? "items-start" : "items-start justify-end")}>
      {isBot && (
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
        isBot ? "bg-zinc-800 text-zinc-200 rounded-tl-sm" : "bg-blue-600 text-white rounded-tr-sm font-medium"
      )}>
        {msg.content.split("\n").map((line, i, arr) => (
          <span key={i}>
            {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j} className={isBot ? "text-blue-300" : "text-white"}>{part.slice(2, -2)}</strong>
                : part
            )}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AdminChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: "0", role: "bot",
    content: `Olá! 👋 Sou seu assistente de gestão.\n\n${pickRandom(INSIGHTS)}\n\nComo posso te ajudar hoje?`,
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(p => [...p, { id: nextMessageId(), role: "user", content: text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages(p => [...p, { id: nextMessageId(), role: "bot", content: getResponse(text) }]);
      setTyping(false);
    }, randomDelay(700, 600));
  };

  const shortcuts = [
    { label: "Ver insights", query: "relatório receita" },
    { label: "Chatbot/WhatsApp", query: "chatbot whatsapp" },
    { label: "Criar campanha", query: "marketing campanha" },
    { label: "Fazer upgrade", query: "plano upgrade pro" },
  ];

  return (
    <>
      {/* FAB */}
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-500/30 hover:scale-105 transition-all">
        {open ? <X className="w-5 h-5 lg:w-6 lg:h-6 text-white" /> : <Bot className="w-5 h-5 lg:w-6 lg:h-6 text-white" />}
      </button>

      {/* Window */}
      {open && (
        <div className="fixed bottom-36 right-3 left-3 z-40 sm:left-auto sm:right-6 sm:w-80 lg:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "min(78dvh, 460px)" }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Assistente de Gestão</p>
              <p className="text-white/70 text-xs">Suporte e insights em tempo real</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Insight banner */}
          <div className="px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              Dica rápida: Pergunte sobre seus relatórios, clientes VIP ou como configurar o chatbot!
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "290px" }}>
            {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
            {typing && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
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

          {/* Shortcuts */}
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 border-t border-zinc-800 pt-2">
            {shortcuts.map(s => (
              <button key={s.label} onClick={() => send(s.query)}
                className="text-xs px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full hover:border-blue-500/50 hover:text-blue-400 transition-all flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> {s.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Pergunte algo sobre seu negócio..."
              className="flex-1 h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            <button onClick={() => send(input)} disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
