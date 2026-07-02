"use client";

import { useState } from "react";
import { Plus, Search, Calendar, Clock, CheckCircle, XCircle, Phone, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const appointments = [
  { id: "1", client: "Lucas Mendes", phone: "(11) 99999-0001", service: "Corte + Barba", barber: "João Silva", date: "02/07/2025", time: "09:00", status: "COMPLETED", value: 55 },
  { id: "2", client: "Pedro Alves", phone: "(11) 99999-0002", service: "Corte Degradê", barber: "Carlos Souza", date: "02/07/2025", time: "10:00", status: "IN_PROGRESS", value: 45 },
  { id: "3", client: "Marcos Lima", phone: "(11) 99999-0003", service: "Barba", barber: "João Silva", date: "02/07/2025", time: "11:00", status: "SCHEDULED", value: 25 },
  { id: "4", client: "Felipe Costa", phone: "(11) 99999-0004", service: "Corte Simples", barber: "André Santos", date: "02/07/2025", time: "11:30", status: "SCHEDULED", value: 35 },
  { id: "5", client: "Gabriel Rocha", phone: "(11) 99999-0005", service: "Corte + Barba", barber: "Carlos Souza", date: "02/07/2025", time: "14:00", status: "SCHEDULED", value: 55 },
  { id: "6", client: "Rafael Torres", phone: "(11) 99999-0006", service: "Tratamento", barber: "André Santos", date: "02/07/2025", time: "15:00", status: "SCHEDULED", value: 45 },
  { id: "7", client: "Bruno Dias", phone: "(11) 99999-0007", service: "Corte Infantil", barber: "João Silva", date: "02/07/2025", time: "16:00", status: "CANCELLED", value: 30 },
  { id: "8", client: "Thiago Carvalho", phone: "(11) 99999-0008", service: "Corte + Barba", barber: "Carlos Souza", date: "03/07/2025", time: "09:00", status: "SCHEDULED", value: 55 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: "Concluído", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  IN_PROGRESS: { label: "Em andamento", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  SCHEDULED: { label: "Agendado", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  CANCELLED: { label: "Cancelado", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

export default function AppointmentsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = appointments.filter((a) => {
    const matchStatus = filter === "all" || a.status === filter;
    const matchSearch =
      a.client.toLowerCase().includes(search.toLowerCase()) ||
      a.service.toLowerCase().includes(search.toLowerCase()) ||
      a.barber.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Agendamentos</h1>
          <p className="text-zinc-500 text-sm mt-1">{appointments.length} agendamentos no total</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" />
          Novo agendamento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === s
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                  : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300"
              }`}
            >
              {s === "all" ? "Todos" : statusConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Serviço</th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Barbeiro</th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Data/Hora</th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((apt) => {
                const status = statusConfig[apt.status];
                return (
                  <tr key={apt.id} className="hover:bg-white/2 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
                          {apt.client.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{apt.client}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {apt.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-zinc-300">{apt.service}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-sm text-zinc-400">{apt.barber}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-white font-medium">{apt.time}</p>
                      <p className="text-xs text-zinc-500">{apt.date}</p>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-amber-400">{formatCurrency(apt.value)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              Nenhum agendamento encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
