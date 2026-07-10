"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Palette,
  Store,
  Clock,
  Bell,
  CreditCard,
  MessageSquareText,
  CheckCircle,
  Lock,
  Sparkles,
  Plus,
  Trash2,
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
  city: string | null;
  description: string | null;
  primaryColor: string;
  workingHours: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[];
}

const tabs = [
  { id: "profile", label: "Barbearia", icon: Store },
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "hours", label: "Horários", icon: Clock },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "chatbot", label: "Chatbot", icon: MessageSquareText },
  { id: "billing", label: "Plano", icon: CreditCard },
];

const PLAN_FEATURE_LABELS: { feature: Feature; label: string }[] = [
  { feature: "unlimited_appointments", label: "Agendamentos ilimitados" },
  { feature: "multiple_staff", label: "Equipe com mais barbeiros" },
  { feature: "advanced_reports", label: "Relatórios avançados" },
  { feature: "chatbot_customization", label: "Chatbot personalizável" },
  { feature: "chatbot_whatsapp", label: "WhatsApp Business" },
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

interface ChatbotFaqItem {
  question: string;
  answer: string;
}

interface ChatbotConfig {
  enabled: boolean;
  name: string;
  welcomeMessage: string;
  address: string;
  hours: string;
  whatsapp: {
    enabled: boolean;
    phone: string;
    autoFrom: string;
    autoTo: string;
    token: string;
  };
  faqItems: ChatbotFaqItem[];
}

const defaultChatbot: ChatbotConfig = {
  enabled: true,
  name: "Assistente",
  welcomeMessage: "Olá! 👋 Como posso te ajudar hoje?",
  address: "Rua das Barbearias, 123 — São Paulo, SP",
  hours: "Seg–Sex: 09h–20h | Sáb: 09h–18h",
  whatsapp: {
    enabled: false,
    phone: "",
    autoFrom: "09:00",
    autoTo: "18:00",
    token: "",
  },
  faqItems: [
    { question: "Horário de funcionamento", answer: "Atendemos de segunda a sábado, das 09h às 20h." },
  ],
};

export default function SettingsPage() {
  const { plan, can, setPlan, formatPrice, pricing } = usePlan();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [primaryColor, setPrimaryColor] = useState("#D4AF37");
  const [hours, setHours] = useState(defaultHours);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [chatbot, setChatbot] = useState<ChatbotConfig>(() => {
    if (typeof window === "undefined") return defaultChatbot;
    const stored = localStorage.getItem("cortix_chatbot_config");
    if (!stored) return defaultChatbot;
    try {
      const parsed = JSON.parse(stored) as Partial<ChatbotConfig>;
      return { ...defaultChatbot, ...parsed, whatsapp: { ...defaultChatbot.whatsapp, ...parsed.whatsapp } };
    } catch {
      return defaultChatbot;
    }
  });
  const [chatbotSaved, setChatbotSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  const { data: barbershop } = useQuery({
    queryKey: ["barbershop-me"],
    queryFn: () => apiGet<BarbershopMe>("/api/barbershop"),
  });

  // Seed the editable color/hours state once the barbershop data arrives —
  // adjusted during render (not an effect) since it only reacts to `barbershop` changing.
  const [syncedBarbershop, setSyncedBarbershop] = useState<BarbershopMe | undefined>(undefined);
  if (barbershop && barbershop !== syncedBarbershop) {
    setSyncedBarbershop(barbershop);
    setPrimaryColor(barbershop.primaryColor);
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

  const saveAppearance = () => {
    updateBarbershop.mutate(
      { primaryColor },
      {
        onSuccess: () => {
          setAppearanceSaved(true);
          setTimeout(() => setAppearanceSaved(false), 1600);
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
    localStorage.setItem("cortix_chatbot_config", JSON.stringify(chatbot));
    setChatbotSaved(true);
    setTimeout(() => setChatbotSaved(false), 1600);
  };

  const addFaq = () => {
    setChatbot((prev) => ({ ...prev, faqItems: [...prev.faqItems, { question: "", answer: "" }] }));
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    setChatbot((prev) => ({
      ...prev,
      faqItems: prev.faqItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const removeFaq = (index: number) => {
    setChatbot((prev) => ({ ...prev, faqItems: prev.faqItems.filter((_, i) => i !== index) }));
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
              <button type="submit" disabled={updateBarbershop.isPending} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-60">
                {profileSaved ? <><CheckCircle className="w-4 h-4" /> Salvou!</> : "Salvar alterações"}
              </button>
            </form>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white">Personalização Visual</h2>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">Cor principal</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                  <div className="flex gap-2">
                    {["#D4AF37", "#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#000000"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setPrimaryColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${primaryColor === color ? "border-white scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">Preview da página de agendamento</label>
                <div className="rounded-xl overflow-hidden border border-zinc-700">
                  <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: primaryColor }}>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                      {(barbershop?.name ?? "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "BJ"}
                    </div>
                    <span className="font-bold text-white">{barbershop?.name ?? "Sua barbearia"}</span>
                  </div>
                  <div className="bg-zinc-800 p-4 text-center">
                    <p className="text-sm text-zinc-400">Sua página personalizada de agendamento</p>
                    <button className="mt-2 px-4 py-2 text-sm font-bold rounded-lg text-black" style={{ backgroundColor: primaryColor }}>
                      Agendar horário
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={saveAppearance} disabled={updateBarbershop.isPending} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-60">
                {appearanceSaved ? <><CheckCircle className="w-4 h-4" /> Salvou!</> : "Salvar aparência"}
              </button>
            </div>
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
              <h2 className="text-lg font-bold text-white">Configurações de Notificações</h2>
              {[
                { label: "Lembrete de agendamento (24h antes)", desc: "Envia mensagem automática para o cliente", enabled: true },
                { label: "Lembrete de agendamento (2h antes)", desc: "Segundo lembrete antes do horário", enabled: true },
                { label: "Confirmação de agendamento", desc: "Confirma quando o agendamento é feito", enabled: true },
                { label: "Aviso de cancelamento", desc: "Notifica quando um cliente cancela", enabled: false },
                { label: "Relatório diário", desc: "Resumo do dia no final do expediente", enabled: true },
              ].map((setting) => (
                <div key={setting.label} className="flex items-center justify-between py-4 border-b border-zinc-800">
                  <div>
                    <p className="text-sm font-medium text-white">{setting.label}</p>
                    <p className="text-xs text-zinc-500">{setting.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={setting.enabled} className="sr-only peer" />
                    <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>
              ))}
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
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Ativar chatbot</p>
                        <p className="text-xs text-zinc-500">Exibe o assistente na página de agendamento do cliente.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chatbot.enabled}
                          onChange={(e) => setChatbot((prev) => ({ ...prev, enabled: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                      </label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Nome do assistente</label>
                        <input value={chatbot.name} onChange={(e) => setChatbot((prev) => ({ ...prev, name: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Mensagem de boas-vindas</label>
                        <input value={chatbot.welcomeMessage} onChange={(e) => setChatbot((prev) => ({ ...prev, welcomeMessage: e.target.value }))} className={inputCls} />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Endereço</label>
                        <input value={chatbot.address} onChange={(e) => setChatbot((prev) => ({ ...prev, address: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Horário</label>
                        <input value={chatbot.hours} onChange={(e) => setChatbot((prev) => ({ ...prev, hours: e.target.value }))} className={inputCls} />
                      </div>
                    </div>

                    {canWhatsapp && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">Integração WhatsApp</p>
                            <p className="text-xs text-zinc-500">Ative o atendimento direto pelo WhatsApp.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={chatbot.whatsapp.enabled}
                              onChange={(e) => setChatbot((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, enabled: e.target.checked } }))}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                          </label>
                        </div>
                        {chatbot.whatsapp.enabled && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-zinc-300 mb-2">Telefone</label>
                              <input value={chatbot.whatsapp.phone} onChange={(e) => setChatbot((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, phone: e.target.value } }))} className={inputCls} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-300 mb-2">Token</label>
                              <input value={chatbot.whatsapp.token} onChange={(e) => setChatbot((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, token: e.target.value } }))} className={inputCls} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-300 mb-2">Horário automático (de)</label>
                              <input type="time" value={chatbot.whatsapp.autoFrom} onChange={(e) => setChatbot((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, autoFrom: e.target.value } }))} className={inputCls} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-300 mb-2">Horário automático (até)</label>
                              <input type="time" value={chatbot.whatsapp.autoTo} onChange={(e) => setChatbot((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, autoTo: e.target.value } }))} className={inputCls} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">FAQ do assistente</p>
                          <p className="text-xs text-zinc-500">Adicione respostas rápidas para dúvidas comuns.</p>
                        </div>
                        <button onClick={addFaq} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700">
                          <Plus className="w-4 h-4" /> Adicionar
                        </button>
                      </div>
                      {chatbot.faqItems.map((item, index) => (
                        <div key={`${item.question}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white">Pergunta {index + 1}</p>
                            <button onClick={() => removeFaq(index)} className="text-zinc-500 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input value={item.question} onChange={(e) => updateFaq(index, "question", e.target.value)} placeholder="Ex.: Como agendar?" className={inputCls} />
                          <textarea rows={2} value={item.answer} onChange={(e) => updateFaq(index, "answer", e.target.value)} placeholder="Resposta do chatbot..." className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={saveChatbot} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm">
                    {chatbotSaved ? <><CheckCircle className="w-4 h-4" /> Salvou!</> : "Salvar chatbot"}
                  </button>
                </>
              )}
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
