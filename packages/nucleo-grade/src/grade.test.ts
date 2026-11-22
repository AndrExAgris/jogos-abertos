import { describe, expect, it } from 'vitest';
import { analisar, contarSolucoesAkari, gerarAkari } from './akari/index.ts';
import { analisarTendas, contarSolucoesTendas, gerarTendas } from './tendas/index.ts';
import { gerarPontes, resolvido as pontesResolvido } from './pontes/index.ts';
import { analisarRainhas, contarSolucoesRainhas, gerarRainhas } from './rainhas/index.ts';
import { analisarMosaico, gerarMosaico } from './mosaico/index.ts';
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

describe('mosaico', () => {
  it('gera e a imagem satisfaz as pistas', () => {
    const q = gerarMosaico(8, 8, 'm');
    expect(analisarMosaico(q, new Set(q.solucao)).resolvido).toBe(true);
    expect(q.pistas.filter((p) => p >= 0).length).toBeLessThan(64);
  }, 20000);
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
