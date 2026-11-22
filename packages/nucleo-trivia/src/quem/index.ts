/*
 * Quem Sou Eu: cartas por categoria (listas próprias do projeto, em
 * data/quem-sou-eu). Cada carta tem o nome e, às vezes, a origem.
 */
import { criarAleatorio } from '@ja/contrato';
import dados from '../../../../data/quem-sou-eu/cartas.json';

export interface CartaQuem { n: string; o?: string }
export interface CategoriaQuem { id: string; nome: string; icone: string; itens: CartaQuem[] }

export const CATEGORIAS_QUEM = dados as CategoriaQuem[];

/** Baralho embaralhado da categoria (ou de todas, com id 'todas'). */
export function baralhoQuem(id: string, semente: string): CartaQuem[] {
  const itens = id === 'todas' ? CATEGORIAS_QUEM.flatMap((c) => c.itens) : CATEGORIAS_QUEM.find((c) => c.id === id)?.itens ?? [];
  return criarAleatorio(semente).embaralhar(itens.slice());
}
