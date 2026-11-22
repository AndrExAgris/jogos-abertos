/*
 * Computador dos jogos para dois: busca minimax com poda alfa-beta e uma
 * avaliação simples por jogo. Fácil: olha um lance à frente, com bastante
 * ruído; médio e difícil: olham mais fundo. Feito aqui, sem motor externo.
 */
import { COLUNAS, LINHAS, soltar, type EstadoQuatro } from '../quatro/index.ts';
import { jogarReversi, lancesReversi, type EstadoReversi } from '../reversi/index.ts';
import { jogarDamas, lancesDamas, type EstadoDamas, type Lance as LanceDamas } from '../damas/index.ts';
import { jogarXadrez, lancesXadrez, type EstadoXadrez, type Lance as LanceXadrez } from '../xadrez/index.ts';
import { MOINHOS, colocar, destinos, fase, moverTrilha, remover, removiveis, type EstadoTrilha } from '../trilha/index.ts';
import { FIM, ROSETAS, destinoUr, movimentosUr, type EstadoUr } from '../ur/index.ts';

export type NivelIA = 'facil' | 'medio' | 'dificil';

interface Regras<E, L> {
  lances(e: E): L[];
  jogar(e: E, l: L): E;
  vez(e: E): number;
  fim(e: E): boolean;
  /** Valor do estado para o jogador `p` (positivo é bom para ele). */
  avaliar(e: E, p: number): number;
  /** Ordena os lances para podar melhor (opcional). */
  ordenar?(e: E, l: L[]): L[];
}

const GANHA = 1_000_000;

function busca<E, L>(r: Regras<E, L>, e: E, prof: number, alfa: number, beta: number, p: number, limite: { nos: number }): number {
  if (r.fim(e) || prof === 0 || limite.nos <= 0) return r.avaliar(e, p) * (1 + prof * 0.001);
  limite.nos--;
  let lances = r.lances(e);
  if (!lances.length) return r.avaliar(e, p);
  if (r.ordenar) lances = r.ordenar(e, lances);
  const max = r.vez(e) === p;
  let melhor = max ? -Infinity : Infinity;
  for (const l of lances) {
    const v = busca(r, r.jogar(e, l), prof - 1, alfa, beta, p, limite);
    if (max) { if (v > melhor) melhor = v; if (melhor > alfa) alfa = melhor; }
    else { if (v < melhor) melhor = v; if (melhor < beta) beta = melhor; }
    if (beta <= alfa) break;
  }
  return melhor;
}

function escolher<E, L>(r: Regras<E, L>, e: E, nivel: NivelIA, prof: Record<NivelIA, number>, rnd: () => number, nos = 60_000): L {
  const lances = r.lances(e);
  if (lances.length === 1) return lances[0];
  const p = r.vez(e);
  // Ordem sorteada: entre lances iguais, varia de uma partida para outra.
  const ordem = lances.map((l) => ({ l, s: rnd() })).sort((a, b) => a.s - b.s).map((x) => x.l);
  const ruido = nivel === 'facil' ? 400 : nivel === 'medio' ? 25 : 2;
  const limite = { nos };
  let melhor = ordem[0], mv = -Infinity;
  for (const l of ordem) {
    const v = busca(r, r.jogar(e, l), prof[nivel] - 1, -Infinity, Infinity, p, limite) + (rnd() - 0.5) * ruido;
    if (v > mv) { mv = v; melhor = l; }
  }
  // Fácil às vezes joga qualquer coisa.
  if (nivel === 'facil' && rnd() < 0.25) return ordem[Math.floor(rnd() * ordem.length)];
  return melhor;
}

// --- Quatro em Linha ---
function avaliarQuatro(e: EstadoQuatro, p: number): number {
  if (e.vencedor === p) return GANHA;
  if (e.vencedor === 'empate') return 0;
  if (e.vencedor) return -GANHA;
  const outro = p === 1 ? 2 : 1;
  let v = 0;
  for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLUNAS; x++) {
    const c = e.casas[y * COLUNAS + x];
    if (c) v += (c === p ? 1 : -1) * (3 - Math.abs(3 - x));
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const xs = x + dx * 3, ys = y + dy * 3;
      if (xs < 0 || xs >= COLUNAS || ys < 0 || ys >= LINHAS) continue;
      let meu = 0, dele = 0;
      for (let k = 0; k < 4; k++) { const q = e.casas[(y + dy * k) * COLUNAS + x + dx * k]; if (q === p) meu++; else if (q === outro) dele++; }
      if (dele === 0) v += meu === 3 ? 50 : meu === 2 ? 8 : 0;
      if (meu === 0) v -= dele === 3 ? 60 : dele === 2 ? 8 : 0;
    }
  }
  return v;
}
const regrasQuatro: Regras<EstadoQuatro, number> = {
  lances: (e) => (e.vencedor ? [] : [3, 2, 4, 1, 5, 0, 6].filter((c) => !e.casas[c])),
  jogar: soltar,
  vez: (e) => e.vez,
  fim: (e) => !!e.vencedor,
  avaliar: avaliarQuatro,
};
export const iaQuatro = (e: EstadoQuatro, n: NivelIA, rnd = Math.random) => escolher(regrasQuatro, e, n, { facil: 2, medio: 4, dificil: 7 }, rnd, 120_000);

