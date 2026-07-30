import Link from "next/link";
import { Lock } from "lucide-react";
import { RukzLogo, RukzSimbolo } from "@/components/brand/RukzLogo";

// A porta de entrada: foto real de barbearia atrás de um cartão centralizado,
// dividida por login, cadastro, "esqueci a senha" e redefinição.
//
// Ela carrega a mesma identidade da landing — preto, branco e o amarelo da
// marca — porque quem chega aqui acabou de decidir lá. Entrar num produto com
// outra cara é o primeiro momento em que a pessoa desconfia de que comprou uma
// coisa e recebeu outra.
//
// A tipografia não é mais declarada aqui. Depois que o sistema inteiro passou a
// usar uma família só, a fonte vem do layout raiz e este arquivo para de ter
// opinião sobre isso.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 py-10">
      {/* Cara de sistema, não de barbearia: preto seco, sem foto. A única
          textura é a marca d'água do bigode, bem apagada — identidade sem
          virar cenário. */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-preto">
        <RukzSimbolo
          tom="mono"
          className="pointer-events-none absolute left-1/2 top-1/2 w-[min(92vw,700px)] -translate-x-1/2 -translate-y-1/2 text-neve/[0.04]"
        />
      </div>

      <Link href="/" aria-label="rukz, início" className="mb-8 text-neve transition-opacity hover:opacity-80">
        <RukzLogo titulo={null} orientacao="empilhado" className="text-[2rem]" />
      </Link>

      <div className="auth-rise w-full max-w-md">
        <div className="rounded-3xl border border-traco bg-carvao/85 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8">
          {children}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-cinza">
          <Lock className="h-3 w-3 text-ouro" aria-hidden="true" />
          Conexão segura e dados protegidos conforme a LGPD
        </p>
      </div>
    </div>
  );
}
