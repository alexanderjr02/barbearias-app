import Link from "next/link";
import { Scissors, ArrowLeft } from "lucide-react";

// Shared chrome for the public legal pages (/termos, /privacidade): dark
// theme matching the rest of the app, a back link, and readable prose.
export function LegalShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="border-b border-zinc-800/60 sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Scissors className="w-4 h-4 text-zinc-900" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">
              CORT<span className="text-amber-400">IX</span>
            </span>
          </Link>
          <Link href="/login" className="text-sm text-zinc-500 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{title}</h1>
        <p className="text-sm text-zinc-500 mb-10">Última atualização: {updatedAt}</p>

        <div className="legal-prose space-y-6 text-[15px] leading-relaxed">{children}</div>

        <footer className="mt-16 pt-8 border-t border-zinc-800/60 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
          <Link href="/termos" className="hover:text-amber-400 transition-colors">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-amber-400 transition-colors">Política de Privacidade</Link>
          <Link href="/login" className="hover:text-amber-400 transition-colors">Entrar</Link>
        </footer>
      </main>
    </div>
  );
}

// Section heading + paragraph helpers so the two pages read consistently.
export function LegalSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white pt-2">
        <span className="text-amber-400">{n}.</span> {title}
      </h2>
      <div className="space-y-3 text-zinc-400">{children}</div>
    </section>
  );
}
