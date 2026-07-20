import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";

// GET /api/brand/icon?slug=<barbearia>&size=180
//
// Devolve a logo da barbearia como ícone QUADRADO, para o "Adicionar à tela
// de início" do iPhone e do Android.
//
// Duas coisas que esta rota resolve:
//
// 1. A logo enviada pelo gestor é uma foto qualquer — a de teste era 800x1421.
//    O iOS recorta o centro de qualquer imagem não quadrada, então metade da
//    marca sumia. Aqui ela é encaixada inteira num quadrado, com fundo, em vez
//    de cortada.
// 2. O ícone estava fixo no build (um arquivo só, servindo todas as
//    barbearias). Sendo rota, cada barbearia tem o seu sem rebuild nenhum.
export const runtime = "nodejs";

const MAX_SIZE = 512;
const DEFAULT_SIZE = 180; // o que o iOS pede no apple-touch-icon

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const size = Math.min(Number(request.nextUrl.searchParams.get("size")) || DEFAULT_SIZE, MAX_SIZE);

  if (!slug) {
    return NextResponse.json({ error: "Informe a barbearia" }, { status: 400 });
  }

  const shop = await prisma.barbershop.findUnique({
    where: { slug },
    select: { logo: true, primaryColor: true, name: true },
  });

  if (!shop) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  const bg = /^#[0-9a-f]{6}$/i.test(shop.primaryColor ?? "") ? shop.primaryColor! : "#F59E0B";

  // Sem logo: devolve as iniciais sobre a cor da marca. É melhor que o ícone
  // genérico do Flutter, que não diz nada sobre a barbearia.
  if (!shop.logo) {
    const initials = shop.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? "")
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${bg}"/>
      <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
        font-family="system-ui,sans-serif" font-weight="800"
        font-size="${Math.round(size * 0.4)}" fill="${textColorFor(bg)}">${initials}</text>
    </svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return imageResponse(png);
  }

  try {
    const res = await fetch(shop.logo);
    if (!res.ok) throw new Error(`logo respondeu ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());

    // "contain" e não "cover": a logo inteira aparece, com sobra preenchida
    // pela cor da marca. Com "cover" o iOS voltaria a cortar as bordas.
    const png = await sharp(input)
      .resize(size, size, { fit: "contain", background: bg })
      .flatten({ background: bg })
      .png()
      .toBuffer();

    return imageResponse(png);
  } catch {
    // Logo fora do ar não pode derrubar o ícone: cai num quadrado da cor da
    // marca, que ainda é melhor que ícone quebrado.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${bg}"/>
    </svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return imageResponse(png);
  }
}

function imageResponse(png: Buffer) {
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Cache curto: o gestor troca a logo e quer ver o efeito, mas não a
      // ponto de refazer a imagem a cada request.
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/** Preto ou branco, conforme o contraste com o fundo (luminância WCAG). */
function textColorFor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? "#18181B" : "#FFFFFF";
}
