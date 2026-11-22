/*
 * Resta Um. Pule uma peça por cima de outra vizinha (na horizontal ou
 * vertical) até uma casa vazia; a peça pulada sai. Termina quando não há mais
 * pulos; o ideal é sobrar uma só (no centro, para os perfeccionistas).
 */
export interface Tabuleiro {
  id: string;
  nome: string;
  descricao: string;
  /** Linhas com '.' (casa), ' ' (fora) e 'o' (casa vazia no começo). */
  desenho: string[];
}

export const TABULEIROS: Tabuleiro[] = [
  { id: 'ingles', nome: 'Inglês', descricao: 'A cruz clássica de 33 casas, centro vazio', desenho: ['  ...  ', '  ...  ', '.......', '...o...', '.......', '  ...  ', '  ...  '] },
  { id: 'frances', nome: 'Francês', descricao: '37 casas, mais difícil', desenho: ['  ...  ', ' ..... ', '...o...', '.......', '.......', ' ..... ', '  ...  '] },
  { id: 'cruz', nome: 'Cruz pequena', descricao: 'Aquecimento: 6 peças em cruz', desenho: ['  ooo  ', '  o.o  ', 'oo...oo', 'ooo.ooo', 'ooo.ooo', '  ooo  ', '  ooo  '] },
  { id: 'piramide', nome: 'Pirâmide', descricao: '16 peças em triângulo', desenho: ['  ooo  ', '  o.o  ', 'oo...oo', 'o.....o', '.......', '  ooo  ', '  ooo  '] },
];

export interface EstadoRestaUm {
  largura: number;
  altura: number;
  /** -1 fora, 0 vazia, 1 peça. */
  casas: number[];
}

export function montar(t: Tabuleiro): EstadoRestaUm {
  const altura = t.desenho.length, largura = Math.max(...t.desenho.map((l) => l.length));
  const casas: number[] = [];
  for (const linha of t.desenho) for (let x = 0; x < largura; x++) {
    const c = linha[x] ?? ' ';
    casas.push(c === ' ' ? -1 : c === 'o' ? 0 : 1);
  }
  return { largura, altura, casas };
}

export interface Pulo { de: number; sobre: number; para: number }

export function pulos(e: EstadoRestaUm, de?: number): Pulo[] {
  const r: Pulo[] = [];
  const { largura: w, altura: h, casas } = e;
  for (let i = 0; i < casas.length; i++) {
    if (casas[i] !== 1 || (de !== undefined && de !== i)) continue;
    const x = i % w, y = Math.floor(i / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x2 = x + 2 * dx, y2 = y + 2 * dy;
      if (x2 < 0 || y2 < 0 || x2 >= w || y2 >= h) continue;
      const sobre = (y + dy) * w + x + dx, para = y2 * w + x2;
      if (casas[sobre] === 1 && casas[para] === 0) r.push({ de: i, sobre, para });
    }
  }
  return r;
}

export function pular(e: EstadoRestaUm, p: Pulo): EstadoRestaUm {
  const casas = e.casas.slice();
  casas[p.de] = 0; casas[p.sobre] = 0; casas[p.para] = 1;
  return { ...e, casas };
}

export const pecas = (e: EstadoRestaUm) => e.casas.filter((c) => c === 1).length;
