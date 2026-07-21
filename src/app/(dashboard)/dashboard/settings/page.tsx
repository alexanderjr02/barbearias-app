"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Clock,
  Bell,
  CreditCard,
  MessageSquareText,
  CheckCircle,
  Lock,
  Sparkles,
} from "lucide-react";
import { usePlan, PLAN_INFO, FEATURES_BY_PLAN, type Feature } from "@/context/PlanContext";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/apiClient";

interface BarbershopMe {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  pixKey: string | null;
  faqText: string | null;
  city: string | null;
  description: string | null;
  primaryColor: string;
  autopilotLevel?: string;
  autoConfirm?: boolean;
  autoBirthday?: boolean;
  autoWinbackDays?: number | null;
  chatbotEnabled?: boolean;
  chatbotName?: string | null;
  chatbotWelcome?: string | null;
  workingHours: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[];
}

const tabs = [
  { id: "profile", label: "Barbearia", icon: Store },
  { id: "hours", label: "Horários", icon: Clock },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "chatbot", label: "Chatbot", icon: MessageSquareText },
  { id: "autopilot", label: "Auto-piloto", icon: Sparkles },
  { id: "billing", label: "Plano", icon: CreditCard },
];

const PLAN_FEATURE_LABELS: { feature: Feature; label: string }[] = [
  { feature: "unlimited_appointments", label: "Agendamentos ilimitados" },
  { feature: "multiple_staff", label: "Equipe com mais barbeiros" },
  { feature: "advanced_reports", label: "Relatórios avançados" },
  { feature: "chatbot_customization", label: "Chatbot personalizável" },
  { feature: "chatbot_whatsapp", label: "WhatsApp Business" },
  { feature: "ai_copilot", label: "Copiloto com IA" },
  { feature: "financial_full", label: "Financeiro completo" },
  { feature: "inventory", label: "Controle de estoque" },
  { feature: "marketing", label: "Marketing e campanhas" },
  { feature: "staff_commission", label: "Comissão por barbeiro" },
  { feature: "export_data", label: "Exportar dados" },
  { feature: "client_subscriptions", label: "Assinaturas de clientes" },
];

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const defaultHours = days.map((day, i) => ({
  day,
  isOpen: i !== 0,
  open: "09:00",
  close: i === 6 ? "18:00" : "20:00",
}));

const inputCls =
  "w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

