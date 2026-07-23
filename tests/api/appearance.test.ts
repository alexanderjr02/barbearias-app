import { describe, expect, it } from "vitest";
import { getJson, patchJson, registerBarbershop } from "../setup/client";

// Edição de aparência do app (cor, logo, capa, tema, fundo). Nasceu de dois
// bugs reais: remover a logo deixava o app com um tile em branco (guardava ""
// em vez de null), e o ícone do app não trocava ao mudar a logo (URL sem
// cache-busting). Estes testes travam o comportamento correto de cada campo —
// a porta por onde o gestor "quebra" a própria marca sem querer.

interface Shop {
  primaryColor?: string;
  logo?: string | null;
  coverImage?: string | null;
  appTagline?: string | null;
  bgType?: string | null;
  bgDim?: number | null;
  bgBlur?: number | null;
  name?: string;
  themeMode?: string | null;
}

async function setup(label: string) {
  const shop = await registerBarbershop(label);
  const read = () => getJson<Shop>(`/api/barbershop?slug=${shop.slug}`);
  const save = (body: Record<string, unknown>) => patchJson<Shop>("/api/barbershop", body, shop.accessToken);
  return { ...shop, read, save };
}

describe("aparência — logo e capa", () => {
  it("salva a logo e depois a remove (string vazia vira null, não '')", async () => {
    const s = await setup("ap-logo");

    let res = await s.save({ logo: "/uploads/minha-logo.png" });
    expect(res.status).toBe(200);
    expect((await s.read()).body.logo).toBe("/uploads/minha-logo.png");

    // O bug: mandar "" tem que LIMPAR (virar null), não guardar "" — que faria
    // o app tentar carregar uma imagem vazia e mostrar o tile só com a cor.
    res = await s.save({ logo: "" });
    expect(res.status).toBe(200);
    expect((await s.read()).body.logo).toBeNull();
  });

  it("remove a capa do mesmo jeito", async () => {
    const s = await setup("ap-capa");
    await s.save({ coverImage: "/uploads/capa.jpg" });
    expect((await s.read()).body.coverImage).toBe("/uploads/capa.jpg");
    await s.save({ coverImage: "" });
    expect((await s.read()).body.coverImage).toBeNull();
  });
});

describe("aparência — cor da marca", () => {
  it("aceita hex válido e guarda em maiúsculo", async () => {
    const s = await setup("ap-cor");
    const res = await s.save({ primaryColor: "#3b82f6" });
    expect(res.status).toBe(200);
    expect((await s.read()).body.primaryColor).toBe("#3B82F6");
  });

  it("aceita hex de 3 dígitos", async () => {
    const s = await setup("ap-cor3");
    await s.save({ primaryColor: "#0af" });
    expect((await s.read()).body.primaryColor).toBe("#0AF");
  });

  it("ignora cor inválida (não quebra o app nem o manifesto do PWA)", async () => {
    const s = await setup("ap-cor-ruim");
    await s.save({ primaryColor: "#3B82F6" });
    for (const ruim of ["azul", "#GGG", "rgb(1,2,3)", "#12", "123456", ""]) {
      const res = await s.save({ primaryColor: ruim });
      expect(res.status, `cor "${ruim}" não deveria dar erro`).toBe(200);
      // A cor válida anterior permanece — o lixo foi ignorado, não salvo.
      expect((await s.read()).body.primaryColor, `cor "${ruim}" não deveria ter sido salva`).toBe("#3B82F6");
    }
  });
});

describe("aparência — fundo e efeitos", () => {
  it("aceita bgType válido e ignora inválido", async () => {
    const s = await setup("ap-bg");
    await s.save({ bgType: "image" });
    expect((await s.read()).body.bgType).toBe("image");
    await s.save({ bgType: "hologram" });
    expect((await s.read()).body.bgType).toBe("image"); // inválido ignorado
  });

  it("trava o teto de escurecer e desfoque", async () => {
    const s = await setup("ap-range");
    await s.save({ bgDim: 9999, bgBlur: 9999 });
    const b = (await s.read()).body;
    expect(b.bgDim).toBeLessThanOrEqual(80);
    expect(b.bgBlur).toBeLessThanOrEqual(16);
  });

  it("ignora valores negativos", async () => {
    const s = await setup("ap-neg");
    await s.save({ bgDim: 40 });
    await s.save({ bgDim: -10 });
    expect((await s.read()).body.bgDim).toBe(40);
  });
});

describe("aparência — nome e frase", () => {
  it("não deixa o nome ficar vazio", async () => {
    const s = await setup("ap-nome");
    const original = (await s.read()).body.name;
    const res = await s.save({ name: "   " });
    expect(res.status).toBe(200);
    expect((await s.read()).body.name).toBe(original); // vazio ignorado
  });

  it("corta a frase do login em tamanho seguro", async () => {
    const s = await setup("ap-frase");
    await s.save({ appTagline: "x".repeat(500) });
    const tag = (await s.read()).body.appTagline ?? "";
    expect(tag.length).toBeLessThanOrEqual(140);
  });
});

describe("aparência — tema", () => {
  it("aceita light/dark e ignora valor estranho", async () => {
    const s = await setup("ap-tema");
    await s.save({ themeMode: "light" });
    expect((await s.read()).body.themeMode).toBe("light");
    await s.save({ themeMode: "rgb" });
    expect((await s.read()).body.themeMode).toBe("light");
  });
});

describe("aparência — salvar tudo junto não dá erro", () => {
  it("um payload completo do editor salva 200", async () => {
    const s = await setup("ap-tudo");
    const res = await s.save({
      name: "Barbearia Nova",
      appTagline: "Tradição e estilo",
      primaryColor: "#EF4444",
      themeMode: "dark",
      themePreset: "midnight",
      bgType: "gradient",
      bgVideo: "",
      bgDim: 35,
      bgBlur: 4,
      bgGradient: true,
      bgEffect: "pulse",
      logo: "/uploads/l.png",
      coverImage: "/uploads/c.jpg",
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const b = (await s.read()).body;
    expect(b.primaryColor).toBe("#EF4444");
    expect(b.name).toBe("Barbearia Nova");
    expect(b.bgType).toBe("gradient");
  });
});
