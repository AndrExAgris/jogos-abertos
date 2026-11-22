/*
 * Pirâmide. 28 cartas em pirâmide; tire pares de cartas livres que somem 13
 * (J = 11, Q = 12; o Rei sai sozinho). A carta de cima do descarte também
 * vale. O estoque passa três vezes.
 */
import { abrir, baralho, type Carta } from '../baralho/index.ts';

export interface EstadoPiramide { piramide: (Carta | null)[]; estoque: Carta[]; descarte: Carta[]; passadas: number }
export const PASSADAS = 3;

export function novaPiramide(semente: string): EstadoPiramide {
  const b = baralho(semente).map(abrir);
  return { piramide: b.slice(0, 28), estoque: b.slice(28), descarte: [], passadas: 1 };
}

/** Posição (linha, coluna) do índice na pirâmide de 7 linhas. */
export function linhaColuna(i: number): [number, number] {
  let l = 0;
  while (((l + 1) * (l + 2)) / 2 <= i) l++;
  return [l, i - (l * (l + 1)) / 2];
}
export const indice = (l: number, c: number) => (l * (l + 1)) / 2 + c;

export function livre(e: EstadoPiramide, i: number): boolean {
  if (!e.piramide[i]) return false;
  const [l, c] = linhaColuna(i);
  if (l === 6) return true;
  return !e.piramide[indice(l + 1, c)] && !e.piramide[indice(l + 1, c + 1)];
}

/** `a` e `b`: índice da pirâmide ou -1 para o topo do descarte. */
export function tirar(e: EstadoPiramide, a: number, b?: number): EstadoPiramide | null {
  const carta = (i: number) => (i < 0 ? e.descarte[e.descarte.length - 1] : livre(e, i) ? e.piramide[i] : null);
  const ca = carta(a);
  if (!ca) return null;
  if (b === undefined) { if (ca.v !== 13) return null; }
  else { const cb = carta(b); if (!cb || a === b || ca.v + cb.v !== 13) return null; }
  const n: EstadoPiramide = { ...e, piramide: e.piramide.slice(), descarte: e.descarte.slice() };
  for (const i of b === undefined ? [a] : [a, b]) { if (i < 0) n.descarte.pop(); else n.piramide[i] = null; }
  return n;
}

export function comprarPiramide(e: EstadoPiramide): EstadoPiramide | null {
  if (e.estoque.length) return { ...e, estoque: e.estoque.slice(0, -1), descarte: [...e.descarte, e.estoque[e.estoque.length - 1]] };
  if (e.passadas >= PASSADAS || !e.descarte.length) return null;
  return { ...e, estoque: e.descarte.slice().reverse(), descarte: [], passadas: e.passadas + 1 };
}

export const venceuPiramide = (e: EstadoPiramide) => e.piramide.every((c) => !c);
