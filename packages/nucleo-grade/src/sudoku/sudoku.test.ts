import { describe, expect, it } from 'vitest';
import { conflitos, contarSolucoes, gerarSudoku, type Regra } from './index.ts';

function valida(regras: Regra[], q: ReturnType<typeof gerarSudoku>) {
  expect(conflitos(regras, q.solucao, q.gaiolas).size).toBe(0);
  for (let i = 0; i < 81; i++) if (q.dadas[i]) expect(q.dadas[i]).toBe(q.solucao[i]);
  expect(contarSolucoes(regras.filter((r) => r !== 'killer'), q.dadas, q.gaiolas)).toBe(1);
}

describe('sudoku', () => {
  it('gera clássico fácil, médio e difícil com solução única', () => {
    for (const d of ['facil', 'medio', 'dificil'] as const) {
      const q = gerarSudoku({ regras: [], dificuldade: d, semente: `c-${d}`, prazo: 3000 });
      valida([], q);
    }
  });
  it('gera com regras globais', () => {
    for (const regras of [['diagonais'], ['anti-rei'], ['anti-cavalo'], ['nao-consecutivo'], ['diagonais', 'anti-rei']] as Regra[][]) {
      const q = gerarSudoku({ regras, dificuldade: 'medio', semente: regras.join('+'), prazo: 3000 });
      valida(regras, q);
    }
  }, 30000);
  it('gera killer com gaiolas que somam certo', () => {
    const q = gerarSudoku({ regras: ['killer'], dificuldade: 'medio', semente: 'k', prazo: 4000 });
    expect(q.gaiolas.length).toBeGreaterThan(15);
    for (const g of q.gaiolas) expect(g.casas.reduce((s, c) => s + q.solucao[c], 0)).toBe(g.soma);
    valida(['killer'], q);
  }, 30000);
  it('acusa conflitos', () => {
    const g = new Array(81).fill(0);
    g[0] = 5; g[1] = 5;
    expect(conflitos([], g)).toEqual(new Set([0, 1]));
    const h = new Array(81).fill(0);
    h[0] = 4; h[1] = 5;
    expect(conflitos(['nao-consecutivo'], h).size).toBe(2);
  });
});
