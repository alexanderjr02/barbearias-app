"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

/**
 * Aviso e preferências de cookies (LGPD).
 *
 * Duas formas para dois momentos. O aviso é uma faixa rente ao pé da tela, rasa
 * de propósito: precisa ser vista e respondida sem tapar a página que a pessoa
 * veio ler. As preferências abrem como painel, porque ali existe texto para ler
 * e três decisões para tomar, e consentimento em bloco não é escolha: quem quer
 * medição e não quer marketing tem que conseguir dizer isso.
 *
 * Enquanto a pessoa não decide, nada além do essencial roda. Hoje o site não
 * carrega script de terceiro; no dia em que carregar, ele lê esta mesma chave
 * antes de subir. A escolha fica no armazenamento do navegador, então o aviso
 * aparece uma vez e não volta a cada visita, e o rodapé tem um botão para
 * reabrir e mudar de ideia depois.
 *
 * A escolha gravada é lida por `useSyncExternalStore`, e não por um efeito que
 * chama setState na montagem. O armazenamento do navegador é exatamente o tipo
 * de estado externo que esse gancho existe para ler: no servidor ele devolve a
 * marca de "ainda não deu para ler", que não renderiza nada, e depois da
 * hidratação o valor real entra sem piscar e sem render em cascata.
 */

const CHAVE = "rukz_cookies_v2";
/** Pedido de reabrir o painel, disparado pelo botão do rodapé. */
const EVENTO_ABRIR = "rukz:cookies";
/** Aviso de que a escolha mudou, para o gancho reler o armazenamento. */
const EVENTO_MUDOU = "rukz:cookies:mudou";
/** Só o servidor devolve isto, e significa "ainda não deu para ler". */
const NO_SERVIDOR = " servidor";

type Escolha = { medicao: boolean; marketing: boolean };

const PADRAO: Escolha = { medicao: true, marketing: true };

const CATEGORIAS = [
  {
    id: "essenciais",
    nome: "Essenciais",
    texto: "Mantêm você conectado, guardam o plano escolhido e protegem o formulário. Sem eles o site não funciona.",
  },
  {
    id: "medicao",
    nome: "Medição de uso",
    texto: "Contam quais partes da página são lidas e onde as pessoas desistem, para a gente arrumar o que não está claro.",
  },
  {
    id: "marketing",
    nome: "Marketing",
    texto: "Registram por qual anúncio ou link você chegou, para não repetirmos a mesma campanha para quem já é cliente.",
  },
] as const;

function assinar(aoMudar: () => void) {
  window.addEventListener("storage", aoMudar);
  window.addEventListener(EVENTO_MUDOU, aoMudar);
  return () => {
    window.removeEventListener("storage", aoMudar);
    window.removeEventListener(EVENTO_MUDOU, aoMudar);
  };
}

function lerBruto(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    // Armazenamento bloqueado: trata como quem ainda não decidiu, que é o lado
    // seguro do erro.
    return null;
  }
}

function lerNoServidor() {
  return NO_SERVIDOR;
}

function interpretar(bruto: string | null): Escolha {
  if (!bruto) return PADRAO;
  try {
    const salvo = JSON.parse(bruto) as Partial<Escolha>;
    return { medicao: Boolean(salvo.medicao), marketing: Boolean(salvo.marketing) };
  } catch {
    return PADRAO;
  }
}

/** Reabre o painel de preferências de qualquer lugar da página. */
export function BotaoPreferenciasCookies({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR))} className={className}>
      Preferências de cookies
    </button>
  );
}

