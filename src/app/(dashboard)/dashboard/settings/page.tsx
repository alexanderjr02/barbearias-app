"use client";

import { useState } from "react";
import { Palette, Store, Clock, Bell, CreditCard, Shield } from "lucide-react";

const tabs = [
  { id: "profile", label: "Barbearia", icon: Store },
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "hours", label: "Horários", icon: Clock },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "billing", label: "Plano", icon: CreditCard },
];

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const defaultHours = days.map((day, i) => ({
  day,
  isOpen: i !== 0,
  open: "09:00",
  close: i === 6 ? "18:00" : "20:00",
}));

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [primaryColor, setPrimaryColor] = useState("#D4AF37");
  const [hours, setHours] = useState(defaultHours);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Configurações</h1>
        <p className="text-zinc-500 text-sm mt-1">Personalize sua barbearia</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
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

        {/* Content */}
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
                    <input
                      type="text"
                      defaultValue={field.defaultValue}
                      placeholder={field.placeholder}
                      className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
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

          {activeTab === "billing" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white">Plano Atual</h2>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">Plano Pro</span>
                    <p className="text-3xl font-black text-white mt-3">R$ 97<span className="text-lg text-zinc-400 font-normal">/mês</span></p>
                    <p className="text-sm text-zinc-400 mt-1">Renova em 01/08/2025</p>
                  </div>
                  <button className="text-sm text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg hover:bg-amber-500/10 transition-colors">
                    Mudar plano
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  "Agendamentos ilimitados",
                  "Até 10 barbeiros",
                  "Chatbot avançado",
                  "Gestão financeira completa",
                  "Controle de estoque",
                  "Marketing e lembretes",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    </div>
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
