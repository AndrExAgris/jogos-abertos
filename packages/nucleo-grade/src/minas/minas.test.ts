import { describe, expect, it } from 'vitest';
import { criarAleatorio } from '@ja/contrato';
import {
  ABERTA, BANDEIRA, NIVEIS_MINAS, gerarMinas, minas, numero, resolveSemChute,
  validarConfig, vizinhas,
} from './index.ts';

const contar = (a: ArrayLike<number>) => Array.from(a).reduce((s, v) => s + v, 0);

describe('gerador', () => {
  for (const [nivel, c] of Object.entries(NIVEIS_MINAS)) {
    it(`gera ${nivel} sem chute, com a primeira casa e vizinhas livres`, () => {
      for (let s = 0; s < 5; s++) {
        const x = s % c.largura;
        const y = (s * 3) % c.altura;
        const { minas: m } = gerarMinas(c.largura, c.altura, c.minas, x, y, criarAleatorio(`t${s}`));
        expect(contar(m)).toBe(c.minas);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < c.largura && ny < c.altura) expect(m[ny * c.largura + nx]).toBe(0);
          }
        expect(resolveSemChute(c.largura, c.altura, m, x, y)).toBe(true);
      }
    });
  }

  it('é determinístico pela semente', () => {
    const a = gerarMinas(16, 16, 40, 5, 5, criarAleatorio('igual'));
    const b = gerarMinas(16, 16, 40, 5, 5, criarAleatorio('igual'));
    expect(Array.from(a.minas)).toEqual(Array.from(b.minas));
  });

  it('aguenta densidade alta', () => {
    const { minas: m } = gerarMinas(9, 9, 35, 4, 4, criarAleatorio('denso'));
    expect(contar(m)).toBe(35);
    expect(resolveSemChute(9, 9, m, 4, 4)).toBe(true);
  });

  it('reconhece tabuleiros que exigem chute', () => {
    // Minas sorteadas sem o gerador, em densidade alta: quase sempre exigem chute.
    const a = criarAleatorio('chute');
    let exigem = 0;
    for (let k = 0; k < 20; k++) {
      const m = new Uint8Array(81);
      let n = 0;
      while (n < 25) {
        const i = a.inteiro(81);
        const x = i % 9, y = (i / 9) | 0;
        if (m[i] || (Math.abs(x - 4) <= 1 && Math.abs(y - 4) <= 1)) continue;
        m[i] = 1;
        n++;
      }
      if (!resolveSemChute(9, 9, m, 4, 4)) exigem++;
    }
    expect(exigem).toBeGreaterThan(10);
  });
});

describe('jogo', () => {
  const novo = () => minas.novo(NIVEIS_MINAS.facil, 'jogo');

  it('valida configuração', () => {
    expect(validarConfig({ largura: 9, altura: 9, minas: 10 })).toBeNull();
    expect(validarConfig({ largura: 9, altura: 9, minas: 73 })).not.toBeNull();
    expect(validarConfig({ largura: 3, altura: 9, minas: 1 })).not.toBeNull();
  });

  it('primeira jogada nunca perde e abre uma área', () => {
    for (let s = 0; s < 20; s++) {
      const e = minas.jogar(minas.novo(NIVEIS_MINAS.dificil, `p${s}`), { tipo: 'abrir', x: s % 30, y: s % 16 });
      expect(e.resultado).not.toBe('derrota');
      expect(e.casas.filter((c) => c === ABERTA).length).toBeGreaterThan(1);
    }
  });

  it('é imutável', () => {
    const e0 = novo();
    const e1 = minas.jogar(e0, { tipo: 'abrir', x: 4, y: 4 });
    expect(e0.casas.every((c) => c === 0)).toBe(true);
    expect(e0.tabuleiro.length).toBe(0);
    expect(e1).not.toBe(e0);
  });

  it('bandeira alterna e não vale antes da primeira jogada', () => {
    const e0 = novo();
    expect(minas.jogar(e0, { tipo: 'bandeira', x: 0, y: 0 })).toBe(e0);
    let e = minas.jogar(e0, { tipo: 'abrir', x: 4, y: 4 });
    const fechada = e.casas.findIndex((c) => c === 0);
    const x = fechada % 9, y = (fechada / 9) | 0;
    e = minas.jogar(e, { tipo: 'bandeira', x, y });
    expect(e.casas[fechada]).toBe(BANDEIRA);
    e = minas.jogar(e, { tipo: 'bandeira', x, y });
    expect(e.casas[fechada]).toBe(0);
  });

  it('abrir mina perde', () => {
    let e = minas.jogar(novo(), { tipo: 'abrir', x: 4, y: 4 });
    const mina = e.tabuleiro.findIndex((v) => v === 1);
    e = minas.jogar(e, { tipo: 'abrir', x: mina % 9, y: (mina / 9) | 0 });
    expect(e.resultado).toBe('derrota');
    expect(e.explodida).toBe(mina);
  });

  it('abrir todas as casas livres vence e marca as minas', () => {
    let e = minas.jogar(novo(), { tipo: 'abrir', x: 4, y: 4 });
    for (let i = 0; i < 81 && e.resultado === 'andamento'; i++) {
      if (!e.tabuleiro[i]) e = minas.jogar(e, { tipo: 'abrir', x: i % 9, y: (i / 9) | 0 });
    }
    expect(e.resultado).toBe('vitoria');
    e.tabuleiro.forEach((v, i) => { if (v) expect(e.casas[i]).toBe(BANDEIRA); });
  });

  it('acorde abre as vizinhas quando as bandeiras batem', () => {
    let e = minas.jogar(novo(), { tipo: 'abrir', x: 4, y: 4 });
    const alvo = e.casas.findIndex((c, i) => c === ABERTA && numero(e, i) > 0 &&
      vizinhas(e, i).some((v) => e.casas[v] === 0 && !e.tabuleiro[v]));
    expect(alvo).toBeGreaterThanOrEqual(0);
    for (const v of vizinhas(e, alvo)) if (e.tabuleiro[v]) e = minas.jogar(e, { tipo: 'bandeira', x: v % 9, y: (v / 9) | 0 });
    const antes = e.casas.filter((c) => c === ABERTA).length;
    e = minas.jogar(e, { tipo: 'abrir', x: alvo % 9, y: (alvo / 9) | 0 });
    expect(e.casas.filter((c) => c === ABERTA).length).toBeGreaterThan(antes);
    expect(e.resultado).not.toBe('derrota');
  });

  it('serializa e desserializa', () => {
    const e = minas.jogar(novo(), { tipo: 'abrir', x: 2, y: 2 });
    expect(minas.desserializar(minas.serializar(e))).toEqual(e);
  });
});
