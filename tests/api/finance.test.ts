import { beforeAll, describe, expect, it } from "vitest";
import { getJson, postJson, registerBarbershop } from "../setup/client";

interface FinanceSummary {
  transactions: { id: string; type: string; amount: number }[];
  summary: { income: number; expenses: number; profit: number; serviceRevenue: number; manualIncome: number };
}

interface ErrorBody {
  error?: string;
}

describe("finance/transactions", () => {
  let accessToken: string;

  beforeAll(async () => {
    const shop = await registerBarbershop("finance");
    accessToken = shop.accessToken;
  });

  it("starts with a zeroed summary for a fresh barbershop", async () => {
    const { status, body } = await getJson<FinanceSummary>("/api/finance/transactions", accessToken);
    expect(status).toBe(200);
    expect(body.summary.income).toBe(0);
    expect(body.summary.expenses).toBe(0);
  });

  it("an INCOME transaction increases income and profit", async () => {
    const create = await postJson(
      "/api/finance/transactions",
      { type: "INCOME", category: "Produtos", description: "Venda de pomada", amount: 50 },
      accessToken
    );
    expect(create.status).toBe(201);

    const { body } = await getJson<FinanceSummary>("/api/finance/transactions", accessToken);
    expect(body.summary.income).toBe(50);
    expect(body.summary.manualIncome).toBe(50);
    expect(body.summary.profit).toBe(50);
  });

  it("an EXPENSE transaction increases expenses and reduces profit", async () => {
    await postJson(
      "/api/finance/transactions",
      { type: "EXPENSE", category: "Insumos", description: "Compra de shampoo", amount: 20 },
      accessToken
    );

    const { body } = await getJson<FinanceSummary>("/api/finance/transactions", accessToken);
    expect(body.summary.expenses).toBe(20);
    expect(body.summary.profit).toBe(30); // 50 income - 20 expense
  });

  it("rejects a transaction missing required fields", async () => {
    const { status, body } = await postJson<ErrorBody>(
      "/api/finance/transactions",
      { type: "INCOME", amount: 10 },
      accessToken
    );
    expect(status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("requires authentication", async () => {
    const { status } = await getJson<FinanceSummary>("/api/finance/transactions");
    expect(status).toBe(401);
  });
});
