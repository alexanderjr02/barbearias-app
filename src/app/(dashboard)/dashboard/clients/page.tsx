"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Star, Phone, Users, Camera, Loader2, Award, Crown, Check, Minus, Gift } from "lucide-react";
import { formatCurrency, formatDate, formatPhoneBR, cn } from "@/lib/utils";
import { apiGet, apiPatch, apiPost, apiUpload } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

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

const TIER_LABELS: Record<string, string> = { BRONZE: "Bronze", SILVER: "Prata", GOLD: "Ouro" };
const TIER_COLORS: Record<string, string> = {
  BRONZE: "bg-zinc-700/40 border-zinc-600 text-zinc-300",
  SILVER: "bg-slate-400/10 border-slate-400/30 text-slate-300",
  GOLD: "bg-amber-500/10 border-amber-500/30 text-amber-400",
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
      (filter === "no-account" && !c.tier) ||
      (filter === "subscribers" && !!c.subscription);
    return matchSearch && matchFilter;
  });

  const goldCount = clients.filter((c) => c.tier === "GOLD").length;
  const subscriberCount = clients.filter((c) => c.subscription).length;
  const totalSpentAll = clients.reduce((a, c) => a + c.totalSpent, 0);

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
            <input
              name="dateOfBirth"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              className={`${fieldCls} [color-scheme:dark]`}
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
        subtitle={`${clients.length} clientes cadastrados · ${goldCount} no nível Ouro`}
        action={
          <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" />
            Cadastrar cliente
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Users className="w-4 h-4 text-blue-400 mb-2" />
          <p className="text-2xl font-black text-white">{clients.length}</p>
          <p className="text-xs text-zinc-500">Total de clientes</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Award className="w-4 h-4 text-amber-400 mb-2 fill-amber-400" />
          <p className="text-2xl font-black text-white">{goldCount}</p>
          <p className="text-xs text-zinc-500">Clientes Ouro</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Crown className="w-4 h-4 text-violet-400 mb-2" />
          <p className="text-2xl font-black text-white">{subscriberCount}</p>
          <p className="text-xs text-zinc-500">Assinantes</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Star className="w-4 h-4 text-emerald-400 mb-2" />
          <p className="text-2xl font-black text-white">{formatCurrency(totalSpentAll)}</p>
          <p className="text-xs text-zinc-500">Receita acumulada</p>
        </div>
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
        <div className="flex gap-2 flex-wrap">
          {["all", "gold", "subscribers", "no-account"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                filter === f ? "bg-amber-500/20 border border-amber-500/40 text-amber-400" : "bg-zinc-800 border border-zinc-700 text-zinc-400"
              )}
            >
              {f === "all" ? "Todos" : f === "gold" ? "Ouro" : f === "subscribers" ? "Assinantes" : "Sem conta"}
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
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Nível</th>
                <th className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Visitas</th>
                <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Total gasto</th>
                <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Ticket médio</th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Favorito</th>
                <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">Última visita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3.5" colSpan={7}>
                      <Skeleton className="h-10 rounded-lg" />
                    </td>
                  </tr>
                ))}
              {!isLoading && filtered.map((client) => (
                <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <ClientAvatar client={client} onChange={(avatar) => updateAvatar.mutate({ id: client.id, avatar })} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                          {client.subscription && (
                            <span
                              title={client.subscription.status === "PAST_DUE" ? "Assinatura com pagamento pendente" : "Assinante ativo"}
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0",
                                client.subscription.status === "PAST_DUE" ? "border-red-500/40 text-red-400 bg-red-500/10" : "border-transparent"
                              )}
                              style={client.subscription.status === "ACTIVE" ? { backgroundColor: `${client.subscription.planColor}1a`, color: client.subscription.planColor } : undefined}
                            >
                              <Crown className="w-2.5 h-2.5" /> {client.subscription.planName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {client.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    {client.tier ? (
                      <span className={cn("inline-flex items-center gap-1 border text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap", TIER_COLORS[client.tier])}>
                        <Star className="w-3 h-3 fill-current" /> {TIER_LABELS[client.tier]} · {client.points}pts
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">Sem conta</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center text-sm font-semibold text-white">{client.visits}</td>
                  <td className="px-4 py-3.5 text-right hidden md:table-cell text-sm font-semibold text-amber-400">{formatCurrency(client.totalSpent)}</td>
                  <td className="px-4 py-3.5 text-right hidden lg:table-cell text-sm text-zinc-300">
                    {formatCurrency(client.visits > 0 ? client.totalSpent / client.visits : 0)}
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-sm text-zinc-400 max-w-[160px] truncate">{client.favorite || "—"}</td>
                  <td className="px-6 py-3.5 text-right text-xs text-zinc-500 whitespace-nowrap">
                    {client.visits > 0 ? formatDate(client.lastVisit) : `Desde ${formatDate(client.lastVisit)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && <div className="text-center py-12 text-zinc-500">Nenhum cliente encontrado</div>}
        </div>
      </div>
    </div>
  );
}
