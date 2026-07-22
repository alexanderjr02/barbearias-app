"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Store, Loader2, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiPost } from "@/lib/apiClient";
import { cn, slugify } from "@/lib/utils";

interface Criada {
  id: string;
  slug: string;
  email: string;
  senhaInicial: string;
}

const PLANOS = [
  { val: "ENTERPRISE", label: "White Label" },
  { val: "PRO", label: "Pro" },
  { val: "FREE", label: "Starter" },
] as const;

const DURACOES = [
  { val: 0, label: "Sem prazo" },
  { val: 30, label: "30 dias" },
  { val: 365, label: "12 meses" },
] as const;

// /admin/barbershops/new — cadastrar uma barbearia inteira sem ela passar
// pela tela de pagamento. É o que permite fechar no WhatsApp e entregar a
// conta pronta, em vez de "se cadastra aí que depois eu ajeito" — que perde
// gente no meio do caminho.
export default function NovaBarbeariaPage() {
  const router = useRouter();
  const [f, setF] = useState({
    name: "", slug: "", cnpj: "", city: "", state: "", address: "",
    ownerName: "", email: "", phone: "",
    plan: "ENTERPRISE" as string, durationDays: 0, isComplimentary: true, compReason: "",
  });
  const [slugEditado, setSlugEditado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [criada, setCriada] = useState<Criada | null>(null);
  const [copiado, setCopiado] = useState(false);

  const set = (k: keyof typeof f, v: string | number | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiPost<Criada>("/api/admin/barbershops/create", {
        ...f,
        durationDays: f.durationDays || null,
        compReason: f.compReason.trim() || null,
      });
      setCriada(res);
    } catch {
      // apiClient já mostrou o motivo
    } finally {
      setBusy(false);
    }
  };

  if (criada) {
    const credenciais = `Acesso CORTIX\nE-mail: ${criada.email}\nSenha: ${criada.senhaInicial}\nLink: https://cortix-pied.vercel.app/login`;
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <PageHeader icon={Store} title="Barbearia criada" subtitle="Repasse estes dados ao gestor" accent="mono" />
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs leading-relaxed text-zinc-400">
            A senha aparece <strong className="text-white">uma única vez</strong>. Não foi enviada por e-mail de propósito —
            o envio ainda depende de domínio verificado, e uma conta que nasce esperando um e-mail que pode não chegar nasce quebrada.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-200">{credenciais}</pre>
          <button
            onClick={async () => { await navigator.clipboard.writeText(credenciais); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar credenciais"}
          </button>
          <div className="mt-3 flex gap-2">
            <button onClick={() => router.push(`/admin/barbershops/${criada.id}`)} className="flex-1 rounded-xl border border-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:text-white">
              Abrir barbearia
            </button>
            <button onClick={() => { setCriada(null); setF({ ...f, name: "", slug: "", cnpj: "", ownerName: "", email: "", phone: "" }); setSlugEditado(false); }} className="flex-1 rounded-xl border border-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:text-white">
              Criar outra
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/admin/barbershops" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <PageHeader icon={Store} title="Nova barbearia" subtitle="Cadastro completo, sem passar por pagamento" accent="mono" />

      <form onSubmit={submit} className="space-y-5">
        <Bloco titulo="A barbearia">
          <Campo label="Nome" value={f.name} required
            onChange={(v) => { set("name", v); if (!slugEditado) set("slug", slugify(v)); }} />
          <Campo label="Link (aparece na URL)" value={f.slug} required
            onChange={(v) => { setSlugEditado(true); set("slug", slugify(v)); }} />
          <Campo label="CNPJ" value={f.cnpj} required placeholder="00.000.000/0000-00" onChange={(v) => set("cnpj", v)} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2"><Campo label="Cidade" value={f.city} required onChange={(v) => set("city", v)} /></div>
            <Campo label="UF" value={f.state} placeholder="SP" onChange={(v) => set("state", v.toUpperCase().slice(0, 2))} />
          </div>
          <Campo label="Endereço (opcional)" value={f.address} onChange={(v) => set("address", v)} />
        </Bloco>

        <Bloco titulo="O dono">
          <Campo label="Nome" value={f.ownerName} required onChange={(v) => set("ownerName", v)} />
          <Campo label="E-mail (será o login)" type="email" value={f.email} required onChange={(v) => set("email", v)} />
          <Campo label="Telefone" value={f.phone} required placeholder="(11) 99999-9999" onChange={(v) => set("phone", v)} />
        </Bloco>

        <Bloco titulo="O acesso">
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">Plano</p>
            <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              {PLANOS.map((p) => (
                <button key={p.val} type="button" onClick={() => set("plan", p.val)}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors", f.plan === p.val ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white")}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">Validade</p>
            <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              {DURACOES.map((d) => (
                <button key={d.val} type="button" onClick={() => set("durationDays", d.val)}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors", f.durationDays === d.val ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white")}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 pt-1">
            <input type="checkbox" checked={f.isComplimentary} onChange={(e) => set("isComplimentary", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-white" />
            <span className="text-xs leading-relaxed text-zinc-400">
              <strong className="text-white">Cortesia</strong> — não paga. Marque para o faturamento não contar esta conta como assinante;
              sem isso seu número de receita fica maior do que a realidade.
            </span>
          </label>
          {f.isComplimentary && <Campo label="Motivo da cortesia" value={f.compReason} placeholder="Ex: piloto, sócio, compensação" onChange={(v) => set("compReason", v)} />}
        </Bloco>

        <button type="submit" disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar barbearia
        </button>
      </form>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-semibold text-white">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({ label, value, onChange, ...props }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      <input {...props} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-white/40 focus:outline-none" />
    </div>
  );
}
