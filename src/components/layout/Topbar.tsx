"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Search, Plus, X, Megaphone, Inbox, CalendarPlus, CalendarX, LifeBuoy } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";

import { NewAppointmentModal } from "@/components/dashboard/NewAppointmentModal";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { UnitSwitcher } from "@/components/layout/UnitSwitcher";
import { formatDateTime, cn } from "@/lib/utils";

interface BarbershopMe {
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface GestorNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: GestorNotification[];
  unreadCount: number;
}

const NOTIF_ICON: Record<string, typeof CalendarPlus> = {
  NEW_APPOINTMENT: CalendarPlus,
  APPOINTMENT_CANCELLED: CalendarX,
  SUPPORT_REPLY: LifeBuoy,
};

export function Topbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newAptOpen, setNewAptOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [bellTab, setBellTab] = useState<"avisos" | "notificacoes">("avisos");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { data: barbershop } = useQuery({ queryKey: ["barbershop-me"], queryFn: () => apiGet<BarbershopMe>("/api/barbershop") });
  const { data: announcements } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: () => apiGet<Announcement[]>("/api/announcements/active"),
    refetchInterval: 60_000,
  });
  const { data: notifData } = useQuery({
    queryKey: ["gestor-notifications"],
    queryFn: () => apiGet<NotificationsResponse>("/api/notifications"),
    refetchInterval: 60_000,
  });
  const name = barbershop?.name ?? "Minha barbearia";
  const announcementCount = announcements?.length ?? 0;
  const unreadCount = notifData?.unreadCount ?? 0;
  const totalBadge = announcementCount + unreadCount;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const dismissAnnouncement = async (id: string) => {
    await apiPost(`/api/announcements/${id}/dismiss`, {});
    queryClient.invalidateQueries({ queryKey: ["active-announcements"] });
    toast.success("Aviso dispensado");
  };

  const openBell = () => {
    setNotifOpen((v) => !v);
  };

  const openNotificationsTab = () => {
    setBellTab("notificacoes");
    if (unreadCount > 0) {
      apiPost("/api/notifications/read-all", {}).then(() => queryClient.invalidateQueries({ queryKey: ["gestor-notifications"] }));
    }
  };

  const goToNotification = (n: GestorNotification) => {
    setNotifOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <>
      {/* Rendered as a sibling, not a header child — backdrop-blur on <header> would
          otherwise become the containing block for this modal's fixed positioning. */}
      <NewAppointmentModal open={newAptOpen} onClose={() => setNewAptOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <header className="h-16 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/60 flex items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setPaletteOpen(true)} className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <div className="w-64 pl-9 pr-4 h-9 flex items-center justify-between text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:border-zinc-700 transition-all">
              <span>Buscar...</span>
              <kbd className="text-[10px] text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">Ctrl K</kbd>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewAptOpen(true)}
            className="hidden sm:flex items-center gap-2 h-9 pl-3 pr-4 bg-amber-500 text-zinc-950 text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Novo agendamento
          </button>

          <div className="relative">
            <button
              onClick={openBell}
              className="relative w-9 h-9 rounded-xl text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-all flex items-center justify-center"
            >
              <Bell className="w-4 h-4" />
              {totalBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-amber-400 rounded-full border-2 border-zinc-950 text-[9px] font-bold text-zinc-900 flex items-center justify-center">
                  {totalBadge > 9 ? "9+" : totalBadge}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-11 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex border-b border-zinc-800">
                    <button
                      onClick={() => setBellTab("avisos")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors",
                        bellTab === "avisos" ? "text-amber-400 border-b-2 border-amber-400 -mb-px" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Megaphone className="w-3.5 h-3.5" /> Avisos {announcementCount > 0 && `(${announcementCount})`}
                    </button>
                    <button
                      onClick={openNotificationsTab}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors",
                        bellTab === "notificacoes" ? "text-amber-400 border-b-2 border-amber-400 -mb-px" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Inbox className="w-3.5 h-3.5" /> Notificações {unreadCount > 0 && `(${unreadCount})`}
                    </button>
                  </div>

                  {bellTab === "avisos" ? (
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800">
                      {announcementCount === 0 && <p className="text-xs text-zinc-500 text-center py-8">Nenhum aviso novo</p>}
                      {(announcements ?? []).map((a) => (
                        <div key={a.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-zinc-200">{a.title}</p>
                            <button onClick={() => dismissAnnouncement(a.id)} className="text-zinc-600 hover:text-zinc-300 flex-shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">{a.body}</p>
                          <p className="text-[10px] text-zinc-700 mt-1.5">{formatDateTime(a.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800">
                      {(notifData?.notifications ?? []).length === 0 && <p className="text-xs text-zinc-500 text-center py-8">Nenhuma notificação ainda</p>}
                      {(notifData?.notifications ?? []).map((n) => {
                        const Icon = NOTIF_ICON[n.type] ?? Inbox;
                        return (
                          <button key={n.id} onClick={() => goToNotification(n)} className="w-full flex items-start gap-2.5 px-4 py-3 hover:bg-white/[0.03] text-left transition-colors">
                            <Icon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-zinc-200">{n.title}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>
                              <p className="text-[10px] text-zinc-700 mt-1">{formatDateTime(n.createdAt)}</p>
                            </div>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <UnitSwitcher shopName={name} />
        </div>
      </header>
    </>
  );
}
