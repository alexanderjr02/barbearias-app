"use client";

import { useState } from "react";
import { Plus, Search, Star, Calendar, Scissors, TrendingUp, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const staff = [
  { id: "1", name: "João Silva", role: "Barbeiro Sênior", specialties: "Degradê, Navalhado", appointments: 145, revenue: 8700, commission: 40, rating: 4.9, avatar: "JS", isActive: true },
  { id: "2", name: "Carlos Souza", role: "Barbeiro", specialties: "Corte Clássico, Barba", appointments: 118, revenue: 6490, commission: 40, rating: 4.8, avatar: "CS", isActive: true },
  { id: "3", name: "André Santos", role: "Barbeiro", specialties: "Tratamentos, Coloração", appointments: 93, revenue: 5115, commission: 35, rating: 4.7, avatar: "AS", isActive: true },
  { id: "4", name: "Marcos Ferreira", role: "Aprendiz", specialties: "Corte Básico", appointments: 42, revenue: 1470, commission: 30, rating: 4.5, avatar: "MF", isActive: true },
];

export default function StaffPage() {
  const [search, setSearch] = useState("");

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.specialties.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = staff.reduce((acc, s) => acc + s.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Equipe</h1>
          <p className="text-zinc-500 text-sm mt-1">{staff.filter((s) => s.isActive).length} barbeiros ativos</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" />
          Adicionar barbeiro
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
          <p className="text-3xl font-black text-white">{staff.length}</p>
          <p className="text-sm text-zinc-500">Total de barbeiros</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
          <p className="text-3xl font-black text-amber-400">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-zinc-500">Receita total/mês</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
          <p className="text-3xl font-black text-white">
            {Math.round(staff.reduce((a, s) => a + s.rating, 0) / staff.length * 10) / 10}
          </p>
          <p className="text-sm text-zinc-500">Avaliação média</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar barbeiro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Staff cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {filtered.map((member) => (
          <div key={member.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-xl font-black">
                {member.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{member.name}</h3>
                  <span className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {member.rating}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{member.role}</p>
                <p className="text-xs text-zinc-600 mt-1">{member.specialties}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <Scissors className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{member.appointments}</p>
                <p className="text-xs text-zinc-500">Cortes/mês</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-amber-400">{formatCurrency(member.revenue)}</p>
                <p className="text-xs text-zinc-500">Receita/mês</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{member.commission}%</p>
                <p className="text-xs text-zinc-500">Comissão</p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Comissão estimada:{" "}
                <span className="text-white font-semibold">
                  {formatCurrency(member.revenue * (member.commission / 100))}
                </span>
              </span>
              <button className="text-xs text-amber-400 hover:underline">
                Ver agenda →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