// --- Reversi ---
const PESO_REVERSI = [
  100, -20, 10, 5, 5, 10, -20, 100, -20, -40, -2, -2, -2, -2, -40, -20, 10, -2, 2, 1, 1, 2, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 2, 1, 1, 2, -2, 10, -20, -40, -2, -2, -2, -2, -40, -20, 100, -20, 10, 5, 5, 10, -20, 100,
];
const regrasReversi: Regras<EstadoReversi, number> = {
  lances: (e) => (e.fim ? [] : lancesReversi(e)),
  jogar: jogarReversi,
  vez: (e) => e.vez,
  fim: (e) => e.fim,
  avaliar: (e, p) => {
    let meu = 0, dele = 0, v = 0;
    e.casas.forEach((c, i) => { if (c === p) { meu++; v += PESO_REVERSI[i]; } else if (c) { dele++; v -= PESO_REVERSI[i]; } });
    if (e.fim) return meu > dele ? GANHA : meu < dele ? -GANHA : 0;
    const mob = lancesReversi({ ...e, vez: p as 1 | 2 }).length - lancesReversi({ ...e, vez: (p === 1 ? 2 : 1) as 1 | 2 }).length;
    const vazias = 64 - meu - dele;
    return v + mob * 4 + (vazias < 12 ? (meu - dele) * 6 : 0);
  },
};
export const iaReversi = (e: EstadoReversi, n: NivelIA, rnd = Math.random) => escolher(regrasReversi, e, n, { facil: 1, medio: 3, dificil: 5 }, rnd, 80_000);

// --- Damas ---
type LD = LanceDamas & { de: number };
const regrasDamas: Regras<EstadoDamas, LD> = {
  lances: (e) => (e.vencedor ? [] : lancesDamas(e)),
  jogar: jogarDamas,
  vez: (e) => e.vez,
  fim: (e) => !!e.vencedor,
  avaliar: (e, p) => {
    if (e.vencedor) return e.vencedor === p ? GANHA : -GANHA;
    let v = 0;
    e.casas.forEach((c, i) => {
      if (!c) return;
      const dono = c === 1 || c === 3 ? 1 : 2, dama = c > 2, y = Math.floor(i / 8), x = i % 8;
      // Peça vale 100, dama 300; avançar e ficar no centro ajudam um pouco.
      let s = dama ? 300 : 100 + (dono === 1 ? 7 - y : y) * 4;
      if (x > 1 && x < 6 && y > 1 && y < 6) s += 4;
      v += dono === p ? s : -s;
    });
    return v;
  },
  ordenar: (_e, l) => l.slice().sort((a, b) => b.capturadas.length - a.capturadas.length),
};
export const iaDamas = (e: EstadoDamas, n: NivelIA, rnd = Math.random) => escolher(regrasDamas, e, n, { facil: 1, medio: 4, dificil: 6 }, rnd, 60_000);

// --- Xadrez ---
const VALOR: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const CENTRO = (i: number) => { const x = i % 8, y = Math.floor(i / 8); return 6 - (Math.abs(3.5 - x) + Math.abs(3.5 - y)); };
const regrasXadrez: Regras<EstadoXadrez, LanceXadrez> = {
  lances: lancesXadrez,
  jogar: jogarXadrez,
  vez: (e) => (e.vez === 'b' ? 1 : 2),
  fim: (e) => !!e.fim,
  avaliar: (e, p) => {
    const cor = p === 1 ? 'b' : 'p';
    if (e.fim) return e.fim.vencedor === null ? 0 : e.fim.vencedor === cor ? GANHA : -GANHA;
    let v = 0;
    e.casas.forEach((c, i) => {
      if (!c) return;
      const t = c.toLowerCase(), meu = (c === c.toUpperCase()) === (cor === 'b');
      let s = VALOR[t];
      if (t === 'n' || t === 'b') s += CENTRO(i) * 4;
      if (t === 'p') { const y = Math.floor(i / 8); s += (c === 'P' ? 6 - y : y - 1) * 6 + CENTRO(i) * 2; }
      if (t === 'q') s += CENTRO(i);
      v += meu ? s : -s;
    });
    return v;
  },
  // Capturas primeiro (as de peça mais valiosa com a menos valiosa).
  ordenar: (e, l) => l.map((x) => ({ x, s: e.casas[x.para] ? VALOR[e.casas[x.para].toLowerCase()] * 10 - VALOR[e.casas[x.de].toLowerCase()] : x.promocao ? 800 : 0 }))
    .sort((a, b) => b.s - a.s).map((y) => y.x),
};
export const iaXadrez = (e: EstadoXadrez, n: NivelIA, rnd = Math.random) => escolher(regrasXadrez, e, n, { facil: 1, medio: 2, dificil: 3 }, rnd, 25_000);

