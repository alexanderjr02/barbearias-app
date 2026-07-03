"use client";

import { useEffect, useState } from "react";
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
import { usePlan, PLAN_INFO } from "@/context/PlanContext";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Barbearia", icon: Store },
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "hours", label: "Horários", icon: Clock },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "chatbot", label: "Chatbot", icon: MessageSquareText },
  { id: "billing", label: "Plano", icon: CreditCard },
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
  const { plan, can } = usePlan();
  const [activeTab, setActiveTab] = useState("profile");
  const [primaryColor, setPrimaryColor] = useState("#D4AF37");
  const [hours, setHours] = useState(defaultHours);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [chatbot, setChatbot] = useState<ChatbotConfig>(defaultChatbot);
  const [chatbotSaved, setChatbotSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cortix_chatbot_config");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Partial<ChatbotConfig>;
      setChatbot((prev) => ({ ...prev, ...parsed, whatsapp: { ...prev.whatsapp, ...parsed.whatsapp } }));
    } catch {
      // ignore invalid storage
    }
  }, []);

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
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white">Informações da Barbearia</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Nome da barbearia", placeholder: "Barbearia do João", defaultValue: "Barbearia do João" },
                  { label: "Link personalizado", placeholder: "minha-barbearia", defaultValue: "barbearia-do-joao" },
                  { label: "Telefone / WhatsApp", placeholder: "(11) 99999-9999", defaultValue: "(11) 99999-9999" },
                  { label: "E-mail", placeholder: "contato@barbearia.com", defaultValue: "contato@barbearia.com" },
                  { label: "Instagram", placeholder: "@suabarbearia", defaultValue: "@barbearia_joao" },
                  { label: "Cidade", placeholder: "São Paulo, SP", defaultValue: "São Paulo, SP" },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">{field.label}</label>
                    <input type="text" defaultValue={field.defaultValue} placeholder={field.placeholder} className={inputCls} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição</label>
                <textarea
                  rows={3}
                  defaultValue="A melhor barbearia da região! Especialistas em corte degradê e barba. Venha nos visitar!"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
              <button className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm">
                Salvar alterações
              </button>
            </div>
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
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">BJ</div>
                    <span className="font-bold text-white">Barbearia do João</span>
                  </div>
                  <div className="bg-zinc-800 p-4 text-center">
                    <p className="text-sm text-zinc-400">Sua página personalizada de agendamento</p>
                    <button className="mt-2 px-4 py-2 text-sm font-bold rounded-lg text-black" style={{ backgroundColor: primaryColor }}>
                      Agendar horário
                    </button>
                  </div>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm">
                Salvar aparência
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
                        <input type="time" defaultValue={h.open} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                        <span className="text-zinc-500 text-sm">até</span>
                        <input type="time" defaultValue={h.close} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">Fechado</span>
                    )}
                  </div>
                ))}
              </div>
              <button className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm">
                Salvar horários
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
                  <p className="text-sm text-zinc-500 mt-1">Ajuste seu plano e veja o que cada opção desbloqueia.</p>
                </div>
                <button onClick={() => setUpgradeOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-semibold">
                  <Sparkles className="w-4 h-4" /> Mudar plano
                </button>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", planInfo.badgeBg)}>{planInfo.label}</span>
                    <p className="text-3xl font-black text-white mt-3">{planInfo.price}</p>
                    <p className="text-sm text-zinc-400 mt-1">{plan === "FREE" ? "Ideal para começar" : "Acesso completo aos recursos premium"}</p>
                  </div>
                  <div className="text-right text-sm text-zinc-400">
                    <p>{plan === "FREE" ? "50 agendamentos/mês" : "Agendamentos ilimitados"}</p>
                    <p>{plan === "FREE" ? "1 barbeiro" : plan === "PRO" ? "Até 10 barbeiros" : "Barbeiros ilimitados"}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {[
                  "Chatbot personalizável",
                  "WhatsApp Business",
                  "Relatórios avançados",
                  "Marketing e campanhas",
                  "Controle de estoque",
                  "Exportar dados",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                    <CheckCircle className="w-4 h-4 text-amber-400" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
