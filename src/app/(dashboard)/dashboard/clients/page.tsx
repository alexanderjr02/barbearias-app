"use client";

import { useState } from "react";
import { Plus, Search, Star, Phone, Calendar, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const clients = [
  { id: "1", name: "Lucas Mendes", phone: "(11) 99999-0001", email: "lucas@email.com", visits: 24, totalSpent: 1320, lastVisit: "2025-07-01", favorite: "Corte + Barba", isVip: true },
  { id: "2", name: "Pedro Alves", phone: "(11) 99999-0002", email: "pedro@email.com", visits: 18, totalSpent: 810, lastVisit: "2025-06-28", favorite: "Corte Degradê", isVip: false },
  { id: "3", name: "Marcos Lima", phone: "(11) 99999-0003", email: "marcos@email.com", visits: 31, totalSpent: 775, lastVisit: "2025-07-02", favorite: "Barba", isVip: true },
  { id: "4", name: "Felipe Costa", phone: "(11) 99999-0004", email: "felipe@email.com", visits: 8, totalSpent: 280, lastVisit: "2025-06-15", favorite: "Corte Simples", isVip: false },
  { id: "5", name: "Gabriel Rocha", phone: "(11) 99999-0005", email: "gabriel@email.com", visits: 45, totalSpent: 2475, lastVisit: "2025-07-01", favorite: "Corte + Barba", isVip: true },
  { id: "6", name: "Rafael Torres", phone: "(11) 99999-0006", email: "rafael@email.com", visits: 12, totalSpent: 540, lastVisit: "2025-06-20", favorite: "Tratamento", isVip: false },
  { id: "7", name: "Bruno Dias", phone: "(11) 99999-0007", email: "bruno@email.com", visits: 5, totalSpent: 150, lastVisit: "2025-06-01", favorite: "Corte Infantil", isVip: false },
  { id: "8", name: "Thiago Carvalho", phone: "(11) 99999-0008", email: "thiago@email.com", visits: 22, totalSpent: 1210, lastVisit: "2025-06-30", favorite: "Corte + Barba", isVip: true },
];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "vip" && c.isVip) ||
      (filter === "regular" && !c.isVip);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Clientes</h1>
          <p className="text-zinc-500 text-sm mt-1">{clients.length} clientes cadastrados</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" />
          Novo cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total de Clientes", value: "342", icon: "👥" },
          { label: "Clientes VIP", value: "28", icon: "⭐" },
          { label: "Novos este mês", value: "7", icon: "🆕" },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">{stat.icon}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex gap-2">
          {["all", "vip", "regular"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === f
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                  : "bg-zinc-800 border border-zinc-700 text-zinc-400"
              }`}
            >
              {f === "all" ? "Todos" : f === "vip" ? "VIP" : "Regular"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <div key={client.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-sm font-bold">
                  {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{client.name}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {client.phone}
                  </p>
                </div>
              </div>
              {client.isVip && (
                <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  <Star className="w-3 h-3 fill-amber-400" /> VIP
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-800/50 rounded-lg p-2">
                <p className="text-lg font-bold text-white">{client.visits}</p>
                <p className="text-xs text-zinc-500">Visitas</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2">
                <p className="text-sm font-bold text-amber-400">{formatCurrency(client.totalSpent)}</p>
                <p className="text-xs text-zinc-500">Total gasto</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2">
                <p className="text-sm font-bold text-white">{formatCurrency(client.totalSpent / client.visits)}</p>
                <p className="text-xs text-zinc-500">Ticket médio</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>Favorito: <span className="text-zinc-300">{client.favorite}</span></span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(client.lastVisit)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
