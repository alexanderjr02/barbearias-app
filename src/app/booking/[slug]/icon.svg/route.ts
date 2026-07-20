import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Ícone GERADO com a marca da barbearia: quadrado na cor dela + as iniciais.
//
// Por que existe: o manifest caía nos ícones padrão quando a barbearia não
// tinha logo — e esses ícones têm a marca CORTIX. Ou seja, justamente o
// cliente White Label que ainda não subiu um logo instalava um app com a
// NOSSA marca, que é o oposto do que ele paga. Aqui ninguém fica sem ícone
// próprio: sem logo, ele é desenhado a partir do nome e da cor da barbearia.

/** Iniciais legíveis: "Cortezz Zona Sul" -> "CZ"; "Barbearia" -> "BA". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 1);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const first = words[0] ?? name.trim();
  return (first.slice(0, 2) || "?").toUpperCase();
}

/** Preto ou branco, o que tiver mais contraste com o fundo (WCAG relativo). */
function readableTextOn(hex: string): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return "#000000";
  const int = parseInt(m[1], 16);
  const srgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return lum > 0.45 ? "#000000" : "#FFFFFF";
}

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const shop = await prisma.barbershop.findUnique({
    where: { slug },
    select: { name: true, primaryColor: true },
  });
  if (!shop) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });

  const bg = /^#[\da-fA-F]{6}$/.test(shop.primaryColor || "") ? shop.primaryColor : "#D4AF37";
  const fg = readableTextOn(bg);
  const initials = initialsOf(shop.name);

  // 512x512 com margem interna generosa: no Android o ícone "maskable" é
  // recortado em círculo, e sem essa folga as iniciais ficariam cortadas.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${escapeXml(shop.name)}">
  <rect width="512" height="512" rx="96" fill="${bg}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="220" font-weight="700" fill="${fg}">${escapeXml(initials)}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Curto porque o gestor troca a cor na tela de Aparência e espera ver.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}
