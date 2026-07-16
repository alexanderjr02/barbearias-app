"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Upload, Sparkles, Check, Wand2, Loader2, ImageIcon, Bell, Calendar, Scissors, Film, Blend, ZoomIn, Activity, Ban, Plus } from "lucide-react";
import { apiGet, apiPatch, apiUpload } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface Shop {
  name?: string;
  primaryColor?: string;
  themePreset?: string | null;
  themeMode?: string | null;
  appTagline?: string | null;
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
const EFFECTS = [
  { id: "none", label: "Nenhum", icon: Ban },
  { id: "zoom", label: "Zoom lento", icon: ZoomIn },
  { id: "pulse", label: "Brilho pulsante", icon: Activity },
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

export default function AppearancePage() {
  const queryClient = useQueryClient();
  const { data: shop } = useQuery({ queryKey: ["barbershop"], queryFn: () => apiGet<Shop>("/api/barbershop") });

  const [name, setName] = useState("Minha Barbearia");
  const [tagline, setTagline] = useState("Sua barbearia, no estilo certo.");
  const [accent, setAccent] = useState("#F59E0B");
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [preset, setPreset] = useState("midnight");
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [tab, setTab] = useState<"login" | "home">("login");
  const [busy, setBusy] = useState<"logo" | "cover" | null>(null);
  const [bgType, setBgType] = useState<"gradient" | "image" | "video">("gradient");
  const [bgVideo, setBgVideo] = useState("");
  const [bgDim, setBgDim] = useState(35);
  const [bgBlur, setBgBlur] = useState(0);
  const [bgGradient, setBgGradient] = useState(true);
  const [bgEffect, setBgEffect] = useState<"none" | "zoom" | "pulse">("none");

  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const [seeded, setSeeded] = useState(false);
  if (shop && !seeded) {
    setSeeded(true);
    if (shop.name) setName(shop.name);
    if (shop.appTagline) setTagline(shop.appTagline);
    if (shop.primaryColor) setAccent(shop.primaryColor);
    if (shop.themeMode === "light" || shop.themeMode === "dark") setMode(shop.themeMode);
    if (shop.themePreset) setPreset(shop.themePreset);
    if (shop.logo) setLogo(shop.logo);
    if (shop.coverImage) setCover(shop.coverImage);
    if (shop.bgType === "gradient" || shop.bgType === "image" || shop.bgType === "video") setBgType(shop.bgType);
    if (shop.bgVideo) setBgVideo(shop.bgVideo);
    if (typeof shop.bgDim === "number") setBgDim(shop.bgDim);
    if (typeof shop.bgBlur === "number") setBgBlur(shop.bgBlur);
    if (typeof shop.bgGradient === "boolean") setBgGradient(shop.bgGradient);
    if (shop.bgEffect === "zoom" || shop.bgEffect === "pulse" || shop.bgEffect === "none") setBgEffect(shop.bgEffect);
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
          toast.success("Cores extraídas da sua logo!");
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
        name, appTagline: tagline, primaryColor: accent, themeMode: mode, themePreset: preset,
        bgType, bgVideo, bgDim, bgBlur, bgGradient, bgEffect,
        ...(logo ? { logo } : {}),
        ...(cover ? { coverImage: cover } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      toast.success("Aparência salva! O app já reflete sua marca.");
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

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes cortix-kb { 0%{transform:scale(1.06)} 100%{transform:scale(1.22)} }
        @keyframes cortix-pg { 0%,100%{opacity:.4} 50%{opacity:.95} }
        .anim-zoom { animation: cortix-kb 16s ease-in-out infinite alternate; }
        .anim-pulse { animation: cortix-pg 3.5s ease-in-out infinite; }
      `}</style>

      <PageHeader icon={Palette} title="Aparência do app" subtitle="Personalize com a sua marca — sem deixar feio, nunca" />

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        {/* Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Estilo base</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESETS.map((ps) => {
                const active = preset === ps.id;
                return (
                  <button key={ps.id} onClick={() => { setPreset(ps.id); setMode(ps.mode as "dark" | "light"); setAccent(ps.accent); }}
                    className={`relative rounded-2xl p-3 border text-left transition-all ${active ? "border-white/40 ring-2 ring-white/20" : "border-zinc-800 hover:border-zinc-700"}`}
                    style={{ background: ps.mode === "light" ? "#F5F3EF" : "#111016" }}>
                    <div className="flex gap-1 mb-6">
                      <span className="w-4 h-4 rounded-full" style={{ background: ps.accent }} />
                      <span className="w-4 h-4 rounded-full" style={{ background: ps.mode === "light" ? "#fff" : "#2A2730" }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: ps.mode === "light" ? "#1A1A1A" : "#fff" }}>{ps.name}</span>
                    {active && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center"><Check className="w-3 h-3 text-black" /></span>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Logo + auto palette */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5" /> Logo (extrai as cores automaticamente)</h3>
            <div className="flex items-center gap-4">
              <button onClick={() => logoInput.current?.click()} className="w-20 h-20 rounded-2xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900 flex items-center justify-center overflow-hidden bg-cover bg-center transition-colors" style={logo ? { backgroundImage: `url(${logo})` } : undefined}>
                {busy === "logo" ? <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" /> : !logo && <Upload className="w-5 h-5 text-zinc-600" />}
              </button>
              <div className="flex-1">
                <p className="text-sm text-zinc-300">Envie a logo da barbearia</p>
                <p className="text-xs text-zinc-500 mt-0.5">PNG/JPG. A cor de destaque é sugerida a partir dela.</p>
                {suggested.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-zinc-500">da logo:</span>
                    {suggested.map((c) => (
                      <button key={c} onClick={() => setAccent(c)} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${accent.toLowerCase() === c.toLowerCase() ? "border-white" : "border-transparent"}`} style={{ background: c }} title={c} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload("logo", e.target.files[0])} />
          </section>

          {/* Accent */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Cor de destaque</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {SWATCHES.map((c) => (
                <button key={c} onClick={() => setAccent(c)} className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${accent.toLowerCase() === c.toLowerCase() ? "border-white scale-110" : "border-transparent"}`} style={{ background: c }} />
              ))}
              <label className="w-9 h-9 rounded-full border border-zinc-700 flex items-center justify-center cursor-pointer relative overflow-hidden" style={{ background: accent }}>
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Palette className="w-4 h-4" style={{ color: contrastText(accent) }} />
              </label>
              <span className="text-xs text-zinc-500 ml-1 font-mono">{accent.toUpperCase()}</span>
            </div>
          </section>

          {/* Background & effects */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Blend className="w-3.5 h-3.5" /> Fundo do login &amp; efeitos</h3>
            <div className="flex gap-2 mb-4">
              {([["gradient", "Gradiente", Sparkles], ["image", "Imagem", ImageIcon], ["video", "Vídeo", Film]] as const).map(([id, label, Icon]) => (
                <button key={id} onClick={() => setBgType(id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all ${bgType === id ? "border-white/40 bg-white/5 text-white" : "border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {bgType === "gradient" && <p className="text-xs text-zinc-500 mb-4">Um gradiente elegante gerado a partir da sua cor de destaque.</p>}
            {bgType === "image" && (
              <button onClick={() => coverInput.current?.click()} className="w-full h-24 rounded-2xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900 flex items-center justify-center overflow-hidden bg-cover bg-center transition-colors mb-4" style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
                {busy === "cover" ? <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" /> : !cover && <span className="text-xs text-zinc-500 flex items-center gap-1.5"><Upload className="w-4 h-4" /> Enviar imagem de fundo</span>}
              </button>
            )}
            {bgType === "video" && (
              <div className="mb-4">
                <input value={bgVideo} onChange={(e) => setBgVideo(e.target.value)} placeholder="Cole o link de um vídeo .mp4" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600" />
                <p className="text-xs text-zinc-500 mt-1.5">Um vídeo curto em loop (ex: barbearia em movimento). Dica: mantenha leve.</p>
              </div>
            )}

            {bgType !== "gradient" && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Escurecer</span><span>{bgDim}%</span></div>
                  <input type="range" min="0" max="80" value={bgDim} onChange={(e) => setBgDim(Number(e.target.value))} style={rangeStyle} className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Desfoque</span><span>{bgBlur}px</span></div>
                  <input type="range" min="0" max="16" value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} style={rangeStyle} className="w-full" />
                </div>
                <button onClick={() => setBgGradient(!bgGradient)} className="flex items-center justify-between w-full pt-1">
                  <span className="text-sm text-zinc-300">Sombra gradiente <span className="text-zinc-500 text-xs">(legibilidade)</span></span>
                  <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${bgGradient ? "bg-emerald-500/80" : "bg-zinc-700"}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${bgGradient ? "translate-x-5" : ""}`} />
                  </span>
                </button>
              </div>
            )}

            {/* Effect / animation */}
            <div className="mt-4">
              <p className="text-xs text-zinc-400 mb-2">Animação</p>
              <div className="flex gap-2">
                {EFFECTS.map((ef) => {
                  const Icon = ef.icon;
                  const active = bgEffect === ef.id;
                  return (
                    <button key={ef.id} onClick={() => setBgEffect(ef.id)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-medium transition-all ${active ? "border-white/40 bg-white/5 text-white" : "border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
                      <Icon className="w-4 h-4" /> {ef.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload("cover", e.target.files[0])} />
          </section>

          {/* Texts */}
          <section className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Frase do login</label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600" />
            </div>
          </section>

          <button onClick={() => save.mutate()} disabled={save.isPending} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Salvar aparência
          </button>
        </div>

        {/* Live phone preview */}
        <div className="lg:sticky lg:top-6">
          <div className="flex items-center justify-center gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-full p-1 w-fit mx-auto">
            {(["login", "home"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${tab === t ? "bg-white text-black" : "text-zinc-400"}`}>
                {t === "login" ? "Login" : "Início"}
              </button>
            ))}
          </div>

          <div className="mx-auto w-[280px] h-[580px] rounded-[2.6rem] border-[6px] border-zinc-800 bg-black shadow-2xl shadow-black/50 overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-zinc-800 rounded-b-2xl z-20" />

            {tab === "login" ? (
              <div className="w-full h-full relative overflow-hidden" style={{ background: p.bg, color: loginText }}>
                <div className="absolute inset-0">
                  {bgType === "video" && bgVideo ? (
                    <video key={bgVideo} src={bgVideo} autoPlay muted loop playsInline className={`absolute inset-0 w-full h-full object-cover ${mediaAnim}`} style={{ filter: `blur(${bgBlur}px)` }} />
                  ) : bgType === "image" && cover ? (
                    <div className={`absolute inset-0 bg-cover bg-center ${mediaAnim}`} style={{ backgroundImage: `url(${cover})`, filter: `blur(${bgBlur}px)` }} />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 50% 0%, ${accent}44, transparent 60%), ${p.bg}` }} />
                  )}
                  {hasMedia && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${bgDim / 100})` }} />}
                  {bgGradient && <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${p.bg} 2%, transparent 45%)` }} />}
                  <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full ${bgEffect === "pulse" ? "anim-pulse" : ""}`} style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }} />
                  <div className="absolute inset-0" style={{ boxShadow: "inset 0 -60px 60px rgba(0,0,0,0.35)" }} />
                </div>

                <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-cover bg-center flex items-center justify-center text-base font-black" style={{ background: logo ? undefined : accent, backgroundImage: logo ? `url(${logo})` : undefined, color: onAccent, boxShadow: `0 10px 30px ${accent}66` }}>
                    {!logo && brandInitials}
                  </div>
                  <p className="mt-4 text-lg font-black leading-tight text-center">Bem-vindo de volta</p>
                  <p className="text-[11px] mt-1 text-center" style={{ color: loginMuted }}>{tagline}</p>
                  <div className="w-full mt-5 space-y-2">
                    <div className="h-8 rounded-xl flex items-center justify-center gap-2 text-[11px] font-medium" style={{ background: "#fff", color: "#111" }}>
                      <span className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-red-500" /> Continuar com Google
                    </div>
                    <div className="h-8 rounded-xl flex items-center justify-center text-[11px] font-medium" style={{ background: hasMedia ? "rgba(255,255,255,0.12)" : p.surface, color: loginText, border: `1px solid ${hasMedia ? "rgba(255,255,255,0.15)" : p.border}` }}>
                      Continuar com Apple
                    </div>
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="flex-1 h-px" style={{ background: hasMedia ? "rgba(255,255,255,0.2)" : p.border }} />
                      <span className="text-[10px]" style={{ color: loginMuted }}>ou</span>
                      <span className="flex-1 h-px" style={{ background: hasMedia ? "rgba(255,255,255,0.2)" : p.border }} />
                    </div>
                    <div className="h-8 rounded-xl flex items-center px-3 text-[11px]" style={{ background: loginField, color: loginMuted }}>E-mail</div>
                    <div className="h-8 rounded-xl flex items-center px-3 text-[11px]" style={{ background: loginField, color: loginMuted }}>Senha</div>
                    <div className="text-right"><span className="text-[10px] font-medium" style={{ color: hasMedia ? "#fff" : accent }}>Esqueceu a senha?</span></div>
                    <div className="h-9 rounded-xl flex items-center justify-center text-xs font-bold" style={{ background: accent, color: onAccent, boxShadow: `0 8px 22px ${accent}55` }}>Entrar</div>
                  </div>
                  <p className="text-[10px] mt-3" style={{ color: loginMuted }}>Novo por aqui? <span style={{ color: hasMedia ? "#fff" : accent, fontWeight: 700 }}>Criar conta</span></p>
                </div>
              </div>
            ) : (
              /* Home — faithful to the real client app */
              <div className="w-full h-full flex flex-col relative" style={{ background: p.bg, color: p.text }}>
                <div className="px-4 pt-9 pb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: p.muted }}>Boa tarde,</p>
                    <p className="text-lg font-black leading-tight">Você</p>
                  </div>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: p.field, color: p.muted }}>V</div>
                </div>
                {/* Next appointment card */}
                <div className="px-4 mt-2">
                  <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
                    <p className="text-[10px] font-black tracking-wide" style={{ color: onAccent, opacity: 0.85 }}>PRÓXIMO · EM 2H</p>
                    <p className="text-base font-black mt-1" style={{ color: onAccent }}>{name}</p>
                    <p className="text-[11px]" style={{ color: onAccent, opacity: 0.85 }}>Corte + Barba · com Rafael</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold" style={{ color: onAccent }}>Hoje · 15:30</span>
                      <span className="text-[11px]" style={{ color: onAccent, opacity: 0.8 }}>R$ 55,00</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg" style={{ background: onAccent === "#000000" ? "#00000018" : "#ffffff22", color: onAccent }}>Cancelar</span>
                      <span className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg" style={{ background: onAccent === "#000000" ? "#00000030" : "#ffffff33", color: onAccent }}>Remarcar</span>
                    </div>
                  </div>
                </div>
                {/* Points strip */}
                <div className="px-4 mt-3 flex gap-3">
                  <div className="flex-1 rounded-xl p-3" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                    <p className="text-[10px]" style={{ color: p.muted }}>Meus pontos</p>
                    <p className="text-base font-black" style={{ color: accent }}>240</p>
                  </div>
                  <div className="flex-1 rounded-xl p-3" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                    <p className="text-[10px]" style={{ color: p.muted }}>Assinatura</p>
                    <p className="text-sm font-bold">Clube VIP</p>
                  </div>
                </div>
                <p className="px-4 mt-4 text-xs font-semibold" style={{ color: p.muted }}>Meus agendamentos</p>
                <div className="px-4 mt-1 flex-1">
                  <div className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: p.border }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}22` }}><Scissors className="w-4 h-4" style={{ color: accent }} /></div>
                    <div className="flex-1"><p className="text-xs font-semibold">Corte</p><p className="text-[10px]" style={{ color: p.muted }}>12 mar · 10:00</p></div>
                    <Calendar className="w-4 h-4" style={{ color: p.muted }} />
                  </div>
                </div>
                {/* FAB */}
                <div className="absolute bottom-16 right-4 h-10 px-4 rounded-full flex items-center gap-1.5 text-sm font-bold shadow-lg" style={{ background: accent, color: onAccent }}>
                  <Plus className="w-4 h-4" /> Agendar
                </div>
                <div className="h-14 border-t flex items-center justify-around px-6" style={{ borderColor: p.border, background: p.surface }}>
                  <Calendar className="w-5 h-5" style={{ color: accent }} />
                  <Scissors className="w-5 h-5" style={{ color: p.muted }} />
                  <Bell className="w-5 h-5" style={{ color: p.muted }} />
                </div>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-zinc-600 mt-4">Prévia em tempo real — igual ao app</p>
        </div>
      </div>
    </div>
  );
}
