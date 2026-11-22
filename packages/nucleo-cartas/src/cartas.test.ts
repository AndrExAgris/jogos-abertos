import { describe, expect, it } from 'vitest';
import { baralho } from './baralho/index.ts';
import { comprar, destinoAutomatico, novaPaciencia, semSaida, venceu, type EstadoPaciencia } from './paciencia/index.ts';
import { distribuir, moverSpider, novoSpider, movel } from './spider/index.ts';
import { maxMovel, novoFreecell } from './freecell/index.ts';
import { comprarPiramide, livre, novaPiramide, tirar } from './piramide/index.ts';
import { comprarPicos, cobertasPor, livrePicos, novoPicos } from './picos/index.ts';
import { apostar, novoVinte, parar, pontos } from './vinte-e-um/index.ts';

describe('baralho', () => {
  it('tem 52 cartas distintas e o Spider 104', () => {
    expect(new Set(baralho('x').map((c) => `${c.n}${c.v}`)).size).toBe(52);
    expect(baralho('x', 2, [0]).length).toBe(104);
  });
});

describe('paciência', () => {
  it('distribui 28 cartas e compra do estoque', () => {
    const e = novaPaciencia('p', 3);
    expect(e.colunas.flat().length).toBe(28);
    expect(e.estoque.length).toBe(24);
    const n = comprar(e);
    expect(n.descarte.length).toBe(3);
    expect(venceu(n)).toBe(false);
    destinoAutomatico(n, { tipo: 'descarte' });
  });
});

describe('spider', () => {
  it('distribui 54 e tem estoque de 50', () => {
    const e = novoSpider('s', 1);
    expect(e.colunas.flat().length).toBe(54);
    expect(distribuir(e)!.estoque.length).toBe(40);
  });
  it('só move sequência do mesmo naipe', () => {
    const col = [{ n: 0, v: 5, aberta: true }, { n: 1, v: 4, aberta: true }];
    expect(movel(col, 0)).toBe(false);
    expect(movel(col, 1)).toBe(true);
    const e = { colunas: [[{ n: 0, v: 9, aberta: true }], [{ n: 0, v: 10, aberta: true }], ...Array(8).fill([{ n: 0, v: 1, aberta: true }])], estoque: [], completas: 0 };
    expect(moverSpider(e, 0, 0, 1)!.colunas[1].length).toBe(2);
  });
});

describe('freecell', () => {
  it('8 colunas e limite de movimento', () => {
    const e = novoFreecell('f');
    expect(e.colunas.map((c) => c.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
    expect(maxMovel(e, false)).toBe(5);
  });
});

describe('pirâmide', () => {
  it('só a base está livre e o estoque passa', () => {
    const e = novaPiramide('p');
    expect(livre(e, 27)).toBe(true);
    expect(livre(e, 0)).toBe(false);
    expect(comprarPiramide(e)!.descarte.length).toBe(1);
    const rei = e.piramide.findIndex((c, i) => c?.v === 13 && livre(e, i));
    if (rei >= 0) expect(tirar(e, rei)).not.toBeNull();
  });
});

describe('tripeaks e golf', () => {
  it('coberturas do TriPeaks', () => {
    expect(cobertasPor(0)).toEqual([3, 4]);
    expect(cobertasPor(17)).toEqual([26, 27]);
    expect(cobertasPor(27)).toEqual([]);
    const e = novoPicos('t', 'tripeaks');
    expect(livrePicos(e, 18)).toBe(true);
    expect(livrePicos(e, 0)).toBe(false);
    expect(comprarPicos(e)!.descarte.length).toBe(2);
  });
  it('golf libera a última de cada coluna', () => {
    const e = novoPicos('g', 'golf');
    expect(livrePicos(e, 4)).toBe(true);
    expect(livrePicos(e, 3)).toBe(false);
  });
});

describe('vinte e um', () => {
  it('conta o ás de forma flexível e paga', () => {
    expect(pontos([{ n: 0, v: 1, aberta: true }, { n: 0, v: 13, aberta: true }])).toBe(21);
    expect(pontos([{ n: 0, v: 1, aberta: true }, { n: 0, v: 9, aberta: true }, { n: 0, v: 5, aberta: true }])).toBe(15);
    let e = apostar(novoVinte('v'), 10, 'v');
    expect(e.fichas).toBe(90);
    e = parar(e);
    expect(e.fase).toBe('fim');
    expect([80, 90, 100, 105, 110, 115].includes(e.fichas) || e.fichas >= 90).toBe(true);
  });
});

describe('paciência sem saída', () => {
  it('início normal tem saída; mesa travada não', () => {
    let travadas = 0;
    for (let k = 0; k < 40; k++) if (semSaida(novaPaciencia(`p${k}`, 3))) travadas++;
    expect(travadas).toBeLessThan(10);
    const c = (n: number, v: number, aberta = true) => ({ n, v, aberta });
    const e: EstadoPaciencia = {
      estoque: [], descarte: [c(1, 5)], fundacoes: [[], [], [], []],
      colunas: [[c(0, 2, false), c(1, 9)], [c(3, 3, false), c(0, 9)], [], [], [], [], []],
      virar: 3, passadas: 0,
    };
    // Coluna vazia aceita Rei, mas não há Rei; nada vai para a fundação.
    expect(semSaida(e)).toBe(true);
  });
});
