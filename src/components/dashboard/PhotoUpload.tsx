"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { apiUpload } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  shape?: "circle" | "square";
  size?: number;
  fallbackLabel?: string;
}

export function PhotoUpload({ value, onChange, shape = "circle", size = 96, fallbackLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const { url } = await apiUpload(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        style={{ width: size, height: size }}
        className={cn(
          "relative flex-shrink-0 flex items-center justify-center bg-zinc-800 border border-zinc-700 overflow-hidden cursor-pointer group hover:border-amber-500/60 transition-colors",
          shape === "circle" ? "rounded-full" : "rounded-xl"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Foto" className="w-full h-full object-cover" />
        ) : (
          <span className="text-zinc-500 text-xs font-semibold text-center px-1">{fallbackLabel ?? "Sem foto"}</span>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="text-xs font-semibold text-amber-400 hover:text-amber-300 disabled:opacity-50 text-left"
        >
          {value ? "Trocar foto" : "Adicionar foto"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 text-left">
            <X className="w-3 h-3" /> Remover
          </button>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
