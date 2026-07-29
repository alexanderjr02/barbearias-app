"use client";

import { useEffect, useState } from "react";

/**
 * Quanto da página já passou, num fio amarelo embaixo do cabeçalho.
 *
 * Antes isto era um poste de barbeiro girando, com listras em gradiente. Saiu
 * junto com os gradientes: a identidade nova não tem enfeite, tem contraste. O
 * que sobrou é a informação crua — uma linha que enche — na única cor que a
 * marca usa para apontar coisas.
 *
 * Três pixels de altura, então animar `width` sai barato e não pesa a rolagem.
 */
export function ScrollProgress() {
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const medir = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgresso(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
    };
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-traco" aria-hidden="true">
      <div className="h-full bg-ouro" style={{ width: `${progresso * 100}%` }} />
    </div>
  );
}
