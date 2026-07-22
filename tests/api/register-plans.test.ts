import { describe, expect, it } from "vitest";
import { getJson, postJson, unique, uniqueCnpj } from "../setup/client";

// O cadastro é a única porta por onde uma barbearia entra pagando, e a porta
// mais barata de abuso. Estes testes cobrem os dois lados: que cada plano
// entra com o plano certo, e que cada validação recusa o que deve recusar.
//
// Nasceram de um problema real: o CNPJ era opcional e só conferia o tamanho,
// então "00000000000000" abria barbearia — e o mesmo documento abria quantas
// quisesse. Sem teste, uma regra dessas volta a afrouxar sem ninguém ver.

interface RegisterBody {
  error?: string;
  user?: { id: string; email: string; barbershopId: string | null };
}

interface ShopBody {
  data?: { plan?: string; name?: string };
  plan?: string;
}

/** Cadastro válido, com só o campo sob teste alterado. */
function payload(label: string, extra: Record<string, unknown> = {}) {
  return {
    name: "Dono Teste",
    email: `${unique(label)}@cortix.test`,
    password: "senha12345",
    phone: "11999999999",
    cnpj: uniqueCnpj(),
    barbershopName: `Barbearia ${label}`,
    barbershopSlug: unique(label),
    city: "São Paulo, SP",
    ...extra,
  };
}

describe("cadastro — os três planos", () => {
  // O formulário manda "starter"/"pro"/"white-label"; o banco guarda
  // FREE/PRO/ENTERPRISE. Um mapa errado aqui significa cobrar de um jeito e
  // entregar de outro.
  const casos: [string, string][] = [
    ["starter", "FREE"],
    ["pro", "PRO"],
    ["white-label", "ENTERPRISE"],
  ];

  for (const [doFormulario, noBanco] of casos) {
    it(`"${doFormulario}" vira ${noBanco}`, async () => {
      const body = payload(`plan-${doFormulario.replace(/\W/g, "")}`, { plan: doFormulario });
      const res = await postJson<RegisterBody>("/api/auth/register", body);
      expect(res.status, JSON.stringify(res.body)).toBe(201);

      const shop = await getJson<ShopBody>(`/api/barbershop?slug=${body.barbershopSlug}`);
      expect(shop.status).toBe(200);
      expect(shop.body.data?.plan ?? shop.body.plan).toBe(noBanco);
    });
  }

  it("plano inválido cai no Starter em vez de quebrar", async () => {
    const body = payload("plan-lixo", { plan: "plano-que-nao-existe" });
    const res = await postJson<RegisterBody>("/api/auth/register", body);
    expect(res.status).toBe(201);

    const shop = await getJson<ShopBody>(`/api/barbershop?slug=${body.barbershopSlug}`);
    expect(shop.body.data?.plan ?? shop.body.plan).toBe("FREE");
  });
});

describe("cadastro — validações que barram barbearia fantasma", () => {
  const recusas: [string, Record<string, unknown>][] = [
    ["sem CNPJ", { cnpj: undefined }],
    ["CNPJ de zeros", { cnpj: "00000000000000" }],
    ["CNPJ com dígito errado", { cnpj: "11222333000182" }],
    ["CNPJ curto", { cnpj: "112223330001" }],
    ["sem telefone", { phone: undefined }],
    ["telefone sem DDD", { phone: "99999999" }],
    ["e-mail inválido", { email: "nao-e-email" }],
    ["senha curta", { password: "1234567" }],
    ["senha só de números", { password: "123456789" }],
    ["sem nome do dono", { name: "" }],
    ["sem nome da barbearia", { barbershopName: "" }],
    ["sem cidade", { city: "" }],
    ["link com espaço", { barbershopSlug: "minha barbearia" }],
    ["link curto demais", { barbershopSlug: "ab" }],
  ];

  for (const [caso, alteracao] of recusas) {
    it(`recusa: ${caso}`, async () => {
      const res = await postJson<RegisterBody>("/api/auth/register", payload("val", alteracao));
      expect(res.status, `deveria recusar "${caso}" — respondeu ${res.status}`).toBe(400);
      expect(res.body.error).toBeTruthy();
    });
  }

  // Não é recusa, é normalização — e isso é de propósito. Link é
  // insensível a maiúscula na prática, então corrigir em silêncio serve
  // melhor que devolver erro para quem digitou o nome como fala.
  it("aceita link com maiúscula, guardando em minúsculo", async () => {
    const body = payload("caixa", { barbershopSlug: "MinhaBarbeariaTeste" });
    const res = await postJson<RegisterBody>("/api/auth/register", body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);

    const shop = await getJson<ShopBody>("/api/barbershop?slug=minhabarbeariateste");
    expect(shop.status, "o link deveria ter sido guardado em minúsculo").toBe(200);
  });

  it("aceita CNPJ formatado com pontuação", async () => {
    const res = await postJson<RegisterBody>("/api/auth/register", payload("fmt", { cnpj: "11.222.333/0001-81" }));
    expect(res.status, JSON.stringify(res.body)).toBe(201);
  });

  it("aceita telefone formatado", async () => {
    const res = await postJson<RegisterBody>("/api/auth/register", payload("tel", { phone: "(11) 99999-9999" }));
    expect(res.status, JSON.stringify(res.body)).toBe(201);
  });
});

describe("cadastro — cupom", () => {
  it("código inexistente é recusado antes de criar qualquer conta", async () => {
    const body = payload("cup-x", { couponCode: "ZZZZ-9999" });
    const res = await postJson<RegisterBody>("/api/auth/register", body);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("não encontrado");

    // E o e-mail tem que continuar livre: se a conta tivesse sido criada antes
    // da checagem, o cliente ficaria preso com uma conta no plano errado.
    const retry = await postJson<RegisterBody>("/api/auth/register", { ...body, couponCode: undefined });
    expect(retry.status).toBe(201);
  });
});
