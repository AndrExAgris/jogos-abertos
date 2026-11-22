/*
 * Apague as Luzes: tocar numa casa inverte ela e as quatro vizinhas (em cruz).
 * O objetivo é apagar todas. O tabuleiro sai de toques aleatórios a partir do
 * tudo apagado, então sempre tem solução.
 */
import { criarAleatorio } from '@ja/contrato';

export interface QuebraLuzes { n: number; acesas: boolean[]; toques: number }

export function tocarLuz(acesas: boolean[], n: number, i: number): boolean[] {
  const r = acesas.slice();
  const x = i % n, y = Math.floor(i / n);
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < n && ny >= 0 && ny < n) r[ny * n + nx] = !r[ny * n + nx];
  }
  return r;
}

export function gerarLuzes(n: number, semente: string): QuebraLuzes {
  const a = criarAleatorio(semente);
  for (;;) {
    let acesas = new Array<boolean>(n * n).fill(false);
    // Cada casa tocada no máximo uma vez (tocar duas vezes desfaz).
    const casas = a.embaralhar(Array.from({ length: n * n }, (_, i) => i)).slice(0, Math.max(3, Math.round(n * n * 0.4)));
    for (const i of casas) acesas = tocarLuz(acesas, n, i);
    if (acesas.filter(Boolean).length >= Math.ceil(n * n * 0.25)) return { n, acesas, toques: casas.length };
  }
}

export const apagadas = (acesas: boolean[]) => acesas.every((v) => !v);
