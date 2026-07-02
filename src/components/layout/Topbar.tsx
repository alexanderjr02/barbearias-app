"use client";

import { Bell, Search, ChevronDown, Plus } from "lucide-react";

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export function Topbar({ title = "Dashboard", subtitle }: TopbarProps) {
  return (
    <header className="h-16 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/60 flex items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            placeholder="Buscar agendamento, cliente..."
            className="w-64 pl-9 pr-4 h-9 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="hidden sm:flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-900 text-sm font-semibold rounded-xl hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" />
          Novo agendamento
        </button>

        <button className="relative w-9 h-9 rounded-xl text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-all flex items-center justify-center">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full border-2 border-zinc-950"></span>
        </button>

        <button className="flex items-center gap-2.5 h-9 pl-1 pr-3 rounded-xl hover:bg-zinc-900 transition-all border border-transparent hover:border-zinc-800">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-900 text-xs font-black">
            AB
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-zinc-200 leading-none">Barbearia do João</p>
            <p className="text-xs text-zinc-600 mt-0.5">Plano Pro</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-600 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}

