import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

// Uma família só, do anúncio ao relatório: Outfit, a fonte oficial da marca
// rukz (ver Rukz-Marca/LEIA-ME.txt).
//
// É geométrica como o desenho da logo — o mesmo tipo de traço reto e
// construído que aparece no símbolo. A faixa de peso vai de 400 a 800, e é
// essa amplitude que permite o mesmo tipo virar cartaz em 800 apertado e
// tabela em 400.
//
// `latin-ext` não é opcional em português: sem ele, ã, ç, é e ê caem em fonte
// de sistema e a palavra sai remendada no meio.
const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "rukz | Gestão para barbearia",
  description:
    "Agenda aberta 24 horas, lembrete automático que derruba a falta, financeiro sem planilha e assinatura de clientes. O sistema que organiza a sua barbearia e traz o cliente de volta.",
  keywords: "barbearia, sistema de gestão, agenda online, agendamento, barbershop software",
  // Os ícones não vêm daqui: `favicon.ico`, `icon.svg` e `apple-icon.png` moram
  // em src/app e o Next monta as tags sozinho. Declarar nos dois lugares só
  // duplicaria o <link>.
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={outfit.variable}>
      <body className="bg-preto text-neve antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
