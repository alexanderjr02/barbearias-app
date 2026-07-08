"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  isPending?: boolean;
  error?: string | null;
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
}

export function FormModal({ open, onClose, title, onSubmit, submitLabel = "Salvar", isPending, error, children, footerExtra }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {children}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
          {footerExtra}
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isPending ? "Salvando..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export const fieldCls =
  "w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";
export const labelCls = "block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5";
