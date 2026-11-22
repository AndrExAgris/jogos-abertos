/*
 * Gerador de Minas sem chute.
 *
 * Portado para TypeScript a partir de mines.c, da Simon Tatham's Portable
 * Puzzle Collection: https://www.chiark.greenend.org.uk/~sgtatham/puzzles/
 *
 * Copyright (c) 2004-2014 Simon Tatham.
 * Portions copyright Richard Boulton, James Harvey, Mike Pinna, Jonas Kölker,
 * Dariusz Olszewski, Michael Schierl, Lambros Lambrou, Bernd Schmidt,
 * Steffen Bauer, Lennard Sprong and Rogier Goossens.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * Alterações deste projeto (GPL-3.0-or-later): estruturas em TypeScript no
 * lugar da tree234, gerador aleatório com semente em texto e nomes em
 * português. O algoritmo (conjuntos locais com contagem de minas, dedução
 * global pelo total e perturbação do tabuleiro) é o mesmo do original.
 */

import type { Aleatorio } from '@ja/contrato';

/** Valores da grade de conhecimento do solucionador. */
const MINA = -1;
const DESCONHECIDA = -2;

function contarBits(m: number): number {
  m = ((m & 0xaaaa) >> 1) + (m & 0x5555);
  m = ((m & 0xcccc) >> 2) + (m & 0x3333);
  m = ((m & 0xf0f0) >> 4) + (m & 0x0f0f);
  m = ((m & 0xff00) >> 8) + (m & 0x00ff);
  return m;
}

/** Conjunto de até 9 casas numa janela 3×3 a partir de (x, y), com a contagem de minas. */
interface Conjunto {
  x: number;
  y: number;
  mascara: number;
  minas: number;
  naFila: boolean;
}

function compararConjuntos(a: Conjunto, b: Conjunto): number {
  return a.y - b.y || a.x - b.x || a.mascara - b.mascara;
}

/**
 * Intersecção (ou diferença, se `diferenca`) do conjunto 1 com o conjunto 2,
 * devolvida como máscara nas coordenadas do conjunto 1.
 */
function combinar(
  x1: number, y1: number, m1: number,
  x2: number, y2: number, m2: number,
  diferenca: boolean,
): number {
  if (Math.abs(x2 - x1) >= 3 || Math.abs(y2 - y1) >= 3) {
    m2 = 0;
  } else {
    while (x2 > x1) { m2 &= ~(4 | 32 | 256); m2 <<= 1; x2--; }
    while (x2 < x1) { m2 &= ~(1 | 8 | 64); m2 >>= 1; x2++; }
    while (y2 > y1) { m2 &= ~(64 | 128 | 256); m2 <<= 3; y2--; }
    while (y2 < y1) { m2 &= ~(1 | 2 | 4); m2 >>= 3; y2++; }
  }
  if (diferenca) m2 ^= 511;
  return m1 & m2;
}

/** Coleção de conjuntos com índice por canto e fila de pendentes. */
class Colecao {
  private porChave = new Map<string, Conjunto>();
  private porCanto = new Map<number, Set<Conjunto>>();
  private fila: Conjunto[] = [];
  private inicioFila = 0;

  constructor(private largura: number) {}

  private canto(x: number, y: number): number {
    // Desloca para aceitar x e y = -1.
    return (y + 2) * (this.largura + 4) + (x + 2);
  }

  get tamanho(): number {
    return this.porChave.size;
  }

  ordenados(): Conjunto[] {
    return [...this.porChave.values()].sort(compararConjuntos);
  }

  colocarNaFila(c: Conjunto): void {
    if (c.naFila) return;
    c.naFila = true;
    this.fila.push(c);
  }

  adicionar(x: number, y: number, mascara: number, minas: number): void {
    while (!(mascara & (1 | 8 | 64))) { mascara >>= 1; x++; }
    while (!(mascara & (1 | 2 | 4))) { mascara >>= 3; y++; }
    const chave = `${x},${y},${mascara}`;
    if (this.porChave.has(chave)) return;
    const c: Conjunto = { x, y, mascara, minas, naFila: false };
    this.porChave.set(chave, c);
    const k = this.canto(x, y);
    let grupo = this.porCanto.get(k);
    if (!grupo) { grupo = new Set(); this.porCanto.set(k, grupo); }
    grupo.add(c);
    this.colocarNaFila(c);
  }

