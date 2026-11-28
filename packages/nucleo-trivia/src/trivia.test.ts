import { describe, expect, it } from 'vitest';
import { CATEGORIAS, aleatorioDaRodada, chave, quantasNaCategoria, sortearNivel, sortearPergunta, type Pergunta } from './perguntas/index.ts';
import dados from '../../../data/conhecimento/perguntas.json';
import paises from '../../../data/paises/paises.json';
import { FILMES, pistas, sortearFilme, sugerirFilmes } from './filme/index.ts';

describe('perguntas', () => {
  it('toda categoria tem perguntas e as opções incluem a resposta', () => {
    for (const c of CATEGORIAS) expect(quantasNaCategoria(c)).toBeGreaterThan(20);
    const q = sortearPergunta('Mundo', [], aleatorioDaRodada('x', 1))!;
    expect(q.opcoes).toContain(q.r);
    expect(new Set(q.opcoes).size).toBe(4);
  });
  it('sorteia pela dificuldade e nenhuma resposta vem quebrada', () => {
    for (let d = 1; d <= 5; d++) {
      const q = sortearNivel(d, [], aleatorioDaRodada('n', d))!;
      expect(q.d).toBe(d);
      expect(q.opcoes.join(' ')).not.toMatch(/https?:/);
    }
  });
});

describe('banco variado', () => {
  const todas = dados as Pergunta[];
  it('cada categoria tem vários tipos de pergunta e o sorteio passa por muitos deles', () => {
    for (const c of CATEGORIAS) {
      const tipos = new Set(todas.filter((q) => q.c === c).map((q) => q.t));
      expect(tipos.size, c).toBeGreaterThanOrEqual(6);
      const usadas: string[] = [];
      const vistos = new Set<string | undefined>();
      for (let i = 0; i < 40; i++) {
        const q = sortearPergunta(c, usadas, aleatorioDaRodada('v' + c, i))!;
        usadas.push(chave(q));
        vistos.add(q.t);
      }
      expect(new Set(usadas).size).toBe(40);
      expect(vistos.size, c).toBeGreaterThanOrEqual(8);
    }
  });
  it('Variedades mistura perguntas fáceis das outras categorias', () => {
    const cats = new Set<string>();
    for (let i = 0; i < 40; i++) cats.add(sortearPergunta('Variedades', [], aleatorioDaRodada('mix', i))!.c);
    expect(cats.has('Variedades')).toBe(true);
    expect(cats.size).toBeGreaterThan(2);
  });
  it('perguntas com imagem apontam para países da base e não se repetem', () => {
    const ids = new Set((paises as { id: string }[]).map((p) => p.id));
    const img = todas.filter((q) => q.img);
    expect(img.filter((q) => q.img!.tipo === 'bandeira').length).toBeGreaterThanOrEqual(30);
    expect(img.filter((q) => q.img!.tipo === 'contorno').length).toBeGreaterThanOrEqual(30);
    for (const q of img) expect(ids.has(q.img!.pais), q.img!.pais).toBe(true);
    expect(new Set(todas.map(chave)).size).toBe(todas.length);
  });
  it('toda pergunta tem quatro opções diferentes e nota de 1 a 5', () => {
    for (const q of todas) {
      expect(new Set([q.r, ...q.e]).size, q.p).toBe(4);
      expect(q.d! >= 1 && q.d! <= 5, q.p).toBe(true);
    }
  });
});

describe('filmes', () => {
  it('tem pistas completas e autocompletar', () => {
    const f = FILMES[sortearFilme('f')];
    expect(pistas(f)).toHaveLength(6);
    expect(sugerirFilmes(f.titulo.slice(0, 5))).toContain(FILMES.indexOf(f));
  });
});
