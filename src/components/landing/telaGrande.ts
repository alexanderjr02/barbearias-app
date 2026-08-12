"use client";

import { useSyncExternalStore } from "react";

/**
 * A largura da tela, lida como estado externo.
 *
 * Duas peças da landing escolhem o que mostrar pelo tamanho da tela: as
 * capturas (app no celular, navegador no computador) e o vídeo do copiloto
 * (vertical ou deitado). Isso não pode virar `setState` dentro de efeito, que
 * dispara render em cascata e é justamente o que o `useSyncExternalStore`
 * existe para resolver: o `matchMedia` é uma fonte externa, com assinatura
 * própria, e o React lê dela.
 *
 * No servidor devolve `null`, e não um palpite. Quem consome trata esse
 * instante mostrando a moldura vazia, então nada pula quando a resposta chega
 * e ninguém baixa o arquivo da versão errada.
 */

const GRANDE = "(min-width: 640px)";

function assinar(aoMudar: () => void) {
  const consulta = window.matchMedia(GRANDE);
  consulta.addEventListener("change", aoMudar);
  return () => consulta.removeEventListener("change", aoMudar);
}

const noCliente = () => window.matchMedia(GRANDE).matches;
const noServidor = () => null;

export function useTelaGrande(): boolean | null {
  return useSyncExternalStore(assinar, noCliente, noServidor);
}
