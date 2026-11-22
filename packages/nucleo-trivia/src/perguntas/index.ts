/*
 * Perguntas por Categoria: escolha a categoria e responda. Cada acerto vale
 * 1 ponto; com 3 erros o jogo acaba.
 * Perguntas montadas a partir do Wikidata (CC0).
 */
import { criarAleatorio, type Aleatorio } from '@ja/contrato';
import dados from '../../../../data/conhecimento/perguntas.json';

/** `d`: dificuldade de 1 (muito fácil) a 5 (muito difícil). */
export interface Pergunta { c: string; p: string; r: string; e: string[]; d?: number }
const TODAS = dados as Pergunta[];

export const CATEGORIAS = ['Mundo', 'Artes e Entretenimento', 'Sociedade', 'Ciência e Tecnologia', 'Esporte e Lazer', 'Variedades'] as const;

export const quantasNaCategoria = (c: string) => TODAS.filter((q) => q.c === c).length;

/** Sorteia uma pergunta da categoria que ainda não saiu; devolve com as opções embaralhadas. */
export function sortearPergunta(categoria: string, usadas: string[], a: Aleatorio): (Pergunta & { opcoes: string[] }) | null {
  const livres = TODAS.filter((q) => q.c === categoria && !usadas.includes(q.p));
  if (!livres.length) return null;
  const q = livres[a.inteiro(livres.length)];
  return { ...q, opcoes: a.embaralhar([q.r, ...q.e]) };
}

/** Sorteia uma pergunta da dificuldade pedida (ou da mais próxima que ainda tiver perguntas livres). */
export function sortearNivel(dificuldade: number, usadas: string[], a: Aleatorio): (Pergunta & { opcoes: string[] }) | null {
  for (const desvio of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
    const d = dificuldade + desvio;
    const livres = TODAS.filter((q) => (q.d ?? 3) === d && !usadas.includes(q.p));
    if (!livres.length) continue;
    const q = livres[a.inteiro(livres.length)];
    return { ...q, opcoes: a.embaralhar([q.r, ...q.e]) };
  }
  return null;
}


export const aleatorioDaRodada = (semente: string, rodada: number) => criarAleatorio(`${semente}:${rodada}`);
