import { describe, expect, it } from 'vitest';
import { PAISES, acharPais, caminhoFronteiras, distanciaBordas, distanciaCapitais, rumo, sortearViagem, sugerir } from './paises/index.ts';

describe('base de países', () => {
  it('tem os países com nome em português do Brasil', () => {
    expect(PAISES.length).toBeGreaterThan(190);
    expect(acharPais('quenia')?.id).toBe('KEN');
    expect(acharPais('Holanda')?.id).toBe('NLD');
    expect(sugerir('bra')[0].nome).toBe('Brasil');
  });
  it('distâncias e direção', () => {
    expect(distanciaBordas('BRA', 'ARG')).toBe(0);
    expect(distanciaBordas('BRA', 'PRT')).toBeGreaterThan(4000);
    const d = distanciaCapitais('BRA', 'ARG');
    expect(d).toBeGreaterThan(2000);
    expect(d).toBeLessThan(2500);
    const r = rumo([0, 0], [10, 0]);
    expect(r).toBeCloseTo(0, 0);
  });
  it('caminho pelas fronteiras', () => {
    const c = caminhoFronteiras('PRT', 'DEU')!;
    expect(c[0]).toBe('PRT');
    expect(c[c.length - 1]).toBe('DEU');
    expect(c.length).toBe(4);
    const v = sortearViagem('x');
    expect(v.caminho.length).toBeGreaterThanOrEqual(4);
  });
});
