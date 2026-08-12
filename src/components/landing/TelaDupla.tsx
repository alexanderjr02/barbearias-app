"use client";

import Image from "next/image";
import { useState } from "react";
import { useTelaGrande } from "./telaGrande";

/**
 * Uma tela do sistema nas duas superfícies em que ela existe.
 *
 * Mesma ideia das abas do painel, para quando a seção mostra uma tela só: no
 * celular abre a captura do aplicativo, que já nasceu naquele formato e se lê
 * inteira, e no computador abre a do navegador. O seletor troca entre as duas
 * em qualquer tamanho de tela, porque quem está no computador também quer ver
 * como fica no bolso, e o contrário também.
 *
 * A moldura muda junto: telefone para o app, janela com endereço para a web.
 */

export function TelaDupla({
  web,
  app,
  alt,
  caminho,
}: {
  web: string;
  app: string;
  alt: string;
  caminho: string;
}) {
  const telaGrande = useTelaGrande();
  const [escolhido, setEscolhido] = useState<"web" | "app" | null>(null);
  const onde = escolhido ?? (telaGrande === null ? null : telaGrande ? "web" : "app");

  return (
    <div>
      <div className="flex items-center gap-2">
        {(["web", "app"] as const).map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setEscolhido(op)}
            aria-pressed={onde === op}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              onde === op
                ? "border-ouro bg-ouro text-preto"
                : "border-traco-forte text-cinza hover:border-cinza hover:text-neve"
            }`}
          >
            {op === "web" ? "No computador" : "No celular"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {onde === null ? (
          <div className="aspect-[16/10] w-full rounded-2xl border border-traco bg-carvao" />
        ) : onde === "app" ? (
          <div className="mx-auto w-full max-w-[19rem]">
            <div className="rounded-[2.5rem] border border-traco-forte bg-grafite p-2 shadow-2xl shadow-black/70">
              <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-traco-forte" aria-hidden="true" />
              <Image
                src={app}
                alt={`${alt} (tela do aplicativo)`}
                width={560}
                height={1212}
                className="w-full rounded-[2rem]"
                unoptimized
              />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-traco bg-carvao shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-traco px-4 py-2.5">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-traco-forte" />
                <span className="h-2 w-2 rounded-full bg-traco-forte" />
                <span className="h-2 w-2 rounded-full bg-traco-forte" />
              </span>
              <span className="tipo-dado mx-auto truncate rounded-md bg-grafite px-3 py-1 text-[11px] text-cinza-fraco">
                rukz.com.br{caminho}
              </span>
            </div>
            <Image src={web} alt={alt} width={1600} height={1000} className="w-full" unoptimized />
          </div>
        )}
      </div>
    </div>
  );
}
