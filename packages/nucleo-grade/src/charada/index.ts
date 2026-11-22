/*
 * Charada de Einstein (problema da zebra): N casas em fila, cada uma com um
 * valor de cada categoria (nome, cor, bicho...). As dicas ligam valores; só
 * uma distribuição satisfaz todas. O gerador sorteia a solução, cria muitas
 * dicas verdadeiras e tira as que sobram, mantendo a solução única.
 */
import { criarAleatorio, type Aleatorio } from '@ja/contrato';

/** Categoria com o predicado de cada valor ("bebe café"); o Nome é o sujeito das frases. */
export interface Categoria { nome: string; valores: string[]; pred: (v: string) => string }

export type Item = [number, number];
export type Dica =
  | { tipo: 'igual'; a: Item; b: Item }
  | { tipo: 'diferente'; a: Item; b: Item }
  | { tipo: 'posicao'; a: Item; casa: number }
  | { tipo: 'esquerda'; a: Item; b: Item } // a logo à esquerda de b
  | { tipo: 'vizinho'; a: Item; b: Item }
  | { tipo: 'antes'; a: Item; b: Item } // a em algum lugar à esquerda de b
  | { tipo: 'ponta'; a: Item }; // a numa das pontas

export interface QuebraCharada {
  casas: number;
  categorias: { nome: string; valores: string[] }[];
  /** solucao[c][v] = casa do valor v da categoria c. */
  solucao: number[][];
  dicas: Dica[];
}

export const BANCO: Categoria[] = [
  { nome: 'Nome', valores: ['Ana', 'Bruno', 'Carla', 'Davi', 'Elisa', 'Fábio'], pred: (v) => `se chama ${v}` },
  { nome: 'Cor da casa', valores: ['azul', 'verde', 'amarela', 'vermelha', 'branca', 'roxa'], pred: (v) => `mora na casa ${v}` },
  { nome: 'Bicho', valores: ['gato', 'cachorro', 'peixe', 'papagaio', 'tartaruga', 'coelho'], pred: (v) => `tem ${v === 'tartaruga' ? 'uma' : 'um'} ${v}` },
  { nome: 'Bebida', valores: ['café', 'chá', 'suco', 'leite', 'água', 'refrigerante'], pred: (v) => `bebe ${v}` },
  { nome: 'Esporte', valores: ['futebol', 'vôlei', 'natação', 'xadrez', 'corrida', 'basquete'], pred: (v) => (v === 'natação' || v === 'corrida' ? `faz ${v}` : `joga ${v}`) },
  { nome: 'Fruta', valores: ['manga', 'banana', 'uva', 'caju', 'maçã', 'goiaba'], pred: (v) => `gosta de ${v}` },
];

// --- Solucionador: casa de cada valor, com permutação por categoria ---

function confere(d: Dica, pos: (it: Item) => number): boolean | null {
  const pa = 'a' in d ? pos(d.a) : -1;
  const pb = 'b' in d ? pos(d.b) : -1;
  if (pa < 0 || ('b' in d && pb < 0)) return null; // ainda sem valor
  switch (d.tipo) {
    case 'igual': return pa === pb;
    case 'diferente': return pa !== pb;
    case 'posicao': return pa === d.casa;
    case 'esquerda': return pa === pb - 1;
    case 'vizinho': return Math.abs(pa - pb) === 1;
    case 'antes': return pa < pb;
    case 'ponta': return false; // tratado fora (precisa de n)
  }
}

/** Conta soluções até `limite`. */
export function contarSolucoes(n: number, ncat: number, dicas: Dica[], limite = 2): number {
  const pos: number[][] = Array.from({ length: ncat }, () => new Array(n).fill(-1));
  const p = (it: Item) => pos[it[0]][it[1]];
  const ok = (d: Dica) => {
    if (d.tipo === 'ponta') { const v = p(d.a); return v < 0 ? null : v === 0 || v === n - 1; }
    return confere(d, p);
  };
  // Dicas por categoria em que podem ser checadas (quando a última categoria envolvida termina).
  const porCat: Dica[][] = Array.from({ length: ncat }, () => []);
  for (const d of dicas) {
    const cats = [d.a[0], ...('b' in d ? [d.b[0]] : [])];
    porCat[Math.max(...cats)].push(d);
  }
  let total = 0;
  const usado = Array.from({ length: ncat }, () => new Array(n).fill(false));
  const rec = (c: number, v: number): boolean => {
    if (c === ncat) { total++; return total >= limite; }
    if (v === n) {
      for (const d of porCat[c]) if (ok(d) === false) return false;
      return rec(c + 1, 0);
    }
    for (let casa = 0; casa < n; casa++) {
      if (usado[c][casa]) continue;
      pos[c][v] = casa;
      usado[c][casa] = true;
      // Poda cedo: dicas da mesma categoria ou de anteriores que já dá para checar.
      let falha = false;
      for (const d of porCat[c]) if (ok(d) === false) { falha = true; break; }
      if (!falha && rec(c, v + 1)) return true;
      usado[c][casa] = false;
      pos[c][v] = -1;
    }
    return false;
  };
  rec(0, 0);
  return total;
}

