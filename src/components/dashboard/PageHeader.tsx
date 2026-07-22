import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  // "mono" e o /admin: preto e branco, sem cor de marca. O painel do gestor
  // usa "amber" — a diferenca continua obvia a distancia, sem precisar de uma
  // terceira cor so para anunciar "voce esta no admin".
  accent?: "amber" | "mono";
}

const ACCENT_CLASSES = {
  amber: { badge: "bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-amber-500/20", icon: "text-amber-400" },
  mono: { badge: "bg-white/10 border-white/15", icon: "text-white" },
};

// Consistent header treatment for every dashboard page: an icon badge to
// anchor the eye, title + subtitle, and an optional primary action on the
// right. Replaces the ad hoc flex-row headers each page used to hand-roll.
export function PageHeader({ icon: Icon, title, subtitle, action, accent = "amber" }: PageHeaderProps) {
  const colors = ACCENT_CLASSES[accent];
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${colors.badge}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-zinc-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
