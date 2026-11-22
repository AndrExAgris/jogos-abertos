/*
 * Desembaraço (Untangle). Um grafo planar com os pontos embaralhados num
 * círculo: arraste os pontos até nenhuma linha cruzar outra.
 */
import { criarAleatorio } from '@ja/contrato';

export interface Ponto { x: number; y: number }
export interface Grafo { pontos: Ponto[]; arestas: [number, number][] }

function cruzamSegmentos(a: Ponto, b: Ponto, c: Ponto, d: Ponto): boolean {
  const o = (p: Ponto, q: Ponto, r: Ponto) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** Arestas que cruzam alguma outra (sem contar as que só dividem um ponto). */
export function cruzadas(g: Grafo): Set<number> {
  const r = new Set<number>();
  const { pontos: p, arestas: e } = g;
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) {
    const [a, b] = e[i], [c, d] = e[j];
    if (a === c || a === d || b === c || b === d) continue;
    if (cruzamSegmentos(p[a], p[b], p[c], p[d])) { r.add(i); r.add(j); }
  }
  return r;
}

export function gerarDesembaraco(n: number, semente: string): Grafo {
  const a = criarAleatorio(semente);
  for (;;) {
    // Pontos sorteados e arestas curtas primeiro, sem cruzar: grafo planar.
    const base: Ponto[] = Array.from({ length: n }, () => ({ x: a.real(), y: a.real() }));
    const pares: [number, number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pares.push([i, j, Math.hypot(base[i].x - base[j].x, base[i].y - base[j].y)]);
    pares.sort((x, y) => x[2] - y[2]);
    const arestas: [number, number][] = [];
    const grau = new Array(n).fill(0);
    for (const [i, j] of pares) {
      if (grau[i] >= 4 || grau[j] >= 4) continue;
      const teste = { pontos: base, arestas: [...arestas, [i, j] as [number, number]] };
      if (cruzadas(teste).has(arestas.length)) continue;
      arestas.push([i, j]); grau[i]++; grau[j]++;
    }
    if (grau.some((g) => g < 2)) continue;
    // Embaralha num círculo.
    const ordem = a.embaralhar(Array.from({ length: n }, (_, i) => i));
    const pontos = base.map(() => ({ x: 0, y: 0 }));
    ordem.forEach((v, k) => {
      const ang = (2 * Math.PI * k) / n;
      pontos[v] = { x: 0.5 + 0.42 * Math.cos(ang), y: 0.5 + 0.42 * Math.sin(ang) };
    });
    const g = { pontos, arestas };
    if (cruzadas(g).size > 0) return g;
  }
}
