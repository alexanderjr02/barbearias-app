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

/**
 * Valida CNPJ pelos dígitos verificadores. Mesma ideia do CPF: a conta do
 * módulo 11, com os pesos ciclando de 2 a 9, e os repetidos
 * (00.000.000/0000-00 e afins) rejeitados porque passam na conta mas não
 * existem na Receita.
 *
 * Existe porque o cadastro só conferia "tem 14 dígitos" — o que deixava
 * entrar barbearia fantasma com CNPJ inventado. É a diferença entre exigir
 * documento e exigir que o documento seja real.
 */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  for (const length of [12, 13] as const) {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i++) {
      sum += Number(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const remainder = sum % 11;
    const digit = remainder < 2 ? 0 : 11 - remainder;
    if (digit !== Number(cnpj[length])) return false;
  }
  return true;
}

/** `"11222333000181"` → `"11.222.333/0001-81"`. Devolve como veio se não der 14. */
export function formatCnpj(value: string): string {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return value;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
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
