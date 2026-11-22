/*
 * Perguntas por Categoria (no estilo dos jogos de tabuleiro de perguntas, sem
 * tabuleiro): escolha a categoria, aposte de 1 a 3 pontos e responda.
 * Perguntas montadas a partir do Wikidata (CC0).
 */
import { criarAleatorio, type Aleatorio } from '@ja/contrato';
import dados from '../../../../data/conhecimento/perguntas.json';

export interface Pergunta { c: string; p: string; r: string; e: string[] }
const TODAS = dados as Pergunta[];

export const CATEGORIAS = ['Mundo', 'Artes e Entretenimento', 'Sociedade', 'Ciência e Tecnologia', 'Esporte e Lazer', 'Variedades'] as const;
export const CATEGORIA_BRASIL = 'Brasil';

export const quantasNaCategoria = (c: string) => TODAS.filter((q) => q.c === c).length;

/** Sorteia uma pergunta da categoria que ainda não saiu; devolve com as opções embaralhadas. */
export function sortearPergunta(categoria: string, usadas: string[], a: Aleatorio): (Pergunta & { opcoes: string[] }) | null {
  const livres = TODAS.filter((q) => q.c === categoria && !usadas.includes(q.p));
  if (!livres.length) return null;
  const q = livres[a.inteiro(livres.length)];
  return { ...q, opcoes: a.embaralhar([q.r, ...q.e]) };
}

export const aleatorioDaRodada = (semente: string, rodada: number) => criarAleatorio(`${semente}:${rodada}`);
