import { describe, expect, it } from 'vitest';
import { CATEGORIAS, aleatorioDaRodada, quantasNaCategoria, sortearPergunta } from './perguntas/index.ts';
import { FILMES, pistas, sortearFilme, sugerirFilmes } from './filme/index.ts';

describe('perguntas', () => {
  it('toda categoria tem perguntas e as opções incluem a resposta', () => {
    for (const c of CATEGORIAS) expect(quantasNaCategoria(c)).toBeGreaterThan(20);
    const q = sortearPergunta('Mundo', [], aleatorioDaRodada('x', 1))!;
    expect(q.opcoes).toContain(q.r);
    expect(new Set(q.opcoes).size).toBe(4);
  });
});

describe('filmes', () => {
  it('tem pistas completas e autocompletar', () => {
    const f = FILMES[sortearFilme('f')];
    expect(pistas(f)).toHaveLength(6);
    expect(sugerirFilmes(f.titulo.slice(0, 5))).toContain(FILMES.indexOf(f));
  });
});