  remover(c: Conjunto): void {
    c.naFila = false;
    this.porChave.delete(`${c.x},${c.y},${c.mascara}`);
    this.porCanto.get(this.canto(c.x, c.y))?.delete(c);
  }

  /** Conjuntos que se sobrepõem ao conjunto dado, em ordem estável. */
  sobrepostos(x: number, y: number, mascara: number): Conjunto[] {
    const res: Conjunto[] = [];
    for (let yy = y - 3; yy < y + 3; yy++) {
      for (let xx = x - 3; xx < x + 3; xx++) {
        if (xx < -1 || yy < -1) continue;
        const grupo = this.porCanto.get(this.canto(xx, yy));
        if (!grupo) continue;
        const ordenado = [...grupo].sort(compararConjuntos);
        for (const s of ordenado) {
          if (combinar(x, y, mascara, s.x, s.y, s.mascara, false)) res.push(s);
        }
      }
    }
    return res;
  }

  proximoDaFila(): Conjunto | null {
    while (this.inicioFila < this.fila.length) {
      const c = this.fila[this.inicioFila++];
      if (c.naFila) {
        c.naFila = false;
        if (this.inicioFila > 1024) {
          this.fila = this.fila.slice(this.inicioFila);
          this.inicioFila = 0;
        }
        return c;
      }
    }
    return null;
  }
}

interface Perturbacao {
  x: number;
  y: number;
  /** +1: virou mina; -1: ficou livre. */
  delta: number;
}

interface Contexto {
  minas: Uint8Array;
  largura: number;
  altura: number;
  sx: number;
  sy: number;
  perturbacaoGrande: boolean;
  aleatorio: Aleatorio;
}

function abrirCasa(ctx: Contexto, x: number, y: number): number {
  const { largura: w, altura: h, minas } = ctx;
  if (minas[y * w + x]) return MINA;
  let n = 0;
  for (let j = -1; j <= 1; j++) {
    if (y + j < 0 || y + j >= h) continue;
    for (let i = -1; i <= 1; i++) {
      if (x + i < 0 || x + i >= w || (i === 0 && j === 0)) continue;
      if (minas[(y + j) * w + (x + i)]) n++;
    }
  }
  return n;
}

/**
 * Resolve o máximo possível sem chute. Devolve -1 se travou, 0 se resolveu
 * sem perturbar, ou o número de perturbações feitas.
 */
