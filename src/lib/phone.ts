import { onlyDigits } from "./br";

// Normalização ÚNICA de telefone (a função que o plano de atribuição exige em
// TODOS os pontos de entrada). Existe para o mesmo cliente não virar dois
// registros por causa de formato — "+55 (21) 99999-8888" e "5521999998888"
// precisam bater. WhatsApp entrega DDI+DDD+número; formulários às vezes vêm sem
// o 55.
export function normalizePhone(raw: string | null | undefined): string {
  const d = onlyDigits(raw ?? "");
  if (!d) return "";
  // Já tem DDI 55 (12–13 díg.: 55 + DDD(2) + número(8/9)).
  if (d.startsWith("55") && d.length >= 12 && d.length <= 13) return d;
  // Número nacional: 10 díg. (fixo) ou 11 (móvel com 9). Prefixa o DDI.
  if (d.length === 10 || d.length === 11) return "55" + d;
  // Desconhecido: guarda só os dígitos, sem inventar DDI.
  return d;
}

// Chave de correlação de cliente usada em TODO o app: últimos 8 dígitos. É assim
// que insights/assistant/copilot já casam telefone (dribla 9º dígito e DDI). O
// Lead usa a MESMA chave de propósito, senão a atribuição criaria um contato
// novo para um telefone que o resto do sistema reconhece como o mesmo.
export function phoneKey(raw: string | null | undefined): string {
  return onlyDigits(raw ?? "").slice(-8);
}
