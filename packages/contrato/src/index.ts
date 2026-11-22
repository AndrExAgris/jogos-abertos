export type Resultado = 'andamento' | 'vitoria' | 'derrota' | 'empate';

/**
 * Contrato comum de todos os jogos. O núcleo é lógica pura: sem interface,
 * sem relógio, sem acesso a armazenamento. A mesma semente gera o mesmo jogo.
 */
export interface Jogo<Estado, Jogada, Config> {
  id: string;
  nome: string;
  novo(config: Config, semente: string): Estado;
  jogadasValidas?(estado: Estado): Jogada[];
  /** Imutável: devolve um estado novo, o que permite desfazer por pilha. */
  jogar(estado: Estado, jogada: Jogada): Estado;
  resultado(estado: Estado): Resultado;
  serializar(estado: Estado): string;
  desserializar(texto: string): Estado;
}

export * from './aleatorio.ts';
