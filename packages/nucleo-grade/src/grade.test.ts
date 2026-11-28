import { describe, expect, it } from 'vitest';
import { analisar, contarSolucoesAkari, gerarAkari } from './akari/index.ts';
import { analisarTendas, contarSolucoesTendas, gerarTendas } from './tendas/index.ts';
import { gerarPontes, resolvido as pontesResolvido } from './pontes/index.ts';
import { analisarRainhas, contarSolucoesRainhas, gerarRainhas } from './rainhas/index.ts';
import { gerarLigue, resolvidoLigue } from './ligue/index.ts';

describe('akari', () => {
  it('gera com solução única que passa na análise', () => {
    for (const s of ['a', 'b', 'c']) {
      const q = gerarAkari(7, 7, s);
      expect(analisar(q, new Set(q.solucao)).resolvido).toBe(true);
      expect(contarSolucoesAkari(q)).toBe(1);
    }
  }, 30000);
  it('10×10 também', () => {
    const q = gerarAkari(10, 10, 'grande');
    expect(analisar(q, new Set(q.solucao)).resolvido).toBe(true);
  }, 30000);
});

describe('tendas', () => {
  it('gera e a solução confere', () => {
    for (const s of ['a', 'b']) {
      const q = gerarTendas(8, 8, s);
      expect(analisarTendas(q, new Set(q.solucao)).resolvido).toBe(true);
      expect(contarSolucoesTendas(q)).toBeGreaterThanOrEqual(1);
      expect(analisarTendas(q, new Set()).resolvido).toBe(false);
    }
  });
  it('tem solução única e acusa tenda sem árvore ', () => {
    for (const s of ['c', 'd', 'e']) expect(contarSolucoesTendas(gerarTendas(8, 8, s), 2, Date.now() + 10000)).toBe(1);
    // 3×1: árvore no meio, tendas nas pontas = duas tendas para uma árvore só.
    const q = { largura: 3, altura: 1, arvores: [1], linhas: [1], colunas: [1, 0, 0] };
    expect(analisarTendas(q, new Set([0])).resolvido).toBe(true);
    const longe = { largura: 4, altura: 1, arvores: [0], linhas: [1], colunas: [0, 0, 0, 1] };
    expect([...analisarTendas(longe, new Set([3])).semArvore]).toEqual([3]);
  });
});

describe('pontes', () => {
  it('gera e a solução confere', () => {
    for (const s of ['a', 'b', 'c']) {
      const q = gerarPontes(8, 10, 14, s);
      expect(pontesResolvido(q, q.solucao)).toBe(true);
      expect(pontesResolvido(q, {})).toBe(false);
    }
  });
});

describe('rainhas', () => {
  it('gera com solução única', () => {
    for (const n of [5, 7, 8]) {
      const q = gerarRainhas(n, `r${n}`);
      expect(new Set(q.regioes).size).toBe(n);
      expect(analisarRainhas(q, new Set(q.solucao)).resolvido).toBe(true);
      expect(contarSolucoesRainhas(q)).toBe(1);
    }
  });
});

describe('ligue', () => {
  it('gera caminhos que resolvem', () => {
    for (const n of [5, 7, 9]) {
      const q = gerarLigue(n, `l${n}`);
      const mapa: Record<number, number[]> = {};
      q.caminhos.forEach((c, k) => (mapa[k + 1] = c));
      expect(resolvidoLigue(q, mapa)).toBe(true);
      expect(resolvidoLigue(q, {})).toBe(false);
    }
  });
});

describe('Sumplete', async () => {
  const { gerarSumplete, contarSolucoes, resolvido } = await import('./sumplete/index.ts');
  it('gera grades com solução única e rápida', () => {
    for (const n of [3, 4, 5, 6, 7, 8]) {
      const t = performance.now();
      const q = gerarSumplete(n, `s${n}`);
      expect(contarSolucoes(n, q.numeros, q.alvoLinhas, q.alvoColunas)).toBe(1);
      expect(resolvido(q, q.solucao.map((v) => (v ? 0 : 1)))).toBe(true);
      expect(performance.now() - t).toBeLessThan(3000);
    }
  });
});

import { apagadas, gerarLuzes, tocarLuz } from './luzes/index.ts';
import { gerarNonograma, pistas, resolverLinha, resolverPorLinhas } from './nonograma/index.ts';
describe('luzes e nonograma', () => {
  it('luzes: tocar duas vezes desfaz; gerado tem luz acesa', () => {
    const q = gerarLuzes(5, 'l');
    expect(apagadas(q.acesas)).toBe(false);
    expect(tocarLuz(tocarLuz(q.acesas, 5, 7), 5, 7)).toEqual(q.acesas);
  });
  it('nonograma: linha e geração com solução por dedução', () => {
    expect(pistas([true, true, false, true])).toEqual([2, 1]);
    expect(resolverLinha([3], [-1, -1, -1, -1])).toEqual([-1, 1, 1, -1]);
    expect(resolverLinha([2, 1], [-1, -1, -1, -1])).toEqual([1, 1, 0, 1]);
    for (const [w, h] of [[5, 5], [10, 10], [15, 15]]) {
      const t = Date.now();
      const q = gerarNonograma(w, h, `n${w}`);
      const r = resolverPorLinhas(w, h, q.linhas, q.colunas)!;
      expect(r.map((v) => v === 1)).toEqual(q.solucao);
      console.log('nonograma', w, Date.now() - t, 'ms');
    }
  }, 30000);
});

import { contarSolucoes as contarCharada, gerarCharada, textoDica } from './charada/index.ts';
describe('charada', () => {
  it('gera com solução única em 3, 4 e 5 casas', () => {
    for (const [n, c] of [[3, 3], [4, 4], [5, 5]]) {
      const t = Date.now();
      const q = gerarCharada(n, c, `ch${n}`);
      expect(contarCharada(n, c, q.dicas)).toBe(1);
      console.log('charada', n, Date.now() - t, 'ms', q.dicas.length, 'dicas;', textoDica(q, q.dicas[0]));
    }
  }, 60000);
});
