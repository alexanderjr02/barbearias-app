"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Calendário do CORTIX — substitui o `<input type="date">` do navegador.
 *
 * O nativo tem três problemas que aparecem todo dia: ele muda de cara em cada
 * navegador e sistema (o do Chrome no Windows não é o do Safari no iPhone),
 * não dá para estilizar junto com o resto da interface, e escolher uma data de
 * nascimento nele é uma sucessão de cliques na seta de mês — quarenta anos,
 * quatrocentos e oitenta cliques. Aqui o cabeçalho abre a lista de anos.
 *
 * Serve aos três jeitos que o app já usa data:
 *  - controlado (`value` + `onChange`);
 *  - não controlado com `defaultValue`;
 *  - dentro de <form>, via `name` — um input escondido carrega o valor, então
 *    FormData e react-hook-form continuam funcionando sem saber que trocou.
 *
 * O valor entra e sai sempre como "YYYY-MM-DD", igual ao nativo: trocar o
 * componente não obriga a mexer em nenhuma rota.
 */

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** "YYYY-MM-DD" → Date LOCAL. `new Date("2026-07-22")` seria meia-noite UTC,
 *  que no Brasil cai no dia 21 — o clássico "escolhi 22 e salvou 21". */
function paraData(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return null;
  const data = new Date(a, m - 1, d);
  return Number.isNaN(data.getTime()) ? null : data;
}

function paraIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface DatePickerProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (valor: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** "amber" = painel do gestor. "mono" = /admin, preto e branco. */
  accent?: "amber" | "mono";
  /** Mostra o botão de limpar quando há data escolhida. */
  clearable?: boolean;
}

