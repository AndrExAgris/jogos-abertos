/*
 * Adivinhe o Filme: até seis pistas, reveladas aos poucos (ano, gênero, país,
 * direção, elenco principal e prêmios). Filmes famosos do Wikidata (CC0).
 */
import { criarAleatorio } from '@ja/contrato';
import dados from '../../../../data/conhecimento/filmes.json';

export interface Filme { titulo: string; ano: number; generos: string[]; paises: string[]; direcao: string[]; elenco: string[]; premios: string[]; fama: number }
export const FILMES = dados as Filme[];

export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function sortearFilme(semente: string, famosos = 400): number {
  return criarAleatorio(semente).inteiro(Math.min(famosos, FILMES.length));
}

export function pistas(f: Filme): { rotulo: string; valor: string }[] {
  return [
    { rotulo: 'Ano', valor: String(f.ano) },
    { rotulo: 'Gênero', valor: f.generos.join(', ') },
    { rotulo: 'País', valor: f.paises.join(', ') || 'sem informação' },
    { rotulo: 'Direção', valor: f.direcao.join(', ') },
    { rotulo: 'Elenco', valor: f.elenco.join(', ') },
    { rotulo: 'Prêmios', valor: f.premios.join(', ') || 'nenhum grande prêmio registrado' },
  ];
}

export function sugerirFilmes(texto: string, limite = 6): number[] {
  const t = semAcento(texto);
  if (t.length < 2) return [];
  const r: number[] = [];
  FILMES.forEach((f, i) => { if (semAcento(f.titulo).includes(t)) r.push(i); });
  return r.sort((a, b) => Number(!semAcento(FILMES[a].titulo).startsWith(t)) - Number(!semAcento(FILMES[b].titulo).startsWith(t))).slice(0, limite);
}
