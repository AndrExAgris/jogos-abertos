/* Baralho francês: naipes 0 ♠, 1 ♥, 2 ♦, 3 ♣; valores 1 (Ás) a 13 (Rei). */
import { criarAleatorio } from '@ja/contrato';

export interface Carta { n: number; v: number; aberta: boolean }

export const NAIPES = ['♠', '♥', '♦', '♣'];
export const NOMES_NAIPE = ['espadas', 'copas', 'ouros', 'paus'];
export const VALORES = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const NOMES_VALOR = ['', 'ás', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'valete', 'dama', 'rei'];
export const vermelha = (c: Carta) => c.n === 1 || c.n === 2;
export const nomeCarta = (c: Carta) => (c.aberta ? `${NOMES_VALOR[c.v]} de ${NOMES_NAIPE[c.n]}` : 'carta virada');

/** Um ou mais baralhos embaralhados; `naipes` limita os naipes (Spider). */
export function baralho(semente: string, baralhos = 1, naipes: number[] = [0, 1, 2, 3]): Carta[] {
  const cartas: Carta[] = [];
  const porNaipe = (52 * baralhos) / naipes.length / 13;
  for (const n of naipes) for (let k = 0; k < porNaipe; k++) for (let v = 1; v <= 13; v++) cartas.push({ n, v, aberta: false });
  return criarAleatorio(semente).embaralhar(cartas);
}

export const abrir = (c: Carta): Carta => ({ ...c, aberta: true });
