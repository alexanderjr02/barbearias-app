"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Check, Plus, Store, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { usePlan, PLAN_INFO } from "@/context/PlanContext";
import { getInitials, cn } from "@/lib/utils";

interface Unit {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isPrimary: boolean;
  isCurrent: boolean;
}
interface UnitsResponse {
  units: Unit[];
  canAddUnit: boolean;
}

// Seletor de unidade da rede. Para quem tem uma barbearia só (a maioria), ele
// se comporta exatamente como o botão de perfil de antes — o dropdown só
// aparece quando existe rede de verdade ou quando o plano permite abrir uma.
export function UnitSwitcher({ shopName }: { shopName: string }) {
  const { plan } = usePlan();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const { data, refetch, isError, isLoading } = useQuery({
    queryKey: ["units"],
    queryFn: () => apiGet<UnitsResponse>("/api/units"),
    retry: 1,
  });

  const units = data?.units ?? [];
  // Só some de vez quando a resposta CONFIRMOU que é loja única. Em erro o
  // seletor continua clicável e mostra o problema — antes ele caía no botão
  // estático, que é visualmente idêntico ao antigo, e uma falha de API ficava
  // indistinguível de "nada mudou".
  const isNetwork = isError || units.length > 1 || !!data?.canAddUnit;

  const switchTo = async (unit: Unit) => {
    if (unit.isCurrent) return setOpen(false);
    setSwitching(unit.id);
    try {
      await apiPost("/api/units/switch", { barbershopId: unit.id });
      // Trocar de unidade muda TODOS os dados da tela (agenda, financeiro,
      // clientes...). Recarregar é mais seguro do que invalidar query por
      // query e correr o risco de mostrar dados de duas unidades misturados.
      window.location.reload();
    } catch {
      toast.error("Não consegui trocar de unidade");
      setSwitching(null);
    }
  };

  const createUnit = async () => {
    const name = newName.trim();
    if (name.length < 2) return toast.error("Dê um nome para a unidade");
    setCreating(true);
    try {
      await apiPost("/api/units", { name });
      toast.success(`Unidade "${name}" criada`);
      setNewName("");
      refetch();
    } catch {
      toast.error("Não consegui criar a unidade");
    } finally {
      setCreating(false);
    }
  };

  const trigger = (
    <>
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-900 text-xs font-black flex-shrink-0">
        {getInitials(shopName)}
      </div>
      <div className="hidden sm:block text-left">
        <p className="text-xs font-semibold text-zinc-200 leading-none">{shopName}</p>
        <p className="text-xs text-zinc-600 mt-0.5">
          {isNetwork ? `${units.length} unidade${units.length > 1 ? "s" : ""}` : `Plano ${PLAN_INFO[plan].label}`}
        </p>
      </div>
      <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-600 hidden sm:block transition-transform", open && "rotate-180")} />
    </>
  );

  if (!isNetwork) {
    return (
      <div className="flex items-center gap-2.5 h-9 pl-1 pr-3 rounded-xl border border-transparent">{trigger}</div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 h-9 pl-1 pr-3 rounded-xl hover:bg-zinc-900 transition-all border border-transparent hover:border-zinc-800"
      >
        {trigger}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Suas unidades</p>
            {isError && (
              <div className="px-4 pb-3">
                <p className="text-xs text-red-400">Não consegui carregar suas unidades.</p>
                <button onClick={() => refetch()} className="mt-1.5 text-xs text-amber-400 hover:underline">
                  Tentar de novo
                </button>
              </div>
            )}
            {isLoading && <p className="px-4 pb-3 text-xs text-zinc-500">Carregando…</p>}
            <div className="max-h-64 overflow-y-auto">
              {units.map((u) => (
                <button
                  key={u.id}
                  onClick={() => switchTo(u)}
                  disabled={!!switching}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] disabled:opacity-50",
                    u.isCurrent && "bg-white/[0.03]"
                  )}
                >
                  <Store className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-200 truncate">{u.name}</p>
                    <p className="text-[10px] text-zinc-600">{u.isPrimary ? "Matriz" : u.city || "Unidade"}</p>
                  </div>
                  {switching === u.id ? (
                    <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin flex-shrink-0" />
                  ) : (
                    u.isCurrent && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {data?.canAddUnit && (
              <div className="border-t border-zinc-800 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createUnit()}
                    placeholder="Nome da nova unidade"
                    className="flex-1 h-8 px-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    onClick={createUnit}
                    disabled={creating}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-500 text-zinc-900 hover:bg-amber-400 transition disabled:opacity-50 flex-shrink-0"
                    title="Criar unidade"
                  >
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">Cada unidade extra entra na sua fatura.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
