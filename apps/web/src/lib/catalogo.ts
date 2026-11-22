/** Catálogo da v1. `disponivel` liga o jogo na tela inicial conforme cada um fica pronto. */
export type Jogadores = '1' | '2' | '1-2' | '2-4';

export interface ItemCatalogo {
  id: string;
  nome: string;
  descricao: string;
  jogadores: Jogadores;
  disponivel: boolean;
}

export interface GrupoCatalogo {
  id: string;
  nome: string;
  icone: string;
  jogos: ItemCatalogo[];
}

const j = (id: string, nome: string, descricao: string, jogadores: Jogadores = '1', disponivel = false): ItemCatalogo =>
  ({ id, nome, descricao, jogadores, disponivel });

export const CATALOGO: GrupoCatalogo[] = [
  {
    id: 'grade', nome: 'Grade', icone: 'grid-dots', jogos: [
      j('minas', 'Minas', 'Abra as casas sem explodir. Sempre dá para resolver sem chutar.', '1', true),
      j('sudoku', 'Sudoku', 'Padrão e com regras combinadas.'),
      j('lampadas', 'Lâmpadas', 'Ilumine a grade toda sem que uma lâmpada veja a outra.'),
      j('tele', 'Tele', 'Risque números até as somas baterem.'),
      j('tendas', 'Tendas', 'Uma tenda ao lado de cada árvore.'),
      j('pontes', 'Pontes', 'Ligue as ilhas com o número certo de pontes.'),
      j('kings', 'Kings', 'Uma coroa por linha, coluna e região.'),
      j('mosaico', 'Mosaico', 'Pinte as casas pelas pistas de vizinhança.'),
      j('linkar', 'Linkar números', 'Ligue os pares sem cruzar caminhos.'),
    ],
  },
  { id: 'numeros', nome: 'Números', icone: 'puzzle', jogos: [j('alvo', 'Alvo', 'Chegue ao alvo com 6 números e as 4 operações.')] },
  {
    id: 'palavras', nome: 'Palavras', icone: 'alphabet-latin', jogos: [
      j('cruzadas', 'Palavras cruzadas', 'Grade compacta com dicas curtas.'),
      j('roda', 'Roda de letras', 'Forme palavras com as letras da roda.'),
      j('termo', 'Termo', 'Descubra a palavra em seis tentativas. Com Dueto e Quarteto.'),
    ],
  },
  {
    id: 'conhecimento', nome: 'Conhecimento', icone: 'bulb', jogos: [
      j('trivia', 'Trivia', 'Escolha a categoria, aposte e responda.', '1-2'),
      j('filme', 'Filme por pistas', 'Adivinhe o filme com até seis pistas.'),
    ],
  },
  {
    id: 'geografia', nome: 'Geografia', icone: 'world', jogos: [
      j('globle', 'Globle', 'Ache o país pela distância.'),
      j('globle-capitais', 'Globle Capitais', 'Ache a capital pela distância.'),
      j('worldle', 'Worldle', 'Qual país tem esse formato?'),
      j('flagle', 'Flagle', 'Revele a bandeira aos poucos.'),
      j('bandeira', 'De que país é a bandeira', 'Acerte o maior número de bandeiras.'),
      j('travle', 'Travle', 'Vá de um país a outro pelas fronteiras.'),
      j('countryle', 'Countryle', 'Adivinhe o país pelas características.'),
    ],
  },
  {
    id: 'cartas', nome: 'Cartas', icone: 'cards', jogos: [
      j('klondike', 'Klondike', 'A paciência clássica, com 1 ou 3 cartas.'),
      j('spider', 'Spider', 'Com 1, 2 ou 4 naipes.'),
      j('freecell', 'FreeCell', 'Quase toda partida tem solução.'),
      j('piramide', 'Pirâmide', 'Pares que somam 13.'),
      j('tripeaks', 'TriPeaks e Golf', 'Uma carta acima ou abaixo.'),
      j('blackjack', 'Blackjack', 'Chegue perto de 21 sem passar.'),
    ],
  },
  {
    id: 'dados', nome: 'Dados', icone: 'dice-5', jogos: [
      j('general', 'General', 'Cinco dados, treze jogadas.', '1-2'),
      j('mentiroso', 'Dado do Mentiroso', 'Blefe sobre os dados escondidos.', '2-4'),
    ],
  },
  {
    id: 'estado', nome: 'Estado', icone: 'puzzle', jogos: [
      j('resta-um', 'Resta Um', 'Pule as peças até sobrar uma.'),
      j('water-sort', 'Water Sort', 'Separe as cores nos tubos.'),
      j('desbloqueio', 'Desbloqueio', 'Tire o bloco do caminho.'),
      j('setas', 'Setas', 'Plano e cubo.'),
      j('desembaraco', 'Desembaraço', 'Desfaça os cruzamentos das linhas.'),
    ],
  },
  {
    id: 'tabuleiro', nome: 'Tabuleiro para 2', icone: 'chess-knight', jogos: [
      j('connect4', 'Connect 4', 'Quatro em linha.', '2'),
      j('trilha', 'Trilha', 'Forme moinhos e capture peças.', '2'),
      j('damas', 'Damas', 'Regra brasileira.', '2'),
      j('reversi', 'Reversi', 'Vire as peças do outro.', '2'),
      j('xadrez', 'Xadrez', 'Dois jogadores no mesmo aparelho.', '2'),
      j('go', 'Go', '9×9, 13×13 e 19×19.', '2'),
      j('ludo', 'Ludo', 'De 2 a 4 jogadores.', '2-4'),
      j('ur', 'Jogo Real de Ur', 'O jogo de corrida mais antigo conhecido.', '2'),
      j('sinuca', 'Sinuca 8 bolas', 'Lisas contra listradas.', '2'),
    ],
  },
];

export function acharJogo(id: string): ItemCatalogo | undefined {
  for (const g of CATALOGO) for (const jogo of g.jogos) if (jogo.id === id) return jogo;
  return undefined;
}

export const rotuloJogadores: Record<Jogadores, string> = {
  '1': '1 jogador',
  '2': '2 jogadores',
  '1-2': '1 ou 2 jogadores',
  '2-4': '2 a 4 jogadores',
};
