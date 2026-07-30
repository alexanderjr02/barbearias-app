import Link from "next/link";
import { Lock } from "lucide-react";
import { RukzLogo, RukzSimbolo } from "@/components/brand/RukzLogo";

// A porta de entrada, em duas colunas: a marca à esquerda, o formulário à
// direita. Cara de sistema sério — preto seco, sem foto, com a marca d'água do
// bigode como única textura. No mobile o painel da marca some (não cabem duas
// colunas) e o formulário ocupa a tela, com um logo compacto no topo.
//
// A tipografia vem do layout raiz (o sistema usa uma família só), então este
// arquivo não opina sobre fonte.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-preto text-neve">
      {/* ESQUERDA — painel da marca. Escondido abaixo de lg. */}
      <aside className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden border-r border-traco px-10 lg:flex">
        {/* Marca d'água do bigode, bem apagada — textura de marca, não cenário. */}
        <RukzSimbolo
          tom="mono"
          className="pointer-events-none absolute left-1/2 top-1/2 w-[125%] max-w-none -translate-x-1/2 -translate-y-1/2 text-neve/[0.05]"
        />
        <div className="relative flex flex-col items-center text-center">
          <RukzLogo titulo="rukz" orientacao="empilhado" className="text-[3.25rem]" />
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-cinza">
            Gestão para barbearia
          </p>
        </div>
      </aside>

      {/* DIREITA — o formulário (login / cadastro / redefinição). */}
      <main className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        {/* No mobile, sem o painel esquerdo, um logo compacto no topo. */}
        <Link
          href="/"
          aria-label="rukz, início"
          className="mb-10 text-neve transition-opacity hover:opacity-80 lg:hidden"
        >
          <RukzLogo titulo={null} orientacao="empilhado" className="text-[2rem]" />
        </Link>

        <div className="auth-rise w-full max-w-md">
          {children}
          <p className="mt-7 flex items-center justify-center gap-2 text-[11px] text-cinza">
            <Lock className="h-3 w-3 text-ouro" aria-hidden="true" />
            Conexão segura e dados protegidos conforme a LGPD
          </p>
        </div>
      </main>
    </div>
  );
}
