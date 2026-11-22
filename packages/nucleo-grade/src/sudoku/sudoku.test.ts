import { describe, expect, it } from 'vitest';
import { conflitos, contarSolucoes, gerarSudoku, type Regra } from './index.ts';

function valida(regras: Regra[], q: ReturnType<typeof gerarSudoku>) {
  expect(conflitos(regras, q.solucao, q).size).toBe(0);
  for (let i = 0; i < 81; i++) if (q.dadas[i]) expect(q.dadas[i]).toBe(q.solucao[i]);
  expect(contarSolucoes(regras, q.dadas, q)).toBe(1);
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
  it('gera com pistas de Kropki, XV, par e ímpar e termômetro, e tudo junto', () => {
    for (const regras of [['kropki'], ['xv'], ['par-impar'], ['termometro'], ['killer', 'kropki', 'xv', 'par-impar', 'termometro', 'diagonais', 'anti-rei']] as Regra[][]) {
      const t = Date.now();
      const q = gerarSudoku({ regras, dificuldade: 'dificil', semente: regras.join('+'), prazo: 4000 });
      valida(regras, q);
      if (regras.includes('termometro')) for (const th of q.termometros!) for (let k = 1; k < th.length; k++) expect(q.solucao[th[k]]).toBeGreaterThan(q.solucao[th[k - 1]]);
      console.log(regras.join('+'), Date.now() - t, 'ms', q.dadas.filter(Boolean).length, 'dadas');
    }
  }, 60000);
  it('avisa quando a combinação é impossível', () => {
    expect(() => gerarSudoku({ regras: ['diagonais', 'anti-rei', 'anti-cavalo', 'nao-consecutivo'], dificuldade: 'facil', semente: 'x', prazo: 2000 })).toThrow(/Não foi possível/);
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
