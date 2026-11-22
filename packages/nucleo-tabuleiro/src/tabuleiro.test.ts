import { describe, expect, it } from 'vitest';
import { novoQuatro, soltar } from './quatro/index.ts';
import { jogarReversi, lancesReversi, novoReversi, placarReversi } from './reversi/index.ts';
import { colocar, fase, moverTrilha as moverTrilhaT, novaTrilha, remover, removiveis } from './trilha/index.ts';
import { jogarDamas, lancesDamas, novasDamas, type EstadoDamas } from './damas/index.ts';
import { jogarXadrez, lancesXadrez, novoXadrez, type EstadoXadrez } from './xadrez/index.ts';
import { jogarGo, novoGo, passarGo, pontuacaoGo } from './go/index.ts';
import { moverLudo, movimentosLudo, novoLudo, rolar } from './ludo/index.ts';
import { lancarUr, moverUr, novoUr, casaUr } from './ur/index.ts';
import { arbitrar, novaSinuca, passo, tacada } from './sinuca/index.ts';

describe('quatro em linha', () => {
  it('quatro na vertical vence', () => {
    let e = novoQuatro();
    for (const c of [0, 1, 0, 1, 0, 1, 0]) e = soltar(e, c);
    expect(e.vencedor).toBe(1);
    expect(e.linhaVencedora).toHaveLength(4);
  });
});

describe('reversi', () => {
  it('abre com 4 lances e vira peças', () => {
    const e = novoReversi();
    expect(lancesReversi(e)).toHaveLength(4);
    const n = jogarReversi(e, lancesReversi(e)[0]);
    expect(placarReversi(n)).toEqual([4, 1]);
    expect(n.vez).toBe(2);
  });
});

describe('trilha', () => {
  it('moinho permite tirar peça', () => {
    let e = novaTrilha();
    e = colocar(e, 0); e = colocar(e, 9); e = colocar(e, 1); e = colocar(e, 10); e = colocar(e, 2);
    expect(e.removendo).toBe(true);
    expect(removiveis(e)).toEqual([9, 10]);
    e = remover(e, 9);
    expect(e.casas[9]).toBe(0);
    expect(e.vez).toBe(2);
    expect(fase(e)).toBe('colocar');
  });
});

describe('damas', () => {
  it('abre com 7 lances para as brancas', () => {
    expect(lancesDamas(novasDamas())).toHaveLength(7);
  });
  it('captura obrigatória pela maioria', () => {
    const casas = new Array(64).fill(0);
    // Peça branca em c3 (42), pretas em b4? usa diagonais: branca 42 pode tomar 33 e depois 17.
    casas[42] = 1; casas[33] = 2; casas[17] = 2; casas[35] = 2; casas[0] = 2;
    const e: EstadoDamas = { casas, vez: 1, vencedor: 0 };
    const l = lancesDamas(e);
    expect(l.length).toBeGreaterThan(0);
    expect(Math.max(...l.map((x) => x.capturadas.length))).toBe(l[0].capturadas.length);
    expect(l[0].capturadas.length).toBe(2);
    const n = jogarDamas(e, l[0]);
    expect(n.casas.filter((c) => c === 2).length).toBe(2);
  });
});

