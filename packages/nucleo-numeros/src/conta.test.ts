import { describe, expect, it } from 'vitest';
import { aplicar, gerarConta, resolverConta } from './conta/index.ts';

describe('conta certa', () => {
  it('só aceita resultados inteiros e positivos', () => {
    expect(aplicar(3, '−', 5)).toBeNull();
    expect(aplicar(7, '÷', 2)).toBeNull();
    expect(aplicar(8, '÷', 2)).toBe(4);
  });
  it('resolve um caso conhecido', () => {
    const r = resolverConta([25, 50, 75, 100, 3, 6], 952);
    expect(r.valor).toBe(952);
  });
  it('gera rodadas sempre exatas', () => {
    for (let i = 0; i < 5; i++) {
      const r = gerarConta(`c${i}`, 2);
      expect(r.numeros).toHaveLength(6);
      const sol = resolverConta(r.numeros, r.alvo);
      expect(sol.valor).toBe(r.alvo);
      // Os passos refazem o alvo.
      expect(sol.passos[sol.passos.length - 1].r).toBe(r.alvo);
    }
  });
});
