"use client";

import { useEffect, useState } from "react";
import { Share, Plus, X, Download, Smartphone } from "lucide-react";

// Convite para instalar o app da barbearia na tela do celular.
//
// Por que isso existe: no Android o Chrome oferece instalar sozinho, mas no
// iPhone o cliente precisa abrir no Safari, tocar em compartilhar e escolher
// "Adicionar à Tela de Início" — e a maioria não sabe fazer isso. Sem esta
// telinha, o app com a marca da barbearia simplesmente não é instalado por
// quem mais importa: o cliente final.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "hidden" | "android" | "ios-safari" | "ios-other";

export function InstallAppPrompt({ shopName, color = "#D4AF37", slug }: { shopName: string; color?: string; slug: string }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const dismissKey = `install-dismissed:${slug}`;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Já instalado (rodando como app) → nunca mostrar.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    if (localStorage.getItem(dismissKey)) return;

    const ua = window.navigator.userAgent;
    // iPadOS 13+ se identifica como Mac — daí o teste por touch.
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    // No iPhone, SÓ o Safari consegue instalar. Chrome/Firefox no iOS não.
    const isIOSSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // impede o banner nativo, usamos o nosso
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Espera um pouco: interromper o cliente no instante em que ele abre é a
    // melhor forma de ser dispensado sem ler.
    const timer = setTimeout(() => {
      if (isIOS) setMode(isIOSSafari ? "ios-safari" : "ios-other");
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      clearTimeout(timer);
    };
  }, [dismissKey]);

  const dismiss = () => {
    localStorage.setItem(dismissKey, "1");
    setMode("hidden");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferred(null);
  };

  if (mode === "hidden") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300">
      <div
        className="mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur p-4 shadow-2xl shadow-black/60"
        style={{ borderColor: `${color}40` }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}22` }}>
            <Smartphone className="h-5 w-5" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Tenha a {shopName} no seu celular</p>

            {mode === "android" && (
              <p className="mt-0.5 text-xs text-zinc-400">Instale o app e agende em 2 toques, sem abrir o navegador.</p>
            )}

            {mode === "ios-safari" && (
              <div className="mt-1.5 space-y-1.5">
                <p className="text-xs text-zinc-400">Para instalar, é rapidinho:</p>
                <p className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-700 text-[9px] font-bold">1</span>
                  Toque em <Share className="inline h-3.5 w-3.5" style={{ color }} /> na barra do Safari
                </p>
                <p className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-700 text-[9px] font-bold">2</span>
                  Escolha <Plus className="inline h-3.5 w-3.5" style={{ color }} /> &ldquo;Adicionar à Tela de Início&rdquo;
                </p>
              </div>
            )}

            {mode === "ios-other" && (
              <p className="mt-0.5 text-xs text-zinc-400">
                Abra esta página no <b className="text-zinc-200">Safari</b> para instalar o app na sua tela de início.
              </p>
            )}

            {mode === "android" && (
              <button
                onClick={install}
                className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-zinc-900 transition-opacity hover:opacity-90"
                style={{ backgroundColor: color }}
              >
                <Download className="h-4 w-4" /> Instalar app
              </button>
            )}
          </div>
          <button onClick={dismiss} aria-label="Agora não" className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
