/*
 * Damas, regra brasileira: tabuleiro 8×8, casas escuras; peças andam uma casa
 * na diagonal para a frente e capturam para a frente e para trás. A captura é
 * obrigatória e vale a lei da maioria (tem que tomar o maior número de peças).
 * A dama anda e captura em qualquer distância na diagonal. A peça que chega à
 * última linha vira dama (só se terminar a jogada lá).
 */
export const LADO = 8;

/** 0 vazia; 1/2 peças; 3/4 damas (do jogador 1/2). */
export interface EstadoDamas {
  casas: number[];
  vez: 1 | 2;
  vencedor: 0 | 1 | 2;
}

export interface Lance { caminho: number[]; capturadas: number[] }

export function novasDamas(): EstadoDamas {
  const casas = new Array(64).fill(0);
  for (let i = 0; i < 64; i++) {
    const x = i % 8, y = Math.floor(i / 8);
    if ((x + y) % 2 === 1) { if (y < 3) casas[i] = 2; else if (y > 4) casas[i] = 1; }
  }
  return { casas, vez: 1, vencedor: 0 };
}

const dono = (c: number) => (c === 0 ? 0 : c === 1 || c === 3 ? 1 : 2);
const ehDama = (c: number) => c >= 3;
const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < LADO && y < LADO;
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

function capturas(casas: number[], de: number, peca: number, jaTomadas: number[]): Lance[] {
  const x0 = de % 8, y0 = Math.floor(de / 8);
  const eu = dono(peca);
  const res: Lance[] = [];
  for (const [dx, dy] of DIAG) {
    if (ehDama(peca)) {
      let x = x0 + dx, y = y0 + dy;
      while (dentro(x, y) && casas[y * 8 + x] === 0) { x += dx; y += dy; }
      if (!dentro(x, y)) continue;
      const alvo = y * 8 + x;
      if (dono(casas[alvo]) === eu || jaTomadas.includes(alvo) || dono(casas[alvo]) === 0) continue;
      let x2 = x + dx, y2 = y + dy;
      while (dentro(x2, y2) && casas[y2 * 8 + x2] === 0) {
        const para = y2 * 8 + x2;
        const novo = casas.slice();
        novo[para] = peca; novo[de] = 0;
        const seguintes = capturas(novo, para, peca, [...jaTomadas, alvo]);
        if (seguintes.length) for (const s of seguintes) res.push({ caminho: [para, ...s.caminho], capturadas: [alvo, ...s.capturadas] });
        else res.push({ caminho: [para], capturadas: [alvo] });
        x2 += dx; y2 += dy;
      }
    } else {
      const x = x0 + dx, y = y0 + dy, x2 = x0 + 2 * dx, y2 = y0 + 2 * dy;
      if (!dentro(x2, y2)) continue;
      const alvo = y * 8 + x, para = y2 * 8 + x2;
      if (dono(casas[alvo]) === eu || dono(casas[alvo]) === 0 || jaTomadas.includes(alvo) || casas[para] !== 0) continue;
      const novo = casas.slice();
      novo[para] = peca; novo[de] = 0;
      const seguintes = capturas(novo, para, peca, [...jaTomadas, alvo]);
      if (seguintes.length) for (const s of seguintes) res.push({ caminho: [para, ...s.caminho], capturadas: [alvo, ...s.capturadas] });
      else res.push({ caminho: [para], capturadas: [alvo] });
    }
  }
  return res;
}

/** Todos os lances legais do jogador da vez (já com a lei da maioria). */
export function lancesDamas(e: EstadoDamas): (Lance & { de: number })[] {
  const todos: (Lance & { de: number })[] = [];
  for (let i = 0; i < 64; i++) if (dono(e.casas[i]) === e.vez) for (const c of capturas(e.casas, i, e.casas[i], [])) todos.push({ de: i, ...c });
  if (todos.length) {
    const max = Math.max(...todos.map((l) => l.capturadas.length));
    return todos.filter((l) => l.capturadas.length === max);
  }
  const frente = e.vez === 1 ? -1 : 1;
  for (let i = 0; i < 64; i++) {
    const p = e.casas[i];
    if (dono(p) !== e.vez) continue;
    const x0 = i % 8, y0 = Math.floor(i / 8);
    for (const [dx, dy] of DIAG) {
      if (!ehDama(p) && dy !== frente) continue;
      let x = x0 + dx, y = y0 + dy;
      while (dentro(x, y) && e.casas[y * 8 + x] === 0) {
        todos.push({ de: i, caminho: [y * 8 + x], capturadas: [] });
        if (!ehDama(p)) break;
        x += dx; y += dy;
      }
    }
  }
  return todos;
}

export function jogarDamas(e: EstadoDamas, l: Lance & { de: number }): EstadoDamas {
  const casas = e.casas.slice();
  let p = casas[l.de];
  casas[l.de] = 0;
  for (const c of l.capturadas) casas[c] = 0;
  const fim = l.caminho[l.caminho.length - 1];
  const yFim = Math.floor(fim / 8);
  if (p === 1 && yFim === 0) p = 3;
  if (p === 2 && yFim === 7) p = 4;
  casas[fim] = p;
  const prox: EstadoDamas = { casas, vez: e.vez === 1 ? 2 : 1, vencedor: 0 };
  if (!lancesDamas(prox).length) prox.vencedor = e.vez;
  return prox;
}

export const contarDamas = (e: EstadoDamas) => [e.casas.filter((c) => dono(c) === 1).length, e.casas.filter((c) => dono(c) === 2).length];
