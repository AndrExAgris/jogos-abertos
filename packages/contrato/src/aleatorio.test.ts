import { describe, expect, it } from 'vitest';
import { criarAleatorio, sementeDoDia } from './aleatorio.ts';

describe('aleatório com semente', () => {
  it('repete a sequência com a mesma semente', () => {
    const a = criarAleatorio('x');
    const b = criarAleatorio('x');
    for (let i = 0; i < 100; i++) expect(a.real()).toBe(b.real());
  });
  it('muda com outra semente', () => {
    expect(criarAleatorio('x').real()).not.toBe(criarAleatorio('y').real());
  });
  it('inteiro fica no intervalo', () => {
    const a = criarAleatorio('z');
    for (let i = 0; i < 1000; i++) {
      const v = a.inteiro(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
  it('semente do dia depende da data', () => {
    expect(sementeDoDia('minas', new Date('2026-01-01T12:00:00Z'))).toBe('minas:2026-01-01');
  });
});
