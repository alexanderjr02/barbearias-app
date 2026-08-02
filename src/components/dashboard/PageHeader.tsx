import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  /**
   * Não é mais desenhado. Continua aceito porque 32 páginas o passam, e um
   * cabeçalho é lugar errado para uma migração em massa arriscar quebrar build.
   * Páginas novas podem simplesmente omitir.
   */
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Mantido pela mesma razão do `icon`: o selo colorido saiu. */
  accent?: "amber" | "mono";
}

// Cabeçalho de página: título, subtítulo e a ação principal à direita.
//
// O selo com ícone que ficava à esquerda saiu. Ele repetia em quadrado o que o
// menu lateral já diz (você está em Equipe), e um quadrado colorido em cada
// página empurrava o título para baixo na hierarquia — quem entra quer ler
// "Equipe · 2 barbeiros ativos", não olhar um ícone. Sem ele o título ganha o
// peso e a página começa na informação.
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-black leading-none tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
