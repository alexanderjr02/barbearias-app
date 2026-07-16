import Link from "next/link";
import { Scissors, ShieldCheck, Lock } from "lucide-react";

// Auth format: a full-bleed real barbershop photo behind a centered glass
// card. Shared by login, register, forgot/reset — one cohesive, premium
// entrance instead of the old split marketing panel.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-10">
      {/* Fixed background photo + darkening + amber glow */}
      <div className="fixed inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/shop-interior.jpg" alt="" className="w-full h-full object-cover kenburns" />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/92 via-zinc-950/85 to-black/95" />
        <div className="absolute -top-[15%] -right-[10%] w-[520px] h-[520px] bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-[15%] -left-[10%] w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
          <Scissors className="w-5 h-5 text-zinc-900" />
        </div>
        <span className="text-2xl font-black text-white tracking-tight font-display">
          CORT<span className="text-amber-400">IX</span>
        </span>
      </Link>

      <div className="auth-rise w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-xl shadow-2xl shadow-black/60 p-6 sm:p-8">
          {children}
        </div>
        <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" /> Conexão segura
          </span>
          <span className="w-px h-3 bg-white/20" />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Dados protegidos (LGPD)
          </span>
        </div>
      </div>
    </div>
  );
}
