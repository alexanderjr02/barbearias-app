import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

// Tipografia do PRODUTO (painel, login, agendamento): Inter no texto e Sora
// nos títulos. Neutras de propósito — quem passa o dia numa tela de gestão
// precisa ler número e tabela, não ouvir a marca falar.
//
// A landing tem tipografia própria, carregada dentro da própria página
// (src/app/page.tsx). Fica lá, e não aqui, para que a fonte de campanha não
// seja baixada por quem só abriu o painel.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CORTIX — Sistema de Gestão para Barbearias",
  description:
    "O sistema mais completo para gerenciamento de barbearias. Agendamento online, chatbot inteligente, controle financeiro, estoque e muito mais.",
  keywords: "barbearia, sistema gestão, agendamento online, barbershop software",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable}`}>
      <body className="bg-black text-white antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
