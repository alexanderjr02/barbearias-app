import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/brand/manifest?slug=<barbearia>&app=<origem do app>
//
// Manifesto do PWA por barbearia.
//
// Existe por causa de um detalhe que só aparece depois de instalar: o app
// aberto pela tela de início NÃO usa a URL que a pessoa visitou, e sim o
// `start_url` do manifesto. Como o manifesto estático do Flutter aponta para
// "/", o `?shop=` se perdia e o app voltava à marca padrão.
//
// Guardar o slug no armazenamento local não resolve no iPhone: o app
// instalado usa um contexto de armazenamento separado do Safari, então o que
// foi salvo navegando não chega lá. Colocar o slug no próprio start_url é o
// que funciona nos dois sistemas.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const appOrigin = request.nextUrl.searchParams.get("app");

  if (!slug || !appOrigin) {
    return NextResponse.json({ error: "Informe a barbearia e a origem do app" }, { status: 400 });
  }

  // Só aceita origem https — sem isso a rota viraria um gerador de manifesto
  // apontando para qualquer domínio que alguém colocasse na query.
  let origin: string;
  try {
    const parsed = new URL(appOrigin);
    if (parsed.protocol !== "https:") throw new Error("origem insegura");
    origin = parsed.origin;
  } catch {
    return NextResponse.json({ error: "Origem inválida" }, { status: 400 });
  }

  const shop = await prisma.barbershop.findUnique({
    where: { slug },
    select: { name: true, primaryColor: true, plan: true },
  });
  if (!shop) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });

  const api = request.nextUrl.origin;
  const icon = (size: number) => `${api}/api/brand/icon?slug=${encodeURIComponent(slug)}&size=${size}`;

  // App com a cara da barbearia é o que se compra no plano mais caro. Abaixo
  // dele o app instalado é o CORTIX — mas o start_url continua levando o slug,
  // senão o atalho abriria "uma barbearia qualquer" em vez da dele.
  const whiteLabel = shop.plan === "ENTERPRISE";

  const manifest = whiteLabel
    ? {
        name: shop.name,
        short_name: shop.name.length > 12 ? shop.name.split(/\s+/)[0] : shop.name,
        description: `Agende seu horário na ${shop.name}.`,
        // O slug vive aqui: é o que sobrevive à instalação.
        start_url: `${origin}/?shop=${encodeURIComponent(slug)}`,
        scope: `${origin}/`,
        display: "standalone",
        orientation: "portrait",
        background_color: "#0B0A0F",
        theme_color: shop.primaryColor || "#F59E0B",
        icons: [
          { src: icon(192), sizes: "192x192", type: "image/png", purpose: "any" },
          { src: icon(512), sizes: "512x512", type: "image/png", purpose: "any" },
          { src: icon(512), sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      }
    : {
        name: "CORTIX",
        short_name: "CORTIX",
        description: "Agende seu horário na barbearia.",
        start_url: `${origin}/?shop=${encodeURIComponent(slug)}`,
        scope: `${origin}/`,
        display: "standalone",
        orientation: "portrait",
        background_color: "#09090b",
        theme_color: "#D4AF37",
        icons: [
          { src: `${origin}/icons/Icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: `${origin}/icons/Icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: `${origin}/icons/Icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      // O manifesto é buscado pelo domínio do app, que é outro — sem CORS o
      // navegador recusa e o PWA volta ao manifesto padrão.
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
