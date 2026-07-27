import Link from "next/link";
import { Big_Shoulders, Manrope } from "next/font/google";
import { Scissors, Lock } from "lucide-react";

// A porta de entrada: foto real de barbearia atrás de um cartão centralizado,
// dividida por login, cadastro, "esqueci a senha" e redefinição.
//
// Ela carrega a mesma identidade da landing — breu, latão e a condensada de
// letreiro — porque quem chega aqui acabou de decidir lá. Entrar num produto
// com outra cara é o primeiro momento em que a pessoa desconfia de que comprou
// uma coisa e recebeu outra.
//
// As fontes são declaradas aqui e na landing, e em lugar nenhum além disso: o
// painel fica em Inter/Sora, que é o que se lê o dia inteiro sem cansar.
const tipoTitulo = Big_Shoulders({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--ff-display",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Haettenschweiler", "system-ui", "sans-serif"],
});
const tipoTexto = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--ff-body",
  display: "swap",
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`marca-cortix relative flex min-h-screen w-full flex-col items-center justify-center px-4 py-10 ${tipoTexto.variable} ${tipoTitulo.variable}`}
    >
      {/* Foto fixa da barbearia + escurecimento quente. O gradiente antigo era
          de zinc e puxava o tijolo para o cinza; em breu a foto continua
          parecendo um salão com luz acesa. */}
      <div className="fixed inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/shop-interior.jpg" alt="" className="kenburns h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-breu/[0.93] via-breu/[0.88] to-black/95" />
        <div className="pointer-events-none absolute -right-[10%] -top-[15%] h-[520px] w-[520px] rounded-full bg-latao/[0.12] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-[15%] -left-[10%] h-96 w-96 rounded-full bg-latao-escuro/10 blur-3xl" />
      </div>

      <Link href="/" className="group mb-6 inline-flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-latao-claro to-latao-escuro shadow-lg shadow-latao-escuro/30 transition-transform group-hover:scale-105">
          <Scissors className="h-5 w-5 text-breu" />
        </span>
        <span className="font-display text-3xl font-bold uppercase leading-none tracking-wide text-porcelana">
          Cort<span className="text-latao">ix</span>
        </span>
      </Link>

      <div className="auth-rise w-full max-w-md">
        {/* Sem listra de poste aqui. Tentei, e ela ficava picada pelos cantos
            arredondados do cartão. A marca já está dita pela assinatura acima,
            pelo título condensado e pelo latão do botão — mais um enfeite só
            competiria com o campo de senha. */}
        <div className="rounded-3xl border border-porcelana/10 bg-breu/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8">
          {children}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-fumaca/70">
          <Lock className="h-3 w-3 text-latao" aria-hidden="true" />
          Conexão segura e dados protegidos conforme a LGPD
        </p>
      </div>
    </div>
  );
}
