import { describe, expect, it } from 'vitest';
import { TABULEIROS, montar, pecas, pular, pulos } from './resta-um/index.ts';
import { despejar, gerarSepare, resolverSepare, resolvido as separado } from './separe/index.ts';
import { gerarRush, minimoMovimentos, resolvido as rushResolvido, limites, mover } from './rush/index.ts';
import { caminhoLivre, gerarSetas, tirar, vazio } from './setas/index.ts';
import { cruzadas, gerarDesembaraco } from './desembaraco/index.ts';

describe('resta um', () => {
  it('inglês começa com 32 peças e 4 pulos', () => {
    const e = montar(TABULEIROS[0]);
    expect(pecas(e)).toBe(32);
    expect(pulos(e)).toHaveLength(4);
    expect(pecas(pular(e, pulos(e)[0]))).toBe(31);
  });
});

describe('separe as cores', () => {
  it('gera tubos com solução que funciona', () => {
    const t = gerarSepare(6, 2, 's');
    const sol = resolverSepare(t)!;
    let x = t;
    for (const [a, b] of sol) x = despejar(x, a, b);
    expect(separado(x)).toBe(true);
  });
});

describe('hora do rush', () => {
  it('gera com o mínimo de movimentos pedido', () => {
    const r = gerarRush(8, 20, 'r');
    expect(minimoMovimentos(r.veiculos)).toBe(r.movimentos);
    expect(rushResolvido(r.veiculos)).toBe(false);
    for (const v of r.veiculos) {
      expect(v.x + (v.horizontal ? v.tam : 1)).toBeLessThanOrEqual(6);
      expect(v.y + (v.horizontal ? 1 : v.tam)).toBeLessThanOrEqual(6);
    }
  });
  it('limites e mover respeitam os outros carros', () => {
    const v = [{ x: 0, y: 2, tam: 2, horizontal: true }, { x: 3, y: 1, tam: 3, horizontal: false }];
    expect(limites(v, 0)).toEqual([0, 1]);
    expect(mover(v, 0, 1)[0].x).toBe(1);
  });
});

describe('setas', () => {
  it('a ordem inversa sempre resolve', () => {
    for (const sem of ['x', 'y', 'z']) {
      let s = gerarSetas(8, 11, 8, sem);
      const ocupadas = s.setas.reduce((n, x) => n + x.corpo.length, 0);
      expect(ocupadas).toBeGreaterThan(8 * 11 * 0.7);
      expect(s.setas.every((x) => x.corpo.length >= 2)).toBe(true);
      for (let passos = 0; passos < 200 && !vazio(s); passos++) {
        const livre = s.setas.find((x) => caminhoLivre(s, x.id));
        expect(livre).toBeDefined();
        s = tirar(s, livre!.id);
      }
      expect(vazio(s)).toBe(true);
    }
  });
});

describe('desembaraço', () => {
  it('gera grafo embaraçado', () => {
    const g = gerarDesembaraco(10, 'd');
    expect(cruzadas(g).size).toBeGreaterThan(0);
  });
});
