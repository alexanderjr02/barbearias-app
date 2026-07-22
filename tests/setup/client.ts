import { BASE_URL } from "./globalSetup";

export { BASE_URL };

// A fresh, collision-free suffix per test run — tests share one long-lived
// server + database (see globalSetup.ts), so every test that creates a
// barbershop/user needs its own unique email/slug instead of relying on a
// clean slate between tests.
export function unique(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Um CNPJ diferente e VÁLIDO a cada chamada.
 *
 * O cadastro passou a exigir CNPJ real (dígitos verificadores conferidos) e
 * único por barbearia — então os testes não podem mais mandar um número fixo
 * nem inventado: o primeiro cadastro passaria e todos os seguintes bateriam
 * no 409 de CNPJ repetido.
 */
export function uniqueCnpj(): string {
  const digit = (nums: string): number => {
    let sum = 0;
    let weight = nums.length - 7;
    for (let i = 0; i < nums.length; i++) {
      sum += Number(nums[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  // 8 dígitos de raiz + "0001" de filial; a raiz aleatória é o que dá a
  // unicidade, e os dois verificadores saem da conta.
  const root = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
  const base = `${root}0001`;
  const d1 = digit(base);
  return `${base}${d1}${digit(`${base}${d1}`)}`;
}

interface RequestOptions {
  token?: string;
  method?: string;
}

async function request<T>(path: string, options: RequestOptions & { body?: unknown } = {}): Promise<{ status: number; body: T }> {
  const { token, method = options.body ? "POST" : "GET", body } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : undefined;
  return { status: res.status, body: parsed as T };
}

export function getJson<T>(path: string, token?: string) {
  return request<T>(path, { method: "GET", token });
}

export function postJson<T>(path: string, body: unknown, token?: string) {
  return request<T>(path, { method: "POST", body, token });
}

export function patchJson<T>(path: string, body: unknown, token?: string) {
  return request<T>(path, { method: "PATCH", body, token });
}

interface RegisterResult {
  success: boolean;
  user: { id: string; name: string; email: string; role: string; barbershopId: string | null };
  accessToken: string;
  refreshToken: string;
}

// Registers a fresh owner + barbershop and sets up Mon–Sat 09:00–18:00
// working hours (closed Sunday) so appointment-booking tests have a
// predictable, always-open window to book into.
export async function registerBarbershop(label: string) {
  const email = `${unique(label)}@cortix.test`;
  const slug = unique(label);
  const { status, body } = await postJson<RegisterResult>("/api/auth/register", {
    name: "Dono de Teste",
    email,
    password: "senha12345",
    // Telefone e CNPJ passaram a ser obrigatórios no cadastro (barbearia
    // fantasma) — sem eles todo teste que cria barbearia toma 400.
    phone: "11999999999",
    cnpj: uniqueCnpj(),
    barbershopName: `Barbearia ${label}`,
    barbershopSlug: slug,
    city: "São Paulo, SP",
    plan: "starter",
  });
  if (status !== 201) {
    throw new Error(`Falha ao registrar barbearia de teste: ${status} ${JSON.stringify(body)}`);
  }

  const { accessToken, user } = body;
  const workingHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isOpen: dayOfWeek !== 0,
    openTime: "09:00",
    closeTime: "18:00",
  }));
  await patchJson("/api/barbershop", { workingHours }, accessToken);

  return { email, slug, accessToken, barbershopId: user.barbershopId as string };
}

// YYYY-MM-DD for N days from now — always a day the test working hours
// (Mon–Sat) cover, and always in the future so validateRequestedSlot()
// doesn't reject it as "already past".
export function futureDateKey(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Land on a Monday-ish weekday to avoid the Sunday-closed edge case.
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
