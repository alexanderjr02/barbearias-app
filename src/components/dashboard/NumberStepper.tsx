"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Seletor de quantidade moderno: − [valor] +, num invólucro só. Substitui as
// setinhas nativas do input numérico (cinza e feias). Controlado por value +
// onChange; se `name` for passado, o valor entra no FormData do formulário.
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  name,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  name?: string;
  className?: string;
}) {
  const clamp = (v: number) => {
    let n = Number.isNaN(v) ? min : v;
    if (n < min) n = min;
    if (max != null && n > max) n = max;
    return n;
  };
  const set = (v: number) => onChange(clamp(v));
  const atMin = value <= min;
  const atMax = max != null && value >= max;

  const btn =
    "flex w-10 shrink-0 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400";

  return (
    <div className={cn("flex h-11 items-stretch overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60 focus-within:border-amber-500/60", className)}>
      <button type="button" aria-label="Diminuir" onClick={() => set(value - step)} disabled={atMin} className={btn}>
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <input
        type="number"
        name={name}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full min-w-0 border-x border-zinc-800 bg-transparent text-center text-sm font-bold text-white outline-none"
      />
      <button type="button" aria-label="Aumentar" onClick={() => set(value + step)} disabled={atMax} className={btn}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
