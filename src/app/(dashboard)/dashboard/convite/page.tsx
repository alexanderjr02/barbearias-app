"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Share2, Copy, Printer, Search, MessageCircle, Loader2, Check, QrCode, Link2 } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { cn } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cortix-app-mu.vercel.app";

interface InviteData {
  shop: { name: string; slug: string; logo: string | null; primaryColor: string; plan: string };
  loyalty: { stampEnabled: boolean; stampGoal: number; stampRewardLabel: string };
  staff: { id: string; name: string }[];
  clients: { id: string; name: string; phone: string; stamps: number }[];
}

const CAMPAIGN_CHANNELS = [
  { value: "GOOGLE", label: "Google" },
  { value: "GBP", label: "Google Meu Negócio" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "REFERRAL", label: "Indicação" },
  { value: "ORGANIC", label: "Outro" },
];

export default function ConvitePage() {
  const [search, setSearch] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  // Links por campanha: origem que viaja no link até o agendamento e vira a
  // origem do lead (relatório de atribuição). O booking mora nesta mesma origem
  // web, por isso usamos window.location.origin (não o APP_URL do app Flutter).
  const [origin, setOrigin] = useState("");
  const [campChannel, setCampChannel] = useState("GOOGLE");
  const [campName, setCampName] = useState("");
  const [campQr, setCampQr] = useState<string | null>(null);
  const [campCopied, setCampCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const { data } = useQuery({ queryKey: ["invite"], queryFn: () => apiGet<InviteData>("/api/invite") });

  const installUrl = data ? `${APP_URL}/?shop=${data.shop.slug}` : "";

  const campaignSlug = campName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const campaignLink =
    data && origin
      ? `${origin}/booking/${data.shop.slug}?ch=${campChannel}${campaignSlug ? `&c=${campaignSlug}` : ""}`
      : "";

  // useEffect e não useMemo: gerar o QR é efeito colateral (setState), e o
  // useMemo não garante execução — serve para calcular valor, não para agir.
  useEffect(() => {
    if (!installUrl) return;
    QRCode.toDataURL(installUrl, { width: 640, margin: 1, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(null));
  }, [installUrl]);

  useEffect(() => {
    if (!campaignLink) {
      setCampQr(null);
      return;
    }
    QRCode.toDataURL(campaignLink, { width: 640, margin: 1, errorCorrectionLevel: "M" })
      .then(setCampQr)
      .catch(() => setCampQr(null));
  }, [campaignLink]);

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Share2} title="Divulgação" subtitle="Carregando…" accent="amber" />
        <div className="h-72 animate-pulse rounded-2xl border border-zinc-800/60 bg-zinc-900/60" />
      </div>
    );
  }

  const { shop, loyalty, clients } = data;

  /**
   * A mensagem muda conforme o que a pessoa já tem.
   *
   * Quem já tem selo recebe o número — abandonar exige perder algo, e isso
   * converte muito melhor que um convite genérico. Quem não tem ainda recebe
   * a promessa concreta do prêmio, não um "baixe nosso app".
   */
  const messageFor = (client: { name: string; stamps: number }) => {
    const primeiroNome = client.name.split(" ")[0];
    const link = installUrl;

    if (loyalty.stampEnabled && client.stamps > 0) {
      const faltam = Math.max(loyalty.stampGoal - client.stamps, 0);
      return (
        `Oi ${primeiroNome}! Aqui é da ${shop.name}.\n\n` +
        `Seu cartão de fidelidade já tem ${client.stamps} de ${loyalty.stampGoal} selos` +
        (faltam > 0 ? ` — faltam ${faltam} para ganhar ${loyalty.stampRewardLabel}.` : ` e já está completo!`) +
        `\n\nVeja o seu cartão e agende pelo link: ${link}`
      );
    }

    if (loyalty.stampEnabled) {
      return (
        `Oi ${primeiroNome}! Aqui é da ${shop.name}.\n\n` +
        `Agora você acompanha seu cartão de fidelidade pelo celular: a cada ${loyalty.stampGoal} cortes, ` +
        `${loyalty.stampRewardLabel}.\n\nComece aqui: ${link}`
      );
    }

    return (
      `Oi ${primeiroNome}! Aqui é da ${shop.name}.\n\n` +
      `Agora dá para agendar seu horário direto pelo celular, sem precisar chamar no WhatsApp.\n\n${link}`
    );
  };

  const openWhatsApp = (client: { id: string; name: string; phone: string; stamps: number }) => {
    const phone = client.phone.length <= 11 ? `55${client.phone}` : client.phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageFor(client))}`, "_blank");
    setSent((prev) => new Set(prev).add(client.id));
  };

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  const comSelo = clients.filter((c) => c.stamps > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Share2}
        title="Divulgação"
        subtitle="O jeito de colocar o app na mão do cliente sem depender de loja de aplicativos"
        accent="amber"
      />

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] items-start">
        {/* QR para imprimir */}
        <div className="print-qr rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <QrCode className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">QR do balcão</h3>
              <p className="text-xs text-zinc-600">Imprima e deixe à vista</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-white p-4">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR Code de instalação" className="mx-auto w-full max-w-[220px]" />
            ) : (
              <div className="flex h-[220px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            )}
          </div>

          <p className="mt-3 break-all rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-500">
            {installUrl}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(installUrl);
                toast.success("Link copiado");
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar link
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
            No iPhone o cliente precisa abrir pelo <strong className="text-zinc-400">Safari</strong> e usar
            Compartilhar → Adicionar à Tela de Início. No Android o próprio navegador oferece instalar.
          </p>
        </div>

        {/* Convite por WhatsApp */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="border-b border-zinc-800 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Convidar por WhatsApp</h3>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {loyalty.stampEnabled && comSelo > 0
                    ? `${comSelo} ${comSelo === 1 ? "cliente já tem selo" : "clientes já têm selos"} — a mensagem mostra o progresso deles`
                    : "A mensagem já vai escrita, é só enviar"}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400">
                {clients.length}
              </span>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/50"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/60">
                <MessageCircle className="h-5 w-5 text-zinc-600" />
              </div>
              <p className="mt-3.5 text-sm font-semibold text-zinc-300">
                {clients.length === 0 ? "Nenhum cliente com telefone" : "Nada encontrado"}
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-600">
                {clients.length === 0
                  ? "Só aparecem aqui clientes com telefone cadastrado — sem ele não há como enviar."
                  : "Tente outro nome ou telefone."}
              </p>
            </div>
          ) : (
            <div className="max-h-[520px] divide-y divide-zinc-800/70 overflow-y-auto">
              {filtered.map((c) => {
                const jaEnviado = sent.has(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-3.5 px-5 py-3.5">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xs font-black text-zinc-400">
                      {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {loyalty.stampEnabled && c.stamps > 0
                          ? `${c.stamps} de ${loyalty.stampGoal} selos`
                          : "sem selos ainda"}
                      </p>
                    </div>
                    <button
                      onClick={() => openWhatsApp(c)}
                      className={cn(
                        "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors",
                        jaEnviado
                          ? "bg-zinc-800 text-zinc-500"
                          : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      )}
                    >
                      {jaEnviado ? <Check className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                      {jaEnviado ? "Enviado" : "Enviar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Links por campanha (atribuição) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <Link2 className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Links por campanha</h3>
            <p className="text-xs text-zinc-600">Crie um link por canal e descubra de onde vêm os agendamentos</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500">Canal</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CAMPAIGN_CHANNELS.map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => setCampChannel(ch.value)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      campChannel === ch.value
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                        : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500">Nome da campanha (opcional)</label>
              <input
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                placeholder="ex.: promo-julho, bio-instagram"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500">Seu link rastreado</label>
              <div className="mt-1.5 flex items-center gap-2">
                <p className="flex-1 truncate rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
                  {campaignLink || "…"}
                </p>
                <button
                  onClick={() => {
                    if (!campaignLink) return;
                    navigator.clipboard.writeText(campaignLink);
                    setCampCopied(true);
                    toast.success("Link da campanha copiado");
                    setTimeout(() => setCampCopied(false), 1500);
                  }}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-700"
                >
                  {campCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {campCopied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                Use este link na bio do Instagram, no Google Meu Negócio ou onde divulgar. Todo agendamento que
                vier por ele é marcado com este canal no relatório de Origem dos clientes.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-3">
            {campQr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campQr} alt="QR da campanha" className="mx-auto w-full max-w-[180px]" />
            ) : (
              <div className="flex h-[180px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Só o QR sai na impressão — o resto da tela viraria papel desperdiçado. */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-qr,
          .print-qr * {
            visibility: visible;
          }
          .print-qr {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
