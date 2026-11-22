/*
 * Hora do Rush. Grade 6×6 com carros de 2 e caminhões de 3 casas, cada um só
 * anda na própria direção. Tire o carro vermelho (o primeiro, na linha 3)
 * pela saída à direita.
 */
import { criarAleatorio } from '@ja/contrato';

export const LADO = 6;
export const LINHA_SAIDA = 2;

export interface Veiculo { x: number; y: number; tam: number; horizontal: boolean }
export type Rush = Veiculo[];

export function ocupacao(v: Rush): Int8Array {
  const o = new Int8Array(LADO * LADO).fill(-1);
  v.forEach((c, k) => { for (let d = 0; d < c.tam; d++) o[(c.y + (c.horizontal ? 0 : d)) * LADO + c.x + (c.horizontal ? d : 0)] = k; });
  return o;
}

/** Até onde o veículo k pode andar para trás (negativo) e para frente. */
export function limites(v: Rush, k: number): [number, number] {
  const o = ocupacao(v);
  const c = v[k];
  let menos = 0, mais = 0;
  if (c.horizontal) {
    while (c.x + menos - 1 >= 0 && o[c.y * LADO + c.x + menos - 1] < 0) menos--;
    while (c.x + c.tam + mais < LADO && o[c.y * LADO + c.x + c.tam + mais] < 0) mais++;
  } else {
    while (c.y + menos - 1 >= 0 && o[(c.y + menos - 1) * LADO + c.x] < 0) menos--;
    while (c.y + c.tam + mais < LADO && o[(c.y + c.tam + mais) * LADO + c.x] < 0) mais++;
  }
  return [menos, mais];
}

export function mover(v: Rush, k: number, d: number): Rush {
  return v.map((c, i) => (i !== k ? c : c.horizontal ? { ...c, x: c.x + d } : { ...c, y: c.y + d }));
}

export const resolvido = (v: Rush) => v[0].x + v[0].tam === LADO;

const chave = (v: Rush) => v.map((c) => (c.horizontal ? c.x : c.y)).join('');

/** Menor número de movimentos (BFS); -1 se não tem solução. */
export function minimoMovimentos(v: Rush, limite = 60000): number {
  const fila: [Rush, number][] = [[v, 0]];
  const vistos = new Set([chave(v)]);
  for (let i = 0; i < fila.length && vistos.size < limite; i++) {
    const [atual, d] = fila[i];
    if (resolvido(atual)) return d;
    for (let k = 0; k < atual.length; k++) {
      const [a, b] = limites(atual, k);
      for (let p = a; p <= b; p++) {
        if (!p) continue;
        const n = mover(atual, k, p);
        const ch = chave(n);
        if (!vistos.has(ch)) { vistos.add(ch); fila.push([n, d + 1]); }
      }
    }
  }
  return -1;
}

export function gerarRush(minimo: number, maximo: number, semente: string, prazo = 3000): { veiculos: Rush; movimentos: number } {
  const a = criarAleatorio(semente);
  const fim = Date.now() + prazo;
  let melhor: { veiculos: Rush; movimentos: number } | null = null;
  while (Date.now() < fim || !melhor) {
    const v: Rush = [{ x: a.inteiro(3), y: LINHA_SAIDA, tam: 2, horizontal: true }];
    const quantos = 9 + a.inteiro(5);
    for (let t = 0; t < 200 && v.length < quantos; t++) {
      const horizontal = a.real() < 0.5;
      const tam = a.real() < 0.25 ? 3 : 2;
      const x = a.inteiro(horizontal ? LADO - tam + 1 : LADO), y = a.inteiro(horizontal ? LADO : LADO - tam + 1);
      // Nada horizontal na linha da saída além do vermelho.
      if (horizontal && y === LINHA_SAIDA) continue;
      const c = { x, y, tam, horizontal };
      const o = ocupacao(v);
      let livre = true;
      for (let d = 0; d < tam; d++) if (o[(y + (horizontal ? 0 : d)) * LADO + x + (horizontal ? d : 0)] >= 0) livre = false;
      if (livre) v.push(c);
    }
    const m = minimoMovimentos(v);
    if (m < 0) continue;
    if (m >= minimo && m <= maximo) return { veiculos: v, movimentos: m };
    if (!melhor || (m > melhor.movimentos && m <= maximo)) melhor = { veiculos: v, movimentos: m };
  }
  return melhor;
}
