/*
 * TriPeaks e Golf: tire cartas livres que sejam uma acima ou uma abaixo da
 * carta de cima do descarte. No TriPeaks o Ás e o Rei se emendam; no Golf não.
 */
import { abrir, baralho, type Carta } from '../baralho/index.ts';

export type Variante = 'tripeaks' | 'golf';
export interface EstadoPicos { variante: Variante; mesa: (Carta | null)[]; estoque: Carta[]; descarte: Carta[]; sequencia: number; melhorSequencia: number }

/* TriPeaks: 3 picos (linhas de 3, 6, 9 e 10 cartas = 28). Cada carta é coberta por duas da linha de baixo. */
const LINHAS_TP = [3, 6, 9, 10];
export function cobertasPor(i: number): number[] {
  // Índices globais por linha.
  const inicio = [0, 3, 9, 18];
  const l = LINHAS_TP.findIndex((_, k) => i < inicio[k] + LINHAS_TP[k]);
  const c = i - inicio[l];
  if (l === 3) return [];
  if (l === 2) return [inicio[3] + c, inicio[3] + c + 1];
  if (l === 1) { const pico = Math.floor(c / 2); return [inicio[2] + c + pico, inicio[2] + c + pico + 1]; }
  return [inicio[1] + c * 2, inicio[1] + c * 2 + 1];
}
/** Posição (x, linha) para desenhar: x em meias cartas. */
export function posicaoTP(i: number): [number, number] {
  const inicio = [0, 3, 9, 18];
  const l = LINHAS_TP.findIndex((_, k) => i < inicio[k] + LINHAS_TP[k]);
  const c = i - inicio[l];
  if (l === 0) return [3 + c * 6, 0];
  if (l === 1) return [2 + Math.floor(c / 2) * 6 + (c % 2) * 2, 1];
  if (l === 2) return [1 + c * 2, 2];
  return [c * 2, 3];
}

export function novoPicos(semente: string, variante: Variante): EstadoPicos {
  const b = baralho(semente);
  if (variante === 'tripeaks') {
    const mesa = b.splice(0, 28).map((c, i) => (i >= 18 ? abrir(c) : c));
    const descarte = [abrir(b.pop()!)];
    return { variante, mesa, estoque: b, descarte, sequencia: 0, melhorSequencia: 0 };
  }
  const mesa = b.splice(0, 35).map(abrir); // 7 colunas × 5 (índice = coluna * 5 + linha)
  const descarte = [abrir(b.pop()!)];
  return { variante, mesa, estoque: b, descarte, sequencia: 0, melhorSequencia: 0 };
}

export function livrePicos(e: EstadoPicos, i: number): boolean {
  if (!e.mesa[i]) return false;
  if (e.variante === 'golf') { const col = Math.floor(i / 5); for (let k = i + 1; k < (col + 1) * 5; k++) if (e.mesa[k]) return false; return true; }
  return cobertasPor(i).every((k) => !e.mesa[k]);
}

export function encaixa(e: EstadoPicos, c: Carta): boolean {
  const t = e.descarte[e.descarte.length - 1];
  const d = Math.abs(t.v - c.v);
  return d === 1 || (e.variante === 'tripeaks' && d === 12);
}

export function jogarPicos(e: EstadoPicos, i: number): EstadoPicos | null {
  const c = e.mesa[i];
  if (!c || !livrePicos(e, i) || !encaixa(e, c)) return null;
  const mesa = e.mesa.slice();
  mesa[i] = null;
  if (e.variante === 'tripeaks') {
    // Abre as cartas que ficaram descobertas.
    mesa.forEach((m, k) => { if (m && !m.aberta && cobertasPor(k).every((x) => !mesa[x])) mesa[k] = abrir(m); });
  }
  const sequencia = e.sequencia + 1;
  return { ...e, mesa, descarte: [...e.descarte, abrir(c)], sequencia, melhorSequencia: Math.max(e.melhorSequencia, sequencia) };
}

export function comprarPicos(e: EstadoPicos): EstadoPicos | null {
  if (!e.estoque.length) return null;
  return { ...e, estoque: e.estoque.slice(0, -1), descarte: [...e.descarte, abrir(e.estoque[e.estoque.length - 1])], sequencia: 0 };
}

export const venceuPicos = (e: EstadoPicos) => e.mesa.every((c) => !c);
export const travouPicos = (e: EstadoPicos) => !e.estoque.length && !e.mesa.some((c, i) => c && livrePicos(e, i) && encaixa(e, c));