function resolver(
  w: number, h: number, n: number, grade: Int8Array,
  ctx: Contexto, permitirPerturbar: boolean,
): number {
  const colecao = new Colecao(w);
  const filaCasas: number[] = [];
  let inicioCasas = 0;
  let perturbacoes = 0;

  const conhecidas = (x: number, y: number, mascara: number, mina: boolean) => {
    let bit = 1;
    for (let yy = 0; yy < 3; yy++) {
      for (let xx = 0; xx < 3; xx++) {
        if (mascara & bit) {
          const i = (y + yy) * w + (x + xx);
          if (grade[i] === DESCONHECIDA) {
            grade[i] = mina ? MINA : abrirCasa(ctx, x + xx, y + yy);
            filaCasas.push(i);
          }
        }
        bit <<= 1;
      }
    }
  };

  for (let i = 0; i < w * h; i++) if (grade[i] !== DESCONHECIDA) filaCasas.push(i);

  for (;;) {
    let fezAlgo = false;

    while (inicioCasas < filaCasas.length) {
      const i = filaCasas[inicioCasas++];
      const x = i % w;
      const y = (i / w) | 0;

      if (grade[i] >= 0) {
        let minas = grade[i];
        let bit = 1;
        let mascara = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) {
              const v = grade[i + dy * w + dx];
              if (v === MINA) minas--;
              else if (v === DESCONHECIDA) mascara |= bit;
            }
            bit <<= 1;
          }
        }
        if (mascara) colecao.adicionar(x - 1, y - 1, mascara, minas);
      }

      for (const s of colecao.sobrepostos(x, y, 1)) {
        const novaMascara = combinar(s.x, s.y, s.mascara, x, y, 1, true);
        const novasMinas = s.minas - (grade[i] === MINA ? 1 : 0);
        if (novaMascara) colecao.adicionar(s.x, s.y, novaMascara, novasMinas);
        colecao.remover(s);
      }
      fezAlgo = true;
    }

    const s = colecao.proximoDaFila();
    if (s) {
      if (s.minas === 0 || s.minas === contarBits(s.mascara)) {
        conhecidas(s.x, s.y, s.mascara, s.minas !== 0);
        continue;
      }
      for (const s2 of colecao.sobrepostos(s.x, s.y, s.mascara)) {
        const asa = combinar(s.x, s.y, s.mascara, s2.x, s2.y, s2.mascara, true);
        const asa2 = combinar(s2.x, s2.y, s2.mascara, s.x, s.y, s.mascara, true);
        const na = contarBits(asa);
        const na2 = contarBits(asa2);
        if (na === s.minas - s2.minas || na2 === s2.minas - s.minas) {
          conhecidas(s.x, s.y, asa, na === s.minas - s2.minas);
          conhecidas(s2.x, s2.y, asa2, na2 === s2.minas - s.minas);
          continue;
        }
        if (na === 0 && na2 !== 0) colecao.adicionar(s2.x, s2.y, asa2, s2.minas - s.minas);
        else if (na2 === 0 && na !== 0) colecao.adicionar(s.x, s.y, asa, s.minas - s2.minas);
      }
      fezAlgo = true;
    } else if (n >= 0) {
      // Dedução global pelo total de minas.
      let restantes = 0;
      let minasRestantes = n;
      for (let i = 0; i < w * h; i++) {
        if (grade[i] === MINA) minasRestantes--;
        else if (grade[i] === DESCONHECIDA) restantes++;
      }
      if (restantes === 0) break;

      if (minasRestantes === 0 || minasRestantes === restantes) {
        for (let i = 0; i < w * h; i++) {
          if (grade[i] === DESCONHECIDA) conhecidas(i % w, (i / w) | 0, 1, minasRestantes !== 0);
        }
        continue;
      }

      const LIMITE = 10;
      if (colecao.tamanho <= LIMITE) {
        const conjuntos = colecao.ordenados();
        const usado: boolean[] = new Array(conjuntos.length).fill(false);
        let cursor = 0;
        for (;;) {
          if (cursor < conjuntos.length) {
            let ok = true;
            for (let i = 0; i < cursor; i++) {
              if (usado[i] && combinar(
                conjuntos[cursor].x, conjuntos[cursor].y, conjuntos[cursor].mascara,
                conjuntos[i].x, conjuntos[i].y, conjuntos[i].mascara, false)) {
                ok = false;
                break;
              }
            }
            if (ok) {
              minasRestantes -= conjuntos[cursor].minas;
              restantes -= contarBits(conjuntos[cursor].mascara);
            }
            usado[cursor++] = ok;
          } else {
            if (restantes > 0 && (minasRestantes === 0 || minasRestantes === restantes)) {
              for (let i = 0; i < w * h; i++) {
                if (grade[i] !== DESCONHECIDA) continue;
                const y = (i / w) | 0;
                const x = i % w;
                let fora = true;
                for (let j = 0; j < conjuntos.length; j++) {
                  if (usado[j] && combinar(conjuntos[j].x, conjuntos[j].y, conjuntos[j].mascara, x, y, 1, false)) {
                    fora = false;
                    break;
                  }
                }
                if (fora) conhecidas(x, y, 1, minasRestantes !== 0);
              }
              fezAlgo = true;
              break;
            }
            while (--cursor >= 0 && !usado[cursor]);
            if (cursor >= 0) {
              minasRestantes += conjuntos[cursor].minas;
              restantes += contarBits(conjuntos[cursor].mascara);
              usado[cursor++] = false;
            } else {
              break;
            }
          }
        }
      }
    }

    if (fezAlgo) continue;

    // Sem saída lógica: pede ao gerador para mexer no tabuleiro.
    if (permitirPerturbar) {
      perturbacoes++;
      let mudancas: Perturbacao[] | null;
      if (colecao.tamanho === 0) {
        mudancas = perturbar(ctx, grade, 0, 0, 0);
      } else {
        const lista = colecao.ordenados();
        const alvo = lista[ctx.aleatorio.inteiro(lista.length)];
        mudancas = perturbar(ctx, grade, alvo.x, alvo.y, alvo.mascara);
      }
      if (mudancas) {
        for (const m of mudancas) {
          if (m.delta < 0 && grade[m.y * w + m.x] !== DESCONHECIDA) filaCasas.push(m.y * w + m.x);
          for (const c of colecao.sobrepostos(m.x, m.y, 1)) {
            c.minas += m.delta;
            colecao.colocarNaFila(c);
          }
        }
        continue;
      }
    }
    break;
  }

  for (let i = 0; i < w * h; i++) if (grade[i] === DESCONHECIDA) return -1;
  return perturbacoes;
}

