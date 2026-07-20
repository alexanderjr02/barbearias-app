import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/db";

// A página pública da barbearia é o que o cliente final instala no celular.
// Sem este layout ela herdava o título e o manifest do CORTIX, e o app
// instalado aparecia como "CORTIX" na tela do cliente — o oposto do que o
// plano White Label promete.

async function getShop(slug: string) {
  return prisma.barbershop.findUnique({
    where: { slug },
    select: { name: true, description: true, logo: true, primaryColor: true, plan: true },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return { title: "Barbearia não encontrada" };

  const isWhiteLabel = shop.plan === "ENTERPRISE";
  const title = isWhiteLabel ? shop.name : `${shop.name} — CORTIX`;

  return {
    title,
    description: shop.description || `Agende seu horário na ${shop.name}.`,
    manifest: `/booking/${slug}/manifest.webmanifest`,
    // Nome que o iOS usa quando o cliente adiciona à tela de início.
    appleWebApp: { capable: true, title: shop.name, statusBarStyle: "black-translucent" },
    // Sem logo, o ícone gerado com a marca dela — nunca o do CORTIX.
    icons: shop.logo
      ? { icon: shop.logo, apple: shop.logo, shortcut: shop.logo }
      : { icon: `/booking/${slug}/icon.svg`, apple: `/booking/${slug}/icon.svg`, shortcut: `/booking/${slug}/icon.svg` },
    openGraph: {
      title,
      description: shop.description || `Agende seu horário na ${shop.name}.`,
      ...(shop.logo ? { images: [shop.logo] } : {}),
    },
    // O White Label não deve carregar a assinatura do CORTIX nem nos metadados.
    ...(isWhiteLabel ? {} : { keywords: "barbearia, agendamento online, CORTIX" }),
  };
}

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params;
  const shop = await getShop(slug);
  // themeColor pinta a barra do navegador/app com a cor da barbearia.
  return { themeColor: shop?.primaryColor || "#D4AF37" };
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
