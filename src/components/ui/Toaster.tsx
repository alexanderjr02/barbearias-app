"use client";

import { useEffect, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { subscribeToasts, toast as toastStore, type ToastItem } from "@/lib/toast";
import { cn } from "@/lib/utils";

// Mounted once in AppProviders — renders whatever's in the module-level
// toast store (src/lib/toast.ts), which is how apiClient.ts can fire a
// toast without being inside a component. Built on @radix-ui/react-toast
// (already a dependency, previously unused) for correct focus/ARIA handling.
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open
          onOpenChange={(open) => {
            if (!open) toastStore.dismiss(t.id);
          }}
          className={cn(
            "flex items-start gap-2.5 w-80 rounded-xl border px-4 py-3 shadow-2xl bg-zinc-900 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-80",
            t.type === "success" ? "border-emerald-500/30" : "border-red-500/30"
          )}
        >
          {t.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <ToastPrimitive.Description className="flex-1 text-sm text-zinc-200 leading-snug">{t.message}</ToastPrimitive.Description>
          <ToastPrimitive.Close className="text-zinc-500 hover:text-zinc-300 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-5 left-5 z-[80] flex flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
