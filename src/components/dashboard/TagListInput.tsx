"use client";

import { useRef, useState } from "react";
import { X, Plus } from "lucide-react";

interface TagListInputProps {
  /** Nome do campo no form, o valor sai como texto, um item por linha. */
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  /** Atalhos do ramo: um clique adiciona, sem digitar. */
  suggestions?: string[];
}

const separa = (texto: string) =>
  texto
    .split(/[\n,;]/)
    .map((t) => t.trim())
    .filter(Boolean);

/**
 * Lista de itens curtos (bebidas, produtos de finalização) que o cliente vê
 * ao agendar.
 *
 * Era uma textarea "um por linha": o gestor digitava às cegas, sem saber se o
 * formato estava certo, e cada erro de digitação virava uma opção estranha na
 * tela do cliente. Aqui cada item vira uma etiqueta assim que ele confirma —
 * o que ele vê é exatamente o que o cliente vai ver.
 */
export function TagListInput({ name, defaultValue, placeholder, suggestions = [] }: TagListInputProps) {
  const [itens, setItens] = useState<string[]>(() => separa(defaultValue ?? ""));
  const [rascunho, setRascunho] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const jaTem = (valor: string) => itens.some((i) => i.toLowerCase() === valor.toLowerCase());

  const adiciona = (texto: string) => {
    const novos = separa(texto).filter((t) => !jaTem(t));
    if (novos.length > 0) setItens((atual) => [...atual, ...novos]);
    setRascunho("");
  };

  const remove = (indice: number) => setItens((atual) => atual.filter((_, i) => i !== indice));

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      // Enter aqui adiciona o item, não envia o formulário inteiro, senão o
      // gestor salva a tela toda sem querer no meio do preenchimento.
      e.preventDefault();
      adiciona(rascunho);
      return;
    }
    // Backspace no campo vazio apaga a última etiqueta, como todo campo de tags.
    if (e.key === "Backspace" && rascunho === "" && itens.length > 0) {
      e.preventDefault();
      remove(itens.length - 1);
    }
  };

  const disponiveis = suggestions.filter((s) => !jaTem(s));

  return (
    <div>
      <input type="hidden" name={name} value={itens.join("\n")} />

      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-[46px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 transition-colors focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20"
      >
        {itens.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-900 py-1 pl-2.5 pr-1.5 text-sm text-white"
          >
            {item}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(i); }}
              aria-label={`Remover ${item}`}
              className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={aoTeclar}
          // Sair do campo com texto pendente salva o item: ninguém deve perder
          // o que digitou por ter clicado fora antes de apertar Enter.
          onBlur={() => adiciona(rascunho)}
          placeholder={itens.length === 0 ? placeholder : "Adicionar..."}
          className="min-w-[130px] flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-zinc-500"
        />
      </div>

      {disponiveis.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-600">Sugestões:</span>
          {disponiveis.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => adiciona(s)}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-400"
            >
              <Plus className="h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
