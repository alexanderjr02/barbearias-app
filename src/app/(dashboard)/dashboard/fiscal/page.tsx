"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, CheckCircle2, RefreshCw, Download, AlertTriangle, Zap } from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface Invoice {
  id: string;
  status: string;
  number: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  amount: number;
  clientName: string;
  message: string | null;
  createdAt: string;
}
interface ShopFiscal {
  fiscalConnected?: boolean;
  fiscalProvider?: string | null;
  cnpj?: string | null;
  municipalServiceCode?: string | null;
  taxRegime?: string | null;
  issRate?: number | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  PROCESSING: { label: "Processando", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  AUTHORIZED: { label: "Autorizada", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  ERROR: { label: "Erro", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  CANCELLED: { label: "Cancelada", cls: "bg-zinc-600/15 text-zinc-400 border-zinc-600/30" },
};

export default function FiscalPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: shop } = useQuery({ queryKey: ["barbershop"], queryFn: () => apiGet<ShopFiscal>("/api/barbershop") });
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ["invoices"], queryFn: () => apiGet<Invoice[]>("/api/invoices") });

  const connected = shop?.fiscalConnected;

  // Fiscal config form state (seeded from the shop once loaded).
  const [provider, setProvider] = useState("FOCUSNFE");
  const [token, setToken] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [code, setCode] = useState("");
  const [iss, setIss] = useState("");
  const [regime, setRegime] = useState("SIMPLES_NACIONAL");

  // Seed the form from the loaded shop config exactly once (render-time guard —
  // the React-recommended alternative to a setState-in-effect).
  const [seeded, setSeeded] = useState(false);
  if (shop && !seeded) {
    setSeeded(true);
    setProvider(shop.fiscalProvider || "FOCUSNFE");
    setCnpj(shop.cnpj || "");
    setCode(shop.municipalServiceCode || "");
    setIss(shop.issRate != null ? String(shop.issRate) : "");
    setRegime(shop.taxRegime || "SIMPLES_NACIONAL");
  }

  const save = useMutation({
    mutationFn: () =>
      apiPatch("/api/barbershop", {
        fiscalProvider: provider,
        ...(token ? { fiscalApiKey: token } : {}),
        cnpj,
        municipalServiceCode: code,
        taxRegime: regime,
        issRate: iss === "" ? undefined : Number(iss),
      }),
    onSuccess: () => {
      setToken("");
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      toast.success("Configuração fiscal salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => apiPatch("/api/barbershop", { fiscalApiKey: "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      toast.success("Provedor desconectado");
    },
  });

  const emit = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setModalOpen(false);
      toast.success("Nota emitida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refresh = useMutation({
    mutationFn: (id: string) => apiPost(`/api/invoices/${id}/refresh`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const handleEmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    emit.mutate({
      amount: Number(form.get("amount")),
      clientName: form.get("clientName"),
      clientDoc: form.get("clientDoc") || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title="Emitir nota fiscal" onSubmit={handleEmit} isPending={emit.isPending} error={emit.error?.message} submitLabel="Emitir nota">
        <div>
          <label className={labelCls}>Valor (R$)</label>
          <input name="amount" type="number" step="0.01" min="0" required className={fieldCls} placeholder="45.00" />
        </div>
        <div>
          <label className={labelCls}>Nome do cliente</label>
          <input name="clientName" required className={fieldCls} placeholder="Ex: Lucas Pereira" />
        </div>
        <div>
          <label className={labelCls}>CPF/CNPJ do cliente (opcional)</label>
          <input name="clientDoc" className={fieldCls} placeholder="000.000.000-00" />
        </div>
      </FormModal>

      <PageHeader
        icon={FileText}
        title="Nota Fiscal"
        subtitle="Emita NFS-e dos atendimentos"
        action={
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" /> Emitir nota
          </button>
        }
      />

      {/* Simulated banner */}
      {!connected && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 p-4">
          <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-200 font-medium">Modo simulado</p>
            <p className="text-zinc-400 mt-0.5">As notas são registradas como demonstração. Conecte um provedor fiscal abaixo para emitir de verdade.</p>
          </div>
        </div>
      )}

      {/* Fiscal config */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Configuração fiscal</h3>
          {connected && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Conectado ({shop?.fiscalProvider})
            </span>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Provedor</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className={fieldCls}>
              <option value="FOCUSNFE">Focus NFe</option>
              <option value="NFEIO">NFe.io</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Token do provedor {connected && <span className="text-zinc-500">(preencha só para trocar)</span>}</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} type="password" className={fieldCls} placeholder={connected ? "••••••••" : "cole o token aqui"} />
          </div>
          <div>
            <label className={labelCls}>CNPJ da barbearia</label>
            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={fieldCls} placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <label className={labelCls}>Código do serviço municipal</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className={fieldCls} placeholder="ex: 0602" />
          </div>
          <div>
            <label className={labelCls}>Alíquota ISS (%)</label>
            <input value={iss} onChange={(e) => setIss(e.target.value)} type="number" step="0.01" min="0" className={fieldCls} placeholder="ex: 3" />
          </div>
          <div>
            <label className={labelCls}>Regime tributário</label>
            <select value={regime} onChange={(e) => setRegime(e.target.value)} className={fieldCls}>
              <option value="SIMPLES_NACIONAL">Simples Nacional</option>
              <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
              <option value="MEI">MEI</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={() => save.mutate()} disabled={save.isPending} className="px-4 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50">
            {save.isPending ? "Salvando..." : "Salvar configuração"}
          </button>
          {connected && (
            <button onClick={() => disconnect.mutate()} disabled={disconnect.isPending} className="text-sm text-zinc-400 hover:text-red-400 transition-colors">
              Desconectar
            </button>
          )}
        </div>
      </div>

      {/* Invoices list */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Notas emitidas</h3>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4"><FileText className="w-6 h-6 text-zinc-600" /></div>
            <p className="text-zinc-400 font-medium">Nenhuma nota emitida</p>
            <p className="text-zinc-600 text-sm mt-1">Clique em &ldquo;Emitir nota&rdquo; para gerar a primeira.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const st = STATUS[inv.status] ?? STATUS.PENDING;
              const simulated = inv.number?.startsWith("SIMULADO");
              return (
                <div key={inv.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{inv.clientName}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                      {simulated && <span className="text-[11px] text-zinc-500">simulada</span>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {inv.number ? `Nº ${inv.number} · ` : ""}R$ {inv.amount.toFixed(2)} · {formatDate(inv.createdAt)}
                    </p>
                    {inv.status === "ERROR" && inv.message && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {inv.message}</p>}
                  </div>
                  {inv.pdfUrl && (
                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                  )}
                  {(inv.status === "PROCESSING" || inv.status === "PENDING") && (
                    <button onClick={() => refresh.mutate(inv.id)} title="Atualizar status" className="p-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors">
                      <RefreshCw className={`w-4 h-4 ${refresh.isPending ? "animate-spin" : ""}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
