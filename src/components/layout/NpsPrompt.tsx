"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Smile, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

// A lightweight, occasional satisfaction prompt — server-side cooldown (30
// days) via /api/nps GET's shouldPrompt, no scheduling infra needed. Session
// dismiss just hides it for this browser session; it'll ask again next visit
// until either answered or 30 days pass.
export function NpsPrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data } = useQuery({
    queryKey: ["nps-should-prompt"],
    queryFn: () => apiGet<{ shouldPrompt: boolean }>("/api/nps"),
  });

  if (dismissed || submitted || !data?.shouldPrompt) return null;

  const submit = async () => {
    if (score === null) return;
    await apiPost("/api/nps", { score, comment: comment.trim() || undefined });
    setSubmitted(true);
  };

  return (
    <div className="fixed bottom-24 right-5 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 z-50">
      <button onClick={() => setDismissed(true)} className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-300">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <Smile className="w-4 h-4 text-amber-400" />
        <p className="text-sm font-bold text-white">Como está sua experiência?</p>
      </div>
      <p className="text-xs text-zinc-500 mb-3">De 0 a 10, o quanto você recomendaria o CORTIX para outro barbeiro?</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            onClick={() => setScore(n)}
            className={cn(
              "w-7 h-7 rounded-lg text-xs font-semibold transition-all",
              score === n ? "bg-amber-500 text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {score !== null && (
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Algum comentário? (opcional)"
          className="w-full h-9 px-3 mb-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      )}
      <button
        onClick={submit}
        disabled={score === null}
        className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-40"
      >
        Enviar
      </button>
    </div>
  );
}
