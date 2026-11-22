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
    id: 'palavras', nome: 'Palavras', jogos: [
      j('termo', 'Termo', 'A palavra em seis tentativas, com Dueto e Quarteto', 'abc', '1', () => import('./palavras/Termo.svelte')),
      j('roda', 'Roda de Letras', 'Forme palavras com as letras da roda', 'letter-case', '1', () => import('./palavras/Roda.svelte')),
      j('cruzadas', 'Palavras Cruzadas', 'Grade livre com dicas curtas', 'keyboard', '1', () => import('./palavras/Cruzadas.svelte')),
    ],
  },
  {
    id: 'geografia', nome: 'Geografia', jogos: [
      j('pais-distancia', 'País pela Distância', 'Ache o país secreto pelo mapa de calor', 'world', '1', () => import('./geo/Distancia.svelte')),
      j('capital-distancia', 'Capital pela Distância', 'Ache a capital pela distância e direção', 'map-pin', '1', () => import('./geo/Capital.svelte')),
      j('pais-contorno', 'País pelo Contorno', 'Que país tem esse formato?', 'map', '1', () => import('./geo/Contorno.svelte')),
      j('bandeira-revelada', 'Bandeira Revelada', 'A bandeira aparece aos poucos', 'flag-question', '1', () => import('./geo/BandeiraRevelada.svelte')),
      j('descobre-bandeiras', 'Descobre Bandeiras', 'De que país é esta bandeira?', 'flag', '1', () => import('./geo/DescobreBandeiras.svelte')),
      j('viagem-fronteiras', 'Viagem pelas Fronteiras', 'De um país a outro só por terra', 'route-2', '1', () => import('./geo/Viagem.svelte')),
      j('pais-pistas', 'País pelas Pistas', 'Continente, população, área e distância', 'world-search', '1', () => import('./geo/Pistas.svelte')),
    ],
  },
  {
    id: 'cartas', nome: 'Cartas', jogos: [
      j('paciencia', 'Paciência', 'A clássica, virando 1 ou 3', 'cards', '1', () => import('./cartas/Paciencia.svelte')),
      j('spider', 'Paciência Spider', 'Com 1, 2 ou 4 naipes', 'spider', '1', () => import('./cartas/Spider.svelte')),
      j('freecell', 'FreeCell', 'Todas abertas e quatro células', 'square', '1', () => import('./cartas/FreeCell.svelte')),
      j('piramide', 'Pirâmide', 'Pares que somam 13', 'triangle', '1', () => import('./cartas/Piramide.svelte')),
      j('tripeaks', 'TriPeaks', 'Uma acima ou uma abaixo', 'mountain', '1', () => import('./cartas/TriPeaks.svelte')),
      j('golf', 'Golf', 'Limpe as sete colunas', 'golf', '1', () => import('./cartas/Golf.svelte')),
      j('vinte-e-um', 'Vinte e Um', 'Chegue perto de 21 sem passar', 'spade', '1', () => import('./cartas/VinteEUm.svelte')),
    ],
  },
  {
    id: 'dados', nome: 'Dados', jogos: [
      j('general', 'General', 'Cinco dados, dez jogadas', 'dice-5', '1-4', () => import('./dados/General.svelte')),
      j('mentiroso', 'Dado Mentiroso', 'Aposte e blefe com dados escondidos', 'mask', '2-4', () => import('./dados/Mentiroso.svelte')),
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
