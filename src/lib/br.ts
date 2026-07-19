// Validações de documento brasileiro. Ficam aqui (e não soltas em cada rota)
// porque CPF entra por três portas: cadastro do cliente, cadastro do barbeiro
// e nota fiscal — e um CPF inválido só aparece na hora de emitir a nota, que
// é o pior momento possível para descobrir.

/** Só os dígitos. `"123.456.789-09"` → `"12345678909"`. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida CPF pelos dígitos verificadores. Rejeita os repetidos (111.111.111-11
 * e afins) que passam na conta do módulo mas não existem na Receita.
 */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (const [length, position] of [[9, 10], [10, 11]] as const) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (position - i);
    }
    const remainder = (sum * 10) % 11;
    const digit = remainder === 10 ? 0 : remainder;
    if (digit !== Number(cpf[length])) return false;
  }
  return true;
}

/** `"12345678909"` → `"123.456.789-09"`. Devolve como veio se não der 11. */
export function formatCpf(value: string): string {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return value;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/**
 * Normaliza o @ do Instagram: aceita `@joao`, `joao` ou a URL completa e
 * guarda sempre `joao`. Sem isso o mesmo perfil vira três registros
 * diferentes e o gestor não consegue procurar.
 */
export function normalizeInstagram(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "");
}
