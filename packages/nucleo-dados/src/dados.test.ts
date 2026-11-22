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
  it('quem erra perde um dado', () => {
    let e = novoMentiroso(2, () => 3);
    e = apostar(e, 8, 3); // há 10 trios: aposta certa
    e = duvidar(e, () => 2);
    expect(e.revelacao!.perdeu).toBe(1);
    expect(e.dados[1]).toHaveLength(4);
  });
});
