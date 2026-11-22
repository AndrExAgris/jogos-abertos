/*
 * Ligue os Números (Numberlink). Ligue os pares de números iguais com
 * caminhos que andam de casa em casa (sem diagonal), sem se cruzar, e
 * preencha a grade toda.
 *
 * Gerador: um caminho que passa por todas as casas (hamiltoniano), embaralhado
 * com movimentos "backbite", é cortado em pedaços; as pontas viram os números.
 */
import { criarAleatorio, type Aleatorio } from '@ja/contrato';

export interface QuebraLigue {
  n: number;
  /** Número em cada casa (0 = vazia). */
  pontas: number[];
}

function caminhoHamiltoniano(n: number, a: Aleatorio): number[] {
  // Começa em ziguezague.
  let p: number[] = [];
  for (let y = 0; y < n; y++) for (let k = 0; k < n; k++) p.push(y * n + (y % 2 ? n - 1 - k : k));
  const adj = (i: number) => {
    const x = i % n, y = Math.floor(i / n);
    const r: number[] = [];
    if (x > 0) r.push(i - 1);
    if (x < n - 1) r.push(i + 1);
    if (y > 0) r.push(i - n);
    if (y < n - 1) r.push(i + n);
    return r;
  };
  for (let passo = 0; passo < n * n * 30; passo++) {
    if (a.real() < 0.5) p.reverse();
    const fim = p[p.length - 1];
    const opcoes = adj(fim).filter((v) => v !== p[p.length - 2]);
    const v = opcoes[a.inteiro(opcoes.length)];
    const k = p.indexOf(v);
    // Backbite: liga a ponta a v e inverte o trecho depois de v.
    p = [...p.slice(0, k + 1), ...p.slice(k + 1).reverse()];
  }
  return p;
}

export function gerarLigue(n: number, semente: string): QuebraLigue & { caminhos: number[][] } {
  const a = criarAleatorio(semente);
  for (;;) {
    const p = caminhoHamiltoniano(n, a);
    const caminhos: number[][] = [];
    let i = 0;
    while (i < p.length) {
      const resta = p.length - i;
      let tam = 3 + a.inteiro(Math.max(1, n + 1));
      if (resta - tam < 3) tam = resta;
      caminhos.push(p.slice(i, i + tam));
      i += tam;
    }
    // Um pedaço reto e curto entre vizinhos facilita demais; e números demais poluem.
    const alvo = Math.round(n * 0.9);
    if (caminhos.length < alvo - 1 || caminhos.length > alvo + 2) continue;
    // Um caminho não pode passar colado nas próprias casas de forma ambígua (atalho).
    const pontas = new Array<number>(n * n).fill(0);
    caminhos.forEach((c, k) => { pontas[c[0]] = k + 1; pontas[c[c.length - 1]] = k + 1; });
    return { n, pontas, caminhos };
  }
}

/** Confere se os caminhos do jogador resolvem o quebra-cabeça. */
export function resolvidoLigue(q: QuebraLigue, caminhos: Record<number, number[]>): boolean {
  const { n, pontas } = q;
  const usado = new Set<number>();
  const numeros = new Set(pontas.filter((v) => v > 0));
  for (const num of numeros) {
    const c = caminhos[num];
    if (!c || c.length < 2) return false;
    const ini = c[0], fim = c[c.length - 1];
    if (pontas[ini] !== num || pontas[fim] !== num || ini === fim) return false;
    for (let k = 0; k < c.length; k++) {
      if (usado.has(c[k])) return false;
      usado.add(c[k]);
      if (k > 0) {
        const a = c[k - 1], b = c[k];
        const d = Math.abs(a - b);
        if (!(d === n || (d === 1 && Math.floor(a / n) === Math.floor(b / n)))) return false;
      }
      if (k > 0 && k < c.length - 1 && pontas[c[k]]) return false;
    }
  }
  return usado.size === n * n;
}
