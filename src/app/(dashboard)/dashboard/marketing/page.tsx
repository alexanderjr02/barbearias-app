"use client";

import { Mail, MessageSquare, Users, Megaphone, Bell } from "lucide-react";

const campaigns = [
  { id: "1", name: "Promoção Julho", type: "WhatsApp", status: "Enviada", recipients: 245, opened: 198, date: "01/07/2025" },
  { id: "2", name: "Lembrete Aniversariantes", type: "Email", status: "Programada", recipients: 18, opened: 0, date: "05/07/2025" },
  { id: "3", name: "Reativação Inativos", type: "SMS", status: "Rascunho", recipients: 67, opened: 0, date: "—" },
];

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Marketing</h1>
          <p className="text-zinc-500 text-sm mt-1">Campanhas e automações</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all">
          <Megaphone className="w-4 h-4" />
          Nova campanha
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: MessageSquare, label: "Campanha WhatsApp", color: "from-green-500 to-emerald-500" },
          { icon: Mail, label: "Campanha Email", color: "from-blue-500 to-cyan-500" },
          { icon: Bell, label: "Lembrete Automático", color: "from-amber-500 to-yellow-500" },
          { icon: Users, label: "Programa Fidelidade", color: "from-purple-500 to-violet-500" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center hover:border-zinc-700 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mx-auto mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-medium text-zinc-300">{action.label}</p>
            </button>
          );
        })}
      </div>

      {/* Automations */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Automações Ativas</h3>
        <div className="space-y-3">
          {[
            { label: "Lembrete 24h antes", desc: "Mensagem WhatsApp 24h antes do agendamento", active: true },
            { label: "Lembrete 2h antes", desc: "Mensagem WhatsApp 2h antes do agendamento", active: true },
            { label: "Aniversariantes do dia", desc: "Mensagem especial no aniversário do cliente", active: false },
            { label: "Reativação de inativos", desc: "Mensagem para clientes sem visita há 30 dias", active: false },
          ].map((auto) => (
            <div key={auto.label} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{auto.label}</p>
                <p className="text-xs text-zinc-500">{auto.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={auto.active} className="sr-only peer" />
                <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white">Últimas Campanhas</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="px-6 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{campaign.name}</p>
                <p className="text-xs text-zinc-500">{campaign.type} · {campaign.date}</p>
              </div>
              <div className="text-center hidden sm:block">
                <p className="text-sm font-medium text-white">{campaign.recipients}</p>
                <p className="text-xs text-zinc-500">enviados</p>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-sm font-medium text-amber-400">{campaign.opened}</p>
                <p className="text-xs text-zinc-500">abertos</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                campaign.status === "Enviada" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                campaign.status === "Programada" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                "bg-zinc-700/50 text-zinc-400 border-zinc-600"
              }`}>
                {campaign.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
