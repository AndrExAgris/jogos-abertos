/*
 * Paciência Spider com 1, 2 ou 4 naipes (dois baralhos, 104 cartas). Dez
 * colunas; desça em ordem (qualquer naipe), mas só sequências do mesmo naipe
 * andam juntas. Uma sequência completa do Rei ao Ás do mesmo naipe sai.
 * O estoque distribui uma carta para cada coluna (não vale com coluna vazia).
 */
import { abrir, baralho, type Carta } from '../baralho/index.ts';

export interface EstadoSpider { colunas: Carta[][]; estoque: Carta[]; completas: number }

export function novoSpider(semente: string, naipes: 1 | 2 | 4): EstadoSpider {
  const ns = naipes === 1 ? [0] : naipes === 2 ? [0, 1] : [0, 1, 2, 3];
  const b = baralho(semente, 2, ns);
  const colunas: Carta[][] = [];
  for (let c = 0; c < 10; c++) {
    const col = b.splice(0, c < 4 ? 6 : 5);
    col[col.length - 1] = abrir(col[col.length - 1]);
    colunas.push(col);
  }
  return { colunas, estoque: b, completas: 0 };
}

/** A sequência a partir de k é do mesmo naipe e em ordem? */
export function movel(col: Carta[], k: number): boolean {
  if (!col[k]?.aberta) return false;
  for (let i = k + 1; i < col.length; i++) if (col[i].n !== col[k].n || col[i].v !== col[i - 1].v - 1) return false;
  return true;
}

function tirarCompletas(colunas: Carta[][]): number {
  let n = 0;
  for (const col of colunas) {
    if (col.length < 13) continue;
    const k = col.length - 13;
    if (col[k].v === 13 && movel(col, k)) {
      col.splice(k);
      if (col.length && !col[col.length - 1].aberta) col[col.length - 1] = abrir(col[col.length - 1]);
      n++;
    }
  }
  return n;
}

export function moverSpider(e: EstadoSpider, de: number, k: number, para: number): EstadoSpider | null {
  if (de === para || !movel(e.colunas[de], k)) return null;
  const destino = e.colunas[para];
  const c = e.colunas[de][k];
  if (destino.length && destino[destino.length - 1].v !== c.v + 1) return null;
  const colunas = e.colunas.map((x) => x.slice());
  const seq = colunas[de].splice(k);
  colunas[para].push(...seq);
  const origem = colunas[de];
  if (origem.length && !origem[origem.length - 1].aberta) origem[origem.length - 1] = abrir(origem[origem.length - 1]);
  const completas = e.completas + tirarCompletas(colunas);
  return { ...e, colunas, completas };
}

export function destinoSpider(e: EstadoSpider, de: number, k: number): EstadoSpider | null {
  const c = e.colunas[de][k];
  // Prefere coluna com carta do mesmo naipe, depois qualquer carta certa, depois vazia.
  const ordem = [...e.colunas.keys()].filter((i) => i !== de).sort((a, b) => {
    const pa = e.colunas[a], pb = e.colunas[b];
    const nota = (col: Carta[]) => (!col.length ? 1 : col[col.length - 1].v === c.v + 1 ? (col[col.length - 1].n === c.n ? 3 : 2) : 0);
    return nota(pb) - nota(pa);
  });
  for (const i of ordem) { const n = moverSpider(e, de, k, i); if (n) return n; }
  return null;
}

export const podeDistribuir = (e: EstadoSpider) => e.estoque.length >= 10 && e.colunas.every((c) => c.length > 0);

export function distribuir(e: EstadoSpider): EstadoSpider | null {
  if (!podeDistribuir(e)) return null;
  const estoque = e.estoque.slice();
  const colunas = e.colunas.map((c, i) => [...c, abrir(estoque[estoque.length - 1 - i])]);
  estoque.splice(-10);
  return { colunas, estoque, completas: e.completas + tirarCompletas(colunas) };
}

export const venceuSpider = (e: EstadoSpider) => e.completas === 8;
