import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="pt-BR">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
