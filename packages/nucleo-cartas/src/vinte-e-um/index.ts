/*
 * Vinte e Um (Blackjack) contra a banca. Chegue mais perto de 21 que a banca
 * sem passar. Ás vale 1 ou 11; figuras valem 10. A banca compra até 17.
 * Vinte e um com as duas primeiras cartas paga 3 para 2.
 */
import { abrir, baralho, type Carta } from '../baralho/index.ts';

export interface EstadoVinte {
  sapato: Carta[];
  jogador: Carta[];
  banca: Carta[];
  fichas: number;
  aposta: number;
  fase: 'apostando' | 'jogando' | 'fim';
  resultado: '' | 'vitoria' | 'derrota' | 'empate' | 'blackjack';
  rodada: number;
}

export function pontos(mao: Carta[]): number {
  let total = 0, ases = 0;
  for (const c of mao) { if (!c.aberta) continue; total += c.v >= 10 ? 10 : c.v === 1 ? 11 : c.v; if (c.v === 1) ases++; }
  while (total > 21 && ases--) total -= 10;
  return total;
}

export const novoVinte = (semente: string): EstadoVinte => ({ sapato: baralho(semente, 4), jogador: [], banca: [], fichas: 100, aposta: 0, fase: 'apostando', resultado: '', rodada: 0 });

function tirar(e: EstadoVinte, aberta = true): [Carta, Carta[]] {
  const sapato = e.sapato.slice();
  const c = sapato.pop()!;
  return [aberta ? abrir(c) : c, sapato];
}

export function apostar(e: EstadoVinte, valor: number, semente: string): EstadoVinte {
  if (e.fase === 'jogando' || valor <= 0 || valor > e.fichas) return e;
  let n: EstadoVinte = { ...e, aposta: valor, fichas: e.fichas - valor, jogador: [], banca: [], fase: 'jogando', resultado: '', rodada: e.rodada + 1 };
  if (n.sapato.length < 20) n.sapato = baralho(`${semente}:${n.rodada}`, 4);
  for (const quem of ['jogador', 'banca', 'jogador', 'banca'] as const) {
    const [c, s] = tirar(n, !(quem === 'banca' && n.banca.length === 1));
    n = { ...n, sapato: s, [quem]: [...n[quem], c] };
  }
  if (pontos(n.jogador) === 21) return finalizar(n);
  return n;
}

export function pedir(e: EstadoVinte): EstadoVinte {
  if (e.fase !== 'jogando') return e;
  const [c, s] = tirar(e);
  const n = { ...e, sapato: s, jogador: [...e.jogador, c] };
  if (pontos(n.jogador) > 21) return finalizar(n);
  if (pontos(n.jogador) === 21) return finalizar(n);
  return n;
}

export function dobrar(e: EstadoVinte): EstadoVinte {
  if (e.fase !== 'jogando' || e.jogador.length !== 2 || e.fichas < e.aposta) return e;
  const [c, s] = tirar(e);
  return finalizar({ ...e, sapato: s, jogador: [...e.jogador, c], fichas: e.fichas - e.aposta, aposta: e.aposta * 2 });
}

export const parar = (e: EstadoVinte) => (e.fase === 'jogando' ? finalizar(e) : e);

function finalizar(e: EstadoVinte): EstadoVinte {
  let n = { ...e, banca: e.banca.map(abrir) };
  const pj = pontos(n.jogador);
  const blackjack = pj === 21 && n.jogador.length === 2;
  if (pj <= 21 && !blackjack) {
    while (pontos(n.banca) < 17) { const [c, s] = tirar(n); n = { ...n, sapato: s, banca: [...n.banca, c] }; }
  }
  const pb = pontos(n.banca);
  const bancaBJ = pb === 21 && n.banca.length === 2;
  let resultado: EstadoVinte['resultado'];
  let ganho = 0;
  if (pj > 21) resultado = 'derrota';
  else if (blackjack && !bancaBJ) { resultado = 'blackjack'; ganho = Math.floor(n.aposta * 2.5); }
  else if (pb > 21 || pj > pb) { resultado = 'vitoria'; ganho = n.aposta * 2; }
  else if (pj === pb) { resultado = 'empate'; ganho = n.aposta; }
  else resultado = 'derrota';
  return { ...n, fichas: n.fichas + ganho, fase: 'fim', resultado };
}
