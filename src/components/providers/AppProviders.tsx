"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/Toaster";

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
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
