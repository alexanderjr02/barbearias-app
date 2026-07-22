// Freio simples por IP, guardado na memória da instância.
//
// Serve para as portas de abuso barato: criar conta, pedir link de senha,
// tentar login. Sem isso, um script cria mil barbearias fantasma numa tarde.
//
// LIMITAÇÃO IMPORTANTE, e ela é real: em ambiente sem servidor cada instância
// tem a própria memória, então o teto efetivo é por instância, não global — e
// a memória some quando a instância morre. Isso é um quebra-molas, não um
// muro. Quem quer muro põe o limitador na borda (WAF/rate limiting da
// hospedagem) ou num armazenamento compartilhado. O quebra-molas ainda vale:
// derruba o script ingênuo, que é a maioria.
interface Hit {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Hit>();
const MAX_KEYS = 10_000; // teto de memória

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key    quem está sendo limitado (ex.: `register:${ip}`)
 * @param limit  quantas tentativas cabem na janela
 * @param windowMs tamanho da janela
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || now >= hit.resetAt) {
    if (buckets.size >= MAX_KEYS) {
      // Faxina barata: joga fora o que já expirou antes de recorrer ao
      // descarte do mais antigo.
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.delete(buckets.keys().next().value as string);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  hit.count++;
  const allowed = hit.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - hit.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((hit.resetAt - now) / 1000),
  };
}
