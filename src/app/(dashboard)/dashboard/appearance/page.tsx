"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Upload, Check, Loader2, Bell, Scissors, Bot, Plus, Mail, Lock, RotateCcw, AlertTriangle, Home, Gift, Award, SlidersHorizontal, User, Trash2 } from "lucide-react";
import { apiGet, apiPatch, apiUpload } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface Shop {
  name?: string;
  primaryColor?: string;
  themePreset?: string | null;
  themeMode?: string | null;
  appTagline?: string | null;
  appFont?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  bgType?: string | null;
  bgVideo?: string | null;
  bgDim?: number | null;
  bgBlur?: number | null;
  bgGradient?: boolean | null;
  bgEffect?: string | null;
}

const PRESETS = [
  { id: "midnight", name: "Meia-noite", mode: "dark", accent: "#F59E0B" },
  { id: "graphite", name: "Grafite", mode: "dark", accent: "#3B82F6" },
  { id: "neon", name: "Neon", mode: "dark", accent: "#22D3AA" },
  { id: "classic", name: "Clássico", mode: "light", accent: "#B08D57" },
];
const SWATCHES = ["#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#3B82F6", "#06B6D4", "#22D3AA", "#84CC16", "#F97316", "#14B8A6"];

// A prévia usa a fonte de verdade, carregada do Google Fonts, senão escolher
// tipografia seria escolher no escuro. O app aplica a mesma família.
const FONTS = [
  { id: "outfit", name: "Outfit", css: "'Outfit', sans-serif", note: "A fonte da marca rukz" },
  { id: "inter", name: "Inter", css: "'Inter', sans-serif", note: "Neutra, some e deixa o conteúdo falar" },
  { id: "poppins", name: "Poppins", css: "'Poppins', sans-serif", note: "Redonda e amigável" },
  { id: "playfair", name: "Playfair Display", css: "'Playfair Display', serif", note: "Serifada, ar de barbearia clássica" },
  { id: "oswald", name: "Oswald", css: "'Oswald', sans-serif", note: "Condensada, pega firme nos títulos" },
] as const;
type FontId = (typeof FONTS)[number]["id"];

const EFFECTS = [
  { id: "none", label: "Nenhuma" },
  { id: "zoom", label: "Zoom lento" },
  { id: "pulse", label: "Brilho pulsante" },
] as const;

const BGS = [
  { id: "solid", label: "Cor sólida", note: "Só o fundo do tema, sem brilho nenhum" },
  { id: "gradient", label: "Brilho da marca", note: "Um halo suave na sua cor de destaque" },
  { id: "image", label: "Foto", note: "Uma foto da sua barbearia atrás do login" },
  { id: "video", label: "Vídeo", note: "Um clipe curto em loop" },
] as const;

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
function contrastText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000000" : "#ffffff";
}
// Contraste WCAG entre duas cores (1 a 21). Serve pra avisar quando a cor
// escolhida some no fundo, a marca do gestor não pode deixar o texto ilegível.
function relLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(a: string, b: string) {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function extractPalette(url: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = 64;
        const h = Math.max(1, Math.round((64 * img.height) / img.width));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve([]);
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const buckets = new Map<string, { c: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 200) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (sat < 0.28 || lum < 30 || lum > 232) continue;
          const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const e = buckets.get(key) || { c: 0, r: 0, g: 0, b: 0 };
          e.c++; e.r += r; e.g += g; e.b += b;
          buckets.set(key, e);
        }
        const top = [...buckets.values()].sort((a, b) => b.c - a.c).slice(0, 5);
        resolve(top.map((e) => rgbToHex(Math.round(e.r / e.c), Math.round(e.g / e.c), Math.round(e.b / e.c))));
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = url;
  });
}

