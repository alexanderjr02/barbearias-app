import Link from "next/link";
import { Scissors } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 mb-10 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-black" />
            </div>
            <span className="text-2xl font-black text-white">
              CORT<span className="text-amber-400">IX</span>
            </span>
          </Link>
          {children}
        </div>
      </div>

      {/* Right side - decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-zinc-900 to-black border-l border-zinc-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="relative text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/30">
            <Scissors className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">
            Bem-vindo ao CORTIX
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            O sistema mais completo para gestão de barbearias. Agendamento
            online, chatbot inteligente e muito mais.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { v: "5.000+", l: "Barbearias" },
              { v: "2M+", l: "Agendamentos" },
              { v: "98%", l: "Satisfação" },
              { v: "R$ 50M+", l: "Em receitas" },
            ].map((stat) => (
              <div
                key={stat.l}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4"
              >
                <p className="text-2xl font-black text-amber-400">{stat.v}</p>
                <p className="text-xs text-zinc-500">{stat.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
