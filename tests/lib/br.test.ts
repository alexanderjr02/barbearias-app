import { describe, it, expect } from "vitest";
import { isValidCnpj, isValidCpf, formatCnpj } from "../../src/lib/br";

// O cadastro de barbearia só conferia "tem 14 dígitos", então CNPJ inventado
// entrava — barbearia fantasma. Estes casos existem para o dígito verificador
// nunca mais sair sem querer.
describe("isValidCnpj", () => {
  it("aceita CNPJ real, com ou sem formatação", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
    // Empresas públicas, para o teste não depender de um número só.
    expect(isValidCnpj("47.960.950/0001-21")).toBe(true); // Magazine Luiza
    expect(isValidCnpj("33.000.167/0001-01")).toBe(true); // Petrobras
    expect(isValidCnpj("60.746.948/0001-12")).toBe(true); // Bradesco
  });

  it("rejeita os repetidos, que passam na conta mas não existem", () => {
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(isValidCnpj("11.111.111/1111-11")).toBe(false);
    expect(isValidCnpj("99999999999999")).toBe(false);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-91")).toBe(false);
  });

  it("rejeita tamanho errado e lixo", () => {
    expect(isValidCnpj("1122233300018")).toBe(false);
    expect(isValidCnpj("112223330001811")).toBe(false);
    expect(isValidCnpj("")).toBe(false);
    expect(isValidCnpj("abcdefghijklmn")).toBe(false);
  });

  it("formata para exibição", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("isValidCpf", () => {
  it("aceita CPF válido e rejeita repetido e dígito errado", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});