export function CookieConsent() {
  const bruto = useSyncExternalStore(assinar, lerBruto, lerNoServidor);
  const [reaberto, setReaberto] = useState(false);
  const [decididoAgora, setDecididoAgora] = useState(false);
  const [detalhando, setDetalhando] = useState(false);
  const [medicao, setMedicao] = useState(PADRAO.medicao);
  const [marketing, setMarketing] = useState(PADRAO.marketing);

  useEffect(() => {
    const abrir = () => {
      const atual = interpretar(lerBruto());
      setMedicao(atual.medicao);
      setMarketing(atual.marketing);
      setDetalhando(true);
      setReaberto(true);
    };
    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, []);

  const gravar = useCallback((escolha: Escolha) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ ...escolha, em: new Date().toISOString() }));
    } catch {
      // Sem armazenamento a escolha não persiste, mas vale para esta sessão.
    }
    setMedicao(escolha.medicao);
    setMarketing(escolha.marketing);
    setDecididoAgora(true);
    setReaberto(false);
    setDetalhando(false);
    window.dispatchEvent(new Event(EVENTO_MUDOU));
  }, []);

  if (bruto === NO_SERVIDOR) return null;
  const precisaDecidir = bruto === null && !decididoAgora;
  if (!precisaDecidir && !reaberto) return null;

  if (detalhando) {
    return (
      <div
        role="dialog"
        aria-labelledby="cookies-titulo"
        className="fixed inset-x-3 bottom-3 z-[60] max-w-md rounded-xl border border-traco-forte bg-carvao/95 p-5 shadow-2xl shadow-black/70 backdrop-blur sm:inset-x-auto sm:bottom-6 sm:left-6 sm:p-6"
      >
        <h2 id="cookies-titulo" className="tipo-titulo text-xl text-neve">
          Preferências de cookies
        </h2>

        <ul className="mt-4 divide-y divide-traco border-y border-traco">
          {CATEGORIAS.map((c) => {
            const fixa = c.id === "essenciais";
            const ligada = fixa ? true : c.id === "medicao" ? medicao : marketing;
            const alternar = c.id === "medicao" ? setMedicao : setMarketing;
            return (
              <li key={c.id} className="flex items-start gap-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neve">{c.nome}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-cinza">{c.texto}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ligada}
                  aria-label={c.nome}
                  disabled={fixa}
                  onClick={() => !fixa && alternar(!ligada)}
                  className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                    ligada ? "bg-ouro" : "bg-traco-forte"
                  } ${fixa ? "cursor-not-allowed opacity-55" : ""}`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-preto transition-transform ${ligada ? "translate-x-5" : ""}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => gravar({ medicao, marketing })}
            className="h-11 flex-1 rounded-xl bg-ouro px-5 text-sm font-bold text-preto transition-colors hover:bg-ouro-claro"
          >
            Salvar escolha
          </button>
          <button
            type="button"
            onClick={() => gravar({ medicao: true, marketing: true })}
            className="h-11 rounded-xl border border-traco-forte px-4 text-sm font-semibold text-neve transition-colors hover:border-cinza"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookies-titulo"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-traco-forte bg-preto/95 px-5 py-4 backdrop-blur sm:px-8"
    >
      <div className="mx-auto flex max-w-[76rem] flex-col gap-4 sm:flex-row sm:items-center sm:gap-10">
        <h2 id="cookies-titulo" className="sr-only">
          Cookies
        </h2>

        <p className="text-[13px] leading-relaxed text-cinza sm:flex-1">
          A gente usa cookies para o site funcionar, para medir o que ajuda você a decidir e para saber por
          qual campanha você chegou. Você escolhe o que fica ligado, e o tratamento está detalhado na{" "}
          <Link href="/privacidade" className="font-semibold text-neve underline underline-offset-2 hover:text-ouro">
            Política de Privacidade
          </Link>
          .
        </p>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDetalhando(true)}
            className="h-11 px-1 text-[13px] font-semibold text-cinza underline underline-offset-4 transition-colors hover:text-neve"
          >
            Escolher por categoria
          </button>
          <button
            type="button"
            onClick={() => gravar({ medicao: false, marketing: false })}
            className="h-11 rounded-xl border border-traco-forte px-4 text-sm font-semibold text-neve transition-colors hover:border-cinza"
          >
            Só os essenciais
          </button>
          <button
            type="button"
            onClick={() => gravar({ medicao: true, marketing: true })}
            className="h-11 rounded-xl bg-ouro px-5 text-sm font-bold text-preto transition-colors hover:bg-ouro-claro"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}
