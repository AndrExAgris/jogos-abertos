/*
 * Adversário do computador para os jogos de tabuleiro: na vez dele, pede o
 * lance ao Web Worker (o celular não trava) e aplica com uma pausa curta.
 * Chame `usarComputador` durante a criação do componente.
 */
import type { Sessao } from './sessao.svelte.ts';
import { gerarNoFundo } from './gerar.ts';
import type { NivelIA } from './ia.ts';

export interface Computador { readonly pensando: boolean; desfazer(): void }

export function usarComputador<E, L>(opcoes: {
  jogo: string;
  sessao: Sessao<{ modo: string; ia?: NivelIA }, E>;
  /** É a vez do computador neste estado? */
  vez: (e: E) => boolean;
  aplicar: (lance: L) => void;
  atraso?: number;
}): Computador {
  const s = opcoes.sessao;
  let pensando = $state(false);
  $effect(() => {
    const e = s.estado;
    const nivel = s.quebra?.ia;
    if (!e || !nivel || s.fase !== 'jogo' || s.terminou || !opcoes.vez(e)) return;
    let cancelado = false;
    pensando = true;
    const inicio = Date.now();
    void gerarNoFundo<L>('ia', [opcoes.jogo, $state.snapshot(e), nivel]).then((lance) => {
      const resto = Math.max(0, (opcoes.atraso ?? 450) - (Date.now() - inicio));
      setTimeout(() => {
        if (cancelado || s.estado !== e) return;
        pensando = false;
        opcoes.aplicar(lance);
      }, resto);
    }).catch(() => { pensando = false; });
    return () => { cancelado = true; pensando = false; };
  });
  return {
    get pensando() { return pensando; },
    /** Desfaz até voltar à vez da pessoa (o lance do computador e o dela). */
    desfazer() {
      if (!s.podeDesfazer) return;
      s.desfazer();
      while (s.estado && s.quebra?.ia && opcoes.vez(s.estado) && s.podeDesfazer) s.desfazer();
    },
  };
}
