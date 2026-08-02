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
import { DatePicker } from "@/components/ui/DatePicker";

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
  // Recortes do mês corrente, é assim que comissão fecha e que dá pra
  // comparar um barbeiro com o outro sem o acumulado de sempre distorcer.
  monthAppointments: number;
  monthRevenue: number;
  /** Um número por dia nos últimos 7, do mais antigo para hoje. */
  last7: number[];
  /** % do tempo aberto da barbearia que este barbeiro já tem preenchido no mês. */
  occupancy: number;
  clientsCount: number;
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

// Iniciais dos dias, indexadas por getDay() (domingo = 0).
// O banco guarda o cargo em caixa alta (BARBER). Mostrar isso cru na tela
// e vazar detalhe de banco pro dono da barbearia.
const CARGO_LABELS: Record<string, string> = { BARBER: "Barbeiro", MANAGER: "Gerente", OWNER: "Dono", ASSISTANT: "Auxiliar" };
const rotuloCargo = (c: string) => CARGO_LABELS[c?.toUpperCase()] ?? c;

const DIAS_CURTOS = ["D", "S", "T", "Q", "Q", "S", "S"];

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
      className="rounded-2xl bg-amber-500 flex items-center justify-center text-black font-black flex-shrink-0"
    >
      {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
    </div>
  );
}

