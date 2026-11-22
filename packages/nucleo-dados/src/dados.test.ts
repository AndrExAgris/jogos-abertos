import { describe, expect, it } from 'vitest';
import { guardar, lancar, marcar, novoGeneral, pontosJogada, total } from './general/index.ts';
import { apostaValida, apostar, contar, duvidar, novoMentiroso } from './mentiroso/index.ts';

describe('general', () => {
  it('pontua as jogadas', () => {
    expect(pontosJogada([2, 3, 4, 5, 6], 'seguida', false)).toBe(20);
    expect(pontosJogada([2, 2, 3, 3, 3], 'full', true)).toBe(35);
    expect(pontosJogada([4, 4, 4, 4, 1], 'quadra', false)).toBe(40);
    expect(pontosJogada([6, 6, 6, 6, 6], 'general', true)).toBe(100);
    expect(pontosJogada([6, 6, 1, 2, 6], '6', false)).toBe(18);
    expect(pontosJogada([1, 2, 3, 4, 6], 'seguida', false)).toBe(0);
    expect(pontosJogada([2, 3, 4, 5, 6], 'seguida', false, 'seguida40')).toBe(40);
    expect(pontosJogada([4, 4, 4, 4, 1], 'quadra', true, 'seguida40')).toBe(40);
  });
  it('três lançamentos, guarda dados e passa a vez ao marcar', () => {
    let k = 0;
    const seq = [5, 5, 5, 2, 3, 6, 6];
    let e = lancar(novoGeneral(2), () => seq[k++ % seq.length]);
    e = guardar(e, 0);
    e = lancar(e, () => 4);
    expect(e.dados[0]).toBe(5);
    e = marcar(e, '5');
    expect(e.vez).toBe(1);
    expect(total(e.tabelas[0])).toBe(5);
  });
});

describe('dado mentiroso', () => {
  it('apostas sobem e o 1 é coringa', () => {
    let e = novoMentiroso(2, () => 3);
    expect(apostaValida(e, 1, 1)).toBe(false);
    e = apostar(e, 3, 4);
    expect(apostaValida(e, 3, 4)).toBe(false);
    expect(apostaValida(e, 3, 5)).toBe(true);
    expect(contar([[1, 3], [3, 2]], 3)).toBe(3);
  });
  it('sem coringa: vale apostar no 1 e o 1 não conta para outras faces', () => {
    let e = novoMentiroso(2, () => 1, false);
    expect(apostaValida(e, 1, 1)).toBe(true);
    e = apostar(e, 2, 3);
    e = duvidar(e, () => 2); // só há 1: ninguém tem 3
    expect(e.revelacao!.total).toBe(0);
    expect(e.revelacao!.perdeu).toBe(0);
    expect(e.coringa).toBe(false);
    expect(contar([[1, 3], [3, 2]], 3, false)).toBe(2);
  });
  it('quem erra perde um dado', () => {
    let e = novoMentiroso(2, () => 3);
    e = apostar(e, 8, 3); // há 10 trios: aposta certa
    e = duvidar(e, () => 2);
    expect(e.revelacao!.perdeu).toBe(1);
    expect(e.dados[1]).toHaveLength(4);
  });
});

import { jogadaGeneralIA, lancar as lancarG, marcar as marcarG, novoGeneral as novoG, guardar as guardarG, total as totalG } from './general/index.ts';
import { jogadaIA, novoMentiroso as novoM, apostar as apostarM, duvidar as duvidarM } from './mentiroso/index.ts';
describe('IA dos dados', () => {
  it('General: difícil faz mais pontos que fácil, em média', () => {
    const jogar = (nivel: 'facil' | 'dificil', semente: number) => {
      let x = semente;
      const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
      let e = novoG(1, 'seguida40');
      for (let passos = 0; passos < 200 && !e.fim; passos++) {
        const j = jogadaGeneralIA(e, nivel, rnd);
        if (j.tipo === 'marcar') e = marcarG(e, j.jogada);
        else {
          if (e.lancamentos > 0) e.dados.forEach((_, i) => { if (e.guardados[i] !== j.guardados[i]) e = guardarG(e, i); });
          e = lancarG(e, () => 1 + Math.floor(rnd() * 6));
        }
      }
      expect(e.fim).toBe(true);
      return totalG(e.tabelas[0]);
    };
    let f = 0, d = 0;
    for (let k = 1; k <= 12; k++) { f += jogar('facil', k); d += jogar('dificil', k); }
    expect(d).toBeGreaterThan(f);
  }, 30000);
  it('Mentiroso: computador sempre faz jogada válida e a partida termina', () => {
    let x = 7;
    const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    const sorteio = () => 1 + Math.floor(rnd() * 6);
    for (const coringa of [true, false]) {
    let e = novoM(3, sorteio, coringa);
    for (let passos = 0; passos < 2000 && e.vencedor === null; passos++) {
      const j = jogadaIA(e, (['facil', 'medio', 'dificil'] as const)[e.vez], rnd);
      const antes = e;
      e = j.tipo === 'duvidar' ? duvidarM(e, sorteio) : apostarM(e, j.quantidade, j.face);
      if (j.tipo === 'duvidar' && !antes.aposta) throw new Error('duvidou sem aposta');
      expect(e).not.toBe(antes);
    }
    expect(e.vencedor).not.toBeNull();
    }
  });
});
