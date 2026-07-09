"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Search, ChevronDown, Plus, X, Megaphone } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { usePlan, PLAN_INFO } from "@/context/PlanContext";
import { NewAppointmentModal } from "@/components/dashboard/NewAppointmentModal";
import { getInitials, formatDateTime } from "@/lib/utils";

interface BarbershopMe {
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export function Topbar() {
  const queryClient = useQueryClient();
  const [newAptOpen, setNewAptOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { plan } = usePlan();
  const { data: barbershop } = useQuery({ queryKey: ["barbershop-me"], queryFn: () => apiGet<BarbershopMe>("/api/barbershop") });
  const { data: announcements } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: () => apiGet<Announcement[]>("/api/announcements/active"),
    refetchInterval: 60_000,
  });
  const name = barbershop?.name ?? "Minha barbearia";
  const count = announcements?.length ?? 0;

  const dismiss = async (id: string) => {
    await apiPost(`/api/announcements/${id}/dismiss`, {});
    queryClient.invalidateQueries({ queryKey: ["active-announcements"] });
  };

  return (
    <>
      {/* Rendered as a sibling, not a header child — backdrop-blur on <header> would
          otherwise become the containing block for this modal's fixed positioning. */}
      <NewAppointmentModal open={newAptOpen} onClose={() => setNewAptOpen(false)} />

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
          <button
            onClick={() => setNewAptOpen(true)}
            className="hidden sm:flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-900 text-sm font-semibold rounded-xl hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Novo agendamento
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative w-9 h-9 rounded-xl text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-all flex items-center justify-center"
            >
              <Bell className="w-4 h-4" />
              {count > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full border-2 border-zinc-950" />}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-11 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                    <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-white">Avisos</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800">
                    {count === 0 && <p className="text-xs text-zinc-500 text-center py-8">Nenhum aviso novo</p>}
                    {(announcements ?? []).map((a) => (
                      <div key={a.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-zinc-200">{a.title}</p>
                          <button onClick={() => dismiss(a.id)} className="text-zinc-600 hover:text-zinc-300 flex-shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{a.body}</p>
                        <p className="text-[10px] text-zinc-700 mt-1.5">{formatDateTime(a.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button className="flex items-center gap-2.5 h-9 pl-1 pr-3 rounded-xl hover:bg-zinc-900 transition-all border border-transparent hover:border-zinc-800">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-900 text-xs font-black flex-shrink-0">
              {getInitials(name)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-zinc-200 leading-none">{name}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Plano {PLAN_INFO[plan].label}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-600 hidden sm:block" />
          </button>
        </div>
      </header>
    </>
  );
}
