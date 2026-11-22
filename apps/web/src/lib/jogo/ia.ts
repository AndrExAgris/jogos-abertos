/** Utilidades para jogar contra o computador. */
export type NivelIA = 'facil' | 'medio' | 'dificil';
export const NOMES_NIVEL: Record<NivelIA, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

/** Opções de partida contra o computador, com ids 'ia-facil', 'ia-medio' e 'ia-dificil'. */
export function opcoesIA(descricao = 'Você contra o computador'): { id: string; titulo: string; descricao: string }[] {
  return (['facil', 'medio', 'dificil'] as const).map((n) => ({ id: `ia-${n}`, titulo: `Computador ${NOMES_NIVEL[n].toLowerCase()}`, descricao }));
}

export const nivelDoId = (id: string): NivelIA | undefined => (id.startsWith('ia-') ? (id.slice(3) as NivelIA) : undefined);

/** Agenda a jogada do computador com uma pausa curta (para dar tempo de ver). Devolve a função que cancela. */
export function agendar(fn: () => void, ms = 600): () => void {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
}
