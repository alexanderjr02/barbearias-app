import { describe, expect, it } from "vitest";
import { getJson, postJson, unique } from "../setup/client";

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
      barbershopName: "Barbearia Dup",
      barbershopSlug: unique("dup-shop"),
      plan: "starter",
    };

    const first = await postJson<RegisterBody>("/api/auth/register", payload);
    expect(first.status).toBe(201);

    const second = await postJson<RegisterBody>("/api/auth/register", {
      ...payload,
      barbershopSlug: unique("dup-shop-2"),
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
});

describe("POST /api/auth/login", () => {
  it("logs in with the correct credentials", async () => {
    const email = `${unique("login")}@cortix.test`;
    const password = "senha12345";
    await postJson<RegisterBody>("/api/auth/register", {
      name: "Login Test",
      email,
      password,
      barbershopName: "Barbearia Login",
      barbershopSlug: unique("login-shop"),
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
      barbershopName: "Barbearia Wrongpw",
      barbershopSlug: unique("wrongpw-shop"),
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
});

describe("GET /api/auth/me", () => {
  it("returns the session user when a valid bearer token is sent", async () => {
    const email = `${unique("me")}@cortix.test`;
    const register = await postJson<RegisterBody>("/api/auth/register", {
      name: "Me Test",
      email,
      password: "senha12345",
      barbershopName: "Barbearia Me",
      barbershopSlug: unique("me-shop"),
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