export default function StaffPage() {
  const [search, setSearch] = useState("");
  const [filtroApp, setFiltroApp] = useState<"todos" | "com" | "sem">("todos");
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
      // undefined, o schema de criação é .optional(), não .nullable(), e
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

  const filtered = staff.filter((s) => {
    const busca =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.specialties ?? "").toLowerCase().includes(search.toLowerCase());
    const app = filtroApp === "todos" || (filtroApp === "com" ? s.hasLogin : !s.hasLogin);
    return busca && app;
  });

  // Indicadores do MÊS, só de quem está ativo, barbeiro desligado não entra na
  // média de ocupação nem puxa a comissão a pagar.
  const equipeAtiva = staff.filter((s) => s.isActive);
  const ativos = equipeAtiva.length;
  const receitaMes = equipeAtiva.reduce((acc, s) => acc + s.monthRevenue, 0);
  const cortesMes = equipeAtiva.reduce((acc, s) => acc + s.monthAppointments, 0);
  const comissoesMes = equipeAtiva.reduce((acc, s) => acc + s.monthRevenue * s.commissionRate, 0);
  const ocupacaoMedia = ativos > 0 ? Math.round(equipeAtiva.reduce((acc, s) => acc + s.occupancy, 0) / ativos) : 0;
  // O gráfico dos 7 dias termina HOJE, então a última coluna é o dia de hoje.
  const hojeDia = new Date().getDay();

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
          <p className="text-xs text-zinc-500">Dados trabalhistas, tudo opcional, preencha o que fizer sentido.</p>
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
              <DatePicker name="hireDate" defaultValue={editing?.hireDate ? editing.hireDate.slice(0, 10) : ""} placeholder="Escolher data" clearable />
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
            <p className="text-xs text-zinc-500 mb-3">Opcional: crie um acesso para esse barbeiro usar o app rukz.</p>
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
        title="Equipe"
        subtitle={`${ativos} barbeiro${ativos === 1 ? "" : "s"} ativo${ativos === 1 ? "" : "s"} · ${formatCurrency(receitaMes)} de receita neste mês`}
        action={
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/10 transition-all hover:opacity-90">
            <Plus className="h-4 w-4" />
            Adicionar barbeiro
          </button>
        }
      />

      {/* Faixa de indicadores: responde "como a equipe está indo" antes de
          olhar barbeiro por barbeiro. Tudo do mês corrente. */}
      <div className="grid grid-cols-2 divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 lg:grid-cols-4 lg:divide-x">
        {[
          { rotulo: "Receita da equipe", valor: formatCurrency(receitaMes), nota: `${cortesMes} corte${cortesMes === 1 ? "" : "s"} concluído${cortesMes === 1 ? "" : "s"}` },
          { rotulo: "Cortes no mês", valor: String(cortesMes), nota: ativos > 0 ? `média de ${(cortesMes / ativos).toFixed(1).replace(".", ",")} por barbeiro` : "sem barbeiro ativo" },
          { rotulo: "Comissões a pagar", valor: formatCurrency(comissoesMes), nota: "sobre o que já foi concluído" },
          { rotulo: "Ocupação média", valor: `${ocupacaoMedia}%`, nota: `${100 - ocupacaoMedia}% da agenda ainda livre` },
        ].map((kpi) => (
          <div key={kpi.rotulo} className="px-5 py-4">
            <p className="text-xs text-zinc-500">{kpi.rotulo}</p>
            <p className="mt-1.5 text-2xl font-black tracking-tight text-white">{kpi.valor}</p>
            <p className="mt-1 text-[11px] text-zinc-600">{kpi.nota}</p>
          </div>
        ))}
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar barbeiro"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {([
            ["todos", `Todos · ${staff.length}`],
            ["com", "Com app"],
            ["sem", "Sem app"],
          ] as const).map(([chave, rotulo]) => (
            <button
              key={chave}
              onClick={() => setFiltroApp(chave)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                filtroApp === chave
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 py-16 text-center text-zinc-500">
          Nenhum barbeiro encontrado
        </div>
      )}

      <div className="grid items-stretch gap-5 xl:grid-cols-2">
        {[...filtered].sort((a, b) => b.monthRevenue - a.monthRevenue).map((member, index) => {
          const isTop = index === 0 && member.monthRevenue > 0 && member.isActive;
          const picoSemana = Math.max(1, ...member.last7);
          return (
            <div
              key={member.id}
              className={cn(
                "flex h-full flex-col rounded-2xl border bg-zinc-900 p-5 transition-all",
                member.isActive ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-800/50 opacity-60"
              )}
            >
              {/* Identificação */}
              <div className="flex items-start gap-3.5">
                <Avatar name={member.name} avatar={member.avatar} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-white">{member.name}</h3>
                    {isTop && (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400">
                        TOP DO MÊS
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {rotuloCargo(member.role)}
                    {" · "}
                    <span className={member.hasLogin ? "text-emerald-400" : "text-zinc-600"}>
                      {member.hasLogin ? "App ativo" : "Sem app"}
                    </span>
                    {!member.isActive && " · Inativo"}
                  </p>
                </div>
                <button onClick={() => openEdit(member)} title="Editar" className="flex-shrink-0 p-1 text-zinc-600 transition-colors hover:text-amber-400">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              {/* Especialidades como etiquetas, texto corrido some no cartão */}
              {member.specialties && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {member.specialties.split(/[,;]/).map((e) => e.trim()).filter(Boolean).slice(0, 5).map((esp) => (
                    <span key={esp} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-[11px] text-zinc-400">
                      {esp}
                    </span>
                  ))}
                </div>
              )}

              {/* Números do mês */}
              <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/40">
                <div className="px-4 py-3">
                  <p className="text-[11px] text-zinc-500">Cortes no mês</p>
                  <p className="mt-0.5 text-lg font-black text-white">{member.monthAppointments}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] text-zinc-500">Receita gerada</p>
                  <p className="mt-0.5 text-lg font-black text-white">{formatCurrency(member.monthRevenue)}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] text-zinc-500">Comissão ({Math.round(member.commissionRate * 100)}%)</p>
                  <p className="mt-0.5 text-lg font-black text-amber-400">{formatCurrency(member.monthRevenue * member.commissionRate)}</p>
                </div>
              </div>

              {/* Ocupação */}
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500">Ocupação da agenda</span>
                  <span className="text-sm font-bold text-white">{member.occupancy}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, member.occupancy)}%` }} />
                </div>
              </div>

              {/* Ritmo da semana */}
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500">Últimos 7 dias</span>
                  <span className="text-xs text-zinc-500">
                    {member.avgRating != null && (
                      <>
                        <span className="font-semibold text-amber-400">{member.avgRating.toFixed(1).replace(".", ",")}</span>
                        {" ★ · "}
                      </>
                    )}
                    {member.clientsCount} cliente{member.clientsCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-2 flex items-end gap-1.5">
                  {member.last7.map((qtd, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        title={`${qtd} corte${qtd === 1 ? "" : "s"}`}
                        className={cn("w-full rounded-md", qtd > 0 ? "bg-amber-500" : "bg-zinc-800")}
                        style={{ height: `${qtd > 0 ? 14 + (qtd / picoSemana) * 30 : 14}px` }}
                      />
                      <span className="text-[10px] text-zinc-600">{DIAS_CURTOS[(hojeDia - 6 + i + 7) % 7]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setScheduleStaff(member)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  <Clock className="h-4 w-4" /> Horários
                </button>
                <button
                  onClick={() => setAgendaStaff(member)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  <CalendarDays className="h-4 w-4" /> Ver agenda
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
