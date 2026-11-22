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
      j('sudoku', 'Sudoku', 'Clássico, killer e regras combinadas', 'grid-3x3', '1', () => import('./sudoku/Sudoku.svelte')),
      j('akari', 'Akari', 'Ilumine a grade com lâmpadas', 'bulb', '1', () => import('./akari/Akari.svelte')),
      j('tendas', 'Tendas', 'Uma tenda ao lado de cada árvore', 'tent', '1', () => import('./tendas/Tendas.svelte')),
      j('pontes', 'Pontes', 'Ligue as ilhas com pontes', 'building-bridge-2', '1', () => import('./pontes/Pontes.svelte')),
      j('rainhas', 'Rainhas', 'Uma coroa por linha, coluna e região', 'crown', '1', () => import('./rainhas/Rainhas.svelte')),
      j('mosaico', 'Mosaico', 'Pinte as casas pelas pistas', 'layout-grid', '1', () => import('./mosaico/Mosaico.svelte')),
      j('ligue', 'Ligue os Números', 'Ligue os pares e preencha a grade', 'route', '1', () => import('./ligue/Ligue.svelte')),
    ],
  },
  {
    id: 'numeros', nome: 'Números', jogos: [
      j('conta', 'Conta Certa', 'Chegue ao alvo com seis números', 'math-symbols', '1', () => import('./conta/Conta.svelte')),
    ],
  },
  {
    id: 'mover', nome: 'Mover e encaixar', jogos: [
      j('resta-um', 'Resta Um', 'Pule as peças até sobrar uma', 'circle-dot', '1', () => import('./resta-um/RestaUm.svelte')),
      j('separe', 'Separe as Cores', 'Uma cor em cada tubo', 'test-pipe', '1', () => import('./separe/Separe.svelte')),
      j('rush', 'Hora do Rush', 'Abra caminho para o carro sair', 'car', '1', () => import('./rush/Rush.svelte')),
      j('setas', 'Setas', 'Tire as setas na ordem certa', 'arrow-big-right', '1', () => import('./setas/Setas.svelte')),
      j('desembaraco', 'Desembaraço', 'Arraste até nenhuma linha cruzar', 'vector-triangle', '1', () => import('./desembaraco/Desembaraco.svelte')),
    ],
  },
  {
    id: 'tabuleiro', nome: 'Tabuleiro para dois', jogos: [
      j('quatro', 'Quatro em Linha', 'Alinhe quatro peças primeiro', 'circles', '2', () => import('./quatro/Quatro.svelte')),
      j('trilha', 'Trilha', 'Forme moinhos e tire peças', 'square-dot', '2', () => import('./trilha/Trilha.svelte')),
      j('damas', 'Damas', 'Regra brasileira', 'circle-half-2', '2', () => import('./damas/Damas.svelte')),
      j('reversi', 'Reversi', 'Cerque e vire as peças', 'contrast', '2', () => import('./reversi/Reversi.svelte')),
      j('xadrez', 'Xadrez', 'Dois jogadores no mesmo aparelho', 'chess-knight', '2', () => import('./xadrez/Xadrez.svelte')),
      j('go', 'Go', '9×9, 13×13 e 19×19', 'circle-dashed', '2', () => import('./go/Go.svelte')),
      j('ludo', 'Ludo', 'De 2 a 4 jogadores', 'dice-3', '2-4', () => import('./ludo/Ludo.svelte')),
      j('ur', 'Jogo Real de Ur', 'Corrida milenar com rosetas', 'rosette', '2', () => import('./ur/Ur.svelte')),
      j('sinuca', 'Sinuca', '8 bolas: lisas contra listradas', 'ball-bowling', '2', () => import('./sinuca/Sinuca.svelte')),
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
