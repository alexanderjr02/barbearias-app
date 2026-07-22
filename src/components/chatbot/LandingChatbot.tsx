"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Scissors, Bot, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { nextMessageId, randomDelay } from "@/lib/chatWidget";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
}

const RESPONSES: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "tudo bem", "e ai", "e aí"],
    answer: "Olá! Que bom te ver por aqui.\n\nPosso te ajudar com:\n\n• **Planos e preços**\n• **Funcionalidades** do sistema\n• **WhatsApp** e integrações\n• Como **começar** hoje mesmo\n\nO que você quer saber?",
  },
  {
    keywords: ["preço", "valor", "quanto", "custa", "plano", "planos", "mensalidade", "assinatura"],
    answer: "Temos 3 planos:\n\n**Essencial** — R$ 50/mês\n• Agenda online 24/7 • Cadastro de clientes • Fila de espera • Caixa do dia • Até 3 barbeiros\n\n**Pro** — R$ 250/mês\n• Tudo do Essencial • Copiloto com IA • Financeiro completo e comissões • Estoque • Fidelidade • Clube de assinatura • Até 10 barbeiros\n\n**White Label** — R$ 897/mês\n• Tudo do Pro • App instalável com a SUA marca • Painel e Copiloto de rede • Nota fiscal automática • Barbeiros ilimitados • Atendimento dedicado\n• Rede: + R$ 149 por unidade adicional\n• **Sem taxa de implantação** — no ar no mesmo dia\n\nOs planos Pro e White Label têm **14 dias de teste grátis** (sem cartão de crédito). Quer saber mais sobre algum deles?",
  },
  {
    keywords: ["diferença", "comparar", "comparação", "qual escolher", "melhor plano", "qual plano"],
    answer: "Depende do tamanho da sua operação:\n\n**Essencial (R$ 50/mês)** — você trabalha sozinho ou com até 3 barbeiros e quer sair da agenda de papel/WhatsApp.\n\n**Pro (R$ 250/mês)** — sua equipe tem até 10 barbeiros e você quer o Copiloto com IA, financeiro completo, fidelização e assinatura.\n\n**White Label (R$ 897/mês)** — você quer um app próprio com a sua marca, nota fiscal automática e sem limite de equipe.\n\nQuer que eu te ajude a decidir com base no tamanho da sua barbearia?",
  },
  {
    keywords: ["funcionalidade", "recurso", "o que faz", "features", "o que tem", "inclui", "sistema faz"],
    answer: "O CORTIX cobre o essencial da gestão de uma barbearia:\n\n**Agendamento online** — página personalizada 24/7\n**Agenda com visão diária, semanal e mensal** — veja toda a equipe de uma vez ou filtre por barbeiro\n**Chatbot** no site (e no WhatsApp nos planos Pro/White Label)\n**Financeiro** — receitas, despesas e comissões\n**Relatórios** de faturamento e performance da equipe\n**Clientes** — histórico, avaliações e programa de pontos/fidelidade (Bronze, Prata, Ouro)\n**Equipe** — controle de barbeiros, comissões e agenda de cada um\n**App para barbeiro e cliente** — agenda, ganhos e avaliações para o barbeiro; histórico, cancelamento/remarcação e avaliação de atendimento para o cliente\n**Estoque** de produtos, com foto de cada item\n\nQuer ver a demonstração ao vivo?",
  },
  {
    keywords: ["app", "aplicativo", "celular", "download", "baixar"],
    answer: "Sim! Além do painel web para o gestor, o barbeiro tem um app próprio com:\n\nAgenda do dia\nGanhos — receita, comissão e ticket médio do mês\nAvaliações recebidas dos clientes\nHistórico de cada cliente ao tocar no agendamento\n\nE o cliente tem um app para:\n\nVer histórico de agendamentos e o saldo de pontos\nCancelar ou remarcar um horário\nAvaliar o atendimento depois de concluído\n\nO app com a marca 100% personalizada da sua barbearia — que o cliente instala na tela do celular pelo seu link, sem passar por loja de aplicativo — é exclusivo do plano **White Label**.",
  },
  {
    keywords: ["avaliação", "avaliações", "nota", "review", "reviews", "estrela", "estrelas"],
    answer: "Depois que um atendimento é concluído, o cliente pode avaliar o barbeiro com estrelas (1 a 5) e um comentário opcional, direto pelo app.\n\nA nota média de cada barbeiro aparece:\n\nNo painel do gestor, na aba **Equipe**\nNo app do barbeiro, na aba **Ganhos**\n\nCada agendamento só pode ser avaliado uma vez.",
  },
  {
    keywords: ["cancelar horário", "remarcar", "reagendar", "desmarcar", "mudar horário", "trocar horário"],
    answer: "O cliente pode cancelar ou remarcar o próprio horário direto pelo app, sem precisar ligar para a barbearia. Ao remarcar, o horário antigo é liberado automaticamente e o cliente escolhe um novo — tudo aparece em tempo real na agenda do gestor e do barbeiro.",
  },
  {
    keywords: ["agenda", "calendário", "visão semanal", "visão mensal", "mês", "semana"],
    answer: "A agenda do painel do gestor tem 3 visões:\n\n**Lista** — busca e filtro por status\n**Semana** — grade por horário, ideal para ver a ocupação do dia a dia\n**Mês** — visão panorâmica de todos os agendamentos\n\nEm qualquer visão dá para filtrar por barbeiro específico. O barbeiro também acompanha a própria agenda direto pelo app dele.",
  },
  {
    keywords: ["ponto", "pontos", "fidelidade", "fidelização", "cashback", "recompensa"],
    answer: "O programa de fidelidade do CORTIX funciona por pontos:\n\n**Bronze** — 0 a 500 pontos\n**Prata** — 501 a 1.500 pontos (5% de desconto)\n**Ouro** — a partir de 1.501 pontos (10% de desconto)\n\nOs pontos são creditados automaticamente quando um atendimento é concluído, e o gestor pode configurar quantos pontos valem por real gasto. Disponível a partir do plano **Pro**.",
  },
  {
    keywords: ["whatsapp", "integração", "api", "mensagem automática"],
    answer: "Nos planos **Pro e White Label** você tem integração com WhatsApp Business API:\n\n• Confirmação automática de agendamentos\n• Lembretes antes do horário\n• Mensagens com o nome e a identidade da sua barbearia\n\nTudo configurável no painel, sem precisar de TI.",
  },
  {
    keywords: ["teste", "grátis", "free", "trial", "experimentar", "começar", "cadastro", "cadastrar"],
    answer: "Você pode começar agora mesmo:\n\n**Plano Essencial** — R$ 50/mês, sem contrato de fidelidade.\n**Planos Pro e White Label** — 14 dias de teste grátis, sem cartão de crédito.\n\nClique em **Começar grátis** no topo da página para criar sua conta em menos de 2 minutos.\n\nPrecisa de ajuda durante o cadastro?",
  },
  {
    keywords: ["cancelar", "fidelidade", "contrato", "multa"],
    answer: "Não trabalhamos com fidelidade ou multa de cancelamento. Você pode cancelar sua assinatura quando quiser, direto pelo painel, sem burocracia.",
  },
  {
    keywords: ["cardápio", "configurar", "personalizar", "logo", "cor", "aparência"],
    answer: "Cada barbearia tem sua identidade visual no CORTIX:\n\nCores, logo e capa personalizadas (planos Pro e White Label)\nURL própria — ex: cortix.app/sua-barbearia\nServiços, preços e horários configuráveis\n\nTudo pelo painel, sem precisar de programação.",
  },
  {
    keywords: ["suporte", "ajuda", "problema", "contato", "falar", "vendas", "comercial"],
    answer: "Estamos aqui para ajudar! \n\n**Email:** suporte@cortix.app\n**WhatsApp:** (11) 99999-0000\n\nNo plano **Pro**, o suporte é prioritário. No **White Label**, você tem atendimento dedicado.\n\nO que mais posso ajudar?",
  },
  {
    keywords: ["segurança", "dados", "lgpd", "privacidade", "criptografia"],
    answer: "Levamos a segurança a sério:\n\nConexões criptografadas (SSL)\nTratamento de dados alinhado à LGPD\nBackup automático\n\nNenhum dado de clientes é compartilhado com terceiros.",
  },
  {
    keywords: ["múltiplas", "unidades", "franquia", "rede", "várias"],
    answer: "Para redes de barbearia, o plano **White Label** (R$ 897/mês + R$ 149 por unidade) foi feito para isso:\n\nApp instalável com a marca da sua rede — o cliente adiciona na tela do celular\nPainel da rede: compare suas lojas lado a lado\nCopiloto que responde \"qual unidade está puxando o faturamento pra baixo?\"\nSem marca do CORTIX em lugar nenhum\nBarbeiros e unidades ilimitados\n\nFale com nossa equipe comercial: **vendas@cortix.app**",
  },
  {
    keywords: ["quanto tempo", "implanta", "implementar", "migrar", "trocar de sistema", "demora"],
    answer: "A configuração inicial leva minutos: você cria a conta, cadastra serviços/horários e já tem um link de agendamento no ar. Se você já usa outro sistema, nossa equipe de suporte te ajuda a migrar os dados — é só chamar no suporte@cortix.app.",
  },
];

const DEFAULT_RESPONSE = "Ainda não tenho uma resposta pronta pra essa pergunta específica. \n\nPosso te ajudar com:";

const QUICK_QUESTIONS = [
  "Quais são os planos?",
  "O que o app faz?",
  "Como funciona a agenda?",
  "Tem período de teste?",
];

function getBotResponse(text: string): string | null {
  const lower = text.toLowerCase();
  const match = RESPONSES.find(r => r.keywords.some(k => lower.includes(k)));
  return match?.answer ?? null;
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
    content: "Olá! Sou o assistente do **CORTIX**.\n\nPosso te ajudar com informações sobre planos, funcionalidades e como começar. O que você quer saber?",
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: nextMessageId(), role: "user", content: text };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const answer = getBotResponse(text) ?? DEFAULT_RESPONSE;
      setMessages(p => [...p, { id: nextMessageId(), role: "bot", content: answer }]);
      setTyping(false);
    }, randomDelay(900, 600));
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

          {/* Quick questions — always available as an escape hatch */}
          {!typing && (
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