interface Casa {
  x: number;
  y: number;
  tipo: number;
  sorteio: number;
}

function perturbar(
  ctx: Contexto, grade: Int8Array,
  sx: number, sy: number, mascara: number,
): Perturbacao[] | null {
  const { largura: w, altura: h, minas } = ctx;
  if (!mascara && !ctx.perturbacaoGrande) return null;

  const noConjunto = (x: number, y: number) =>
    mascara === 0
      ? grade[y * w + x] === DESCONHECIDA
      : x >= sx && x < sx + 3 && y >= sy && y < sy + 3 && (mascara & (1 << ((y - sy) * 3 + (x - sx)))) !== 0;

  const casas: Casa[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.abs(y - ctx.sy) <= 1 && Math.abs(x - ctx.sx) <= 1) continue;
      if (noConjunto(x, y)) continue;
      let tipo: number;
      if (grade[y * w + x] !== DESCONHECIDA) {
        tipo = 3;
      } else {
        tipo = 2;
        for (let dy = -1; dy <= 1 && tipo === 2; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h &&
                grade[(y + dy) * w + (x + dx)] !== DESCONHECIDA) {
              tipo = 1;
              break;
            }
          }
        }
      }
      casas.push({ x, y, tipo, sorteio: ctx.aleatorio.bits31() });
    }
  }
  casas.sort((a, b) => a.tipo - b.tipo || a.sorteio - b.sorteio || a.y - b.y || a.x - b.x);

  // Casas do conjunto, cheias e vazias.
  const doConjunto: number[] = [];
  if (mascara) {
    for (let dy = 0; dy < 3; dy++)
      for (let dx = 0; dx < 3; dx++)
        if (mascara & (1 << (dy * 3 + dx))) doConjunto.push((sy + dy) * w + (sx + dx));
  } else {
    for (let i = 0; i < w * h; i++) if (grade[i] === DESCONHECIDA) doConjunto.push(i);
  }
  let cheias = 0;
  let vazias = 0;
  for (const i of doConjunto) { if (minas[i]) cheias++; else vazias++; }

  const paraEncher: Casa[] = [];
  const paraEsvaziar: Casa[] = [];
  for (const c of casas) {
    if (minas[c.y * w + c.x]) paraEsvaziar.push(c);
    else paraEncher.push(c);
    if (paraEncher.length === cheias || paraEsvaziar.length === vazias) break;
  }

  let listaConjunto: number[] | null = null;
  if (paraEncher.length !== cheias && paraEsvaziar.length !== vazias) {
    // Só dá para fazer parte: enche casas sorteadas do conjunto.
    listaConjunto = doConjunto.filter((i) => !minas[i]);
    for (let k = 0; k < paraEsvaziar.length; k++) {
      const j = k + ctx.aleatorio.inteiro(listaConjunto.length - k);
      [listaConjunto[k], listaConjunto[j]] = [listaConjunto[j], listaConjunto[k]];
    }
  }

  const mudancas: Perturbacao[] = [];
  let deltaConjunto: number;
  if (paraEncher.length === cheias && !listaConjunto) {
    for (const c of paraEncher) mudancas.push({ x: c.x, y: c.y, delta: +1 });
    deltaConjunto = -1;
  } else {
    for (const c of paraEsvaziar) mudancas.push({ x: c.x, y: c.y, delta: -1 });
    deltaConjunto = +1;
  }
  if (listaConjunto) {
    for (let j = 0; j < paraEsvaziar.length; j++) {
      const i = listaConjunto[j];
      mudancas.push({ x: i % w, y: (i / w) | 0, delta: deltaConjunto });
    }
  } else {
    for (const i of doConjunto) {
      const atual = minas[i] ? 1 : -1;
      if (deltaConjunto === -atual) mudancas.push({ x: i % w, y: (i / w) | 0, delta: deltaConjunto });
    }
  }

  if (mudancas.length === 0) return null;

  for (const { x, y, delta } of mudancas) {
    minas[y * w + x] = delta > 0 ? 1 : 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (x + dx < 0 || x + dx >= w || y + dy < 0 || y + dy >= h) continue;
        const j = (y + dy) * w + (x + dx);
        if (grade[j] === DESCONHECIDA) continue;
        if (dx === 0 && dy === 0) {
          if (delta > 0) {
            grade[j] = MINA;
          } else {
            let total = 0;
            for (let dy2 = -1; dy2 <= 1; dy2++)
              for (let dx2 = -1; dx2 <= 1; dx2++)
                if (x + dx2 >= 0 && x + dx2 < w && y + dy2 >= 0 && y + dy2 < h &&
                    minas[(y + dy2) * w + (x + dx2)]) total++;
            grade[j] = total;
          }
        } else if (grade[j] >= 0) {
          grade[j] += delta;
        }
      }
    }
  }
  return mudancas;
}

