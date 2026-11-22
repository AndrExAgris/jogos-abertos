/* Reversi: cerque as peças do outro para virá-las; quem tiver mais no fim vence. */
export const LADO = 8;

export interface EstadoReversi {
  casas: number[];
  vez: 1 | 2;
  fim: boolean;
  passou: boolean;
}

export function novoReversi(): EstadoReversi {
  const casas = new Array(64).fill(0);
  casas[27] = 2; casas[28] = 1; casas[35] = 1; casas[36] = 2;
  return { casas, vez: 1, fim: false, passou: false };
}

/** Peças que virariam jogando em i. */
export function viradas(casas: number[], i: number, vez: number): number[] {
  if (casas[i]) return [];
  const outro = vez === 1 ? 2 : 1;
  const r: number[] = [];
  const x0 = i % LADO, y0 = Math.floor(i / LADO);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const linha: number[] = [];
    let x = x0 + dx, y = y0 + dy;
    while (x >= 0 && y >= 0 && x < LADO && y < LADO && casas[y * LADO + x] === outro) { linha.push(y * LADO + x); x += dx; y += dy; }
    if (linha.length && x >= 0 && y >= 0 && x < LADO && y < LADO && casas[y * LADO + x] === vez) r.push(...linha);
  }
  return r;
}

export const lancesReversi = (e: EstadoReversi) => e.casas.map((_, i) => i).filter((i) => viradas(e.casas, i, e.vez).length > 0);

export function jogarReversi(e: EstadoReversi, i: number): EstadoReversi {
  const v = viradas(e.casas, i, e.vez);
  if (!v.length || e.fim) return e;
  const casas = e.casas.slice();
  casas[i] = e.vez;
  for (const k of v) casas[k] = e.vez;
  return proximaVez({ casas, vez: e.vez, fim: false, passou: false });
}

/** Passa a vez; se o próximo não tiver lance, passa de novo; sem lances para ninguém, fim. */
function proximaVez(e: EstadoReversi): EstadoReversi {
  const outro = (e.vez === 1 ? 2 : 1) as 1 | 2;
  if (lancesReversi({ ...e, vez: outro }).length) return { ...e, vez: outro, passou: false };
  if (lancesReversi(e).length) return { ...e, passou: true };
  return { ...e, fim: true };
}

export const placarReversi = (e: EstadoReversi) => [e.casas.filter((c) => c === 1).length, e.casas.filter((c) => c === 2).length];
