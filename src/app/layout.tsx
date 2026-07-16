import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

// Body copy — Inter (clean, legible). Headlines — Sora (geometric, premium,
// with more character than Inter for a barbershop brand). Both self-hosted by
// next/font, so no external font request at runtime.
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