export interface ResultadoGeracao {
  /** 1 onde há mina, 0 onde não há. */
  minas: Uint8Array;
  tentativas: number;
}

/** Maior número de minas aceito para uma grade (o 3×3 da primeira jogada fica livre). */
export function maximoDeMinas(largura: number, altura: number): number {
  return largura * altura - 9;
}

/**
 * Gera um tabuleiro com `n` minas que se resolve só com lógica a partir da
 * primeira jogada em (x, y). A casa inicial e as vizinhas nunca têm mina.
 */
export function gerarMinas(
  largura: number, altura: number, n: number,
  x: number, y: number, aleatorio: Aleatorio,
): ResultadoGeracao {
  const w = largura;
  const h = altura;
  if (n > maximoDeMinas(w, h)) throw new Error('Minas demais para o tamanho da grade.');
  let tentativas = 0;
  for (;;) {
    tentativas++;
    const minas = new Uint8Array(w * h);
    const possiveis: number[] = [];
    for (let i = 0; i < h; i++)
      for (let j = 0; j < w; j++)
        if (Math.abs(i - y) > 1 || Math.abs(j - x) > 1) possiveis.push(i * w + j);
    let k = possiveis.length;
    for (let nn = 0; nn < n; nn++) {
      const i = aleatorio.inteiro(k);
      minas[possiveis[i]] = 1;
      possiveis[i] = possiveis[--k];
    }

    const ctx: Contexto = {
      minas, largura: w, altura: h, sx: x, sy: y,
      perturbacaoGrande: tentativas > 100, aleatorio,
    };
    const grade = new Int8Array(w * h);
    let anterior = -2;
    for (;;) {
      grade.fill(DESCONHECIDA);
      grade[y * w + x] = abrirCasa(ctx, x, y);
      const r = resolver(w, h, n, grade, ctx, true);
      if (r < 0 || (anterior >= 0 && r >= anterior)) break;
      if (r === 0) return { minas, tentativas };
      anterior = r;
    }
  }
}

/**
 * Confere se um tabuleiro pronto se resolve só com lógica a partir de (x, y),
 * sem mexer nas minas. Usado nos testes.
 */
export function resolveSemChute(
  largura: number, altura: number, minas: Uint8Array, x: number, y: number,
): boolean {
  const ctx: Contexto = {
    minas: minas.slice(), largura, altura, sx: x, sy: y,
    perturbacaoGrande: false,
    aleatorio: { real: () => 0, inteiro: () => 0, bits31: () => 0, embaralhar: (l) => l },
  };
  let n = 0;
  for (const m of minas) n += m;
  const grade = new Int8Array(largura * altura).fill(DESCONHECIDA);
  grade[y * largura + x] = abrirCasa(ctx, x, y);
  if (grade[y * largura + x] < 0) return false;
  return resolver(largura, altura, n, grade, ctx, false) === 0;
}
