/*
 * Trilha (moinho de 9 peças). 24 pontos em três quadrados ligados pelos meios.
 * Fases: colocar as 9 peças; depois mover para um ponto vizinho; com 3 peças,
 * voar para qualquer ponto livre. Três em linha (moinho) tira uma peça do outro.
 */
export const PONTOS: [number, number][] = [
  [0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6],
];
export const LIGACOES: [number, number][] = [
  [0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [9, 10], [10, 11], [12, 13], [13, 14], [15, 16], [16, 17], [18, 19], [19, 20], [21, 22], [22, 23],
  [0, 9], [9, 21], [3, 10], [10, 18], [6, 11], [11, 15], [1, 4], [4, 7], [16, 19], [19, 22], [8, 12], [12, 17], [5, 13], [13, 20], [2, 14], [14, 23],
];
export const MOINHOS: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23],
];
const vizinhos = PONTOS.map((_, i) => LIGACOES.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a)));

export interface EstadoTrilha {
  casas: number[];
  vez: 1 | 2;
  /** Peças ainda na mão de cada jogador. */
  mao: [number, number];
  /** Esperando o jogador da vez escolher uma peça do outro para tirar. */
  removendo: boolean;
  vencedor: 0 | 1 | 2;
}

export const novaTrilha = (): EstadoTrilha => ({ casas: new Array(24).fill(0), vez: 1, mao: [9, 9], removendo: false, vencedor: 0 });

const pecasDe = (e: EstadoTrilha, j: number) => e.casas.filter((c) => c === j).length;
export const emMoinho = (casas: number[], i: number) => MOINHOS.some((m) => m.includes(i) && m.every((k) => casas[k] === casas[i] && casas[i]));

export function fase(e: EstadoTrilha): 'colocar' | 'mover' | 'voar' {
  if (e.mao[e.vez - 1] > 0) return 'colocar';
  return pecasDe(e, e.vez) === 3 ? 'voar' : 'mover';
}

export function destinos(e: EstadoTrilha, de: number): number[] {
  if (e.casas[de] !== e.vez || e.removendo) return [];
  const f = fase(e);
  if (f === 'colocar') return [];
  if (f === 'voar') return e.casas.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  return vizinhos[de].filter((v) => !e.casas[v]);
}

/** Peças do outro que podem sair (fora de moinho, salvo se todas estiverem em moinho). */
export function removiveis(e: EstadoTrilha): number[] {
  const outro = e.vez === 1 ? 2 : 1;
  const delas = e.casas.map((c, i) => (c === outro ? i : -1)).filter((i) => i >= 0);
  const fora = delas.filter((i) => !emMoinho(e.casas, i));
  return fora.length ? fora : delas;
}

function passar(e: EstadoTrilha): EstadoTrilha {
  const outro = (e.vez === 1 ? 2 : 1) as 1 | 2;
  const n: EstadoTrilha = { ...e, vez: outro, removendo: false };
  // Sem peças suficientes ou sem movimento: perde.
  if (n.mao[outro - 1] === 0 && pecasDe(n, outro) < 3) return { ...n, vencedor: e.vez };
  if (n.mao[outro - 1] === 0 && fase(n) === 'mover' && !n.casas.some((c, i) => c === outro && destinos(n, i).length)) return { ...n, vencedor: e.vez };
  return n;
}

export function colocar(e: EstadoTrilha, i: number): EstadoTrilha {
  if (e.vencedor || e.removendo || fase(e) !== 'colocar' || e.casas[i]) return e;
  const casas = e.casas.slice();
  casas[i] = e.vez;
  const mao: [number, number] = [...e.mao];
  mao[e.vez - 1]--;
  const n = { ...e, casas, mao };
  return emMoinho(casas, i) ? { ...n, removendo: true } : passar(n);
}

export function moverTrilha(e: EstadoTrilha, de: number, para: number): EstadoTrilha {
  if (e.vencedor || !destinos(e, de).includes(para)) return e;
  const casas = e.casas.slice();
  casas[para] = e.vez; casas[de] = 0;
  const n = { ...e, casas };
  return emMoinho(casas, para) ? { ...n, removendo: true } : passar(n);
}

export function remover(e: EstadoTrilha, i: number): EstadoTrilha {
  if (!e.removendo || !removiveis(e).includes(i)) return e;
  const casas = e.casas.slice();
  casas[i] = 0;
  return passar({ ...e, casas });
}
