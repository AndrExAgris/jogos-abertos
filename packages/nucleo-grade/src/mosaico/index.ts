/*
 * Mosaico (Mosaic, da coleção do Simon Tatham, com gerador próprio). Algumas
 * casas mostram um número: quantas casas pintadas há no quadrado 3×3 em volta
 * dela, contando ela mesma. Pinte as casas certas.
 */
import { criarAleatorio } from '@ja/contrato';

export const SEM_PISTA = -1;

export interface QuebraMosaico {
  largura: number;
  altura: number;
  pistas: number[];
}

export function vizinhanca(w: number, h: number, i: number): number[] {
  const x = i % w, y = Math.floor(i / w);
  const r: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h) r.push(ny * w + nx);
  }
  return r;
}

/** Pistas satisfeitas e pistas já impossíveis (pintadas demais). */
export function analisarMosaico(q: QuebraMosaico, pintadas: Set<number>) {
  const certas = new Set<number>(), erradas = new Set<number>();
  let todas = true;
  q.pistas.forEach((p, i) => {
    if (p === SEM_PISTA) return;
    const n = vizinhanca(q.largura, q.altura, i).filter((c) => pintadas.has(c)).length;
    if (n === p) certas.add(i);
    else { todas = false; if (n > p) erradas.add(i); }
  });
  return { certas, erradas, resolvido: todas };
}

/** Conta soluções até `limite`, com propagação simples pelas pistas. */
export function contarSolucoesMosaico(q: QuebraMosaico, limite = 2, prazo = Date.now() + 1500): number {
  const { largura: w, altura: h, pistas } = q;
  const n = w * h;
  const viz = Array.from({ length: n }, (_, i) => vizinhanca(w, h, i));
  const comPista = pistas.map((p, i) => (p >= 0 ? i : -1)).filter((i) => i >= 0);
  const pistasDe = Array.from({ length: n }, () => [] as number[]);
  for (const p of comPista) for (const c of viz[p]) pistasDe[c].push(p);
  const v = new Int8Array(n).fill(-1); // -1 indefinida, 0 branca, 1 pintada
  let total = 0;
  const ok = (c: number) => {
    for (const p of pistasDe[c]) {
      let pint = 0, und = 0;
      for (const x of viz[p]) { if (v[x] === 1) pint++; else if (v[x] < 0) und++; }
      if (pint > pistas[p] || pint + und < pistas[p]) return false;
    }
    return true;
  };
  // Casas que não estão perto de pista nenhuma são livres: não entram na contagem.
  const ordem = Array.from({ length: n }, (_, i) => i).filter((i) => pistasDe[i].length > 0);
  const rec = (k: number): boolean => {
    if (Date.now() > prazo) throw new Error('prazo');
    if (k === ordem.length) { total++; return total >= limite; }
    const c = ordem[k];
    for (const val of [0, 1]) {
      v[c] = val;
      if (ok(c) && rec(k + 1)) return true;
    }
    v[c] = -1;
    return false;
  };
  try { rec(0); } catch { return limite; }
  // Casas sem pista por perto deixariam a solução ambígua.
  if (ordem.length < n && total > 0) return limite;
  return total;
}

export function gerarMosaico(largura: number, altura: number, semente: string): QuebraMosaico & { solucao: number[] } {
  const a = criarAleatorio(semente);
  const n = largura * altura;
  const imagem = Array.from({ length: n }, () => (a.real() < 0.5 ? 1 : 0));
  const pistas = Array.from({ length: n }, (_, i) => vizinhanca(largura, altura, i).reduce((s, c) => s + imagem[c], 0));
  const q = { largura, altura, pistas };
  const prazoTotal = Date.now() + 3000;
  for (const i of a.embaralhar(Array.from({ length: n }, (_, i) => i))) {
    if (Date.now() > prazoTotal) break;
    const p = pistas[i];
    pistas[i] = SEM_PISTA;
    if (contarSolucoesMosaico(q, 2, Date.now() + 300) !== 1) pistas[i] = p;
  }
  return { ...q, solucao: imagem.map((v, i) => (v ? i : -1)).filter((i) => i >= 0) };
}
