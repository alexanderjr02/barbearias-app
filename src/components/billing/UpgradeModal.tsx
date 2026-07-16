"use client";

import { useState } from "react";
import { X, Check, Zap, Crown, Sparkles, ShieldCheck } from "lucide-react";
import { usePlan, Plan, PLAN_INFO } from "@/context/PlanContext";
import { apiPost } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPlan?: Plan;
}

const PLANS = [
  {
    id: "PRO" as Plan,
    icon: Zap,
    badge: "Mais popular",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-500/5",
    iconActive: "text-amber-400",
    iconBg: "bg-amber-500/20",
    features: [
      "Barbeiros e agendamentos ilimitados",
      "Financeiro completo (meta, ponto de equilíbrio e comissões)",
      "Relatórios detalhados",
      "Controle de estoque",
      "Fidelidade (pontos/cashback)",
      "Clube de assinatura (cobrança recorrente)",
      "Chatbot com IA que agenda",
      "Lembrete no WhatsApp",
      "Suporte prioritário",
    ],
  },
  {
    id: "ENTERPRISE" as Plan,
    icon: Crown,
    badge: "Para expansão",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    activeBorder: "border-purple-500",
    activeBg: "bg-purple-500/5",
    iconActive: "text-purple-400",
    iconBg: "bg-purple-500/20",
    features: [
      "Tudo do Pro",
      "App próprio com a sua marca (logo, cores e fundo)",
      "App instalável — o link vira app no celular",
      "Nota fiscal automática (NFS-e)",
      "Multi-unidade / rede",
      "Marca 100% sua, sem CORTIX",
      "Barbeiros ilimitados",
    ],
  },
];

export function UpgradeModal({ open, onClose, defaultPlan = "PRO" }: Props) {
  const { setPlan, formatPrice, pricing } = usePlan();
  const [selectedPlan, setSelectedPlan] = useState<Plan>(defaultPlan);
  const [step, setStep] = useState<"plans" | "success">("plans");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setError(null);
    setProcessing(true);
    try {
      const res = await apiPost<{ initPoint?: string; simulated?: boolean }>("/api/billing/subscribe", {
        plan: selectedPlan,
      });
      if (res.initPoint) {
        // Hand off to Mercado Pago's secure checkout (card / Pix / boleto).
        window.location.href = res.initPoint;
        return;
      }
      // Dev fallback (Mercado Pago not configured): activate instantly.
      await setPlan(selectedPlan);
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar o pagamento.");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setStep("plans");
    setError(null);
    onClose();
  };

  if (!open) return null;

  const planInfo = PLAN_INFO[selectedPlan];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {step === "plans" ? "Escolha seu plano" : "Plano ativado!"}
              </h2>
              <p className="text-xs text-zinc-500">
                {step === "plans" ? "Cancele quando quiser" : `Bem-vindo ao CORTIX ${planInfo.label}`}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "plans" && (
            <div className="space-y-3">
              {/* Free current */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-300">Essencial (plano atual)</p>
                  <p className="text-xs text-zinc-500">Agendamentos ilimitados · até {pricing?.FREE?.staffLimit ?? PLAN_INFO.FREE.staffLimit} barbeiros · Chatbot básico</p>
                </div>
                <span className="text-xs font-bold text-zinc-500">{PLAN_INFO.FREE.price}</span>
              </div>

              {PLANS.map(p => {
                const Icon = p.icon;
                const info = PLAN_INFO[p.id];
                const isSelected = selectedPlan === p.id;
                return (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                    className={cn("w-full text-left p-4 rounded-xl border-2 transition-all",
                      isSelected ? `${p.activeBorder} ${p.activeBg}` : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
                    )}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", isSelected ? p.iconBg : "bg-zinc-800")}>
                          <Icon className={cn("w-5 h-5", isSelected ? p.iconActive : "text-zinc-500")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{info.label}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", p.badgeColor)}>{p.badge}</span>
                          </div>
                          <div className="flex items-baseline gap-0.5 mt-0.5">
                            <span className="text-lg font-black text-white">{formatPrice(p.id).split("/")[0]}</span>
                            <span className="text-zinc-500 text-xs">/mês</span>
                          </div>
                        </div>
                      </div>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all flex-shrink-0",
                        isSelected ? "border-amber-400 bg-amber-400" : "border-zinc-600"
                      )}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {p.features.map(f => (
                        <div key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Check className={cn("w-3 h-3 flex-shrink-0", isSelected ? p.iconActive : "text-zinc-600")} />
                          {f}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}

              <div className="flex items-center gap-3 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-zinc-400">
                  Pagamento processado pelo <strong className="text-zinc-300">Mercado Pago</strong> — Pix, cartão ou boleto. Seus dados de cartão nunca passam pelo CORTIX.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-xs text-red-400 text-center">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-4">
              <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl",
                selectedPlan === "ENTERPRISE" ? "bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-500/30" : "bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-500/30"
              )}>
                <Check className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Plano {planInfo.label} ativado!</h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-xs mx-auto">Você agora tem acesso completo a todos os recursos premium do CORTIX.</p>
              <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-left">
                {["Relatórios avançados", "Chatbot personalizável", "WhatsApp Business", "Marketing e campanhas", "Exportar dados", "Controle de estoque"].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <Check className={cn("w-3 h-3 flex-shrink-0", selectedPlan === "ENTERPRISE" ? "text-purple-400" : "text-amber-400")} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
          {step === "plans" ? (
            <>
              <button onClick={handleClose} className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-700 transition-all">
                Continuar grátis
              </button>
              <button onClick={handleSubscribe} disabled={processing}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {processing
                  ? <><div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" /> Redirecionando...</>
                  : <>Assinar {planInfo.label} →</>
                }
              </button>
            </>
          ) : (
            <button onClick={handleClose} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all">
              Começar a usar →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