/** Bloco de edição: título, explicação curta e o controle. */
function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-bold text-white">{titulo}</h3>
      {descricao && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AppearancePage() {
  const queryClient = useQueryClient();
  const { data: shop } = useQuery({ queryKey: ["barbershop"], queryFn: () => apiGet<Shop>("/api/barbershop") });

  const [name, setName] = useState("Minha Barbearia");
  const [tagline, setTagline] = useState("Sua barbearia, no estilo certo.");
  const [accent, setAccent] = useState("#F59E0B");
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [preset, setPreset] = useState("midnight");
  const [font, setFont] = useState<FontId>("outfit");
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [tab, setTab] = useState<"login" | "home">("login");
  const [busy, setBusy] = useState<"logo" | "cover" | null>(null);
  const [bgType, setBgType] = useState<"solid" | "gradient" | "image" | "video">("gradient");
  const [bgVideo, setBgVideo] = useState("");
  const [bgDim, setBgDim] = useState(35);
  const [bgBlur, setBgBlur] = useState(0);
  const [bgGradient, setBgGradient] = useState(true);
  const [bgEffect, setBgEffect] = useState<"none" | "zoom" | "pulse">("none");
  // Guarda o que veio do servidor pra saber se há algo por salvar. Sem isto o
  // gestor sai da tela sem perceber que mexeu e não salvou.
  const [salvo, setSalvo] = useState("");

  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const atual = JSON.stringify({ name, tagline, accent, mode, preset, font, logo, cover, bgType, bgVideo, bgDim, bgBlur, bgGradient, bgEffect });
  const sujo = salvo !== "" && atual !== salvo;

  const [seeded, setSeeded] = useState(false);
  if (shop && !seeded) {
    setSeeded(true);
    const n = shop.name ?? "Minha Barbearia";
    const tg = shop.appTagline ?? "Sua barbearia, no estilo certo.";
    const ac = shop.primaryColor ?? "#F59E0B";
    const md = shop.themeMode === "light" ? "light" : "dark";
    const pr = shop.themePreset ?? "midnight";
    const ft = (FONTS.find((f) => f.id === shop.appFont)?.id ?? "outfit") as FontId;
    const lg = shop.logo ?? null;
    const cv = shop.coverImage ?? null;
    const bt = (["solid", "gradient", "image", "video"].includes(shop.bgType ?? "") ? shop.bgType : "gradient") as typeof bgType;
    const bv = shop.bgVideo ?? "";
    const bd = typeof shop.bgDim === "number" ? shop.bgDim : 35;
    const bb = typeof shop.bgBlur === "number" ? shop.bgBlur : 0;
    const bg = typeof shop.bgGradient === "boolean" ? shop.bgGradient : true;
    const be = (shop.bgEffect === "zoom" || shop.bgEffect === "pulse" ? shop.bgEffect : "none") as typeof bgEffect;
    setName(n); setTagline(tg); setAccent(ac); setMode(md); setPreset(pr); setFont(ft);
    setLogo(lg); setCover(cv); setBgType(bt); setBgVideo(bv); setBgDim(bd); setBgBlur(bb);
    setBgGradient(bg); setBgEffect(be);
    setSalvo(JSON.stringify({ name: n, tagline: tg, accent: ac, mode: md, preset: pr, font: ft, logo: lg, cover: cv, bgType: bt, bgVideo: bv, bgDim: bd, bgBlur: bb, bgGradient: bg, bgEffect: be }));
  }

  async function upload(kind: "logo" | "cover", file: File) {
    setBusy(kind);
    try {
      const { url } = await apiUpload(file);
      if (kind === "logo") {
        setLogo(url);
        const pal = await extractPalette(url);
        if (pal.length) {
          setSuggested(pal);
          setAccent(pal[0]);
          toast.success("Cores extraídas da sua logo");
        }
      } else {
        setCover(url);
        setBgType("image");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(null);
    }
  }

  const save = useMutation({
    mutationFn: () =>
      apiPatch("/api/barbershop", {
        name, appTagline: tagline, primaryColor: accent, themeMode: mode, themePreset: preset, appFont: font,
        bgType, bgVideo, bgDim, bgBlur, bgGradient, bgEffect,
        // String vazia (não ausência) para o servidor conseguir LIMPAR: quando
        // o gestor remove a logo/capa no reset, precisa apagar de verdade, não
        // só deixar de enviar.
        logo: logo ?? "",
        coverImage: cover ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      setSalvo(atual);
      toast.success("Aparência salva. O app já reflete sua marca.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const p = mode === "light"
    ? { bg: "#F5F3EF", surface: "#FFFFFF", text: "#1A1A1A", muted: "#6B7280", border: "#E7E3DC", field: "#F0EDE7" }
    : { bg: "#0B0A0F", surface: "#17151C", text: "#FFFFFF", muted: "#8A8A93", border: "#26232D", field: "#1C1A22" };
  const onAccent = contrastText(accent);
  const brandInitials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const hasMedia = (bgType === "image" && !!cover) || (bgType === "video" && !!bgVideo);
  const loginText = hasMedia ? "#FFFFFF" : p.text;
  const loginMuted = hasMedia ? "rgba(255,255,255,0.7)" : p.muted;
  const loginField = hasMedia ? "rgba(255,255,255,0.12)" : p.field;
  const rangeStyle = { accentColor: accent } as React.CSSProperties;
  const mediaAnim = bgEffect === "zoom" ? "anim-zoom" : "scale-110";
  const fontCss = FONTS.find((f) => f.id === font)?.css ?? FONTS[0].css;
  // Aviso de legibilidade: a cor da marca também vira TEXTO (link "Esqueceu a
  // senha?", "Criar conta", número de pontos). Se ela some no fundo, avisa.
  const lowContrast = contrastRatio(accent, p.bg) < 3;

  const resetDefaults = () => {
    setAccent("#D4AF37");
    setMode("dark");
    setPreset("midnight");
    setFont("outfit");
    setBgType("gradient");
    setBgVideo("");
    setBgDim(35);
    setBgBlur(0);
    setBgGradient(true);
    setBgEffect("none");
    setTagline("Sua barbearia, no estilo certo.");
    // Restaurar o padrão é voltar à rukz de fábrica, inclui tirar a logo e
    // a capa da barbearia, senão "padrão" ainda ficava com a marca de quem
    // estava editando.
    setLogo(null);
    setCover(null);
    setSuggested([]);
    toast.success("Voltou ao padrão rukz. Salve para aplicar.");
  };

  return (
    <div className="space-y-6 pb-24">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Inter:wght@400;700;900&family=Poppins:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Oswald:wght@400;700&display=swap" />
      <style>{`
        @keyframes rukz-kb { 0%{transform:scale(1.06)} 100%{transform:scale(1.22)} }
        @keyframes rukz-pg { 0%,100%{opacity:.4} 50%{opacity:.95} }
        .anim-zoom { animation: rukz-kb 16s ease-in-out infinite alternate; }
        .anim-pulse { animation: rukz-pg 3.5s ease-in-out infinite; }
      `}</style>

      <PageHeader title="Aparência do app" subtitle="Personalize com a sua marca, sem deixar feio nunca" />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Bloco titulo="Estilo base" descricao="O ponto de partida. Ajuste o resto depois de escolher.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRESETS.map((ps) => {
                const active = preset === ps.id;
                return (
                  <button
                    key={ps.id}
                    onClick={() => { setPreset(ps.id); setMode(ps.mode as "dark" | "light"); setAccent(ps.accent); }}
                    className={`relative rounded-xl border p-3 text-left transition-colors ${active ? "border-amber-500" : "border-zinc-800 hover:border-zinc-700"}`}
                    style={{ background: ps.mode === "light" ? "#F5F3EF" : "#111016" }}
                  >
                    <div className="mb-6 flex gap-1">
                      <span className="h-4 w-4 rounded-full" style={{ background: ps.accent }} />
                      <span className="h-4 w-4 rounded-full" style={{ background: ps.mode === "light" ? "#fff" : "#2A2730" }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: ps.mode === "light" ? "#1A1A1A" : "#fff" }}>{ps.name}</span>
                    {active && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500"><Check className="h-3 w-3 text-black" /></span>}
                  </button>
                );
              })}
            </div>
          </Bloco>

          <Bloco titulo="Logo" descricao="Sem logo, o app usa o símbolo do rukz na sua cor. Ao enviar, sugerimos as cores tiradas dela.">
            <div className="flex items-center gap-4">
              <button
                onClick={() => logoInput.current?.click()}
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 bg-cover bg-center transition-colors hover:border-zinc-500"
                style={logo ? { backgroundImage: `url(${logo})` } : undefined}
              >
                {busy === "logo" ? <Loader2 className="h-5 w-5 animate-spin text-zinc-500" /> : !logo && <Upload className="h-5 w-5 text-zinc-600" />}
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => logoInput.current?.click()} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white">
                  {logo ? "Trocar logo" : "Enviar logo"}
                </button>
                {logo && (
                  <button onClick={() => { setLogo(null); setSuggested([]); }} className="ml-2 inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-400">
                    <Trash2 className="h-3 w-3" /> Remover
                  </button>
                )}
                {suggested.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[11px] text-zinc-600">Da sua logo:</span>
                    {suggested.map((c) => (
                      <button key={c} onClick={() => setAccent(c)} className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${accent.toLowerCase() === c.toLowerCase() ? "border-white" : "border-transparent"}`} style={{ background: c }} title={c} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload("logo", e.target.files[0])} />
          </Bloco>

          <Bloco titulo="Cor de destaque" descricao="Ela pinta os botões, os destaques e os números que importam.">
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button key={c} onClick={() => setAccent(c)} className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${accent.toLowerCase() === c.toLowerCase() ? "scale-110 border-white" : "border-transparent"}`} style={{ background: c }} />
              ))}
              <label className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-zinc-700" style={{ background: accent }}>
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                <Palette className="h-4 w-4" style={{ color: contrastText(accent) }} />
              </label>
              <span className="ml-1 font-mono text-xs text-zinc-500">{accent.toUpperCase()}</span>
            </div>
            {lowContrast && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                <p className="text-[11px] leading-relaxed text-amber-200/90">
                  Essa cor tem pouco contraste com o fundo {mode === "light" ? "claro" : "escuro"}. Links e textos na cor da marca podem ficar difíceis de ler. Um tom mais {mode === "light" ? "escuro" : "claro"} lê melhor.
                </p>
              </div>
            )}
          </Bloco>

          {/* Cada opção é escrita na própria fonte: escolher tipografia lendo
              o nome dela em outra letra não diz nada. */}
          <Bloco titulo="Tipografia" descricao="A letra do app inteiro. Cada opção aparece escrita nela mesma.">
            <div className="grid gap-2 sm:grid-cols-2">
              {FONTS.map((f) => {
                const active = font === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFont(f.id)}
                    className={`rounded-xl border p-3.5 text-left transition-colors ${active ? "border-amber-500 bg-amber-500/[0.06]" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-lg font-bold text-white" style={{ fontFamily: f.css }}>{name || "Barbearia"}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-amber-400" />}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      <span className="font-semibold text-zinc-400">{f.name}</span>. {f.note}
                    </p>
                  </button>
                );
              })}
            </div>
          </Bloco>

          <Bloco titulo="Fundo do login" descricao="O que aparece atrás da tela de entrada do seu app.">
            <div className="grid gap-2 sm:grid-cols-2">
              {BGS.map((b) => {
                const active = bgType === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setBgType(b.id)}
                    className={`rounded-xl border p-3.5 text-left transition-colors ${active ? "border-amber-500 bg-amber-500/[0.06]" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{b.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-amber-400" />}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{b.note}</p>
                  </button>
                );
              })}
            </div>

            {bgType === "image" && (
              <button
                onClick={() => coverInput.current?.click()}
                className="mt-4 flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 bg-cover bg-center transition-colors hover:border-zinc-500"
                style={cover ? { backgroundImage: `url(${cover})` } : undefined}
              >
                {busy === "cover" ? <Loader2 className="h-5 w-5 animate-spin text-zinc-500" /> : !cover && <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Upload className="h-4 w-4" /> Enviar foto de fundo</span>}
              </button>
            )}
            {bgType === "video" && (
              <div className="mt-4">
                <input value={bgVideo} onChange={(e) => setBgVideo(e.target.value)} placeholder="Cole o link de um vídeo .mp4" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-zinc-600 focus:outline-none" />
                <p className="mt-1.5 text-xs text-zinc-500">Um clipe curto em loop, por exemplo a barbearia em movimento. Mantenha o arquivo leve.</p>
              </div>
            )}

            {hasMedia && (
              <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-400"><span>Escurecer</span><span>{bgDim}%</span></div>
                  <input type="range" min="0" max="80" value={bgDim} onChange={(e) => setBgDim(Number(e.target.value))} style={rangeStyle} className="w-full" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-400"><span>Desfoque</span><span>{bgBlur}px</span></div>
                  <input type="range" min="0" max="16" value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} style={rangeStyle} className="w-full" />
                </div>
                <button onClick={() => setBgGradient(!bgGradient)} className="flex w-full items-center justify-between pt-1">
                  <span className="text-sm text-zinc-300">Sombra no rodapé <span className="text-xs text-zinc-500">(deixa o texto legível)</span></span>
                  <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${bgGradient ? "bg-emerald-500/80" : "bg-zinc-700"}`}>
                    <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${bgGradient ? "translate-x-5" : ""}`} />
                  </span>
                </button>
                <div>
                  <p className="mb-2 text-xs text-zinc-400">Animação</p>
                  <div className="flex gap-2">
                    {EFFECTS.map((ef) => (
                      <button
                        key={ef.id}
                        onClick={() => setBgEffect(ef.id)}
                        className={`flex-1 rounded-xl border py-2 text-[11px] font-medium transition-colors ${bgEffect === ef.id ? "border-amber-500 text-white" : "border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}
                      >
                        {ef.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload("cover", e.target.files[0])} />
          </Bloco>

          <Bloco titulo="Textos" descricao="O nome que aparece no app e a frase abaixo dele no login.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-zinc-400">Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-zinc-600 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Frase do login</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-zinc-600 focus:outline-none" />
              </div>
            </div>
          </Bloco>

          <button onClick={resetDefaults} className="flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white">
            <RotateCcw className="h-4 w-4" /> Restaurar padrão rukz
          </button>
        </div>

        {/* Prévia ao vivo */}
        <div className="lg:sticky lg:top-6">
          <div className="mx-auto mb-4 flex w-fit items-center justify-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 p-1">
            {(["login", "home"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${tab === t ? "bg-white text-black" : "text-zinc-400"}`}>
                {t === "login" ? "Login" : "Início"}
              </button>
            ))}
          </div>

          <div className="relative mx-auto h-[580px] w-[280px] overflow-hidden rounded-[2.6rem] border-[6px] border-zinc-800 bg-black shadow-2xl shadow-black/50" style={{ fontFamily: fontCss }}>
            <div className="absolute left-1/2 top-0 z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-800" />

            {tab === "login" ? (
              <div className="relative h-full w-full overflow-hidden" style={{ background: p.bg, color: loginText }}>
                <div className="absolute inset-0">
                  {bgType === "video" && bgVideo ? (
                    <video key={bgVideo} src={bgVideo} autoPlay muted loop playsInline className={`absolute inset-0 h-full w-full object-cover ${mediaAnim}`} style={{ filter: `blur(${bgBlur}px)` }} />
                  ) : bgType === "image" && cover ? (
                    <div className={`absolute inset-0 bg-cover bg-center ${mediaAnim}`} style={{ backgroundImage: `url(${cover})`, filter: `blur(${bgBlur}px)` }} />
                  ) : bgType === "gradient" ? (
                    <div className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 50% 0%, ${accent}44, transparent 60%), ${p.bg}` }} />
                  ) : (
                    <div className="absolute inset-0" style={{ background: p.bg }} />
                  )}
                  {hasMedia && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${bgDim / 100})` }} />}
                  {hasMedia && bgGradient && <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${p.bg} 2%, transparent 45%)` }} />}
                  {bgType === "gradient" && (
                    <div className={`absolute -top-10 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full ${bgEffect === "pulse" ? "anim-pulse" : ""}`} style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }} />
                  )}
                </div>

                <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cover bg-center text-base font-black" style={{ background: logo ? undefined : accent, backgroundImage: logo ? `url(${logo})` : undefined, color: onAccent }}>
                    {!logo && brandInitials}
                  </div>
                  <p className="mt-4 text-center text-lg font-black leading-tight">Bem-vindo de volta</p>
                  <p className="mt-1 text-center text-[11px]" style={{ color: loginMuted }}>{tagline}</p>
                  <div className="mt-5 w-full space-y-2">
                    <div className="flex h-8 items-center justify-center gap-2 rounded-xl text-[11px] font-medium" style={{ background: "#fff", color: "#111" }}>
                      <span className="text-[12px] font-bold" style={{ color: "#4285F4" }}>G</span> Continuar com Google
                    </div>
                    <div className="flex h-8 items-center justify-center rounded-xl text-[11px] font-medium" style={{ background: hasMedia ? "rgba(255,255,255,0.12)" : p.surface, color: loginText, border: `1px solid ${hasMedia ? "rgba(255,255,255,0.15)" : p.border}` }}>
                      Continuar com Apple
                    </div>
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="h-px flex-1" style={{ background: hasMedia ? "rgba(255,255,255,0.2)" : p.border }} />
                      <span className="text-[10px]" style={{ color: loginMuted }}>ou</span>
                      <span className="h-px flex-1" style={{ background: hasMedia ? "rgba(255,255,255,0.2)" : p.border }} />
                    </div>
                    <div className="flex h-8 items-center gap-2 rounded-xl px-3 text-[11px]" style={{ background: loginField, color: loginMuted }}><Mail className="h-3 w-3" /> E-mail</div>
                    <div className="flex h-8 items-center gap-2 rounded-xl px-3 text-[11px]" style={{ background: loginField, color: loginMuted }}><Lock className="h-3 w-3" /> Senha</div>
                    <div className="text-right"><span className="text-[10px] font-medium" style={{ color: hasMedia ? "#fff" : accent }}>Esqueceu a senha?</span></div>
                    <div className="flex h-9 items-center justify-center rounded-xl text-xs font-bold" style={{ background: accent, color: onAccent }}>Entrar</div>
                  </div>
                  <p className="mt-3 text-[10px]" style={{ color: loginMuted }}>Novo por aqui? <span style={{ color: hasMedia ? "#fff" : accent, fontWeight: 700 }}>Criar conta</span></p>
                </div>
              </div>
            ) : (
              /* Início, na mesma ordem do app do cliente
                 (cliente_home_screen.dart): capa com a saudação, o lembrete de
                 corte, o próximo agendamento, o cartão de pontos e a lista de
                 próximos. A capa só aparece com fundo "Foto", como no app. */
              <div className="relative flex h-full w-full flex-col" style={{ background: p.bg, color: p.text }}>
                <div className="relative h-[110px] shrink-0">
                  {bgType === "image" && cover ? (
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }} />
                  ) : (
                    <div className="absolute inset-0" style={{ background: p.bg }} />
                  )}
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${p.bg}, transparent 70%)` }} />
                  <div className="relative z-10 flex h-full items-end px-4 pb-3 pt-9">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px]" style={{ color: p.muted }}>Boa tarde,</p>
                      <p className="truncate text-xl font-black leading-tight">Lucas</p>
                    </div>
                    <Bell className="mb-1 mr-2 h-4 w-4" style={{ color: p.text }} />
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold" style={{ background: p.field, color: p.muted }}>L</div>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden px-4">
                  {/* Hora do corte, o lembrete que o app monta do histórico */}
                  <div className="flex items-center gap-2.5 rounded-2xl p-2.5" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}33` }}>
                      <Scissors className="h-4 w-4" style={{ color: accent }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">Hora do corte?</p>
                      <p className="text-[10px] leading-tight" style={{ color: p.muted }}>Você costuma cortar a cada 3 semanas, já faz 24 dias.</p>
                    </div>
                  </div>

                  <div className="mt-2.5 rounded-2xl p-3" style={{ background: accent }}>
                    <p className="text-[9px] font-black tracking-wide" style={{ color: onAccent, opacity: 0.8 }}>PRÓXIMO · EM 2H</p>
                    <p className="mt-0.5 text-sm font-black" style={{ color: onAccent }}>Corte + Barba</p>
                    <p className="text-[10px]" style={{ color: onAccent, opacity: 0.85 }}>com Rafael · Hoje 15:30</p>
                    <div className="mt-2.5 flex gap-2">
                      <span className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold" style={{ background: onAccent === "#000000" ? "#00000018" : "#ffffff22", color: onAccent }}>Cancelar</span>
                      <span className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold" style={{ background: onAccent === "#000000" ? "#00000030" : "#ffffff33", color: onAccent }}>Remarcar</span>
                    </div>
                  </div>

                  {/* Cartão de pontos: o número domina e a barra mostra quanto
                      falta pra próxima faixa, igual ao app. */}
                  <p className="mt-3 text-xs font-semibold" style={{ color: p.muted }}>Minha fidelidade</p>
                  <div className="mt-2 rounded-2xl p-3" style={{ background: `${accent}21`, border: `1px solid ${accent}47` }}>
                    <div className="flex items-center justify-between">
                      <span className="truncate text-[11px] font-semibold" style={{ color: p.muted }}>{name}</span>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: accent, color: onAccent }}>OURO</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-3xl font-black leading-none" style={{ color: accent }}>240</span>
                      <span className="text-[10px]" style={{ color: p.muted }}>pontos</span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: `${accent}2e` }}>
                      <div className="h-full rounded-full" style={{ width: "62%", background: accent }} />
                    </div>
                    <p className="mt-1.5 text-[10px]" style={{ color: p.muted }}>faltam 150 pts para Diamante</p>
                  </div>
                </div>

                {/* O assistente à esquerda e o Agendar à direita, na mesma linha */}
                <div className="absolute bottom-[74px] left-4 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: accent, color: onAccent }}>
                  <Bot className="h-5 w-5" />
                </div>
                <div className="absolute bottom-[74px] right-4 flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold" style={{ background: accent, color: onAccent }}>
                  <Plus className="h-4 w-4" /> Agendar
                </div>
                <div className="absolute inset-x-3 bottom-3">
                  <div className="flex items-center justify-around rounded-2xl px-3 py-2.5" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                    <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: `${accent}1f` }}><Home className="h-[18px] w-[18px]" style={{ color: accent }} /></div>
                    <Scissors className="h-[18px] w-[18px]" style={{ color: p.muted }} />
                    <Gift className="h-[18px] w-[18px]" style={{ color: p.muted }} />
                    <Award className="h-[18px] w-[18px]" style={{ color: p.muted }} />
                    <SlidersHorizontal className="h-[18px] w-[18px]" style={{ color: p.muted }} />
                    <User className="h-[18px] w-[18px]" style={{ color: p.muted }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-zinc-600">Prévia ao vivo, na mesma ordem do app do cliente</p>
        </div>
      </div>

      {/* Barra de salvar: aparece quando há mudança pendente, então o gestor
          nunca sai da tela achando que salvou. */}
      {sujo && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
            <p className="text-sm text-zinc-400">Você tem alterações não salvas.</p>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salvar aparência
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