export default function SettingsPage() {
  const { plan, can, setPlan, formatPrice, pricing } = usePlan();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [hours, setHours] = useState(defaultHours);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  // Config do chatbot agora vem do servidor (não mais do localStorage). Estado
  // local editável, semeado quando a barbearia carrega, salvo via API.
  const [cbName, setCbName] = useState("");
  const [cbWelcome, setCbWelcome] = useState("");
  const [cbFaq, setCbFaq] = useState("");
  const [chatbotSaved, setChatbotSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  const { data: autopilotFeed } = useQuery({
    queryKey: ["autopilot-feed"],
    queryFn: () => apiGet<{ recoveredTotal: number; actionsThisMonth: number; feed: { action: string; detail: string; recoveredValue: number | null; createdAt: string }[] }>("/api/copilot/autopilot-feed"),
    enabled: activeTab === "autopilot",
  });

  const { data: barbershop } = useQuery({
    queryKey: ["barbershop-me"],
    queryFn: () => apiGet<BarbershopMe>("/api/barbershop"),
  });

  // Seed the editable color/hours state once the barbershop data arrives —
  // adjusted during render (not an effect) since it only reacts to `barbershop` changing.
  const [syncedBarbershop, setSyncedBarbershop] = useState<BarbershopMe | undefined>(undefined);
  if (barbershop && barbershop !== syncedBarbershop) {
    setSyncedBarbershop(barbershop);
    setCbName(barbershop.chatbotName ?? "");
    setCbWelcome(barbershop.chatbotWelcome ?? "");
    setCbFaq(barbershop.faqText ?? "");
    if (barbershop.workingHours.length > 0) {
      setHours(
        days.map((day, i) => {
          const wh = barbershop.workingHours.find((h) => h.dayOfWeek === i);
          return wh
            ? { day, isOpen: wh.isOpen, open: wh.openTime, close: wh.closeTime }
            : { day, isOpen: i !== 0, open: "09:00", close: i === 6 ? "18:00" : "20:00" };
        })
      );
    }
  }

  const updateBarbershop = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPatch("/api/barbershop", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barbershop-me"] }),
  });

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    updateBarbershop.mutate(
      {
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        instagram: form.get("instagram"),
        pixKey: form.get("pixKey"),
        faqText: form.get("faqText"),
        city: form.get("city"),
        description: form.get("description"),
      },
      {
        onSuccess: () => {
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 1600);
        },
      }
    );
  };

  const saveHours = () => {
    updateBarbershop.mutate(
      {
        workingHours: hours.map((h, i) => ({ dayOfWeek: i, isOpen: h.isOpen, openTime: h.open, closeTime: h.close })),
      },
      {
        onSuccess: () => {
          setHoursSaved(true);
          setTimeout(() => setHoursSaved(false), 1600);
        },
      }
    );
  };

  const canCustomize = can("chatbot_customization");
  const canWhatsapp = can("chatbot_whatsapp");
  const planInfo = PLAN_INFO[plan];

  const saveChatbot = () => {
    updateBarbershop.mutate(
      { chatbotName: cbName.trim(), chatbotWelcome: cbWelcome.trim(), faqText: cbFaq.trim() },
      {
        onSuccess: () => {
          setChatbotSaved(true);
          setTimeout(() => setChatbotSaved(false), 1600);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <div>
        <h1 className="text-2xl font-black text-white">Configurações</h1>
        <p className="text-zinc-500 text-sm mt-1">Personalize sua barbearia, o chatbot e o plano</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {activeTab === "profile" && (
            <form key={barbershop?.id} onSubmit={handleProfileSubmit} className="space-y-5">
              <h2 className="text-lg font-bold text-white">Informações da Barbearia</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Nome da barbearia</label>
                  <input name="name" type="text" defaultValue={barbershop?.name} placeholder="Barbearia do João" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Link personalizado</label>
                  <input type="text" defaultValue={barbershop?.slug} disabled className={cn(inputCls, "opacity-60 cursor-not-allowed")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Telefone / WhatsApp</label>
                  <input name="phone" type="text" defaultValue={barbershop?.phone ?? ""} placeholder="(11) 99999-9999" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">E-mail</label>
                  <input name="email" type="text" defaultValue={barbershop?.email ?? ""} placeholder="contato@barbearia.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Instagram</label>
                  <input name="instagram" type="text" defaultValue={barbershop?.instagram ?? ""} placeholder="@suabarbearia" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Cidade</label>
                  <input name="city" type="text" defaultValue={barbershop?.city ?? ""} placeholder="São Paulo, SP" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Chave PIX (gorjetas)</label>
                  <input name="pixKey" type="text" defaultValue={barbershop?.pixKey ?? ""} placeholder="CPF, e-mail, telefone ou chave aleatória" className={inputCls} />
                  <p className="mt-1 text-xs text-zinc-500">Usada para o cliente enviar gorjeta ao barbeiro pelo app.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={barbershop?.description ?? ""}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  Perguntas frequentes (o chatbot responde com isso)
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">IA</span>
                </label>
                <textarea
                  name="faqText"
                  rows={4}
                  defaultValue={barbershop?.faqText ?? ""}
                  placeholder={"Ex:\n- Aceita PIX e cartão.\n- Tem estacionamento na porta.\n- Atende criança a partir de 3 anos.\n- Cancelamento até 2h antes."}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <p className="mt-1 text-xs text-zinc-500">Escreva as dúvidas comuns e suas respostas. O assistente virtual usa isso pra responder os clientes.</p>
              </div>
              <button type="submit" disabled={updateBarbershop.isPending} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-60">
                {profileSaved ? <><CheckCircle className="w-4 h-4" /> Salvou!</> : "Salvar alterações"}
              </button>
            </form>
          )}


          {activeTab === "hours" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white">Horários de Funcionamento</h2>
              <div className="space-y-3">
                {hours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-4">
                    <div className="w-10 text-sm text-zinc-400 font-medium">{h.day}</div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.isOpen}
                        onChange={(e) => {
                          const updated = [...hours];
                          updated[i] = { ...updated[i], isOpen: e.target.checked };
                          setHours(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                    </label>
                    {h.isOpen ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={h.open}
                          onChange={(e) => {
                            const updated = [...hours];
                            updated[i] = { ...updated[i], open: e.target.value };
                            setHours(updated);
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-zinc-500 text-sm">até</span>
                        <input
                          type="time"
                          value={h.close}
                          onChange={(e) => {
                            const updated = [...hours];
                            updated[i] = { ...updated[i], close: e.target.value };
                            setHours(updated);
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">Fechado</span>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={saveHours} disabled={updateBarbershop.isPending} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-60">
                {hoursSaved ? <><CheckCircle className="w-4 h-4" /> Salvou!</> : "Salvar horários"}
              </button>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Avisos automáticos</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Estes rodam de verdade — o Copiloto dispara sozinho todo dia. As mudanças salvam na hora.
                </p>
              </div>

              {/* Toggles LIGADOS ao servidor (autoConfirm/autoBirthday/autoWinbackDays
                  do Autopilot), não mais uma lista decorativa. */}
              <RealToggle
                label="Confirmação automática (dia anterior)"
                desc="Na véspera, confirma os agendamentos de amanhã e avisa cada cliente — derruba faltas."
                checked={Boolean(barbershop?.autoConfirm)}
                pending={updateBarbershop.isPending}
                onChange={(v) => updateBarbershop.mutate({ autoConfirm: v })}
              />
              <RealToggle
                label="Mensagem de aniversário"
                desc="Parabeniza o cliente no dia (só quem aceitou receber mensagens)."
                checked={Boolean(barbershop?.autoBirthday)}
                pending={updateBarbershop.isPending}
                onChange={(v) => updateBarbershop.mutate({ autoBirthday: v })}
              />
              <div className="py-4 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Reativar clientes sumidos (win-back)</p>
                    <p className="text-xs text-zinc-500">Chama de volta quem ficou um tempo sem aparecer.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(barbershop?.autoWinbackDays)}
                      onChange={(e) => updateBarbershop.mutate({ autoWinbackDays: e.target.checked ? (barbershop?.autoWinbackDays || 45) : null })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>
                {Boolean(barbershop?.autoWinbackDays) && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Avisar após</span>
                    <input
                      type="number"
                      min={7}
                      defaultValue={barbershop?.autoWinbackDays ?? 45}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (n >= 7) updateBarbershop.mutate({ autoWinbackDays: n });
                      }}
                      className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-zinc-400">dias sem vir</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  <span className="text-zinc-300 font-medium">Sempre ligados:</span> a confirmação na hora do agendamento,
                  os avisos de status (confirmado, cancelado, concluído) e o resumo diário do Copiloto. Esses são
                  automáticos e chegam por push/WhatsApp para quem ativou.
                </p>
              </div>
            </div>
          )}

          {activeTab === "chatbot" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Configuração do Chatbot</h2>
                  <p className="text-sm text-zinc-500 mt-1">Ajuste a experiência do assistente para o seu cliente e o seu negócio.</p>
                </div>
                <div className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", planInfo.color === "text-amber-400" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-800 border-zinc-700 text-zinc-400")}>Plano {planInfo.label}</div>
              </div>

              {!canCustomize ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Personalização do chatbot disponível no plano Pro</h3>
                      <p className="text-sm text-zinc-400 mt-1">Ative o plano para editar nome, mensagem de boas-vindas, FAQ e integração com WhatsApp.</p>
                    </div>
                  </div>
                  <button onClick={() => setUpgradeOpen(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold text-sm">
                    <Sparkles className="w-4 h-4" /> Ver planos
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
                    {/* Ligar/desligar salva NA HORA no servidor — o assistente
                        do app respeita de verdade (greeting some, chat recusa
                        educadamente). */}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Ativar assistente</p>
                        <p className="text-xs text-zinc-500">Quando desligado, o assistente não responde os clientes.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={barbershop?.chatbotEnabled !== false}
                          disabled={updateBarbershop.isPending}
                          onChange={(e) => updateBarbershop.mutate({ chatbotEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                      </label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Nome do assistente</label>
                        <input value={cbName} onChange={(e) => setCbName(e.target.value)} placeholder="Ex.: Léo, da Barbearia" className={inputCls} />
                        <p className="text-xs text-zinc-600 mt-1">Como o assistente se apresenta ao cliente.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Mensagem de boas-vindas</label>
                        <input value={cbWelcome} onChange={(e) => setCbWelcome(e.target.value)} placeholder="Olá! Como posso te ajudar hoje?" className={inputCls} />
                        <p className="text-xs text-zinc-600 mt-1">Primeira mensagem quando o cliente abre o chat.</p>
                      </div>
                    </div>

                    {canWhatsapp && (
                      // A conexão de WhatsApp mora numa página própria, que
                      // valida o número na Meta e o guarda no servidor.
                      <Link
                        href="/dashboard/whatsapp"
                        className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquareText className="h-5 w-5 text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-white">Conectar o WhatsApp da barbearia</p>
                            <p className="text-xs text-zinc-500">
                              Envie confirmações e responda clientes automaticamente. Abre a página de conexão.
                            </p>
                          </div>
                        </div>
                        <span className="text-emerald-400 text-lg shrink-0">→</span>
                      </Link>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-white mb-1">Informações e regras (FAQ)</label>
                      <p className="text-xs text-zinc-500 mb-2">
                        A IA usa isto para responder dúvidas da sua barbearia — formas de pagamento, estacionamento,
                        política de atraso, o que quiser. Escreva livre, como se explicasse para um cliente.
                      </p>
                      <textarea
                        rows={6}
                        value={cbFaq}
                        onChange={(e) => setCbFaq(e.target.value)}
                        placeholder={"Ex.:\nAceitamos Pix, cartão e dinheiro.\nTem estacionamento na rua de trás.\nTolerância de 10 min de atraso."}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
                      />
                    </div>
                  </div>
                  <button onClick={saveChatbot} disabled={updateBarbershop.isPending} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-60">
                    {chatbotSaved ? <><CheckCircle className="w-4 h-4" /> Salvou!</> : "Salvar chatbot"}
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === "autopilot" && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-white">O quanto ele age sozinho</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["off", "Observar", "só avisa"],
                      ["suggest", "Sugerir", "1 toque"],
                      ["auto", "Agir sozinho", "faz e conta"],
                    ] as const
                  ).map(([val, label, desc]) => {
                    const on = (barbershop?.autopilotLevel ?? "suggest") === val;
                    return (
                      <button key={val} onClick={() => updateBarbershop.mutate({ autopilotLevel: val })} className={cn("rounded-xl border px-2 py-3 text-center transition", on ? "border-amber-500 bg-amber-500/10" : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600")}>
                        <p className={cn("text-xs font-bold", on ? "text-amber-400" : "text-white")}>{label}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 p-5 text-black">
                <p className="text-xs font-semibold opacity-80">Receita recuperada este mês</p>
                <p className="text-3xl font-black">R$ {(autopilotFeed?.recoveredTotal ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs opacity-70">{autopilotFeed?.actionsThisMonth ?? 0} ações do Copiloto por você</p>
              </div>
              <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
                <Sparkles className="h-5 w-5 shrink-0" />
                <p>Ligado e trabalhando 24h — reage na hora (vagou horário → chama a fila) e roda as automações todo dia.</p>
              </div>
              {[
                { key: "autoConfirm" as const, title: "Confirmar agendamentos", desc: "Confirma sozinho os agendamentos do dia seguinte. Reduz no-show.", on: !!barbershop?.autoConfirm },
                { key: "autoBirthday" as const, title: "Mensagem de aniversário", desc: "Parabeniza cada cliente no aniversário e convida pra um corte.", on: !!barbershop?.autoBirthday },
              ].map((a) => (
                <div key={a.key} className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-white">{a.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{a.desc}</p>
                  </div>
                  <button onClick={() => updateBarbershop.mutate({ [a.key]: !a.on })} className={cn("relative h-6 w-11 shrink-0 rounded-full transition", a.on ? "bg-amber-500" : "bg-zinc-600")}>
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", a.on ? "left-[22px]" : "left-0.5")} />
                  </button>
                </div>
              ))}
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-white">Chamar clientes sumidos (win-back)</p>
                    <p className="mt-0.5 text-xs text-zinc-400">Mensagem carinhosa quando o cliente passa do tempo sem voltar.</p>
                  </div>
                  <button onClick={() => updateBarbershop.mutate({ autoWinbackDays: barbershop?.autoWinbackDays ? null : 45 })} className={cn("relative h-6 w-11 shrink-0 rounded-full transition", barbershop?.autoWinbackDays ? "bg-amber-500" : "bg-zinc-600")}>
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", barbershop?.autoWinbackDays ? "left-[22px]" : "left-0.5")} />
                  </button>
                </div>
                {barbershop?.autoWinbackDays ? (
                  <div className="mt-3 flex gap-2">
                    {[30, 45, 60].map((d) => (
                      <button key={d} onClick={() => updateBarbershop.mutate({ autoWinbackDays: d })} className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium", barbershop?.autoWinbackDays === d ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-600")}>
                        {d} dias
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {autopilotFeed && autopilotFeed.feed.length > 0 && (
                <div>
                  <p className="mb-2 mt-2 text-sm font-semibold text-white">O que o Copiloto fez por você</p>
                  <div className="space-y-2">
                    {autopilotFeed.feed.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-3">
                        <span className="text-amber-400">⚡</span>
                        <p className="flex-1 text-xs text-zinc-300">{f.detail}</p>
                        {f.recoveredValue ? <span className="text-xs font-bold text-amber-400">+R$ {f.recoveredValue.toFixed(0)}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-zinc-500">Você também liga/desliga isso conversando com o Copiloto (ex.: &quot;liga a confirmação automática&quot; ou &quot;agir sozinho&quot;).</p>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Plano e recursos</h2>
                  <p className="text-sm text-zinc-500 mt-1">Compare os planos e veja exatamente o que cada um desbloqueia.</p>
                </div>
                <button onClick={() => setUpgradeOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-semibold whitespace-nowrap">
                  <Sparkles className="w-4 h-4" /> Assinar um plano
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {(["FREE", "PRO", "ENTERPRISE"] as const).map((p) => {
                  const info = PLAN_INFO[p];
                  const isCurrent = plan === p;
                  return (
                    <div
                      key={p}
                      className={cn(
                        "relative rounded-2xl border p-5 flex flex-col",
                        isCurrent ? "border-amber-500/50 bg-amber-500/[0.04]" : "border-zinc-800 bg-zinc-950/40"
                      )}
                    >
                      {isCurrent && (
                        <span className="absolute -top-2.5 left-5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                          SEU PLANO ATUAL
                        </span>
                      )}
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border w-fit", info.badgeBg)}>{info.label}</span>
                      <p className="text-2xl font-black text-white mt-3">{formatPrice(p)}</p>
                      <p className="text-xs text-zinc-500 mt-1 mb-4">
                        {pricing?.[p]?.appointmentsLimit != null ? `${pricing[p].appointmentsLimit} agend./mês` : pricing?.[p] ? "Agendamentos ilimitados" : (Number.isFinite(info.appointmentsLimit) ? `${info.appointmentsLimit} agend./mês` : "Agendamentos ilimitados")}
                        {" · "}
                        {pricing?.[p]?.staffLimit != null ? `até ${pricing[p].staffLimit} barbeiros` : pricing?.[p] ? "barbeiros ilimitados" : (Number.isFinite(info.staffLimit) ? `até ${info.staffLimit} barbeiros` : "barbeiros ilimitados")}
                      </p>
                      <div className="space-y-1.5 flex-1">
                        {PLAN_FEATURE_LABELS.map(({ feature, label }) => {
                          const included = FEATURES_BY_PLAN[p].includes(feature);
                          return (
                            <div key={feature} className={cn("flex items-center gap-2 text-xs", included ? "text-zinc-300" : "text-zinc-600")}>
                              {included ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <Lock className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />}
                              {label}
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => !isCurrent && setPlan(p)}
                        disabled={isCurrent}
                        className={cn(
                          "mt-4 w-full py-2 rounded-lg text-xs font-bold transition-all",
                          isCurrent
                            ? "bg-zinc-800 text-zinc-500 cursor-default"
                            : "bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:opacity-90"
                        )}
                      >
                        {isCurrent ? "Plano ativo" : `Ver como ${info.label}`}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-600">
                &ldquo;Ver como&rdquo; troca o plano da sua barbearia instantaneamente, para fins de demonstração — sem cobrança real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Interruptor ligado ao servidor: reflete o valor real e salva ao trocar.
// Diferente da lista antiga (defaultChecked sem onChange), que era enfeite.
function RealToggle({
  label,
  desc,
  checked,
  pending,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  pending: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-800">
      <div className="pr-4">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
      </label>
    </div>
  );
}
