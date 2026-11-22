/*
 * Jogo Real de Ur (regras reconstruídas por Irving Finkel). Cada jogador tem 7
 * peças e lança 4 dados de duas faces (0 a 4 pontos). O caminho tem 14 casas:
 * 4 só suas, 8 no meio (compartilhadas) e 2 só suas; depois a peça sai, com o
 * número exato. Cair numa roseta dá outra jogada; a roseta do meio é segura.
 * Cair sobre uma peça do outro no meio manda ela de volta ao começo.
 *
 * Posição: 0 fora (a entrar), 1..14 no tabuleiro, 15 concluída.
 */
export const ROSETAS = [4, 8, 14];
export const FIM = 15;
const MEIO = (p: number) => p >= 5 && p <= 12;

export interface EstadoUr {
  pecas: [number[], number[]];
  vez: 0 | 1;
  dado: number | null;
  vencedor: 0 | 1 | null;
}

export const novoUr = (): EstadoUr => ({ pecas: [new Array(7).fill(0), new Array(7).fill(0)], vez: 0, dado: null, vencedor: null });

export function destinoUr(e: EstadoUr, k: number): number | null {
  if (e.dado === null || e.dado === 0) return null;
  const p = e.pecas[e.vez][k];
  if (p === FIM) return null;
  const n = p + e.dado;
  if (n > FIM) return null;
  if (n < FIM && e.pecas[e.vez].includes(n)) return null;
  if (n === 8 && e.pecas[1 - e.vez].includes(8)) return null; // roseta do meio protegida
  return n;
}

export const movimentosUr = (e: EstadoUr) => e.pecas[e.vez].map((_, k) => k).filter((k) => destinoUr(e, k) !== null)
  // Peças fora iguais contam como uma só opção.
  .filter((k, i, l) => e.pecas[e.vez][k] !== 0 || l.findIndex((j) => e.pecas[e.vez][j] === 0) === i);

export function lancarUr(e: EstadoUr, valor: number): EstadoUr {
  if (e.dado !== null || e.vencedor !== null) return e;
  const n = { ...e, dado: valor };
  if (!movimentosUr(n).length) return { ...n, dado: null, vez: (1 - e.vez) as 0 | 1 };
  return n;
}

export function moverUr(e: EstadoUr, k: number): EstadoUr {
  const para = destinoUr(e, k);
  if (para === null) return e;
  const pecas: [number[], number[]] = [e.pecas[0].slice(), e.pecas[1].slice()];
  pecas[e.vez][k] = para;
  const outro = (1 - e.vez) as 0 | 1;
  if (MEIO(para)) {
    const ali = pecas[outro].indexOf(para);
    if (ali >= 0) pecas[outro][ali] = 0;
  }
  if (pecas[e.vez].every((p) => p === FIM)) return { pecas, vez: e.vez, dado: null, vencedor: e.vez };
  const deNovo = ROSETAS.includes(para);
  return { pecas, vez: deNovo ? e.vez : outro, dado: null, vencedor: null };
}

/** Casa (linha, coluna) no tabuleiro 3×8 para a posição p do jogador j (0 embaixo, 1 em cima). */
export function casaUr(j: 0 | 1, p: number): [number, number] | null {
  if (p < 1 || p > 14) return null;
  const linha = j === 0 ? 2 : 0;
  if (p <= 4) return [linha, 4 - p];
  if (p <= 12) return [1, p - 5];
  return [linha, 20 - p];
}