// --- Trilha ---
export type LanceTrilha = { tipo: 'colocar'; i: number } | { tipo: 'mover'; de: number; para: number } | { tipo: 'remover'; i: number };
const regrasTrilha: Regras<EstadoTrilha, LanceTrilha> = {
  lances: (e) => {
    if (e.vencedor) return [];
    if (e.removendo) return removiveis(e).map((i) => ({ tipo: 'remover', i }) as LanceTrilha);
    if (fase(e) === 'colocar') return e.casas.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0).map((i) => ({ tipo: 'colocar', i }) as LanceTrilha);
    const r: LanceTrilha[] = [];
    e.casas.forEach((c, de) => { if (c === e.vez) for (const para of destinos(e, de)) r.push({ tipo: 'mover', de, para }); });
    return r;
  },
  jogar: (e, l) => (l.tipo === 'colocar' ? colocar(e, l.i) : l.tipo === 'remover' ? remover(e, l.i) : moverTrilha(e, l.de, l.para)),
  vez: (e) => e.vez,
  fim: (e) => !!e.vencedor,
  avaliar: (e, p) => {
    if (e.vencedor) return e.vencedor === p ? GANHA : -GANHA;
    const o = p === 1 ? 2 : 1;
    const pecas = (j: number) => e.casas.filter((c) => c === j).length + e.mao[j - 1];
    let v = (pecas(p) - pecas(o)) * 100;
    for (const m of MOINHOS) {
      const meu = m.filter((k) => e.casas[k] === p).length, dele = m.filter((k) => e.casas[k] === o).length;
      if (dele === 0) v += meu === 3 ? 30 : meu === 2 ? 12 : 0;
      if (meu === 0) v -= dele === 3 ? 30 : dele === 2 ? 14 : 0;
    }
    if (e.removendo) v += e.vez === p ? 90 : -90;
    return v;
  },
};
export const iaTrilha = (e: EstadoTrilha, n: NivelIA, rnd = Math.random) => escolher(regrasTrilha, e, n, { facil: 1, medio: 3, dificil: 4 }, rnd, 40_000);

// --- Jogo Real de Ur (com dado: escolha gulosa com noção de perigo) ---
export function iaUr(e: EstadoUr, n: NivelIA, rnd = Math.random): number {
  const opcoes = movimentosUr(e);
  if (opcoes.length <= 1 || n === 'facil') return opcoes[Math.floor(rnd() * opcoes.length)];
  const meio = (c: number) => c >= 5 && c <= 12;
  const outro = 1 - e.vez;
  const perigo = (c: number) => meio(c) && c !== 8 && e.pecas[outro].some((q) => q > 0 && q < c && c - q <= 4 && meio(c) || (q === 0 && c <= 4));
  let melhor = opcoes[0], mv = -Infinity;
  for (const k of opcoes) {
    const de = e.pecas[e.vez][k], para = destinoUr(e, k)!;
    let v = para - de;
    if (meio(para) && e.pecas[outro].includes(para)) v += 12; // captura
    if (ROSETAS.includes(para)) v += 9;
    if (para === FIM) v += 7;
    if (n === 'dificil') { if (perigo(para)) v -= 8; if (perigo(de) && !perigo(para)) v += 6; if (de === 8) v -= 5; }
    v += rnd() * 0.5;
    if (v > mv) { mv = v; melhor = k; }
  }
  return melhor;
}

/** Ponto único para o Web Worker: escolhe o lance do computador no jogo pedido. */
export function jogarIA(jogo: string, estado: unknown, nivel: NivelIA): unknown {
  switch (jogo) {
    case 'quatro': return iaQuatro(estado as EstadoQuatro, nivel);
    case 'reversi': return iaReversi(estado as EstadoReversi, nivel);
    case 'damas': return iaDamas(estado as EstadoDamas, nivel);
    case 'xadrez': return iaXadrez(estado as EstadoXadrez, nivel);
    case 'trilha': return iaTrilha(estado as EstadoTrilha, nivel);
    case 'ur': return iaUr(estado as EstadoUr, nivel);
    default: throw new Error(`Sem computador para ${jogo}`);
  }
}
