import Link from "next/link";
import { Scissors } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Admin topbar */}
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-black text-white">CORT<span className="text-purple-400">IX</span></span>
            <span className="ml-2 text-xs px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-full font-medium">
              Admin
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Voltar ao painel →
          </Link>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            SA
          </div>
        </div>
      </header>
      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}
