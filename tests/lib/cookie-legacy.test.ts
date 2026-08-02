import { describe, it, expect } from "vitest";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LEGACY_ACCESS_COOKIE,
  LEGACY_REFRESH_COOKIE,
  readCookieWithLegacy,
} from "../../src/lib/auth";

// Trava a migração do rebrand. Os cookies de sessão passaram de `cortix_*`
// para `rukz_*`; sem a leitura de reserva, o deploy do rebrand deslogaria toda
// pessoa que estivesse logada naquele momento. Se alguém apagar o fallback
// achando que é código morto, este teste quebra antes de virar incidente.
function fakeStore(entries: Record<string, string>) {
  return {
    get(name: string) {
      const value = entries[name];
      return value === undefined ? undefined : { value };
    },
  };
}

describe("cookies de sessão — migração da marca antiga", () => {
  it("usa o cookie novo quando ele existe", () => {
    const store = fakeStore({ [ACCESS_COOKIE]: "novo" });
    expect(readCookieWithLegacy(store, ACCESS_COOKIE, LEGACY_ACCESS_COOKIE)).toBe("novo");
  });

  it("aceita o cookie antigo quando só ele existe (não desloga no rebrand)", () => {
    const store = fakeStore({ [LEGACY_ACCESS_COOKIE]: "antigo" });
    expect(readCookieWithLegacy(store, ACCESS_COOKIE, LEGACY_ACCESS_COOKIE)).toBe("antigo");
  });

  it("prefere o novo quando os dois existem", () => {
    const store = fakeStore({ [ACCESS_COOKIE]: "novo", [LEGACY_ACCESS_COOKIE]: "antigo" });
    expect(readCookieWithLegacy(store, ACCESS_COOKIE, LEGACY_ACCESS_COOKIE)).toBe("novo");
  });

  it("devolve undefined quando não há nenhum", () => {
    expect(readCookieWithLegacy(fakeStore({}), ACCESS_COOKIE, LEGACY_ACCESS_COOKIE)).toBeUndefined();
  });

  it("vale igual para o refresh", () => {
    const store = fakeStore({ [LEGACY_REFRESH_COOKIE]: "antigo" });
    expect(readCookieWithLegacy(store, REFRESH_COOKIE, LEGACY_REFRESH_COOKIE)).toBe("antigo");
  });

  it("os nomes novos são os da marca rukz e os legados os antigos", () => {
    expect(ACCESS_COOKIE).toBe("rukz_access");
    expect(REFRESH_COOKIE).toBe("rukz_refresh");
    expect(LEGACY_ACCESS_COOKIE).toBe("cortix_access");
    expect(LEGACY_REFRESH_COOKIE).toBe("cortix_refresh");
  });
});
