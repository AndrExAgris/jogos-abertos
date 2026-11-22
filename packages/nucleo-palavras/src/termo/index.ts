/*
 * Termo (com Dueto e Quarteto): descubra a palavra de cinco letras. Cada
 * palpite mostra as letras certas no lugar certo, as que existem em outro
 * lugar e as que não existem. Acentos não contam.
 */
import { criarAleatorio } from '@ja/contrato';
import dados from '../../../../data/palavras/termo.json';
import { semAcento } from '../normalizar.ts';

export type Marca = 'certa' | 'lugar' | 'nao';
const RESPOSTAS = (dados.respostas as string[]).slice(0, 1600);
const PALPITES = new Set(dados.palpites as string[]);
for (const r of RESPOSTAS) PALPITES.add(semAcento(r));

export const MODOS = { termo: { palavras: 1, tentativas: 6 }, dueto: { palavras: 2, tentativas: 7 }, quarteto: { palavras: 4, tentativas: 9 } } as const;
export type Modo = keyof typeof MODOS;

export const palavraValida = (p: string) => PALPITES.has(semAcento(p));

export function sortearRespostas(modo: Modo, semente: string): string[] {
  const a = criarAleatorio(semente);
  const escolhidas: string[] = [];
  while (escolhidas.length < MODOS[modo].palavras) {
    const r = RESPOSTAS[a.inteiro(RESPOSTAS.length)];
    if (!escolhidas.includes(r)) escolhidas.push(r);
  }
  return escolhidas;
}

/** Marca cada letra do palpite contra a resposta (letras repetidas contadas certo). */
export function avaliar(palpite: string, resposta: string): Marca[] {
  const p = semAcento(palpite), r = semAcento(resposta);
  const marcas: Marca[] = Array(5).fill('nao');
  const sobra: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (p[i] === r[i]) marcas[i] = 'certa';
    else sobra[r[i]] = (sobra[r[i]] ?? 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (marcas[i] === 'certa') continue;
    if (sobra[p[i]]) { marcas[i] = 'lugar'; sobra[p[i]]--; }
  }
  return marcas;
}

/** Melhor marca já vista para cada letra (para o teclado). */
export function marcasDoTeclado(palpites: string[], resposta: string): Record<string, Marca> {
  const r: Record<string, Marca> = {};
  const ordem = { nao: 0, lugar: 1, certa: 2 };
  for (const p of palpites) avaliar(p, resposta).forEach((m, i) => {
    const l = semAcento(p)[i];
    if (!r[l] || ordem[m] > ordem[r[l]]) r[l] = m;
  });
  return r;
}
