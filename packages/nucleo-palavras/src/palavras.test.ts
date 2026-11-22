import { describe, expect, it } from 'vitest';
import { avaliar, palavraValida, sortearRespostas } from './termo/index.ts';
import { cabe, gerarRoda } from './roda/index.ts';
import { gerarCruzada, solucaoCruzada } from './cruzadas/index.ts';

describe('termo', () => {
  it('avalia letras repetidas corretamente', () => {
    expect(avaliar('arara', 'sobra')).toEqual(['nao', 'nao', 'nao', 'certa', 'certa']);
    expect(avaliar('carta', 'tacar')).toEqual(['lugar', 'certa', 'lugar', 'lugar', 'lugar']);
    expect(avaliar('ossos', 'sopas')).toEqual(['lugar', 'lugar', 'nao', 'nao', 'certa']);
    expect(avaliar('casas', 'casas')).toEqual(Array(5).fill('certa'));
    expect(avaliar('ações', 'acoes')).toEqual(Array(5).fill('certa'));
  });
  it('valida palpites e sorteia respostas distintas', () => {
    expect(palavraValida('mundo')).toBe(true);
    expect(palavraValida('xzqwk')).toBe(false);
    const r = sortearRespostas('quarteto', 's');
    expect(new Set(r).size).toBe(4);
  });
});

describe('roda', () => {
  it('as palavras cabem nas letras', () => {
    const r = gerarRoda(6, 'r');
    for (const p of r.palavras) expect(cabe(p, r.letras.join(''))).toBe(true);
    expect(r.palavras.length).toBeGreaterThanOrEqual(5);
  });
});

describe('cruzadas', () => {
  it('cruzamentos batem letra a letra', () => {
    const c = gerarCruzada(12, 'c');
    expect(c.entradas.length).toBeGreaterThanOrEqual(8);
    const sol = solucaoCruzada(c);
    for (const e of c.entradas) for (let i = 0; i < e.palavra.length; i++) {
      expect(sol.get(`${e.x + (e.horizontal ? i : 0)},${e.y + (e.horizontal ? 0 : i)}`)).toBe(e.palavra[i]);
    }
    expect(c.largura).toBeLessThanOrEqual(13);
  });
});