export function DatePicker({
  name, value, defaultValue, onChange, min, max,
  placeholder = "Escolher data", required, disabled,
  className, accent = "amber", clearable,
}: DatePickerProps) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(defaultValue ?? "");
  const atual = controlado ? value : interno;

  const [aberto, setAberto] = useState(false);
  const [vendoAnos, setVendoAnos] = useState(false);
  const [cursor, setCursor] = useState<Date>(() => paraData(atual) ?? new Date());
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  const selecionada = paraData(atual);
  const hoje = new Date();
  const limiteMin = paraData(min);
  const limiteMax = paraData(max);

  const cor = accent === "mono"
    ? { fundo: "bg-white", texto: "text-zinc-950", anel: "focus:border-white/40", suave: "bg-white/10 text-white" }
    : { fundo: "bg-amber-500", texto: "text-zinc-950", anel: "focus:border-amber-500/60", suave: "bg-amber-500/15 text-amber-400" };

  // Reposiciona quando abre. Em portal, para o calendário não ser cortado por
  // um modal com overflow escondido — que é onde metade destes campos vive.
  useEffect(() => {
    if (!aberto || !gatilho.current) return;
    const r = gatilho.current.getBoundingClientRect();
    const alturaPainel = 340;
    const cabeNoRodape = window.innerHeight - r.bottom > alturaPainel;
    setPos({
      top: cabeNoRodape ? r.bottom + 6 : Math.max(8, r.top - alturaPainel - 6),
      left: Math.min(Math.max(8, r.left), window.innerWidth - 312),
    });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const clique = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!painel.current?.contains(alvo) && !gatilho.current?.contains(alvo)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", clique);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", clique);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const escolher = (d: Date) => {
    const iso = paraIso(d);
    if (!controlado) setInterno(iso);
    onChange?.(iso);
    setAberto(false);
  };

  const limpar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!controlado) setInterno("");
    onChange?.("");
  };

  const foraDoLimite = (d: Date) =>
    (limiteMin !== null && d < new Date(limiteMin.getFullYear(), limiteMin.getMonth(), limiteMin.getDate())) ||
    (limiteMax !== null && d > new Date(limiteMax.getFullYear(), limiteMax.getMonth(), limiteMax.getDate()));

  // A grade sempre começa no domingo da semana do dia 1.
  const grade = useMemo(() => {
    const primeiro = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(1 - primeiro.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [cursor]);

  const anos = useMemo(() => {
    const fim = limiteMax?.getFullYear() ?? hoje.getFullYear() + 5;
    const ini = limiteMin?.getFullYear() ?? fim - 100;
    return Array.from({ length: fim - ini + 1 }, (_, i) => fim - i);
  }, [limiteMin, limiteMax]);

  const rotulo = selecionada
    ? `${String(selecionada.getDate()).padStart(2, "0")}/${String(selecionada.getMonth() + 1).padStart(2, "0")}/${selecionada.getFullYear()}`
    : "";

  return (
    <>
      {name && <input type="hidden" name={name} value={atual ?? ""} required={required} />}

      <button
        ref={gatilho}
        type="button"
        disabled={disabled}
        onClick={() => { setAberto((v) => !v); setVendoAnos(false); setCursor(selecionada ?? new Date()); }}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-left text-sm transition-colors",
          cor.anel, "focus:outline-none",
          disabled && "cursor-not-allowed opacity-50",
          rotulo ? "text-white" : "text-zinc-600",
          className,
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" />
        <span className="flex-1 truncate">{rotulo || placeholder}</span>
        {clearable && rotulo && !disabled && (
          <span onClick={limpar} className="rounded p-0.5 text-zinc-600 transition-colors hover:text-white" title="Limpar">
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {aberto && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={painel}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[100] w-[304px] rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl shadow-black/60"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setVendoAnos((v) => !v)}
              className="rounded-lg px-2.5 py-1 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              {MESES[cursor.getMonth()]} {cursor.getFullYear()}
            </button>
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {vendoAnos ? (
            <div className="grid max-h-[248px] grid-cols-4 gap-1 overflow-y-auto pr-1">
              {anos.map((a) => (
                <button key={a} type="button"
                  onClick={() => { setCursor(new Date(a, cursor.getMonth(), 1)); setVendoAnos(false); }}
                  className={cn("rounded-lg py-2 text-xs font-medium transition-colors",
                    a === cursor.getFullYear() ? cn(cor.fundo, cor.texto) : "text-zinc-400 hover:bg-white/10 hover:text-white")}>
                  {a}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7">
                {DIAS.map((d, i) => (
                  <span key={i} className="py-1 text-center text-[10px] font-semibold uppercase text-zinc-600">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {grade.map((d, i) => {
                  const doMes = d.getMonth() === cursor.getMonth();
                  const bloqueado = foraDoLimite(d);
                  const eSelecionada = selecionada !== null && mesmoDia(d, selecionada);
                  const eHoje = mesmoDia(d, hoje);
                  return (
                    <button key={i} type="button" disabled={bloqueado} onClick={() => escolher(d)}
                      className={cn(
                        "relative h-9 rounded-lg text-xs transition-colors",
                        eSelecionada ? cn(cor.fundo, cor.texto, "font-bold")
                          : bloqueado ? "cursor-not-allowed text-zinc-800"
                          : doMes ? "text-zinc-200 hover:bg-white/10"
                          : "text-zinc-700 hover:bg-white/5",
                      )}>
                      {d.getDate()}
                      {eHoje && !eSelecionada && (
                        <span className={cn("absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full", accent === "mono" ? "bg-white" : "bg-amber-500")} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2 border-t border-zinc-800 pt-2">
                <button type="button" disabled={foraDoLimite(hoje)} onClick={() => escolher(hoje)}
                  className={cn("flex-1 rounded-lg py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40", cor.suave)}>
                  Hoje
                </button>
                {clearable && (
                  <button type="button" onClick={() => { if (!controlado) setInterno(""); onChange?.(""); setAberto(false); }}
                    className="flex-1 rounded-lg py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
                    Limpar
                  </button>
                )}
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
