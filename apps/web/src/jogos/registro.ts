import type { Component } from 'svelte';

/** Catálogo da v1. Cada jogo é carregado só quando aberto (o app inicia leve). */
export type Jogadores = '1' | '2' | '1-2' | '2-4' | '1-4';

export interface ItemJogo {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  jogadores: Jogadores;
  carregar?: () => Promise<{ default: Component }>;
}

export interface GrupoJogos {
  id: string;
  nome: string;
  jogos: ItemJogo[];
}

const j = (
  id: string, nome: string, descricao: string, icone: string, jogadores: Jogadores,
  carregar?: ItemJogo['carregar'],
): ItemJogo => ({ id, nome, descricao, icone, jogadores, carregar });

export const GRUPOS: GrupoJogos[] = [
  {
    id: 'grade', nome: 'Quebra-cabeças de grade', jogos: [
      j('minas', 'Campo Minado', 'Abra as casas sem explodir', 'bomb', '1', () => import('./minas/Minas.svelte')),
    ],
  },
];

export function acharJogo(id: string): ItemJogo | undefined {
  for (const g of GRUPOS) for (const jogo of g.jogos) if (jogo.id === id) return jogo;
  return undefined;
}

export const rotuloJogadores: Record<Jogadores, string> = {
  '1': '1 jogador',
  '2': '2 jogadores',
  '1-2': '1 ou 2',
  '2-4': '2 a 4',
  '1-4': '1 a 4',
};
