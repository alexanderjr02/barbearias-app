"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Repeat, Plus, Check, CreditCard, QrCode, Pencil, Trash2, Power,
  Users, Wallet, TrendingUp, Crown, X, Flame, AlertTriangle, Scissors, Ban, CheckCircle2,
} from "lucide-react";
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/apiClient";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { usePlan } from "@/context/PlanContext";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

interface Visit {
  date: string;
  service: string;
  staff: string;
  price: number;
}

interface Subscriber {
  id: string;
  clientName: string;
  clientPhone: string;
  clientAvatar: string | null;
  paymentMethod: "PIX" | "CREDIT_CARD";
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED";
  startedAt: string;
  nextBillingAt: string;
  visitCount: number;
  valueConsumed: number;
  totalPaid: number;
  lastVisitAt: string | null;
  recentVisits: Visit[];
}

interface ApiPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingCycle: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  benefits: string;
  color: string;
  isActive: boolean;
  subscriptions: Subscriber[];
}

const CYCLE_LABELS: Record<ApiPlan["billingCycle"], string> = {
  MONTHLY: "mês",
  QUARTERLY: "trimestre",
  ANNUAL: "ano",
};

const STATUS_STYLE: Record<Subscriber["status"], { label: string; cls: string }> = {
  ACTIVE: { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-400" },
  PAST_DUE: { label: "Atrasado", cls: "bg-amber-500/10 text-amber-400" },
  CANCELLED: { label: "Cancelado", cls: "bg-zinc-700/40 text-zinc-400" },
};

const AVATAR_COLORS = ["#E07A5F", "#D9A05B", "#6DA34D", "#3D9A94", "#4A7FBF", "#7C6FBF", "#BF6FA0", "#BF4F4F"];
function avatarColor(name: string) {
  const hash = name.trim().split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const COLOR_SWATCHES = ["#D4AF37", "#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#F97316"];

function SubscriberAvatar({ name, url, size = 9 }: { name: string; url: string | null; size?: number }) {
  const cls = size === 9 ? "w-9 h-9 text-xs" : "w-14 h-14 text-lg";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={cn(cls, "rounded-full object-cover flex-shrink-0")} />;
  }
  return (
    <div className={cn(cls, "rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white")} style={{ backgroundColor: avatarColor(name) }}>
      {getInitials(name)}
    </div>
  );
}

// ROI = how many times over the plan already paid for itself in real
// services delivered. This is the number that turns "just a subscriber
// list" into something a gestor can act on — a client who never books is
// invisible risk, and this makes that risk visible before it churns.
function roiBadge(sub: Subscriber): { label: string; cls: string; icon: typeof Flame } {
  const ratio = sub.totalPaid > 0 ? sub.valueConsumed / sub.totalPaid : 0;
  const daysSinceLastVisit = sub.lastVisitAt ? (Date.now() - new Date(sub.lastVisitAt).getTime()) / 86400000 : Infinity;
  if (sub.status !== "CANCELLED" && daysSinceLastVisit > 30) {
    return { label: "Sem visitas há 30+ dias", cls: "bg-red-500/10 text-red-400", icon: AlertTriangle };
  }
  if (ratio >= 1.3) {
    return { label: `Aproveitou ${ratio.toFixed(1)}x o valor`, cls: "bg-emerald-500/10 text-emerald-400", icon: Flame };
  }
  if (ratio >= 0.6) {
    return { label: `Aproveitou ${ratio.toFixed(1)}x o valor`, cls: "bg-zinc-700/40 text-zinc-300", icon: CheckCircle2 };
  }
  return { label: "Baixo uso do plano", cls: "bg-amber-500/10 text-amber-400", icon: AlertTriangle };
}

export default function SubscriptionsPage() {
  const { can } = usePlan();
  const canUse = can("client_subscriptions");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPlan | null>(null);
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [detailSub, setDetailSub] = useState<{ sub: Subscriber; plan: ApiPlan } | null>(null);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => apiGet<ApiPlan[]>("/api/subscription-plans"),
    enabled: canUse,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });

  const createPlan = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/api/subscription-plans", data),
    onSuccess: () => { invalidate(); setModalOpen(false); },
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiPatch(`/api/subscription-plans/${id}`, data),
    onSuccess: () => { invalidate(); setModalOpen(false); setEditing(null); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiPatch(`/api/subscription-plans/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  const deletePlan = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/subscription-plans/${id}`),
    onSuccess: invalidate,
    onError: (err: Error) => alert(err.message),
  });

  const updateSubStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Subscriber["status"] }) => apiPatch(`/api/client-subscriptions/${id}`, { status }),
    onSuccess: () => { invalidate(); setDetailSub(null); },
  });

  const openCreate = () => { setEditing(null); setColor(COLOR_SWATCHES[0]); setModalOpen(true); };
  const openEdit = (plan: ApiPlan) => { setEditing(plan); setColor(plan.color); setModalOpen(true); };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name"),
      description: form.get("description") || undefined,
      price: Number(form.get("price")),
      billingCycle: form.get("billingCycle"),
      benefits: form.get("benefits"),
      color,
    };
    if (editing) {
      updatePlan.mutate({ id: editing.id, data });
    } else {
      createPlan.mutate(data);
    }
  };
  const activeMutation = editing ? updatePlan : createPlan;

  if (!canUse) {
    return (
      <>
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} defaultPlan="ENTERPRISE" />
        <div className="space-y-6">
          <PageHeader icon={Repeat} title="Assinaturas" subtitle="Receita recorrente automática dos seus clientes" />

          <div className="relative">
            <div className="select-none pointer-events-none opacity-20 saturate-0 blur-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-24" />)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl h-64" />)}
              </div>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center max-w-md shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/25">
                  <Crown className="w-8 h-8 text-black" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Assinaturas recorrentes</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  Ofereça planos de assinatura para seus clientes, com cobrança automática todo mês — como uma academia
                  ou o Netflix. Exclusivo do plano White Label.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                  {["Cobrança automática mensal", "Pix e cartão de crédito", "Receita previsível (MRR)", "Reduza cancelamentos", "Planos exclusivos por barbearia", "Dashboard completo de assinantes"].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button onClick={() => setUpgradeOpen(true)} className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-400 text-black font-bold rounded-xl hover:opacity-90 transition-all">
                  Desbloquear assinaturas →
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const allSubs = plans.flatMap((p) => p.subscriptions.map((s) => ({ ...s, plan: p })));
  const activeSubs = allSubs.filter((s) => s.status === "ACTIVE" || s.status === "PAST_DUE");
  const mrr = allSubs.filter((s) => s.status === "ACTIVE").reduce((acc, s) => acc + s.plan.price, 0);
  const activePlansCount = plans.filter((p) => p.isActive).length;
  const avgTicket = activeSubs.length > 0 ? mrr / activeSubs.filter((s) => s.status === "ACTIVE").length : 0;
  const pixCount = activeSubs.filter((s) => s.paymentMethod === "PIX").length;
  const pixPct = activeSubs.length > 0 ? Math.round((pixCount / activeSubs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <FormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? "Editar plano" : "Novo plano de assinatura"}
        onSubmit={handleSubmit}
        isPending={activeMutation.isPending}
        error={activeMutation.error?.message}
        submitLabel={editing ? "Salvar alterações" : "Criar plano"}
      >
        <div>
          <label className={labelCls}>Nome do plano</label>
          <input name="name" required defaultValue={editing?.name} className={fieldCls} placeholder="Ex: Ilimitado Premium" />
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <input name="description" defaultValue={editing?.description ?? ""} className={fieldCls} placeholder="Ex: Cortes ilimitados todo mês" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Preço (R$)</label>
            <input name="price" type="number" min={0} step="0.01" required defaultValue={editing?.price ?? 0} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Cobrança</label>
            <select name="billingCycle" defaultValue={editing?.billingCycle ?? "MONTHLY"} className={fieldCls}>
              <option value="MONTHLY">Mensal</option>
              <option value="QUARTERLY">Trimestral</option>
              <option value="ANNUAL">Anual</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-zinc-600 -mt-2">Ciclos mais longos são ótimos para dar desconto e reduzir cancelamentos.</p>
        <div>
          <label className={labelCls}>Benefícios (um por linha)</label>
          <textarea
            name="benefits"
            rows={4}
            defaultValue={editing?.benefits ?? ""}
            className={cn(fieldCls, "h-auto py-2 resize-none")}
            placeholder={"Cortes ilimitados\nPrioridade no agendamento\n10% de desconto em produtos"}
          />
        </div>
        <div>
          <label className={labelCls}>Cor</label>
          <div className="flex items-center gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn("w-7 h-7 rounded-full transition-all", color === c && "ring-2 ring-offset-2 ring-offset-zinc-900 ring-white")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </FormModal>

      <PageHeader
        icon={Repeat}
        title="Assinaturas"
        subtitle={`${activePlansCount} plano${activePlansCount === 1 ? "" : "s"} ativo${activePlansCount === 1 ? "" : "s"} · ${activeSubs.length} assinante${activeSubs.length === 1 ? "" : "s"}`}
        action={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" />
            Novo plano
          </button>
        }
      />

      {/* Stat row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
            <Wallet className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(mrr)}</p>
          <p className="text-sm text-zinc-500 mt-1">Receita recorrente mensal</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{activeSubs.length}</p>
          <p className="text-sm text-zinc-500 mt-1">Assinantes ativos</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(avgTicket)}</p>
          <p className="text-sm text-zinc-500 mt-1">Ticket médio</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
            <Repeat className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">{activePlansCount}</p>
          <p className="text-sm text-zinc-500 mt-1">Planos ativos</p>
        </div>
      </div>

      {/* Payment mix */}
      {activeSubs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-bold text-white mb-3">Forma de pagamento dos assinantes</p>
          <div className="h-2.5 rounded-full overflow-hidden flex w-full bg-zinc-800">
            <div className="bg-emerald-400 h-full" style={{ width: `${pixPct}%` }} />
            <div className="bg-blue-400 h-full" style={{ width: `${100 - pixPct}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-2.5 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Pix · {pixPct}%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Cartão · {100 - pixPct}%</span>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const planActiveSubs = plan.subscriptions.filter((s) => s.status === "ACTIVE");
          const planMrr = planActiveSubs.length * plan.price;
          const benefits = plan.benefits.split("\n").map((b) => b.trim()).filter(Boolean);
          return (
            <div key={plan.id} className={cn("relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col overflow-hidden", !plan.isActive && "opacity-50")}>
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: plan.color }} />
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-white text-base">{plan.name}</h3>
                {!plan.isActive && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 flex-shrink-0">Inativo</span>}
              </div>
              {plan.description && <p className="text-xs text-zinc-500 mb-3">{plan.description}</p>}
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-black text-white">{formatCurrency(plan.price)}</span>
                <span className="text-zinc-500 text-xs">/{CYCLE_LABELS[plan.billingCycle]}</span>
              </div>
              <div className="space-y-1.5 flex-1 mb-4">
                {benefits.map((b) => (
                  <div key={b} className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.color }} />
                    {b}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-zinc-800 text-zinc-400"><QrCode className="w-3 h-3" /> Pix</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-zinc-800 text-zinc-400"><CreditCard className="w-3 h-3" /> Cartão</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div className="text-xs text-zinc-500">
                  <span className="text-white font-bold">{planActiveSubs.length}</span> assinante{planActiveSubs.length === 1 ? "" : "s"}
                  {planMrr > 0 && <span className="text-zinc-600"> · {formatCurrency(planMrr)}/mês</span>}
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => toggleActive.mutate({ id: plan.id, isActive: !plan.isActive })}
                    title={plan.isActive ? "Desativar" : "Ativar"}
                    className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors", plan.isActive ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-600 hover:bg-zinc-800")}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(plan)} title="Editar" className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Excluir "${plan.name}"?`)) deletePlan.mutate(plan.id); }}
                    title="Excluir"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <button onClick={openCreate} className="border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-2 py-10 text-zinc-500 hover:text-amber-400 hover:border-amber-500/40 transition-all min-h-[240px]">
          <Plus className="w-6 h-6" />
          <span className="text-sm font-semibold">Criar plano</span>
        </button>
      </div>

      {/* Subscribers table */}
      {allSubs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950/40">
            <h3 className="text-sm font-bold text-white">Assinantes</h3>
          </div>
          <div className="divide-y divide-zinc-800/80">
            {allSubs.map((sub) => {
              const roi = roiBadge(sub);
              const RoiIcon = roi.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setDetailSub({ sub, plan: sub.plan })}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <SubscriberAvatar name={sub.clientName} url={sub.clientAvatar} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{sub.clientName}</p>
                    <p className="text-xs text-zinc-500 truncate">{sub.clientPhone}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 flex-shrink-0 w-36">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.plan.color }} />
                    {sub.plan.name}
                  </div>
                  <div className="hidden md:flex items-center gap-1 text-xs text-zinc-400 flex-shrink-0 w-20">
                    {sub.paymentMethod === "PIX" ? <QrCode className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                    {sub.paymentMethod === "PIX" ? "Pix" : "Cartão"}
                  </div>
                  <div className="hidden lg:flex items-center gap-1 text-xs text-zinc-400 flex-shrink-0 w-20">
                    <Scissors className="w-3.5 h-3.5 text-zinc-600" /> {sub.visitCount} visita{sub.visitCount === 1 ? "" : "s"}
                  </div>
                  {sub.status !== "CANCELLED" && (
                    <span className={cn("hidden xl:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0", roi.cls)}>
                      <RoiIcon className="w-3 h-3" /> {roi.label}
                    </span>
                  )}
                  <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0", STATUS_STYLE[sub.status].cls)}>
                    {STATUS_STYLE[sub.status].label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {detailSub && (
        <SubscriberDetail
          sub={detailSub.sub}
          plan={detailSub.plan}
          onClose={() => setDetailSub(null)}
          onCancel={() => updateSubStatus.mutate({ id: detailSub.sub.id, status: "CANCELLED" })}
          onMarkPaid={() => updateSubStatus.mutate({ id: detailSub.sub.id, status: "ACTIVE" })}
          isPending={updateSubStatus.isPending}
        />
      )}

      {plans.length === 0 && (
        <div className="text-center py-16 text-zinc-500 bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl">
          <Repeat className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
          Nenhum plano de assinatura criado ainda
        </div>
      )}
    </div>
  );
}

function SubscriberDetail({
  sub, plan, onClose, onCancel, onMarkPaid, isPending,
}: {
  sub: Subscriber;
  plan: ApiPlan;
  onClose: () => void;
  onCancel: () => void;
  onMarkPaid: () => void;
  isPending: boolean;
}) {
  const roi = roiBadge(sub);
  const RoiIcon = roi.icon;
  const ratio = sub.totalPaid > 0 ? sub.valueConsumed / sub.totalPaid : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border-l border-zinc-800 w-full max-w-md h-full overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
          <h2 className="text-base font-bold text-white">Detalhes do assinante</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <SubscriberAvatar name={sub.clientName} url={sub.clientAvatar} size={14} />
            <div className="min-w-0">
              <p className="text-lg font-bold text-white truncate">{sub.clientName}</p>
              <p className="text-sm text-zinc-500">{sub.clientPhone}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLE[sub.status].cls)}>{STATUS_STYLE[sub.status].label}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: plan.color }} /> {plan.name}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">
              {sub.paymentMethod === "PIX" ? <QrCode className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
              {sub.paymentMethod === "PIX" ? "Pix" : "Cartão"}
            </span>
          </div>

          {/* Usage / ROI — the differentiator: ties the subscription to what the client actually consumed */}
          <div className={cn("rounded-2xl border p-4", roi.cls.includes("emerald") ? "border-emerald-500/20 bg-emerald-500/[0.04]" : roi.cls.includes("red") ? "border-red-500/20 bg-red-500/[0.04]" : "border-zinc-800 bg-zinc-950/40")}>
            <div className="flex items-center gap-2 mb-3">
              <RoiIcon className="w-4 h-4" style={{ color: roi.cls.includes("emerald") ? "#34D399" : roi.cls.includes("red") || roi.cls.includes("amber") ? "#FBBF66" : "#A1A1AA" }} />
              <p className="text-sm font-bold text-white">{roi.label}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-lg font-black text-white">{sub.visitCount}</p>
                <p className="text-[11px] text-zinc-500">visitas usadas</p>
              </div>
              <div>
                <p className="text-lg font-black text-white">{formatCurrency(sub.valueConsumed)}</p>
                <p className="text-[11px] text-zinc-500">valor consumido</p>
              </div>
              <div>
                <p className="text-lg font-black text-white">{formatCurrency(sub.totalPaid)}</p>
                <p className="text-[11px] text-zinc-500">pago até agora</p>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className={cn("h-full rounded-full", ratio >= 1 ? "bg-emerald-400" : ratio >= 0.6 ? "bg-zinc-400" : "bg-amber-400")} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
            </div>
          </div>

          {/* Recent visits */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Visitas recentes</p>
            {sub.recentVisits.length === 0 ? (
              <p className="text-sm text-zinc-600 py-3">Nenhuma visita registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {sub.recentVisits.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-800 rounded-lg px-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{v.service}</p>
                      <p className="text-xs text-zinc-500">{v.staff} · {formatDate(v.date)}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-400">{formatCurrency(v.price)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Assinante desde</span>
              <span className="text-zinc-300 font-medium">{formatDate(sub.startedAt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Próxima cobrança</span>
              <span className="text-zinc-300 font-medium">{formatDate(sub.nextBillingAt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Mensalidade</span>
              <span className="text-zinc-300 font-medium">{formatCurrency(plan.price)}</span>
            </div>
          </div>

          {/* Actions */}
          {sub.status !== "CANCELLED" && (
            <div className="flex gap-2 pt-2">
              {sub.status === "PAST_DUE" && (
                <button onClick={onMarkPaid} disabled={isPending} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                  <CheckCircle2 className="w-4 h-4" /> Marcar como pago
                </button>
              )}
              <button
                onClick={() => { if (confirm(`Cancelar a assinatura de ${sub.clientName}?`)) onCancel(); }}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all disabled:opacity-50"
              >
                <Ban className="w-4 h-4" /> Cancelar assinatura
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
