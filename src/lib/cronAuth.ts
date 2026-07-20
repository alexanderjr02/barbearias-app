import { NextRequest } from "next/server";

/**
 * Lê o segredo do cron da requisição, nos três formatos que os hosts usam.
 *
 * A Vercel manda `Authorization: Bearer <segredo>` sozinha quando a variável
 * CRON_SECRET existe — não dá para pôr a variável no path do agendamento. O
 * Render chama pela query string. O header x-cron-secret fica para chamada
 * manual.
 *
 * Estava repetido nas três rotas de cron lendo só dois dos formatos, então a
 * chamada da Vercel batia 401 em todas.
 */
export function cronSecretFrom(request: NextRequest): string | null {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return bearer || request.nextUrl.searchParams.get("secret") || request.headers.get("x-cron-secret");
}
