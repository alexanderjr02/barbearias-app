"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Aparece quando entra na tela.
 *
 * O IntersectionObserver dispara também para o que já está visível no
 * carregamento, então o mesmo mecanismo dá a entrada escalonada do topo da
 * página e a revelação das seções de baixo, sem dois sistemas de animação.
 *
 * Desconecta no primeiro disparo: revelar de novo a cada rolagem cansa e
 * mantém observer vivo à toa.
 *
 * Sem JavaScript o conteúdo continua invisível, e por isso a landing declara
 * um <noscript> que zera a classe. Animação nunca pode esconder conteúdo.
 *
 * `apenasMarcar` serve ao título do topo, onde as linhas sobem de dentro de um
 * recorte. Ali o bloco não pode subir junto nem esmaecer: seriam três
 * movimentos ao mesmo tempo no mesmo texto, e o resultado é borrão. Neste modo
 * o componente só pendura `is-visible` e deixa o efeito para o CSS de dentro.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  apenasMarcar = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  apenasMarcar?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        el.classList.add("is-visible");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${apenasMarcar ? "" : "reveal"} ${className}`}
      style={apenasMarcar ? undefined : { transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
