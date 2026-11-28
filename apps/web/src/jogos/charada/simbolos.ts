/*
 * Símbolo de cada valor da Charada: emoji para bichos, bebidas, esportes e
 * frutas; quadradinho colorido para as cores. Nomes de pessoas seguem em texto.
 */
export type Simbolo = { tipo: 'emoji'; texto: string } | { tipo: 'cor'; cor: string } | { tipo: 'texto'; texto: string; curto: string };

const EMOJI: Record<string, string> = {
  gato: '🐱', cachorro: '🐶', peixe: '🐟', papagaio: '🦜', tartaruga: '🐢', coelho: '🐰',
  café: '☕', chá: '🍵', suco: '🧃', leite: '🥛', água: '💧', refrigerante: '🥤',
  futebol: '⚽', vôlei: '🏐', natação: '🏊', xadrez: '♟️', corrida: '🏃', basquete: '🏀',
  manga: '🥭', banana: '🍌', uva: '🍇', abacaxi: '🍍', maçã: '🍎', morango: '🍓',
};
const COR: Record<string, string> = {
  azul: 'var(--info)', verde: 'var(--sucesso)', amarela: 'var(--aviso)', vermelha: 'var(--erro)', branca: 'var(--ja-branca)', roxa: 'var(--roxo)',
};

export function simbolo(categoria: string, valor: string): Simbolo {
  if (categoria === 'Cor da casa' && COR[valor]) return { tipo: 'cor', cor: COR[valor] };
  if (EMOJI[valor]) return { tipo: 'emoji', texto: EMOJI[valor] };
  return { tipo: 'texto', texto: valor, curto: valor.slice(0, 1) };
}

/** Ícone de cada categoria (Tabler), no lugar do nome na lateral do tabuleiro. */
export const ICONE_CATEGORIA: Record<string, string> = {
  Nome: 'user', 'Cor da casa': 'palette', Bicho: 'paw', Bebida: 'cup', Esporte: 'ball-football', Fruta: 'apple',
};
