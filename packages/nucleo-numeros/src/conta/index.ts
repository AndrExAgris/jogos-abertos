/*
 * Conta Certa: com 6 números e as quatro operações, chegue ao alvo (ou o mais
 * perto possível). Cada número é usado no máximo uma vez; só resultados
 * inteiros e positivos valem.
 */
import { criarAleatorio } from '@ja/contrato';

export type Op = '+' | '−' | '×' | '÷';

export function aplicar(a: number, op: Op, b: number): number | null {
  switch (op) {
    case '+': return a + b;
    case '−': return a > b ? a - b : null;
    case '×': return a * b;
    case '÷': return b !== 0 && a % b === 0 ? a / b : null;
  }
}

export interface Passo { a: number; op: Op; b: number; r: number }

/** Melhor solução (exata se existir): lista de passos. */
export function resolverConta(numeros: number[], alvo: number): { valor: number; passos: Passo[] } {
  let melhor = { valor: numeros.reduce((m, n) => (Math.abs(n - alvo) < Math.abs(m - alvo) ? n : m), numeros[0]), passos: [] as Passo[] };
  const vistos = new Set<string>();
  const rec = (lista: number[], passos: Passo[]): boolean => {
    const chave = [...lista].sort((x, y) => x - y).join(',');
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    for (let i = 0; i < lista.length; i++) for (let j = 0; j < lista.length; j++) {
      if (i === j) continue;
      for (const op of ['+', '−', '×', '÷'] as Op[]) {
        if ((op === '+' || op === '×') && j < i) continue;
        const a = lista[i], b = lista[j];
        if ((op === '×' || op === '÷') && b === 1) continue;
        const r = aplicar(a, op, b);
        if (r === null) continue;
        const novos = [...passos, { a, op, b, r }];
        if (Math.abs(r - alvo) < Math.abs(melhor.valor - alvo) || (r === alvo && novos.length < melhor.passos.length)) melhor = { valor: r, passos: novos };
        if (r === alvo) return true;
        const resto = lista.filter((_, k) => k !== i && k !== j);
        if (rec([...resto, r], novos)) return true;
      }
    }
    return false;
  };
  rec(numeros, []);
  return melhor;
}

export interface Rodada { numeros: number[]; alvo: number }

/** Grandes: 25, 50, 75, 100. Pequenos: 1 a 10 (dois de cada). */
export function gerarConta(semente: string, quantosGrandes?: number): Rodada {
  const a = criarAleatorio(semente);
  const grandes = quantosGrandes ?? 1 + a.inteiro(3);
  for (;;) {
    const g = a.embaralhar([25, 50, 75, 100]).slice(0, grandes);
    const pequenos = a.embaralhar([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10]).slice(0, 6 - grandes);
    const numeros = [...g, ...pequenos];
    const alvo = 101 + a.inteiro(899);
    if (resolverConta(numeros, alvo).valor === alvo) return { numeros, alvo };
  }
}
