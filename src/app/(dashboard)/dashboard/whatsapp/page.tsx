"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, CheckCircle2, Loader2, Link2Off, Wand2, KeyRound, ExternalLink } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";

interface WhatsappStatus {
  connected: boolean;
  embeddedSignupAvailable: boolean;
  connection: {
    displayPhone: string | null;
    status: string;
    templateName: string | null;
    connectedAt: string;
    hasWaba: boolean;
  } | null;
}

// window.launchWhatsAppSignup vem do script do Embedded Signup (mais abaixo),
// e só existe quando FACEBOOK_APP_ID está publicado. Declarado para o TS.
declare global {
  interface Window {
    launchWhatsAppSignup?: () => void;
  }
}

export default function WhatsappPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<WhatsappStatus>({
    queryKey: ["whatsapp-status"],
    queryFn: () => apiGet<WhatsappStatus>("/api/whatsapp/status"),
  });

  const [manualOpen, setManualOpen] = useState(false);
  const [token, setToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const connectManual = useMutation({
    mutationFn: () =>
      apiPost("/api/whatsapp/connect", {
        mode: "manual",
        accessToken: token.trim(),
        phoneNumberId: phoneNumberId.trim(),
        templateName: templateName.trim() || undefined,
      }),
    onSuccess: () => {
      setError(null);
      setToken("");
      setPhoneNumberId("");
      setManualOpen(false);
      qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Não consegui conectar."),
  });

  const disconnect = useMutation({
    mutationFn: () => apiPost("/api/whatsapp/disconnect", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-status"] }),
  });

  const connected = data?.connected;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
          <MessageCircle className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">WhatsApp da barbearia</h1>
          <p className="text-sm text-zinc-500">
            Conecte o número que envia as confirmações e responde os clientes automaticamente.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : connected ? (
        // ---------- Já conectado ----------
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="font-semibold text-zinc-100">WhatsApp conectado</p>
              <p className="text-sm text-zinc-400">
                {data?.connection?.displayPhone
                  ? `Número: ${data.connection.displayPhone}`
                  : "Número conectado."}
                {data?.connection?.templateName ? ` · Template: ${data.connection.templateName}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
          >
            {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
            Desconectar
          </button>
        </div>
      ) : (
        // ---------- Não conectado ----------
        <div className="space-y-4">
          {/* Conexão automática (Embedded Signup) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-emerald-400" />
              <h2 className="font-semibold text-zinc-100">Conectar automático</h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Você entra na sua conta da Meta, autoriza e pronto — sem copiar código nenhum.
            </p>
            {data?.embeddedSignupAvailable ? (
              <button
                onClick={() => window.launchWhatsAppSignup?.()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                <MessageCircle className="h-4 w-4" /> Conectar WhatsApp
              </button>
            ) : (
              <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/90">
                A conexão automática entra no ar assim que a plataforma for aprovada pela Meta. Enquanto isso, use a
                conexão manual abaixo com o número de teste gratuito.
              </div>
            )}
          </div>

          {/* Conexão manual */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <button
              onClick={() => setManualOpen((v) => !v)}
              className="flex w-full items-center gap-2 text-left"
            >
              <KeyRound className="h-5 w-5 text-zinc-400" />
              <span className="font-semibold text-zinc-100">Conectar manual (número de teste)</span>
            </button>
            <p className="mt-1 text-sm text-zinc-500">
              Cole o token permanente e o Phone Number ID que a Meta te dá em developers.facebook.com.
            </p>

            {manualOpen && (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-zinc-400">Token de acesso</span>
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="EAAG..."
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-zinc-400">Phone Number ID</span>
                  <input
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="123456789012345"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-zinc-400">Nome do template de confirmação (opcional)</span>
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="confirmacao_agendamento"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                  />
                </label>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  onClick={() => connectManual.mutate()}
                  disabled={connectManual.isPending || !token.trim() || !phoneNumberId.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {connectManual.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Validar e conectar
                </button>
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Abrir painel da Meta <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <EmbeddedSignupScript available={Boolean(data?.embeddedSignupAvailable)} onDone={() => qc.invalidateQueries({ queryKey: ["whatsapp-status"] })} />
    </div>
  );
}

// Carrega o SDK da Meta e define window.launchWhatsAppSignup. Só faz algo quando
// a plataforma tem FACEBOOK_APP_ID publicado (embeddedSignupAvailable). O
// NEXT_PUBLIC_FACEBOOK_APP_ID e o NEXT_PUBLIC_META_CONFIG_ID são preenchidos
// depois da aprovação da Meta — até lá, este componente fica quieto.
function EmbeddedSignupScript({ available, onDone }: { available: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!available) return;
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
    if (!appId || !configId) return;

    // Recebe waba_id/phone_number_id do popup do Embedded Signup.
    let sessionInfo: { phone_number_id?: string; waba_id?: string } = {};
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const d = JSON.parse(event.data);
        if (d.type === "WA_EMBEDDED_SIGNUP" && d.data) {
          sessionInfo = { phone_number_id: d.data.phone_number_id, waba_id: d.data.waba_id };
        }
      } catch {
        /* mensagem não-JSON do SDK — ignora */
      }
    }
    window.addEventListener("message", onMessage);

    // Carrega o SDK do Facebook uma vez.
    const w = window as unknown as { fbAsyncInit?: () => void; FB?: { init: (o: unknown) => void; login: (cb: (r: unknown) => void, o: unknown) => void } };
    w.fbAsyncInit = function () {
      w.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version: "v21.0" });
    };
    if (!document.getElementById("facebook-jssdk")) {
      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      js.async = true;
      document.body.appendChild(js);
    }

    window.launchWhatsAppSignup = function () {
      w.FB?.login(
        function (response: unknown) {
          const authCode = (response as { authResponse?: { code?: string } })?.authResponse?.code;
          if (!authCode || !sessionInfo.phone_number_id) return;
          apiPost("/api/whatsapp/connect", {
            mode: "embedded",
            code: authCode,
            phoneNumberId: sessionInfo.phone_number_id,
            wabaId: sessionInfo.waba_id,
          })
            .then(() => onDone())
            .catch(() => {});
        },
        { config_id: configId, response_type: "code", override_default_response_type: true, extras: { setup: {} } }
      );
    };

    return () => window.removeEventListener("message", onMessage);
  }, [available, onDone]);

  return null;
}
