"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Phone, Users, Camera, Loader2, Award, Crown, Check, Minus, Gift } from "lucide-react";
import { formatCurrency, formatDate, formatPhoneBR, cn } from "@/lib/utils";
import { apiGet, apiPatch, apiPost, apiUpload } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { DatePicker } from "@/components/ui/DatePicker";

interface ApiClient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  favorite: string;
  points: number | null;
  tier: "BRONZE" | "SILVER" | "GOLD" | null;
  hasAccount: boolean;
  avatar: string | null;
  subscription: { planName: string; planColor: string; status: "ACTIVE" | "PAST_DUE" } | null;
}

const TIERS = ["GOLD", "SILVER", "BRONZE"] as const;
type Tier = (typeof TIERS)[number];

// Paleta metálica contida (sem gradiente/brilho): ouro âmbar, prata ardósia,
// bronze quente. Cada tier tem a cor da barra de distribuição, o selo da
// tabela e o pontinho do indicador.
const TIER_META: Record<Tier, { label: string; bar: string; badge: string; dot: string }> = {
  GOLD: { label: "Ouro", bar: "#f59e0b", badge: "border-amber-500/30 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  SILVER: { label: "Prata", bar: "#94a3b8", badge: "border-slate-400/30 bg-slate-400/10 text-slate-200", dot: "bg-slate-300" },
  BRONZE: { label: "Bronze", bar: "#b07a4a", badge: "border-amber-800/40 bg-amber-800/10 text-amber-600", dot: "bg-amber-700" },
};

function initialsOf(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const CLIENT_PWD_RULES = [
  { label: "8+ caracteres", test: (p: string) => p.length >= 8 },
  { label: "Uma letra", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "Um número", test: (p: string) => /[0-9]/.test(p) },
] as const;

function ClientAvatar({ client, onChange }: { client: ApiClient; onChange: (avatar: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const initials = initialsOf(client.name);

  if (!client.hasAccount) {
    return (
      <div
        title="Disponível após o primeiro login do cliente"
        className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 text-xs font-bold flex-shrink-0"
      >
        {initials}
      </div>
    );
  }

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await apiUpload(file);
      onChange(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      title="Alterar foto"
      className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-zinc-700 bg-zinc-800 group"
    >
      {client.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={client.avatar} alt={client.name} className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full flex items-center justify-center text-zinc-400 text-xs font-bold">{initials}</span>
      )}
      <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        {uploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
      </span>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </button>
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");

  const openModal = () => {
    setNewPwd("");
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const queryClient = useQueryClient();
  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => apiGet<ApiClient[]>("/api/clients") });

  // Só para o select de barbeiro preferido — carrega junto com o modal aberto.
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiGet<{ id: string; name: string; isActive: boolean }[]>("/api/staff"),
    enabled: modalOpen,
    select: (rows) => rows.filter((s) => s.isActive),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["clients"] });

  const updateAvatar = useMutation({
    mutationFn: ({ id, avatar }: { id: string; avatar: string | null }) => apiPatch(`/api/clients/${id}`, { avatar }),
    onSuccess: invalidate,
  });

  const createClient = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<{ reusedExistingAccount?: boolean }>("/api/clients", data),
    onSuccess: (res) => {
      invalidate();
      setModalOpen(false);
      // Conta que já existia mantém a senha antiga — avisar aqui evita o
      // gestor entregar ao cliente uma senha que não funciona.
      if (res?.reusedExistingAccount) {
        toast.success("Cliente vinculado. A conta já existia, então ele entra com a senha que já usava.");
      } else {
        toast.success("Cliente cadastrado");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createClient.mutate({
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone") || undefined,
      dateOfBirth: form.get("dateOfBirth") || undefined,
      password: form.get("password"),
      cpf: form.get("cpf") || undefined,
      neighborhood: form.get("neighborhood") || undefined,
      profession: form.get("profession") || undefined,
      instagram: form.get("instagram") || undefined,
      howFoundUs: form.get("howFoundUs") || undefined,
      preferredStaffId: form.get("preferredStaffId") || undefined,
    });
  };

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "gold" && c.tier === "GOLD") ||
      (filter === "silver" && c.tier === "SILVER") ||
      (filter === "bronze" && c.tier === "BRONZE") ||
      (filter === "no-account" && !c.tier) ||
      (filter === "subscribers" && !!c.subscription);
    return matchSearch && matchFilter;
  });

  const tierCounts: Record<Tier, number> = { GOLD: 0, SILVER: 0, BRONZE: 0 };
  for (const c of clients) if (c.tier) tierCounts[c.tier] += 1;
  const withTier = tierCounts.GOLD + tierCounts.SILVER + tierCounts.BRONZE;
  const noAccountCount = clients.filter((c) => !c.tier).length;
  const subscriberCount = clients.filter((c) => c.subscription).length;
  const totalSpentAll = clients.reduce((a, c) => a + c.totalSpent, 0);
  const totalVisitsAll = clients.reduce((a, c) => a + c.visits, 0);
  const avgTicketAll = totalVisitsAll > 0 ? totalSpentAll / totalVisitsAll : 0;

  const segments: { key: string; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: clients.length },
    { key: "gold", label: "Ouro", count: tierCounts.GOLD },
    { key: "silver", label: "Prata", count: tierCounts.SILVER },
    { key: "bronze", label: "Bronze", count: tierCounts.BRONZE },
    { key: "subscribers", label: "Assinantes", count: subscriberCount },
    { key: "no-account", label: "Sem conta", count: noAccountCount },
  ];

  return (
    <div className="space-y-6">
      <FormModal
        open={modalOpen}
        onClose={closeModal}
        title="Cadastrar cliente"
        onSubmit={handleSubmit}
        isPending={createClient.isPending}
        error={createClient.error?.message}
        submitLabel="Cadastrar cliente"
      >
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
          <Award className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400">
            O cliente recebe acesso próprio para agendar, acompanhar o histórico e acumular pontos de fidelidade pelo app.
          </p>
        </div>
        <div>
          <label className={labelCls}>Nome completo</label>
          <input name="name" required autoComplete="off" className={fieldCls} placeholder="Ex: Maria Souza" />
        </div>
        <div>
          <label className={labelCls}>E-mail</label>
          <input name="email" type="email" required autoComplete="off" className={fieldCls} placeholder="cliente@email.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Telefone / WhatsApp</label>
            <input
              name="phone"
              inputMode="numeric"
              className={fieldCls}
              placeholder="(11) 99999-9999"
              onInput={(e) => {
                e.currentTarget.value = formatPhoneBR(e.currentTarget.value);
              }}
            />
          </div>
          <div>
            <label className={labelCls}>Nascimento</label>
            <DatePicker
              name="dateOfBirth"
              max={new Date().toISOString().slice(0, 10)}
              placeholder="Escolher data"
              clearable
            />
          </div>
        </div>
        <p className="-mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Gift className="w-3 h-3 text-amber-400" />
          A data de nascimento habilita felicitações e campanhas de aniversário automáticas.
        </p>

        <div className="pt-3 border-t border-zinc-800 space-y-3">
          <p className="text-xs text-zinc-500">
            Ficha do cliente — tudo opcional. Quanto mais preenchido, melhor o Copiloto entende quem é ele.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>CPF</label>
              <input name="cpf" inputMode="numeric" autoComplete="off" className={fieldCls} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className={labelCls}>Bairro</label>
              <input name="neighborhood" autoComplete="off" className={fieldCls} placeholder="Ex: Centro" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Profissão</label>
              <input name="profession" autoComplete="off" className={fieldCls} placeholder="Ex: Motorista" />
            </div>
            <div>
              <label className={labelCls}>Instagram</label>
              <input name="instagram" autoComplete="off" className={fieldCls} placeholder="@perfil" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Como conheceu</label>
              <select name="howFoundUs" defaultValue="" className={fieldCls}>
                <option value="">Não informado</option>
                <option value="INDICACAO">Indicação de amigo</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="GOOGLE">Google / Maps</option>
                <option value="PASSOU_NA_FRENTE">Passou na frente</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Barbeiro preferido</label>
              <select name="preferredStaffId" defaultValue="" className={fieldCls}>
                <option value="">Sem preferência</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className={labelCls}>Senha inicial</label>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className={fieldCls}
            placeholder="Mínimo 8 caracteres"
          />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {CLIENT_PWD_RULES.map((rule) => {
              const ok = rule.test(newPwd);
              return (
                <span
                  key={rule.label}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] transition-colors",
                    ok ? "text-emerald-400" : "text-zinc-600"
                  )}
                >
                  {ok ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />} {rule.label}
                </span>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-600">Você pode compartilhar essa senha com o cliente — ele poderá alterá-la depois.</p>
        </div>
      </FormModal>

      <PageHeader
        icon={Users}
        title="Clientes"
        subtitle={`${clients.length} clientes · ${subscriberCount} assinantes`}
        action={
          <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-zinc-950 text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Cadastrar cliente
          </button>
        }
      />

      {/* KPIs + distribuição de níveis lado a lado. */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* KPI tiles refinados — sem ícones coloridos aleatórios. */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Kpi label="Total de clientes" value={`${clients.length}`} loading={isLoading} />
          <Kpi label="Assinantes" value={`${subscriberCount}`} loading={isLoading} />
          <Kpi label="Receita acumulada" value={formatCurrency(totalSpentAll)} loading={isLoading} />
          <Kpi label="Ticket médio" value={formatCurrency(avgTicketAll)} loading={isLoading} />
        </div>

        {/* Distribuição por nível — a leitura rápida do mix da base. */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Distribuição por nível</p>
            <p className="text-xs text-zinc-600">{withTier} com conta · {noAccountCount} sem</p>
          </div>
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
            {withTier === 0 ? (
              <div className="h-full w-full bg-zinc-800" />
            ) : (
              TIERS.map((t) => {
                const pct = (tierCounts[t] / withTier) * 100;
                if (pct <= 0) return null;
                return <div key={t} style={{ width: `${pct}%`, backgroundColor: TIER_META[t].bar }} className="h-full" />;
              })
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t.toLowerCase())}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  filter === t.toLowerCase() ? "border-zinc-600 bg-white/[0.03]" : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIER_META[t].bar }} />
                  <span className="text-xs text-zinc-400">{TIER_META[t].label}</span>
                </div>
                <p className="mt-1 text-xl font-black text-white">{tierCounts[t]}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Busca + segmentos com contagem. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {segments.map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === s.key ? "bg-white/[0.06] text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {s.label}
              <span className={cn("rounded px-1 text-[10px] font-semibold", filter === s.key ? "bg-white/10 text-zinc-300" : "bg-zinc-800 text-zinc-600")}>{s.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela refinada. */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Cliente</th>
                <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:table-cell">Nível</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Visitas</th>
                <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500 md:table-cell">Total gasto</th>
                <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500 lg:table-cell">Ticket médio</th>
                <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 lg:table-cell">Favorito</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Última visita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5" colSpan={7}>
                      <Skeleton className="h-10 rounded-lg" />
                    </td>
                  </tr>
                ))}
              {!isLoading &&
                filtered.map((client) => (
                  <tr key={client.id} className="group transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <ClientAvatar client={client} onChange={(avatar) => updateAvatar.mutate({ id: client.id, avatar })} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-white">{client.name}</p>
                            {client.subscription && (
                              <span
                                title={client.subscription.status === "PAST_DUE" ? "Assinatura com pagamento pendente" : "Assinante ativo"}
                                className={cn(
                                  "inline-flex flex-shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
                                  client.subscription.status === "PAST_DUE" ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-transparent"
                                )}
                                style={client.subscription.status === "ACTIVE" ? { backgroundColor: `${client.subscription.planColor}1a`, color: client.subscription.planColor } : undefined}
                              >
                                <Crown className="h-2.5 w-2.5" /> {client.subscription.planName}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                            <Phone className="h-3 w-3" /> {client.phone || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      {client.tier ? (
                        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium", TIER_META[client.tier].badge)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", TIER_META[client.tier].dot)} />
                          {TIER_META[client.tier].label}
                          <span className="text-[10px] opacity-70">{client.points ?? 0} pts</span>
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">Sem conta</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold text-white">{client.visits}</td>
                    <td className="hidden px-4 py-3.5 text-right text-sm font-semibold text-white md:table-cell">{formatCurrency(client.totalSpent)}</td>
                    <td className="hidden px-4 py-3.5 text-right text-sm text-zinc-400 lg:table-cell">
                      {formatCurrency(client.visits > 0 ? client.totalSpent / client.visits : 0)}
                    </td>
                    <td className="hidden max-w-[160px] truncate px-4 py-3.5 text-sm text-zinc-400 lg:table-cell">{client.favorite || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs text-zinc-500">
                      {client.visits > 0 ? formatDate(client.lastVisit) : `Desde ${formatDate(client.lastVisit)}`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <div className="py-14 text-center">
              <Users className="mx-auto h-7 w-7 text-zinc-700" />
              <p className="mt-2 text-sm text-zinc-500">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// KPI enxuto: rótulo discreto, número em destaque. Sem ícone colorido.
function Kpi({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      {loading ? <Skeleton className="mt-2 h-7 w-16 rounded" /> : <p className="mt-1 text-2xl font-black text-white">{value}</p>}
    </div>
  );
}
