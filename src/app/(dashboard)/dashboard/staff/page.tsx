"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Scissors, TrendingUp, CalendarDays, X, Pencil, Star, UserCheck, Crown, Clock } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PhotoUpload } from "@/components/dashboard/PhotoUpload";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StaffScheduleModal } from "@/components/dashboard/StaffScheduleModal";

interface ApiStaff {
  id: string;
  name: string;
  role: string;
  specialties: string | null;
  avatar: string | null;
  commissionRate: number;
  cpf: string | null;
  employmentType: string | null;
  hireDate: string | null;
  pixKey: string | null;
  isActive: boolean;
  appointmentsCount: number;
  revenue: number;
  hasLogin: boolean;
  avgRating: number | null;
  reviewCount: number;
}

interface ApiAppointment {
  id: string;
  clientName: string;
  date: string;
  startTime: string;
  status: string;
  totalPrice: number;
  service: { name: string };
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

function Avatar({ name, avatar, size = 64 }: { name: string; avatar: string | null; size?: number }) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt={name} style={{ width: size, height: size }} className="rounded-2xl object-cover flex-shrink-0" />;
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black flex-shrink-0"
    >
      {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
    </div>
  );
}

export default function StaffPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiStaff | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [agendaStaff, setAgendaStaff] = useState<ApiStaff | null>(null);
  const [scheduleStaff, setScheduleStaff] = useState<ApiStaff | null>(null);
  const queryClient = useQueryClient();

  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => apiGet<ApiStaff[]>("/api/staff") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setAvatar(null);
  };

  const createStaff = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/api/staff", data),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const updateStaff = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiPatch(`/api/staff/${id}`, data),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const { data: agendaAppointments, isLoading: agendaLoading } = useQuery({
    queryKey: ["staff-agenda", agendaStaff?.id],
    queryFn: async () => {
      const me = await apiGet<{ barbershopId: string }>("/api/auth/me");
      return apiGet<ApiAppointment[]>(`/api/appointments?barbershopId=${me.barbershopId}&staffId=${agendaStaff!.id}`);
    },
    enabled: !!agendaStaff,
  });

  const openCreate = () => {
    setEditing(null);
    setAvatar(null);
    setModalOpen(true);
  };

  const openEdit = (member: ApiStaff) => {
    setEditing(member);
    setAvatar(member.avatar);
    setModalOpen(true);
  };

  const activeMutation = editing ? updateStaff : createStaff;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const blank = editing ? null : undefined;
    const data: Record<string, unknown> = {
      name: form.get("name"),
      role: form.get("role") || "BARBER",
      specialties: form.get("specialties") || null,
      commissionRate: Number(form.get("commissionRate")) / 100,
      avatar,
      // Campo vazio: no PATCH vira null ("apaguei isso"), no POST vira
      // undefined — o schema de criação é .optional(), não .nullable(), e
      // mandar null ali derruba a validação inteira.
      cpf: form.get("cpf") || blank,
      employmentType: form.get("employmentType") || blank,
      hireDate: form.get("hireDate") || blank,
      pixKey: form.get("pixKey") || blank,
    };
    if (editing) {
      data.isActive = form.get("isActiveSelect") === "true";
    }
    if (!editing || !editing.hasLogin) {
      data.email = form.get("email") || undefined;
      data.password = form.get("password") || undefined;
    }
    if (editing) {
      updateStaff.mutate({ id: editing.id, data });
    } else {
      createStaff.mutate(data);
    }
  };

  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.specialties ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = staff.reduce((acc, s) => acc + s.revenue, 0);

  return (
    <div className="space-y-6">
      <FormModal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar barbeiro" : "Adicionar barbeiro"}
        onSubmit={handleSubmit}
        isPending={activeMutation.isPending}
        error={activeMutation.error?.message}
        submitLabel={editing ? "Salvar alterações" : "Adicionar barbeiro"}
      >
        <div>
          <label className={labelCls}>Foto de perfil</label>
          <PhotoUpload value={avatar} onChange={setAvatar} shape="square" />
        </div>
        <div>
          <label className={labelCls}>Nome</label>
          <input name="name" required defaultValue={editing?.name} className={fieldCls} placeholder="Ex: João Silva" />
        </div>
        <div>
          <label className={labelCls}>Cargo</label>
          <input name="role" className={fieldCls} placeholder="BARBER" defaultValue={editing?.role ?? "BARBER"} />
        </div>
        <div>
          <label className={labelCls}>Especialidades</label>
          <input name="specialties" defaultValue={editing?.specialties ?? ""} className={fieldCls} placeholder="Degradê, Navalhado" />
        </div>
        <div>
          <label className={labelCls}>Comissão (%)</label>
          <input name="commissionRate" type="number" min={0} max={100} defaultValue={editing ? Math.round(editing.commissionRate * 100) : 40} className={fieldCls} />
        </div>

        <div className="pt-2 border-t border-zinc-800 space-y-3">
          <p className="text-xs text-zinc-500">Dados trabalhistas — tudo opcional, preencha o que fizer sentido.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Vínculo</label>
              <select name="employmentType" defaultValue={editing?.employmentType ?? ""} className={fieldCls}>
                <option value="">Não informado</option>
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="AUTONOMO">Autônomo</option>
                <option value="PARCEIRO">Parceiro / cadeira</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Admissão</label>
              <input name="hireDate" type="date" defaultValue={editing?.hireDate ? editing.hireDate.slice(0, 10) : ""} className={fieldCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>CPF</label>
            <input name="cpf" inputMode="numeric" defaultValue={editing?.cpf ?? ""} className={fieldCls} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className={labelCls}>Chave PIX do barbeiro</label>
            <input name="pixKey" defaultValue={editing?.pixKey ?? ""} className={fieldCls} placeholder="CPF, celular, e-mail ou aleatória" />
            <p className="text-xs text-zinc-500 mt-1.5">
              A gorjeta do cliente cai direto nessa chave. Sem ela, vai para a chave da barbearia e você repassa na mão.
            </p>
          </div>
        </div>
        {editing && (
          <div>
            <label className={labelCls}>Status</label>
            <select name="isActiveSelect" defaultValue={editing.isActive ? "true" : "false"} className={fieldCls}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        )}
        {(!editing || !editing.hasLogin) && (
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-3">Opcional: crie um acesso para esse barbeiro usar o app CORTIX.</p>
            <label className={labelCls}>E-mail de acesso</label>
            <input name="email" type="email" className={fieldCls} placeholder="barbeiro@email.com" />
            <label className={labelCls + " mt-3 block"}>Senha de acesso</label>
            <input name="password" type="password" minLength={8} className={fieldCls} placeholder="Mínimo 8 caracteres" />
          </div>
        )}
        {editing?.hasLogin && (
          <p className="text-xs text-emerald-400">Este barbeiro já tem acesso ao app com o e-mail cadastrado.</p>
        )}
      </FormModal>

      {/* Agenda modal */}
      {agendaStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAgendaStaff(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar name={agendaStaff.name} avatar={agendaStaff.avatar} size={36} />
                <div>
                  <h2 className="text-base font-bold text-white">Agenda de {agendaStaff.name}</h2>
                  <p className="text-xs text-zinc-500">Últimos e próximos agendamentos</p>
                </div>
              </div>
              <button onClick={() => setAgendaStaff(null)} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
              {agendaLoading && <p className="text-sm text-zinc-500 text-center py-10">Carregando...</p>}
              {!agendaLoading && (agendaAppointments ?? []).length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-10">Nenhum agendamento para este barbeiro.</p>
              )}
              {(agendaAppointments ?? []).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{apt.clientName}</p>
                    <p className="text-xs text-zinc-500">{apt.service.name} · {formatDate(apt.date)} às {apt.startTime}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">{STATUS_LABELS[apt.status] ?? apt.status}</p>
                    <p className="text-sm font-bold text-amber-400">{formatCurrency(apt.totalPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {scheduleStaff && (
        <StaffScheduleModal
          staffId={scheduleStaff.id}
          staffName={scheduleStaff.name}
          onClose={() => setScheduleStaff(null)}
        />
      )}

      <PageHeader
        icon={UserCheck}
        title="Equipe"
        subtitle={`${staff.filter((s) => s.isActive).length} barbeiros ativos · ${formatCurrency(totalRevenue)} receita/mês`}
        action={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" />
            Adicionar barbeiro
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <UserCheck className="w-4 h-4 text-blue-400 mb-2" />
          <p className="text-2xl font-black text-white">{staff.length}</p>
          <p className="text-xs text-zinc-500">Total de barbeiros</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <TrendingUp className="w-4 h-4 text-amber-400 mb-2" />
          <p className="text-2xl font-black text-white">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-zinc-500">Receita total/mês</p>
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
      {filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-500 bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl">
          <UserCheck className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
          Nenhum barbeiro cadastrado ainda
        </div>
      )}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
        {[...filtered].sort((a, b) => b.revenue - a.revenue).map((member, index) => {
          const isTop = index === 0 && member.revenue > 0 && member.isActive;
          return (
            <div
              key={member.id}
              className={cn(
                "relative flex flex-col h-full bg-zinc-900 border rounded-2xl p-5 transition-all",
                member.isActive ? "border-zinc-800 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/30" : "border-zinc-800/50 opacity-60"
              )}
            >
              {isTop && (
                <span className="absolute -top-2.5 right-4 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg">
                  <Crown className="w-3 h-3" /> TOP DO MÊS
                </span>
              )}

              <div className="flex items-start gap-3.5">
                <Avatar name={member.name} avatar={member.avatar} size={56} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white truncate">{member.name}</h3>
                  <p className="text-xs text-zinc-500">{member.role}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {member.avgRating != null && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-400 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400" /> {member.avgRating.toFixed(1)}
                        <span className="text-zinc-600 font-normal">({member.reviewCount})</span>
                      </span>
                    )}
                    {member.hasLogin && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        App ativo
                      </span>
                    )}
                    {!member.isActive && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-700/40 border border-zinc-600 text-zinc-400">
                        Inativo
                      </span>
                    )}
                  </div>
                  {member.specialties && <p className="text-xs text-zinc-600 mt-1.5 truncate">{member.specialties}</p>}
                </div>
                <button onClick={() => openEdit(member)} title="Editar" className="text-zinc-600 hover:text-amber-400 transition-colors flex-shrink-0 p-1">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 divide-x divide-zinc-800 mt-auto pt-4 border-t border-zinc-800/80">
                <div className="flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 overflow-hidden">
                  <Scissors className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm font-bold text-white truncate w-full text-center">{member.appointmentsCount}</span>
                  <span className="text-[11px] text-zinc-500">cortes</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 overflow-hidden">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-sm font-bold text-amber-400 truncate w-full text-center">{formatCurrency(member.revenue)}</span>
                  <span className="text-[11px] text-zinc-500">receita</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 overflow-hidden">
                  <span className="text-sm font-bold text-white truncate w-full text-center">{Math.round(member.commissionRate * 100)}%</span>
                  <span className="text-[11px] text-zinc-500">comissão</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs text-zinc-500 truncate min-w-0 flex-1">
                  Comissão: <span className="text-white font-semibold">{formatCurrency(member.revenue * member.commissionRate)}</span>
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setScheduleStaff(member)}
                    title="Horário e folgas"
                    className="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-amber-400 bg-zinc-800/60 hover:bg-amber-500/10 rounded-lg transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setAgendaStaff(member)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Agenda
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
