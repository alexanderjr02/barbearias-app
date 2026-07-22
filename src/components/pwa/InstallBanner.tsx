"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, X, Share, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = "android" | "ios" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [step, setStep] = useState<"banner" | "ios-instructions">("banner");

  useEffect(() => {
    // Already installed as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;
    if (localStorage.getItem("cortix-pwa-dismissed")) return;

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      // iOS Safari — show after short delay
      const t = setTimeout(() => {
        setPlatform("ios");
        setShow(true);
      }, 3000);
      return () => clearTimeout(t);
    }

    if (isAndroid) {
      const handler = (e: BeforeInstallPromptEvent) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setPlatform("android");
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler as EventListener);
      return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
    }

    // Desktop Chrome — also support install
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const dismiss = () => {
    localStorage.setItem("cortix-pwa-dismissed", "1");
    setShow(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setShow(false);
  };

  if (!show) return null;

  return (
    <div className={cn(
      "fixed z-[45] transition-all duration-500",
      "bottom-20 left-3 right-3 sm:bottom-6 sm:left-auto sm:right-6 sm:w-80"
    )}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25">
            <Image src="/icons/icon.svg" alt="CORTIX" width={24} height={24} className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Instalar CORTIX</p>
            <p className="text-xs text-zinc-500">Acesso rápido, uso offline, notificações</p>
          </div>
          <button onClick={dismiss} className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {platform === "ios" && step === "banner" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { icon: "", label: "Funciona offline" },
                  { icon: "", label: "Notificações" },
                  { icon: "", label: "Acesso rápido" },
                ].map(f => (
                  <div key={f.label} className="bg-zinc-800 rounded-lg p-2">
                    <span className="text-lg">{f.icon}</span>
                    <p className="text-zinc-400 mt-1">{f.label}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep("ios-instructions")}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Ver como instalar
              </button>
            </div>
          )}

          {platform === "ios" && step === "ios-instructions" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 font-medium">Como instalar no iPhone/iPad:</p>
              {[
                { step: "1", icon: <Share className="w-4 h-4" />, text: 'Toque em "Compartilhar" na barra do Safari' },
                { step: "2", icon: <Smartphone className="w-4 h-4" />, text: 'Selecione "Adicionar à Tela de Início"' },
                { step: "3", icon: <Download className="w-4 h-4" />, text: 'Toque em "Adicionar" para confirmar' },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
                    {s.icon}
                  </div>
                  <p className="text-xs text-zinc-300">{s.text}</p>
                </div>
              ))}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2 mt-2">
                <span className="text-amber-400 text-xs"></span>
                <p className="text-xs text-zinc-400">Use o <strong className="text-zinc-300">Safari</strong> para instalar — outros navegadores não suportam.</p>
              </div>
            </div>
          )}

          {platform === "android" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { icon: "", label: "Funciona offline" },
                  { icon: "", label: "Notificações" },
                  { icon: "", label: "Acesso rápido" },
                ].map(f => (
                  <div key={f.label} className="bg-zinc-800 rounded-lg p-2">
                    <span className="text-lg">{f.icon}</span>
                    <p className="text-zinc-400 mt-1">{f.label}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={handleInstall}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Instalar aplicativo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