describe('xadrez', () => {
  const lance = (e: EstadoXadrez, de: string, para: string) => {
    const c = (s: string) => (8 - Number(s[1])) * 8 + (s.charCodeAt(0) - 97);
    const l = lancesXadrez(e).find((x) => x.de === c(de) && x.para === c(para) && (!x.promocao || x.promocao.toLowerCase() === 'q'));
    if (!l) throw new Error(`lance ilegal ${de}${para}`);
    return jogarXadrez(e, l);
  };
  it('20 lances na abertura', () => expect(lancesXadrez(novoXadrez())).toHaveLength(20));
  it('mate do pastor', () => {
    let e = novoXadrez();
    for (const [a, b] of [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6'], ['h5', 'f7']]) e = lance(e, a, b);
    expect(e.fim).toEqual({ tipo: 'mate', vencedor: 'b' });
  });
  it('en passant e roque', () => {
    let e = novoXadrez();
    for (const [a, b] of [['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5']]) e = lance(e, a, b);
    e = lance(e, 'e5', 'd6');
    expect(e.casas[(8 - 5) * 8 + 3]).toBe('');
    for (const [a, b] of [['a6', 'a5'], ['g1', 'f3'], ['a5', 'a4'], ['f1', 'e2'], ['a4', 'a3']]) e = lance(e, a, b);
    e = lance(e, 'e1', 'g1');
    expect(e.casas[62]).toBe('K');
    expect(e.casas[61]).toBe('R');
  });
});

describe('go', () => {
  it('captura e conta', () => {
    let e = novoGo(9);
    // Pretas cercam a branca em 10 (x1,y1).
    for (const [p, b] of [[1, 10], [9, 40], [11, 41], [19, 42]]) { e = jogarGo(e, p)!; e = jogarGo(e, b)!; }
    expect(e.casas[10]).toBe(0);
    expect(e.capturas[0]).toBe(1);
    e = passarGo(passarGo(e));
    expect(e.fim).toBe(true);
    expect(pontuacaoGo(e).pretas).toBeGreaterThan(0);
  });
  it('suicídio não vale', () => {
    let e = novoGo(9);
    e = jogarGo(e, 1)!; e = jogarGo(e, 80)!; e = jogarGo(e, 9)!;
    expect(jogarGo(e, 0)).toBeNull();
  });
});

describe('ludo', () => {
  it('só sai da base com 6 e o 6 dá outra jogada', () => {
    let e = novoLudo(2);
    e = rolar(e, 3);
    expect(e.vez).toBe(1);
    e = rolar(e, 6);
    expect(movimentosLudo(e)).toHaveLength(4);
    e = moverLudo(e, 0);
    expect(e.vez).toBe(1);
    expect(e.peoes[2][0]).toBe(0);
  });
});

describe('ur', () => {
  it('roseta dá outra jogada e captura no meio', () => {
    let e = novoUr();
    e = lancarUr(e, 4);
    e = moverUr(e, 0);
    expect(e.vez).toBe(0);
    expect(casaUr(0, 4)).toEqual([2, 0]);
    expect(casaUr(1, 5)).toEqual([1, 0]);
  });
});

describe('sinuca', () => {
  it('a tacada espalha e as bolas param', () => {
    let e = tacada(novaSinuca(), 0, 6);
    const ev = { encacapadas: [] as number[], primeiroToque: null as number | null };
    let n = 0;
    while (passo(e.bolas, ev) && n < 5000) n++;
    expect(n).toBeLessThan(5000);
    expect(ev.primeiroToque).not.toBeNull();
    e = arbitrar(e, ev);
    expect(e.vencedor === null || e.vencedor >= 0).toBe(true);
  });
});

import { iaDamas, iaQuatro, iaReversi, iaTrilha, iaXadrez } from './ia/index.ts';
import { atirar, derrotado, posicionar, tiroIA, type Mar } from './naval/index.ts';
describe('computador', () => {
  it('Quatro em Linha: difícil vence o fácil', () => {
    let vit = 0;
    for (let k = 0; k < 4; k++) {
      let e = novoQuatro();
      while (!e.vencedor) e = soltar(e, e.vez === 1 ? iaQuatro(e, 'dificil') : iaQuatro(e, 'facil'));
      if (e.vencedor === 1) vit++;
    }
    expect(vit).toBeGreaterThanOrEqual(3);
  }, 60000);
  it('Quatro em Linha: bloqueia a vitória imediata', () => {
    let e = novoQuatro();
    for (const c of [0, 6, 1, 6, 2]) e = soltar(e, c); // jogador 1 ameaça na coluna 3
    expect(iaQuatro(e, 'medio')).toBe(3);
  });
  it('Reversi, Damas, Xadrez e Trilha: partidas inteiras com lances válidos', () => {
    let r = novoReversi();
    for (let k = 0; k < 80 && !r.fim; k++) r = jogarReversi(r, iaReversi(r, k % 2 ? 'medio' : 'facil'));
    expect(r.fim).toBe(true);
    let d = novasDamas();
    for (let k = 0; k < 150 && !d.vencedor; k++) d = jogarDamas(d, iaDamas(d, k % 2 ? 'medio' : 'facil'));
    let x = novoXadrez();
    const t = Date.now();
    for (let k = 0; k < 20 && !x.fim; k++) x = jogarXadrez(x, iaXadrez(x, 'dificil'));
    console.log('xadrez difícil: 20 lances em', Date.now() - t, 'ms');
    let tr = novaTrilha();
    for (let k = 0; k < 200 && !tr.vencedor; k++) {
      const l = iaTrilha(tr, 'medio');
      tr = l.tipo === 'colocar' ? colocar(tr, l.i) : l.tipo === 'remover' ? remover(tr, l.i) : moverTrilhaT(tr, l.de, l.para);
    }
    expect(tr.casas.length).toBe(24);
  }, 120000);
  it('Batalha Naval: frota sem encostar e computador termina', () => {
    const navios = posicionar('n');
    expect(navios.map((n) => n.casas.length)).toEqual([5, 4, 3, 3, 2]);
    for (const nivel of ['facil', 'medio', 'dificil'] as const) {
      let m: Mar = { navios: posicionar(nivel), tiros: [] };
      let tiros = 0;
      while (!derrotado(m)) { m = atirar(m, tiroIA(m, nivel))!.mar; tiros++; }
      console.log('naval', nivel, tiros, 'tiros');
      expect(tiros).toBeLessThanOrEqual(100);
    }
  });
});
