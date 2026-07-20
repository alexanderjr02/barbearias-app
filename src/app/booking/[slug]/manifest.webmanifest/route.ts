import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Manifest PWA POR BARBEARIA. O manifest fixo em /public/manifest.json diz
// "CORTIX" — então o cliente White Label, que paga justamente para NÃO ver a
// nossa marca, instalava um app chamado CORTIX na tela dele. Aqui cada
// barbearia ganha o seu, com nome, ícone e cor dela.
//
// A regra de marca segue o plano:
//   ENTERPRISE (White Label) → 100% a marca dele, sem "CORTIX" em lugar nenhum
//   demais planos            → nome da barbearia com a assinatura do CORTIX
export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const shop = await prisma.barbershop.findUnique({
    where: { slug },
    select: { name: true, description: true, logo: true, primaryColor: true, secondaryColor: true, plan: true, isActive: true },
  });

  if (!shop || !shop.isActive) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  const isWhiteLabel = shop.plan === "ENTERPRISE";
  const start = `/booking/${slug}`;

  // Se a barbearia subiu um logo, ele vira o ícone do app. Sem logo, usamos um
  // ícone GERADO com as iniciais e a cor dela — nunca os ícones padrão, que
  // têm a marca CORTIX e apareceriam justamente para o cliente White Label que
  // ainda não subiu logo.
  const generated = { src: `/booking/${slug}/icon.svg`, sizes: "any", type: "image/svg+xml" };
  const icons = shop.logo
    ? [
        { src: shop.logo, sizes: "any", purpose: "any" },
        { src: shop.logo, sizes: "any", purpose: "maskable" },
      ]
    : [
        { ...generated, purpose: "any" },
        { ...generated, purpose: "maskable" },
      ];

  const manifest = {
    name: isWhiteLabel ? shop.name : `${shop.name} — CORTIX`,
    short_name: shop.name.slice(0, 12),
    description: shop.description || `Agende seu horário na ${shop.name}.`,
    // Escopo preso à página da barbearia: o app instalado abre direto nela e
    // não "vaza" para o resto do site.
    start_url: start,
    scope: start,
    id: start,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: shop.secondaryColor || "#09090b",
    theme_color: shop.primaryColor || "#D4AF37",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "lifestyle"],
    prefer_related_applications: false,
    icons,
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      // Curto de propósito: o gestor troca logo/cor na tela de Aparência e
      // espera ver o resultado ao reinstalar, não daqui a um dia.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
