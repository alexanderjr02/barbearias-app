"use client";

import { useState } from "react";
import { Eye, Loader2, ArrowLeft } from "lucide-react";

/**
 * A faixa que aparece quando um admin está vendo o painel com os olhos do
 * gestor.
 *
 * Ela existe para impedir o erro mais caro da impersonação: agir achando que
 * é o dono. Por isso fica no topo de todas as telas, não some ao rolar, e diz
 * de quem é a conta — não só "modo admin".
 */
export function ImpersonationBanner({ shopName, ownerName }: { shopName: string | null; ownerName: string }) {
  const [leaving, setLeaving] = useState(false);

  const stop = async () => {
    setLeaving(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { redirectTo?: string; error?: string };
      // Recarrega de verdade em vez de navegar pelo roteador: a sessão mudou
      // no cookie, e todo dado em cache na página é da conta anterior.
      window.location.href = res.ok ? (data.redirectTo ?? "/admin") : "/login";
    } catch {
      window.location.href = "/admin";
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 bg-white px-4 py-2.5 text-zinc-950">
      <div className="flex items-center gap-2.5 min-w-0">
        <Eye className="h-4 w-4 shrink-0" />
        <p className="truncate text-sm">
          <span className="font-semibold">Você está vendo como {ownerName}</span>
          {shopName && <span className="text-zinc-600"> · {shopName}</span>}
          <span className="ml-2 hidden text-xs text-zinc-500 sm:inline">tudo que você fizer aqui é como se fosse o gestor</span>
        </p>
      </div>
      <button
        onClick={stop}
        disabled={leaving}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        {leaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeft className="h-3.5 w-3.5" />}
        Voltar ao admin
      </button>
    </div>
  );
}
