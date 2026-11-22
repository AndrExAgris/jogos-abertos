import type { Carta } from '@ja/nucleo-cartas/baralho';

/**
 * Deslocamento vertical de cada carta numa coluna, em múltiplos da altura da
 * carta. Cartas viradas encostam mais; colunas longas se comprimem para caber.
 */
export function deslocamentos(col: Carta[], maxAlturas = 3.6): number[] {
  const fechada = 0.16, aberta = 0.3;
  let total = 0;
  for (let i = 0; i < col.length - 1; i++) total += col[i].aberta ? aberta : fechada;
  const fator = total > maxAlturas ? maxAlturas / total : 1;
  const r: number[] = [];
  let y = 0;
  for (const c of col) { r.push(y); y += (c.aberta ? aberta : fechada) * fator; }
  return r;
}

export const alturaColuna = (col: Carta[], maxAlturas = 3.6) => {
  const d = deslocamentos(col, maxAlturas);
  return (d[d.length - 1] ?? 0) + 1;
};
