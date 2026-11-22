/*
 * Paciência (Klondike), virando 1 ou 3 cartas. Sete colunas; monte a fundação
 * de cada naipe do Ás ao Rei. Nas colunas, desça alternando cores; só Rei vai
 * para coluna vazia.
 */
import { abrir, baralho, vermelha, type Carta } from '../baralho/index.ts';

export interface EstadoPaciencia {
  estoque: Carta[];
  descarte: Carta[];
  fundacoes: Carta[][];
  colunas: Carta[][];
  virar: 1 | 3;
  passadas: number;
}

export type Local = { tipo: 'descarte' } | { tipo: 'fundacao'; i: number } | { tipo: 'coluna'; i: number; k: number };

export function novaPaciencia(semente: string, virar: 1 | 3): EstadoPaciencia {
  const b = baralho(semente);
  const colunas: Carta[][] = [];
  for (let c = 0; c < 7; c++) {
    const col = b.splice(0, c + 1);
    col[col.length - 1] = abrir(col[col.length - 1]);
    colunas.push(col);
  }
  return { estoque: b, descarte: [], fundacoes: [[], [], [], []], colunas, virar, passadas: 0 };
}

export const podeNaFundacao = (f: Carta[], c: Carta) => (f.length ? f[f.length - 1].n === c.n && f[f.length - 1].v === c.v - 1 : c.v === 1);
export const podeNaColuna = (col: Carta[], c: Carta) => {
  if (!col.length) return c.v === 13;
  const t = col[col.length - 1];
  return t.aberta && t.v === c.v + 1 && vermelha(t) !== vermelha(c);
};

export function comprar(e: EstadoPaciencia): EstadoPaciencia {
  if (!e.estoque.length) {
    if (!e.descarte.length) return e;
    return { ...e, estoque: e.descarte.slice().reverse().map((c) => ({ ...c, aberta: false })), descarte: [], passadas: e.passadas + 1 };
  }
  const estoque = e.estoque.slice();
  const tiradas = estoque.splice(-Math.min(e.virar, estoque.length)).reverse().map(abrir);
  return { ...e, estoque, descarte: [...e.descarte, ...tiradas] };
}

/** Cartas que saem do local (uma, ou a sequência da coluna a partir de k). */
function pegar(e: EstadoPaciencia, de: Local): Carta[] {
  if (de.tipo === 'descarte') return e.descarte.slice(-1);
  if (de.tipo === 'fundacao') return e.fundacoes[de.i].slice(-1);
  const col = e.colunas[de.i];
  if (!col[de.k]?.aberta) return [];
  return col.slice(de.k);
}

export function mover(e: EstadoPaciencia, de: Local, para: { tipo: 'fundacao' | 'coluna'; i: number }): EstadoPaciencia | null {
  const cartas = pegar(e, de);
  if (!cartas.length) return null;
  if (para.tipo === 'fundacao') {
    if (cartas.length !== 1 || !podeNaFundacao(e.fundacoes[para.i], cartas[0])) return null;
  } else if (!podeNaColuna(e.colunas[para.i], cartas[0]) || (de.tipo === 'coluna' && de.i === para.i)) return null;
  const n: EstadoPaciencia = { ...e, descarte: e.descarte.slice(), fundacoes: e.fundacoes.map((f) => f.slice()), colunas: e.colunas.map((c) => c.slice()) };
  if (de.tipo === 'descarte') n.descarte.pop();
  else if (de.tipo === 'fundacao') n.fundacoes[de.i].pop();
  else {
    n.colunas[de.i].splice(de.k);
    const col = n.colunas[de.i];
    if (col.length && !col[col.length - 1].aberta) col[col.length - 1] = abrir(col[col.length - 1]);
  }
  if (para.tipo === 'fundacao') n.fundacoes[para.i].push(cartas[0]);
  else n.colunas[para.i].push(...cartas);
  return n;
}

/** Manda a carta para a fundação certa, se puder (toque duplo). */
export function paraFundacao(e: EstadoPaciencia, de: Local): EstadoPaciencia | null {
  for (let i = 0; i < 4; i++) { const n = mover(e, de, { tipo: 'fundacao', i }); if (n) return n; }
  return null;
}

/** Melhor destino automático para um toque: fundação, depois a primeira coluna que aceitar. */
export function destinoAutomatico(e: EstadoPaciencia, de: Local): EstadoPaciencia | null {
  const unica = de.tipo !== 'coluna' || de.k === e.colunas[de.i].length - 1;
  if (unica && de.tipo !== 'fundacao') { const f = paraFundacao(e, de); if (f) return f; }
  for (let i = 0; i < 7; i++) { const n = mover(e, de, { tipo: 'coluna', i }); if (n) return n; }
  return null;
}

export const venceu = (e: EstadoPaciencia) => e.fundacoes.every((f) => f.length === 13);
/** Todas as cartas abertas e estoque vazio: dá para terminar sozinho. */
export const podeTerminarSozinho = (e: EstadoPaciencia) => !e.estoque.length && !e.descarte.length && e.colunas.every((c) => c.every((x) => x.aberta));

export function terminarSozinho(e: EstadoPaciencia): EstadoPaciencia {
  let atual = e;
  for (let passos = 0; passos < 60 && !venceu(atual); passos++) {
    let mexeu = false;
    for (let i = 0; i < 7 && !mexeu; i++) {
      const col = atual.colunas[i];
      if (!col.length) continue;
      const n = paraFundacao(atual, { tipo: 'coluna', i, k: col.length - 1 });
      if (n) { atual = n; mexeu = true; }
    }
    if (!mexeu) break;
  }
  return atual;
}
