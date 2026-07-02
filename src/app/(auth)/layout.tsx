import Link from "next/link";
import { Scissors } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left side */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 max-w-lg mx-auto w-full lg:max-w-none lg:mx-0 lg:px-16">
        <Link href="/" className="inline-flex items-center gap-2 mb-12 group w-fit">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Scissors className="w-5 h-5 text-zinc-900" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">
            CORT<span className="text-amber-400">IX</span>
          </span>
        </Link>
        {children}
      </div>

      {/* Right side */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-l border-zinc-800/50 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative text-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/30">
            <Scissors className="w-10 h-10 text-zinc-900" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">
            Bem-vindo ao CORTIX
          </h2>
          <p className="text-zinc-500 leading-relaxed text-sm">
            O sistema mais completo para gestão de barbearias. Agendamento online, chatbot inteligente e muito mais.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 text-left">
            {[
              { v: "5.000+", l: "Barbearias ativas" },
              { v: "2M+", l: "Agendamentos" },
              { v: "98%", l: "Satisfação" },
              { v: "R$ 50M+", l: "Em receitas" },
            ].map((stat) => (
              <div key={stat.l} className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-xl font-black text-amber-400">{stat.v}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{stat.l}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-zinc-600">+127 barbearias cadastradas este mês</span>
          </div>
        </div>
      </div>
    </div>
  );
}
