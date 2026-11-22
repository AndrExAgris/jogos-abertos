/*
 * Separe as Cores (Water Sort). Tubos com até 4 camadas de cor. Despeje a
 * camada de cima de um tubo em outro se ele estiver vazio ou tiver a mesma cor
 * em cima (e espaço). Vence quando cada tubo tem uma cor só (ou está vazio).
 */
import { criarAleatorio } from '@ja/contrato';

export const CAPACIDADE = 4;
export type Tubos = number[][];

export function podeDespejar(t: Tubos, de: number, para: number): boolean {
  if (de === para || !t[de].length || t[para].length >= CAPACIDADE) return false;
  const cor = t[de][t[de].length - 1];
  return !t[para].length || t[para][t[para].length - 1] === cor;
}

export function despejar(t: Tubos, de: number, para: number): Tubos {
  if (!podeDespejar(t, de, para)) return t;
  const n = t.map((x) => x.slice());
  const cor = n[de][n[de].length - 1];
  while (n[de].length && n[de][n[de].length - 1] === cor && n[para].length < CAPACIDADE) n[para].push(n[de].pop()!);
  return n;
}

export const resolvido = (t: Tubos) => t.every((x) => !x.length || (x.length === CAPACIDADE && x.every((c) => c === x[0])));

/** Busca em profundidade com memória: devolve os movimentos ou null. */
export function resolverSepare(t: Tubos, limite = 200000): [number, number][] | null {
  const vistos = new Set<string>();
  const chave = (x: Tubos) => x.map((tubo) => tubo.join('')).sort().join('|');
  const caminho: [number, number][] = [];
  const rec = (x: Tubos): boolean => {
    if (resolvido(x)) return true;
    const k = chave(x);
    if (vistos.has(k) || vistos.size > limite) return false;
    vistos.add(k);
    for (let i = 0; i < x.length; i++) for (let j = 0; j < x.length; j++) {
      if (!podeDespejar(x, i, j)) continue;
      // Não vale tirar um tubo já completo de uma cor só, nem despejar uma cor única em tubo vazio.
      const cor = x[i][x[i].length - 1];
      if (!x[j].length && x[i].every((c) => c === cor)) continue;
      caminho.push([i, j]);
      if (rec(despejar(x, i, j))) return true;
      caminho.pop();
    }
    return false;
  };
  return rec(t) ? caminho.slice() : null;
}

export function gerarSepare(cores: number, vazios: number, semente: string): Tubos {
  const a = criarAleatorio(semente);
  for (;;) {
    const camadas = a.embaralhar(Array.from({ length: cores * CAPACIDADE }, (_, i) => Math.floor(i / CAPACIDADE)));
    const t: Tubos = [];
    for (let k = 0; k < cores; k++) t.push(camadas.slice(k * CAPACIDADE, (k + 1) * CAPACIDADE));
    for (let k = 0; k < vazios; k++) t.push([]);
    if (resolvido(t)) continue;
    // Nenhum tubo começa já resolvido.
    if (t.some((x) => x.length === CAPACIDADE && x.every((c) => c === x[0]))) continue;
    if (resolverSepare(t)) return t;
  }
}
