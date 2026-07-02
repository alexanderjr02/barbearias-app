"use client";

import { useState } from "react";
import { Plus, Scissors, Clock, DollarSign, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const services = [
  { id: "1", name: "Corte Simples", category: "HAIRCUT", duration: 30, price: 35, active: true, count: 120 },
  { id: "2", name: "Corte Degradê", category: "HAIRCUT", duration: 45, price: 45, active: true, count: 89 },
  { id: "3", name: "Corte + Barba", category: "COMBO", duration: 60, price: 55, active: true, count: 210 },
  { id: "4", name: "Barba Completa", category: "BEARD", duration: 30, price: 25, active: true, count: 145 },
  { id: "5", name: "Barba Modelada", category: "BEARD", duration: 40, price: 35, active: true, count: 67 },
  { id: "6", name: "Tratamento Capilar", category: "TREATMENT", duration: 60, price: 45, active: false, count: 23 },
  { id: "7", name: "Corte Infantil", category: "HAIRCUT", duration: 30, price: 30, active: true, count: 55 },
  { id: "8", name: "Relaxamento", category: "TREATMENT", duration: 90, price: 80, active: true, count: 18 },
];

const categoryColors: Record<string, string> = {
  HAIRCUT: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  BEARD: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  COMBO: "bg-green-500/10 text-green-400 border-green-500/30",
  TREATMENT: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

const categoryLabels: Record<string, string> = {
  HAIRCUT: "Corte",
  BEARD: "Barba",
  COMBO: "Combo",
  TREATMENT: "Tratamento",
};

export default function ServicesPage() {
  const [items, setItems] = useState(services);
  const [filter, setFilter] = useState("all");

  const filtered = items.filter(
    (s) => filter === "all" || s.category === filter
  );

  const toggleActive = (id: string) => {
    setItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Serviços</h1>
          <p className="text-zinc-500 text-sm mt-1">{items.filter((s) => s.active).length} ativos de {items.length}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" />
          Novo serviço
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(categoryLabels).map(([key, label]) => {
          const count = items.filter((s) => s.category === key).length;
          return (
            <div key={key} className={`bg-zinc-900 border rounded-xl p-4 text-center cursor-pointer transition-all hover:border-zinc-600 ${filter === key ? "border-amber-500/40 bg-amber-500/5" : "border-zinc-800"}`} onClick={() => setFilter(filter === key ? "all" : key)}>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Services grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((service) => (
          <div key={service.id} className={`bg-zinc-900 border rounded-xl p-5 transition-all ${service.active ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-800/50 opacity-60"}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-white">{service.name}</h3>
                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border mt-1 ${categoryColors[service.category]}`}>
                  {categoryLabels[service.category]}
                </span>
              </div>
              <button
                onClick={() => toggleActive(service.id)}
                className={`transition-colors ${service.active ? "text-green-400" : "text-zinc-600"}`}
              >
                {service.active ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center bg-zinc-800/50 rounded-lg p-2">
                <DollarSign className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{formatCurrency(service.price)}</p>
              </div>
              <div className="text-center bg-zinc-800/50 rounded-lg p-2">
                <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{service.duration}min</p>
              </div>
              <div className="text-center bg-zinc-800/50 rounded-lg p-2">
                <Scissors className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{service.count}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
