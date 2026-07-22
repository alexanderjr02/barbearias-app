import { describe, expect, it } from "vitest";
import { BASE_URL, getJson, postJson, unique, uniqueCnpj } from "../setup/client";

interface RegisterBody {
  success?: boolean;
  error?: string;
  user?: { id: string; email: string; barbershopId: string | null };
  accessToken?: string;
}

interface LoginBody {
  error?: string;
  requiresTwoFactor?: boolean;
  accessToken?: string;
  user?: { id: string; email: string };
}

interface MeBody {
  error?: string;
  id?: string;
  email?: string;
}

describe("POST /api/auth/register", () => {
  it("creates an owner account and a barbershop", async () => {
    const email = `${unique("register")}@cortix.test`;
    const { status, body } = await postJson<RegisterBody>("/api/auth/register", {
      name: "Novo Dono",
      email,
      password: "senha12345",
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Barbearia Teste",
      barbershopSlug: unique("shop"),
      city: "São Paulo, SP",
      plan: "starter",
    });

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.user?.email).toBe(email);
    expect(body.user?.barbershopId).toBeTruthy();
    expect(body.accessToken).toBeTruthy();
  });

  it("rejects a duplicate email with 409", async () => {
    const email = `${unique("dup")}@cortix.test`;
    const payload = {
      name: "Dono",
      email,
      password: "senha12345",
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Barbearia Dup",
      barbershopSlug: unique("dup-shop"),
      city: "São Paulo, SP",
      plan: "starter",
    };

    const first = await postJson<RegisterBody>("/api/auth/register", payload);
    expect(first.status).toBe(201);

    // Slug e CNPJ novos de propósito: assim o 409 só pode ser pelo e-mail.
    const second = await postJson<RegisterBody>("/api/auth/register", {
      ...payload,
      barbershopSlug: unique("dup-shop-2"),
      cnpj: uniqueCnpj(),
    });
    expect(second.status).toBe(409);
    expect(second.body.error).toBeTruthy();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const { status, body } = await postJson<RegisterBody>("/api/auth/register", {
      name: "Dono Fraco",
      email: `${unique("weakpw")}@cortix.test`,
      password: "1234567",
    });
    expect(status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("rejects a request missing required fields", async () => {
    const { status } = await postJson<RegisterBody>("/api/auth/register", { email: "no-name@cortix.test" });
    expect(status).toBe(400);
  });

  it("rejects registration without barbershop info (no more ownerless accounts)", async () => {
    const { status, body } = await postJson<RegisterBody>("/api/auth/register", {
      name: "Sem Barbearia",
      email: `${unique("noshop")}@cortix.test`,
      password: "senha12345",
    });
    expect(status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("rejects an invalid barbershop slug (uppercase/spaces)", async () => {
    const { status } = await postJson<RegisterBody>("/api/auth/register", {
      name: "Slug Ruim",
      email: `${unique("badslug")}@cortix.test`,
      password: "senha12345",
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Barbearia Slug",
      barbershopSlug: "Minha Barbearia!!",
      city: "São Paulo, SP",
    });
    expect(status).toBe(400);
  });

  it("rejects a duplicate barbershop slug even with a fresh email, without orphaning the user", async () => {
    const slug = unique("taken-slug");
    const first = await postJson<RegisterBody>("/api/auth/register", {
      name: "Primeiro",
      email: `${unique("slugowner1")}@cortix.test`,
      password: "senha12345",
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Primeira Barbearia",
      barbershopSlug: slug,
      city: "São Paulo, SP",
    });
    expect(first.status).toBe(201);

    const clashEmail = `${unique("slugowner2")}@cortix.test`;
    const second = await postJson<RegisterBody>("/api/auth/register", {
      name: "Segundo",
      email: clashEmail,
      password: "senha12345",
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Segunda Barbearia",
      barbershopSlug: slug,
      city: "São Paulo, SP",
    });
    expect(second.status).toBe(409);

    // The email must not have been consumed by the failed attempt — the
    // whole User+Barbershop creation is one transaction now.
    const retry = await postJson<RegisterBody>("/api/auth/register", {
      name: "Segundo de Novo",
      email: clashEmail,
      password: "senha12345",
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Segunda Barbearia",
      barbershopSlug: unique("taken-slug-2"),
      city: "São Paulo, SP",
    });
    expect(retry.status).toBe(201);
  });

  // --- Barbearia fantasma: o cadastro precisa de documento REAL e único. ---

  it("rejeita cadastro sem CNPJ", async () => {
    const { status, body } = await postJson<RegisterBody>("/api/auth/register", {
      name: "Sem Documento",
      email: `${unique("nocnpj")}@cortix.test`,
      password: "senha12345",
      phone: "11999999999",
      barbershopName: "Barbearia Fantasma",
      barbershopSlug: unique("fantasma"),
      city: "São Paulo, SP",
    });
    expect(status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("rejeita CNPJ com dígito verificador inválido (o antigo só via o tamanho)", async () => {
    for (const cnpj of ["00000000000000", "11111111111111", "11222333000182"]) {
      const { status } = await postJson<RegisterBody>("/api/auth/register", {
        name: "Documento Falso",
        email: `${unique("badcnpj")}@cortix.test`,
        password: "senha12345",
        phone: "11999999999",
        cnpj,
        barbershopName: "Barbearia Falsa",
        barbershopSlug: unique("falsa"),
        city: "São Paulo, SP",
      });
      expect(status, `CNPJ ${cnpj} deveria ser recusado`).toBe(400);
    }
  });

  it("rejeita o MESMO CNPJ abrindo uma segunda barbearia", async () => {
    const cnpj = uniqueCnpj();
    const base = {
      password: "senha12345",
      phone: "11999999999",
      cnpj,
      city: "São Paulo, SP",
    };
    const first = await postJson<RegisterBody>("/api/auth/register", {
      ...base,
      name: "Dono Original",
      email: `${unique("cnpj1")}@cortix.test`,
      barbershopName: "Barbearia Original",
      barbershopSlug: unique("original"),
    });
    expect(first.status).toBe(201);

    // Tudo diferente menos o documento — é assim que se monta uma fileira de
    // fantasmas com aparência legítima.
    const second = await postJson<RegisterBody>("/api/auth/register", {
      ...base,
      name: "Dono Clone",
      email: `${unique("cnpj2")}@cortix.test`,
      barbershopName: "Barbearia Clone",
      barbershopSlug: unique("clone"),
    });
    expect(second.status).toBe(409);
    expect(second.body.error).toContain("CNPJ");
  });

  it("rejeita cadastro sem telefone (conta de dono sem ninguém atrás)", async () => {
    const { status } = await postJson<RegisterBody>("/api/auth/register", {
      name: "Sem Telefone",
      email: `${unique("nophone")}@cortix.test`,
      password: "senha12345",
      cnpj: uniqueCnpj(),
      barbershopName: "Barbearia Muda",
      barbershopSlug: unique("muda"),
      city: "São Paulo, SP",
    });
    expect(status).toBe(400);
  });
});

describe("POST /api/auth/register/client", () => {
  it("creates a client account with no barbershop attached", async () => {
    const email = `${unique("client")}@cortix.test`;
    const { status, body } = await postJson<RegisterBody>("/api/auth/register/client", {
      name: "Cliente Novo",
      email,
      password: "senha12345",
      phone: "11999990000",
      dateOfBirth: "1995-06-15",
    });
    expect(status).toBe(201);
    expect(body.user?.email).toBe(email);
    expect(body.user?.barbershopId).toBeNull();
    expect(body.accessToken).toBeTruthy();
  });

  it("rejects someone under 13", async () => {
    const { status, body } = await postJson<RegisterBody>("/api/auth/register/client", {
      name: "Muito Novo",
      email: `${unique("kid")}@cortix.test`,
      password: "senha12345",
      phone: "11999990000",
      dateOfBirth: new Date().toISOString().slice(0, 10),
    });
    expect(status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("rejects a missing date of birth", async () => {
    const { status } = await postJson<RegisterBody>("/api/auth/register/client", {
      name: "Sem Data",
      email: `${unique("nodob")}@cortix.test`,
      password: "senha12345",
      phone: "11999990000",
    });
    expect(status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    const email = `${unique("clientdup")}@cortix.test`;
    const payload = {
      name: "Cliente Dup",
      email,
      password: "senha12345",
      phone: "11999990000",
      dateOfBirth: "1995-06-15",
    };
    const first = await postJson<RegisterBody>("/api/auth/register/client", payload);
    expect(first.status).toBe(201);

    const second = await postJson<RegisterBody>("/api/auth/register/client", payload);
    expect(second.status).toBe(409);
  });
});

describe("POST /api/auth/google", () => {
  it("responds 501 when GOOGLE_CLIENT_ID isn't configured (the test environment doesn't set it)", async () => {
    const { status, body } = await postJson<{ error?: string }>("/api/auth/google", { idToken: "x".repeat(30) });
    expect(status).toBe(501);
    expect(body.error).toBeTruthy();
  });

  it("rejects an obviously-too-short token before ever calling Google", async () => {
    const { status } = await postJson<{ error?: string }>("/api/auth/google", { idToken: "short" });
    // With no GOOGLE_CLIENT_ID configured this still short-circuits to 501
    // (checked first) — either way, it must never be a 500.
    expect([400, 501]).toContain(status);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the correct credentials", async () => {
    const email = `${unique("login")}@cortix.test`;
    const password = "senha12345";
    await postJson<RegisterBody>("/api/auth/register", {
      name: "Login Test",
      email,
      password,
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Barbearia Login",
      barbershopSlug: unique("login-shop"),
      city: "São Paulo, SP",
      plan: "starter",
    });

    const { status, body } = await postJson<LoginBody>("/api/auth/login", { email, password });
    expect(status).toBe(200);
    expect(body.accessToken).toBeTruthy();
    expect(body.user?.email).toBe(email);
  });

  it("rejects the wrong password with 401", async () => {
    const email = `${unique("wrongpw")}@cortix.test`;
    await postJson<RegisterBody>("/api/auth/register", {
      name: "Wrong Password Test",
      email,
      password: "senha12345",
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Barbearia Wrongpw",
      barbershopSlug: unique("wrongpw-shop"),
      city: "São Paulo, SP",
      plan: "starter",
    });

    const { status, body } = await postJson<LoginBody>("/api/auth/login", { email, password: "senhaerrada" });
    expect(status).toBe(401);
    expect(body.error).toBeTruthy();
  });

  it("rejects an email that doesn't exist with 401", async () => {
    const { status } = await postJson<LoginBody>("/api/auth/login", {
      email: "never-registered@cortix.test",
      password: "senha12345",
    });
    expect(status).toBe(401);
  });

  // Regression: session cookies were marked Secure purely from
  // NODE_ENV === "production", which docker-compose.yml sets even though it
  // serves plain HTTP with no reverse proxy/TLS by default. A Secure cookie
  // over plain HTTP on a non-localhost origin is silently dropped by the
  // browser — login/register appear to succeed (the JSON body is fine) but
  // no session ever sticks, and every following request looks
  // unauthenticated. The test server runs over plain HTTP, so the fix
  // (src/lib/requestIp.ts isSecureRequest) must produce a non-Secure cookie
  // here regardless of NODE_ENV.
  it("does not mark the session cookie Secure when the request itself is plain HTTP", async () => {
    const email = `${unique("cookiesecure")}@cortix.test`;
    const password = "senha12345";
    await postJson<RegisterBody>("/api/auth/register", {
      name: "Cookie Secure Test",
      email,
      password,
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Barbearia Cookie",
      barbershopSlug: unique("cookie-shop"),
      city: "São Paulo, SP",
      plan: "starter",
    });

    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);
    // Two Set-Cookie headers (access + refresh) — headers.get() would join
    // them with a comma and corrupt the syntax, so use getSetCookie().
    const cookies = res.headers.getSetCookie();
    const accessCookie = cookies.find((c) => c.startsWith("cortix_access"));
    expect(accessCookie).toBeTruthy();
    expect(accessCookie!.toLowerCase()).not.toContain("secure");
  });
});

describe("GET /api/auth/me", () => {
  it("returns the session user when a valid bearer token is sent", async () => {
    const email = `${unique("me")}@cortix.test`;
    const register = await postJson<RegisterBody>("/api/auth/register", {
      name: "Me Test",
      email,
      password: "senha12345",
      phone: "11999999999",
      cnpj: uniqueCnpj(),
      barbershopName: "Barbearia Me",
      barbershopSlug: unique("me-shop"),
      city: "São Paulo, SP",
      plan: "starter",
    });

    const { status, body } = await getJson<MeBody>("/api/auth/me", register.body.accessToken);
    expect(status).toBe(200);
    expect(body.email).toBe(email);
  });

  it("returns 401 without a token", async () => {
    const { status } = await getJson<MeBody>("/api/auth/me");
    expect(status).toBe(401);
  });
});
