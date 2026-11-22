/*
 * FreeCell. Todas as cartas abertas em 8 colunas; 4 células livres guardam uma
 * carta cada. Fundações do Ás ao Rei por naipe; colunas descem alternando
 * cores. Dá para mover várias cartas de uma vez se houver espaço livre suficiente.
 */
import { abrir, baralho, vermelha, type Carta } from '../baralho/index.ts';

export interface EstadoFreecell { colunas: Carta[][]; celulas: (Carta | null)[]; fundacoes: Carta[][] }
export type LocalFC = { tipo: 'celula'; i: number } | { tipo: 'coluna'; i: number; k: number } | { tipo: 'fundacao'; i: number };

export function novoFreecell(semente: string): EstadoFreecell {
  const b = baralho(semente).map(abrir);
  const colunas: Carta[][] = Array.from({ length: 8 }, () => []);
  b.forEach((c, i) => colunas[i % 8].push(c));
  return { colunas, celulas: [null, null, null, null], fundacoes: [[], [], [], []] };
}

const sequencia = (col: Carta[], k: number) => {
  for (let i = k + 1; i < col.length; i++) if (col[i].v !== col[i - 1].v - 1 || vermelha(col[i]) === vermelha(col[i - 1])) return false;
  return true;
};
export const maxMovel = (e: EstadoFreecell, paraVazia: boolean) => {
  const celulas = e.celulas.filter((c) => !c).length;
  const vazias = e.colunas.filter((c) => !c.length).length - (paraVazia ? 1 : 0);
  return (celulas + 1) * 2 ** Math.max(0, vazias);
};

export function moverFC(e: EstadoFreecell, de: LocalFC, para: { tipo: 'celula' | 'coluna' | 'fundacao'; i: number }): EstadoFreecell | null {
  let cartas: Carta[];
  if (de.tipo === 'celula') cartas = e.celulas[de.i] ? [e.celulas[de.i]!] : [];
  else if (de.tipo === 'fundacao') cartas = e.fundacoes[de.i].slice(-1);
  else cartas = sequencia(e.colunas[de.i], de.k) ? e.colunas[de.i].slice(de.k) : [];
  if (!cartas.length) return null;
  const c = cartas[0];
  if (para.tipo === 'celula') { if (cartas.length > 1 || e.celulas[para.i]) return null; }
  else if (para.tipo === 'fundacao') {
    const f = e.fundacoes[para.i];
    if (cartas.length > 1 || !(f.length ? f[f.length - 1].n === c.n && f[f.length - 1].v === c.v - 1 : c.v === 1)) return null;
  } else {
    if (de.tipo === 'coluna' && de.i === para.i) return null;
    const col = e.colunas[para.i];
    if (col.length) { const t = col[col.length - 1]; if (t.v !== c.v + 1 || vermelha(t) === vermelha(c)) return null; }
    if (cartas.length > maxMovel(e, !col.length)) return null;
  }
  const n: EstadoFreecell = { colunas: e.colunas.map((x) => x.slice()), celulas: e.celulas.slice(), fundacoes: e.fundacoes.map((f) => f.slice()) };
  if (de.tipo === 'celula') n.celulas[de.i] = null;
  else if (de.tipo === 'fundacao') n.fundacoes[de.i].pop();
  else n.colunas[de.i].splice(de.k);
  if (para.tipo === 'celula') n.celulas[para.i] = c;
  else if (para.tipo === 'fundacao') n.fundacoes[para.i].push(c);
  else n.colunas[para.i].push(...cartas);
  return n;
}

export function destinoFC(e: EstadoFreecell, de: LocalFC): EstadoFreecell | null {
  const unica = de.tipo !== 'coluna' || de.k === e.colunas[de.i].length - 1;
  if (unica && de.tipo !== 'fundacao') for (let i = 0; i < 4; i++) { const n = moverFC(e, de, { tipo: 'fundacao', i }); if (n) return n; }
  for (let i = 0; i < 8; i++) if (e.colunas[i].length) { const n = moverFC(e, de, { tipo: 'coluna', i }); if (n) return n; }
  for (let i = 0; i < 8; i++) if (!e.colunas[i].length) { const n = moverFC(e, de, { tipo: 'coluna', i }); if (n) return n; }
  if (unica && de.tipo === 'coluna') for (let i = 0; i < 4; i++) { const n = moverFC(e, de, { tipo: 'celula', i }); if (n) return n; }
  return null;
}

export const venceuFC = (e: EstadoFreecell) => e.fundacoes.every((f) => f.length === 13);
