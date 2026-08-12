"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/Toaster";
import { CookieConsent } from "@/components/landing/CookieConsent";

/** Onde o aviso de cookies não entra: quem já está logado no produto. */
const AREAS_INTERNAS = ["/dashboard", "/admin", "/barbeiro"];

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // O PlanProvider NÃO mora aqui. Ele busca /api/barbershop, que exige sessão;
  // no layout raiz isso rodava em toda página pública (login, cadastro, site),
  // tomava 401 e o apiClient mostrava um toast vermelho de erro de
  // autenticação em cima da tela de login. Ele vive no layout do dashboard,
  // que é onde o plano é usado de fato.
  // O aviso de cookies é do site, não do produto. Ele nasceu aqui para cobrir
  // toda página pública de uma vez, mas dentro do painel virava uma faixa em
  // cima da ferramenta de quem já entrou, já aceitou e está trabalhando.
  const rota = usePathname() ?? "/";
  const areaPublica = !AREAS_INTERNAS.some((a) => rota.startsWith(a));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      {areaPublica && <CookieConsent />}
    </QueryClientProvider>
  );
}
