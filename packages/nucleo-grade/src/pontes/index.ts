/*
 * Pontes (Hashi). Ilhas com números; ligue-as com pontes retas na horizontal ou
 * vertical, até duas entre o mesmo par, sem cruzar outras pontes. Cada ilha tem
 * exatamente o número de pontes indicado e todas ficam ligadas entre si.
 */
import { criarAleatorio } from '@ja/contrato';

export interface Ilha {
  x: number;
  y: number;
  n: number;
}

export interface QuebraPontes {
  largura: number;
  altura: number;
  ilhas: Ilha[];
}

/** Ponte entre as ilhas a e b (a < b) com 1 ou 2 traços. */
export type Pontes = Record<string, number>;
export const chave = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Vizinha visível de cada ilha em cada direção (sem outra ilha no meio). */
export function vizinhas(q: QuebraPontes): number[][] {
  const pos = new Map<string, number>();
  q.ilhas.forEach((il, i) => pos.set(`${il.x},${il.y}`, i));
  return q.ilhas.map((il) => {
    const r: number[] = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let x = il.x + dx, y = il.y + dy;
      while (x >= 0 && y >= 0 && x < q.largura && y < q.altura) {
        const k = pos.get(`${x},${y}`);
        if (k !== undefined) { r.push(k); break; }
        x += dx; y += dy;
      }
    }
    return r;
  });
}

/** Casas por onde a ponte entre a e b passa (sem as ilhas). */
function casasDaPonte(q: QuebraPontes, a: number, b: number): string[] {
  const A = q.ilhas[a], B = q.ilhas[b];
  const r: string[] = [];
  if (A.y === B.y) for (let x = Math.min(A.x, B.x) + 1; x < Math.max(A.x, B.x); x++) r.push(`${x},${A.y}`);
  else for (let y = Math.min(A.y, B.y) + 1; y < Math.max(A.y, B.y); y++) r.push(`${A.x},${y}`);
  return r;
}

export function cruza(q: QuebraPontes, pontes: Pontes, a: number, b: number): boolean {
  const A = q.ilhas[a], B = q.ilhas[b];
  const horizontal = A.y === B.y;
  const minhas = new Set(casasDaPonte(q, a, b));
  for (const [k, v] of Object.entries(pontes)) {
    if (!v) continue;
    const [c, d] = k.split('-').map(Number);
    if (chave(c, d) === chave(a, b)) continue;
    const outraHorizontal = q.ilhas[c].y === q.ilhas[d].y;
    if (outraHorizontal === horizontal) continue;
    if (casasDaPonte(q, c, d).some((s) => minhas.has(s))) return true;
  }
  return false;
}

export function grau(pontes: Pontes, i: number): number {
  let g = 0;
  for (const [k, v] of Object.entries(pontes)) {
    const [a, b] = k.split('-').map(Number);
    if (a === i || b === i) g += v;
  }
  return g;
}

export function resolvido(q: QuebraPontes, pontes: Pontes): boolean {
  if (!q.ilhas.every((il, i) => grau(pontes, i) === il.n)) return false;
  // Conexo?
  const adj = q.ilhas.map(() => [] as number[]);
  for (const [k, v] of Object.entries(pontes)) {
    if (!v) continue;
    const [a, b] = k.split('-').map(Number);
    adj[a].push(b); adj[b].push(a);
  }
  const vistos = new Set([0]);
  const fila = [0];
  while (fila.length) for (const v of adj[fila.pop()!]) if (!vistos.has(v)) { vistos.add(v); fila.push(v); }
  return vistos.size === q.ilhas.length;
}

export function gerarPontes(largura: number, altura: number, quantas: number, semente: string): QuebraPontes & { solucao: Pontes } {
  const a = criarAleatorio(semente);
  for (;;) {
    const ilhas: { x: number; y: number }[] = [{ x: a.inteiro(largura), y: a.inteiro(altura) }];
    const ocupado = new Map<string, number>([[`${ilhas[0].x},${ilhas[0].y}`, 0]]);
    const passa = new Set<string>(); // casas cobertas por ponte
    const pontes: Pontes = {};
    let falhas = 0;
    while (ilhas.length < quantas && falhas < 400) {
      const origem = a.inteiro(ilhas.length);
      const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][a.inteiro(4)];
      const dist = 2 + a.inteiro(Math.max(1, Math.floor(Math.max(largura, altura) / 2)));
      const o = ilhas[origem];
      const x = o.x + dx * dist, y = o.y + dy * dist;
      let ok = x >= 0 && y >= 0 && x < largura && y < altura && !ocupado.has(`${x},${y}`);
      const caminho: string[] = [];
      for (let k = 1; ok && k < dist; k++) {
        const s = `${o.x + dx * k},${o.y + dy * k}`;
        if (ocupado.has(s) || passa.has(s)) ok = false;
        caminho.push(s);
      }
      // A nova ilha não pode ficar colada a outra nem em cima de uma ponte.
      if (ok && (passa.has(`${x},${y}`) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ex, ey]) => ocupado.has(`${x + ex},${y + ey}`)))) ok = false;
      if (!ok) { falhas++; continue; }
      const nova = ilhas.length;
      ilhas.push({ x, y });
      ocupado.set(`${x},${y}`, nova);
      caminho.forEach((s) => passa.add(s));
      pontes[chave(origem, nova)] = a.real() < 0.35 ? 2 : 1;
    }
    if (ilhas.length < Math.min(quantas, 6)) continue;
    const q: QuebraPontes = { largura, altura, ilhas: ilhas.map((il) => ({ ...il, n: 0 })) };
    // Pontes extras entre vizinhas visíveis, sem cruzar.
    const viz = vizinhas(q);
    for (let i = 0; i < ilhas.length; i++) for (const j of viz[i]) {
      if (j < i || pontes[chave(i, j)] || a.real() > 0.3) continue;
      if (!cruza(q, pontes, i, j)) pontes[chave(i, j)] = a.real() < 0.3 ? 2 : 1;
    }
    q.ilhas.forEach((il, i) => (il.n = grau(pontes, i)));
    if (q.ilhas.some((il) => il.n > 8 || il.n === 0)) continue;
    return { ...q, solucao: pontes };
  }
}
