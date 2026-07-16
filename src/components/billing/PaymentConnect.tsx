"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2, Loader2, ShieldCheck } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/apiClient";

interface ShopInfo {
  paymentProvider?: string | null;
  paymentConnected?: boolean;
}

const PROVIDERS: Record<string, { label: string; credential: string; placeholder: string; help: string }> = {
  MERCADOPAGO: {
    label: "Mercado Pago",
    credential: "Access Token",
    placeholder: "APP_USR-...",
    help: "mercadopago.com.br/developers → Suas integrações → Credenciais de produção.",
  },
  ASAAS: {
    label: "Asaas",
    credential: "Chave de API",
    placeholder: "$aact_...",
    help: "asaas.com → Integrações → Chave de API. Melhor pra Pix recorrente automático.",
  },
  STRIPE: {
    label: "Stripe",
    credential: "Secret Key",
    placeholder: "sk_live_...",
    help: "dashboard.stripe.com → Developers → API keys. Ideal pra cartão recorrente.",
  },
  PAGBANK: {
    label: "PagBank",
    credential: "Token",
    placeholder: "Token da API PagBank",
    help: "conta.pagbank.com.br → Venda Online → Integrações → gere um Token. Pix e cartão numa página só.",
  },
};

// Lets the gestor connect their OWN payment account (choosing the provider) so
// client memberships are charged straight into it. Until connected,
// subscriptions run in simulated mode (no real charge).
export function PaymentConnect() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("MERCADOPAGO");
  const [key, setKey] = useState("");
  const [open, setOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["barbershop-payment"], queryFn: () => apiGet<ShopInfo>("/api/barbershop") });
  const connected = data?.paymentConnected ?? false;
  const connectedProvider = data?.paymentProvider ?? "";

  const save = useMutation({
    mutationFn: (payload: { paymentProvider: string; paymentApiKey: string }) => apiPatch("/api/barbershop", payload),
    onSuccess: () => {
      setKey("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["barbershop-payment"] });
    },
  });

  if (connected) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              Recebimento conectado{connectedProvider && ` via ${PROVIDERS[connectedProvider]?.label ?? connectedProvider}`}
            </p>
            <p className="text-xs text-zinc-400">As mensalidades dos clientes caem direto na sua conta (Pix e cartão).</p>
          </div>
        </div>
        <button
          onClick={() => save.mutate({ paymentProvider: "", paymentApiKey: "" })}
          disabled={save.isPending}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors whitespace-nowrap"
        >
          Desconectar
        </button>
      </div>
    );
  }

  const cfg = PROVIDERS[provider];

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <Link2 className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Conecte uma conta para receber de verdade</p>
          <p className="text-xs text-zinc-400 mt-1">
            Sem conectar, as assinaturas ativam em <strong className="text-zinc-300">modo simulado</strong> (sem cobrança). Escolha seu provedor e receba as mensalidades por <strong className="text-zinc-300">Pix e cartão</strong>, direto na sua conta.
          </p>

          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all"
            >
              <Link2 className="w-4 h-4" /> Conectar recebimento
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Provedor</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(PROVIDERS).map(([id, p]) => (
                    <button
                      key={id}
                      onClick={() => setProvider(id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        provider === id ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{cfg.credential} da sua conta {cfg.label}</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={cfg.placeholder}
                    className="flex-1 h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => key.trim() && save.mutate({ paymentProvider: provider, paymentApiKey: key.trim() })}
                    disabled={!key.trim() || save.isPending}
                    className="h-10 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                  </button>
                </div>
              </div>

              {save.error && <p className="text-xs text-red-400">{(save.error as Error).message}</p>}
              <p className="text-[11px] text-zinc-500 flex items-start gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                {cfg.help} Guardamos com segurança e nunca exibimos de volta.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