function dicaVerdadeira(a: Aleatorio, sol: number[][], n: number): Dica {
  const ncat = sol.length;
  const item = (): Item => [a.inteiro(ncat), a.inteiro(n)];
  const casa = (it: Item) => sol[it[0]][it[1]];
  for (;;) {
    const x = item();
    const r = a.inteiro(100);
    if (r < 34) {
      // Igual: outro valor de outra categoria na mesma casa.
      const c = (x[0] + 1 + a.inteiro(ncat - 1)) % ncat;
      const v = sol[c].indexOf(casa(x));
      return { tipo: 'igual', a: x, b: [c, v] };
    }
    const y = item();
    if (y[0] === x[0] && y[1] === x[1]) continue;
    const px = casa(x), py = casa(y);
    if (r < 50 && px === py - 1) return { tipo: 'esquerda', a: x, b: y };
    if (r < 64 && Math.abs(px - py) === 1) return { tipo: 'vizinho', a: x, b: y };
    if (r < 72 && px < py && y[0] !== x[0]) return { tipo: 'antes', a: x, b: y };
    if (r < 82 && px !== py && y[0] !== x[0]) return { tipo: 'diferente', a: x, b: y };
    if (r < 90) return { tipo: 'posicao', a: x, casa: px };
    if (r < 96 && (px === 0 || px === n - 1)) return { tipo: 'ponta', a: x };
  }
}

export function gerarCharada(n: number, ncat: number, semente: string): QuebraCharada {
  const a = criarAleatorio(semente);
  const cats = a.embaralhar(BANCO.slice(1)).slice(0, ncat - 1);
  const categorias = [BANCO[0], ...cats].map((c) => ({ nome: c.nome, valores: a.embaralhar(c.valores.slice()).slice(0, n) }));
  const solucao = categorias.map(() => a.embaralhar(Array.from({ length: n }, (_, i) => i)));
  // Nomes em ordem nas casas ficam fáceis demais de ler: a primeira categoria também é embaralhada.
  let dicas: Dica[] = [];
  while (contarSolucoes(n, ncat, dicas) > 1) {
    for (let k = 0; k < n; k++) dicas.push(dicaVerdadeira(a, solucao, n));
  }
  // Tira dicas sobrando (as de posição primeiro, que entregam demais).
  const ordem = a.embaralhar(dicas.map((_, i) => i)).sort((x, y) => Number(dicas[y].tipo === 'posicao') - Number(dicas[x].tipo === 'posicao'));
  const fica = new Set(dicas.map((_, i) => i));
  for (const i of ordem) {
    fica.delete(i);
    if (contarSolucoes(n, ncat, dicas.filter((_, k) => fica.has(k))) !== 1) fica.add(i);
  }
  dicas = a.embaralhar(dicas.filter((_, k) => fica.has(k)));
  return { casas: n, categorias, solucao, dicas };
}

/** Texto da dica em português. */
export function textoDica(q: QuebraCharada, d: Dica): string {
  const ehNome = (it: Item) => q.categorias[it[0]].nome === 'Nome';
  const valor = (it: Item) => q.categorias[it[0]].valores[it[1]];
  const pred = (it: Item) => BANCO.find((c) => c.nome === q.categorias[it[0]].nome)!.pred(valor(it));
  /** Sujeito: o nome, ou "Quem bebe café". */
  const suj = (it: Item) => (ehNome(it) ? valor(it) : `Quem ${pred(it)}`);
  /** Objeto: o nome, ou "quem bebe café". */
  const obj = (it: Item) => (ehNome(it) ? valor(it) : `quem ${pred(it)}`);
  const ord = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta'];
  switch (d.tipo) {
    case 'igual':
      if (ehNome(d.b)) return `${valor(d.b)} ${pred(d.a)}.`;
      if (ehNome(d.a)) return `${valor(d.a)} ${pred(d.b)}.`;
      return `${suj(d.a)} também ${pred(d.b)}.`;
    case 'diferente':
      if (ehNome(d.b)) return `${valor(d.b)} não ${pred(d.a)}.`;
      if (ehNome(d.a)) return `${valor(d.a)} não ${pred(d.b)}.`;
      return `${suj(d.a)} não ${pred(d.b)}.`;
    case 'posicao': return `${suj(d.a)} mora na ${ord[d.casa]} casa.`;
    case 'esquerda': return `${suj(d.a)} mora logo à esquerda de ${obj(d.b)}.`;
    case 'vizinho': return `${suj(d.a)} mora ao lado de ${obj(d.b)}.`;
    case 'antes': return `${suj(d.a)} mora em algum lugar à esquerda de ${obj(d.b)}.`;
    case 'ponta': return `${suj(d.a)} mora numa das pontas.`;
  }
}

/**
 * Situação da dica com o que o jogador já preencheu (atrib[c][casa] = valor ou -1):
 * true (cumprida), false (quebrada) ou null (ainda não dá para saber).
 */
export function avaliarDica(n: number, d: Dica, atrib: number[][]): boolean | null {
  const pos = (it: Item) => atrib[it[0]].indexOf(it[1]);
  if (d.tipo === 'ponta') { const v = pos(d.a); return v < 0 ? null : v === 0 || v === n - 1; }
  return confere(d, pos);
}
