import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Traces only the files each route actually needs into .next/standalone —
  // the Docker image copies that instead of the full node_modules tree.
  //
  // Só no build do Docker: a Vercel monta o deploy do seu jeito e o modo
  // standalone atrapalha lá. DOCKER_BUILD=1 fica no Dockerfile.
  ...(process.env.DOCKER_BUILD === "1" && { output: "standalone" as const }),

  // Cabeçalhos de segurança em todas as páginas. A Vercel já manda o HSTS;
  // estes fecham as outras portas comuns sem risco de quebrar a aplicação:
  // clickjacking (embutir o painel num iframe de terceiro), MIME sniffing e
  // vazamento de referrer para outros sites. CSP fica de fora de propósito —
  // uma política restritiva demais quebraria fontes/imagens externas legítimas,
  // e é melhor acertar com calma do que travar o app agora.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Reforça o HSTS que a Vercel já envia (dois anos, subdomínios).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Ninguém embute o painel num iframe: barra clickjacking.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // O navegador respeita o Content-Type declarado, não "adivinha".
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Não vaza o caminho completo da URL para sites externos.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Desliga APIs sensíveis do navegador que o app não usa.
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(self), camera=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
