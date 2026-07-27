"use client";

import { useEffect, useState } from "react";

/**
 * Progresso da página desenhado como o poste de barbeiro, embaixo do cabeçalho.
 *
 * É o único elemento decorativo fixo da landing, e ganhou esse direito por ser
 * a placa da própria barbearia — não um enfeite genérico de site.
 *
 * Três pixels de altura, então animar `width` sai barato; `transform: scaleX`
 * esticaria as listras e desmancharia o poste.
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-breu-3" aria-hidden="true">
      <div className="pole pole-gira h-full" style={{ width: `${progresso * 100}%` }} />
    </div>
  );
}
