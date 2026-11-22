/* Quatro em Linha: 7 colunas × 6 linhas; quem alinhar quatro primeiro vence. */
export const COLUNAS = 7;
export const LINHAS = 6;

export interface EstadoQuatro {
  /** 0 vazia, 1 ou 2; linha 0 é a de cima. */
  casas: number[];
  vez: 1 | 2;
  vencedor: 0 | 1 | 2 | 'empate';
  linhaVencedora: number[];
}

export const novoQuatro = (): EstadoQuatro => ({ casas: new Array(COLUNAS * LINHAS).fill(0), vez: 1, vencedor: 0, linhaVencedora: [] });

export function soltar(e: EstadoQuatro, coluna: number): EstadoQuatro {
  if (e.vencedor) return e;
  let linha = -1;
  for (let y = LINHAS - 1; y >= 0; y--) if (!e.casas[y * COLUNAS + coluna]) { linha = y; break; }
  if (linha < 0) return e;
  const casas = e.casas.slice();
  const i = linha * COLUNAS + coluna;
  casas[i] = e.vez;
  const linhaV = alinhada(casas, i);
  const vencedor = linhaV.length ? e.vez : casas.every((c) => c) ? 'empate' : 0;
  return { casas, vez: e.vez === 1 ? 2 : 1, vencedor, linhaVencedora: linhaV };
}

function alinhada(casas: number[], i: number): number[] {
  const x0 = i % COLUNAS, y0 = Math.floor(i / COLUNAS), p = casas[i];
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const linha = [i];
    for (const s of [1, -1]) {
      let x = x0 + dx * s, y = y0 + dy * s;
      while (x >= 0 && y >= 0 && x < COLUNAS && y < LINHAS && casas[y * COLUNAS + x] === p) { linha.push(y * COLUNAS + x); x += dx * s; y += dy * s; }
    }
    if (linha.length >= 4) return linha;
  }
  return [];
}
