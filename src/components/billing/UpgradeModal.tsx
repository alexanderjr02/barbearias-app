"use client";

import { useState } from "react";
import { X, Check, CreditCard, Lock, Zap, Crown, Sparkles } from "lucide-react";
import { usePlan, Plan, PLAN_INFO } from "@/context/PlanContext";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPlan?: Plan;
}

// Luhn algorithm for credit card validation
function isValidLuhn(cardNum: string): boolean {
  const digits = cardNum.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]);
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function formatCard(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 4);
  return d.length >= 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
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
      "Agendamentos ilimitados",
      "Até 10 barbeiros",
      "Chatbot com IA básica",
      "Análises detalhadas",
      "Fidelização avançada",
      "Suporte prioritário",
      "Customização de cores e logo",
      "Controle de estoque",
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
      "App própria com domínio customizado",
      "Publicável na App Store e Play Store",
      "Branding 100% personalizado",
      "Sem marca da plataforma",
      "Dashboard barbeiro completo",
      "Marketplace de produtos",
      "WhatsApp Business integrado",
      "Barbeiros ilimitados",
    ],
  },
];

export function UpgradeModal({ open, onClose, defaultPlan = "PRO" }: Props) {
  const { setPlan, formatPrice, pricing } = usePlan();
  const [selectedPlan, setSelectedPlan] = useState<Plan>(defaultPlan);
  const [step, setStep] = useState<"plans" | "payment" | "success">("plans");

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!cardName.trim()) e.cardName = "Informe o nome do titular";
    const raw = cardNumber.replace(/\s/g, "");
    if (raw.length < 16) e.cardNumber = "Número do cartão incompleto";
    else if (!isValidLuhn(raw)) e.cardNumber = "Cartão inválido (número incorreto)";
    const [mm, yy] = expiry.split("/").map(Number);
    const exp = new Date(2000 + (yy || 0), (mm || 0) - 1, 1);
    if (!mm || !yy || mm > 12 || exp < new Date()) e.expiry = "Data de validade inválida";
    if (cvv.length < 3) e.cvv = "CVV inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1400));
    await setPlan(selectedPlan);
    setProcessing(false);
    setStep("success");
  };

  const handleClose = () => {
    setStep("plans");
    setCardName(""); setCardNumber(""); setExpiry(""); setCvv(""); setErrors({});
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
                {step === "plans" && "Escolha seu plano"}
                {step === "payment" && "Finalizar assinatura"}
                {step === "success" && "Plano ativado!"}
              </h2>
              <p className="text-xs text-zinc-500">
                {step === "plans" && "14 dias grátis • Cancele quando quiser"}
                {step === "payment" && `Plano ${planInfo.label} · Pagamento seguro`}
                {step === "success" && `Bem-vindo ao CORTIX ${planInfo.label}`}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1: Plan selection */}
          {step === "plans" && (
            <div className="space-y-3">
              {/* Free current */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-300">Starter (plano atual)</p>
                  <p className="text-xs text-zinc-500">{pricing?.FREE?.appointmentsLimit ?? PLAN_INFO.FREE.appointmentsLimit} agend./mês · até {pricing?.FREE?.staffLimit ?? PLAN_INFO.FREE.staffLimit} barbeiros · Chatbot básico</p>
                </div>
                <span className="text-xs font-bold text-zinc-500">Grátis</span>
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
            </div>
          )}

          {/* Step 2: Payment */}
          {step === "payment" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-zinc-400">Pagamento protegido com criptografia SSL 256-bit. Seus dados nunca são armazenados.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Nome no cartão</label>
                <input
                  value={cardName}
                  onChange={e => setCardName(e.target.value.toUpperCase())}
                  placeholder="NOME COMPLETO"
                  autoComplete="cc-name"
                  className={cn("w-full h-11 px-4 bg-zinc-800 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all border",
                    errors.cardName ? "border-red-500/70" : "border-zinc-700 focus:border-amber-500/60"
                  )}
                />
                {errors.cardName && <p className="text-xs text-red-400 mt-1">{errors.cardName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Número do cartão</label>
                <div className="relative">
                  <input
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCard(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    autoComplete="cc-number"
                    className={cn("w-full h-11 pl-4 pr-12 bg-zinc-800 rounded-xl text-white placeholder:text-zinc-600 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all border",
                      errors.cardNumber ? "border-red-500/70" : "border-zinc-700 focus:border-amber-500/60"
                    )}
                  />
                  <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                </div>
                {errors.cardNumber && <p className="text-xs text-red-400 mt-1">{errors.cardNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Validade</label>
                  <input
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/AA"
                    maxLength={5}
                    autoComplete="cc-exp"
                    className={cn("w-full h-11 px-4 bg-zinc-800 rounded-xl text-white placeholder:text-zinc-600 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all border",
                      errors.expiry ? "border-red-500/70" : "border-zinc-700 focus:border-amber-500/60"
                    )}
                  />
                  {errors.expiry && <p className="text-xs text-red-400 mt-1">{errors.expiry}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">CVV</label>
                  <input
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    autoComplete="cc-csc"
                    className={cn("w-full h-11 px-4 bg-zinc-800 rounded-xl text-white placeholder:text-zinc-600 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all border",
                      errors.cvv ? "border-red-500/70" : "border-zinc-700 focus:border-amber-500/60"
                    )}
                  />
                  {errors.cvv && <p className="text-xs text-red-400 mt-1">{errors.cvv}</p>}
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Plano {planInfo.label}</span>
                  <span className="font-bold text-white">{formatPrice(selectedPlan)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 border-t border-zinc-700 pt-2">
                  <span>14 dias de teste grátis incluídos</span>
                  <span>Cancele a qualquer momento</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
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
          {step === "plans" && (
            <>
              <button onClick={handleClose} className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-700 transition-all">
                Continuar grátis
              </button>
              <button onClick={() => setStep("payment")} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all">
                Assinar plano {planInfo.label} →
              </button>
            </>
          )}
          {step === "payment" && (
            <>
              <button onClick={() => setStep("plans")} className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-700 transition-all">
                Voltar
              </button>
              <button onClick={handlePay} disabled={processing}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {processing
                  ? <><div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" /> Processando...</>
                  : <><Lock className="w-3.5 h-3.5" /> Assinar por {formatPrice(selectedPlan)}</>
                }
              </button>
            </>
          )}
          {step === "success" && (
            <button onClick={handleClose} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all">
              Começar a usar →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
