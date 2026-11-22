import { gravar, ler } from './armazenamento.ts';

/** Estatísticas de uma variante de um jogo (um nível, um tamanho...). */
export interface Estatistica {
  jogadas: number;
  vitorias: number;
  sequenciaAtual: number;
  maiorSequencia: number;
  /** Melhor tempo de vitória, em milissegundos. */
  melhorTempo: number | null;
}

export type EstatisticasJogo = Record<string, Estatistica>;

export const vazia = (): Estatistica => ({
  jogadas: 0, vitorias: 0, sequenciaAtual: 0, maiorSequencia: 0, melhorTempo: null,
});

export async function lerEstatisticas(jogo: string): Promise<EstatisticasJogo> {
  return (await ler<EstatisticasJogo>('estatisticas', jogo)) ?? {};
}

/** Registra o fim de uma partida. Devolve true se for recorde de tempo. */
export async function registrarPartida(
  jogo: string, variante: string, venceu: boolean, tempo: number,
): Promise<boolean> {
  const todas = await lerEstatisticas(jogo);
  const e = { ...vazia(), ...todas[variante] };
  e.jogadas++;
  let recorde = false;
  if (venceu) {
    e.vitorias++;
    e.sequenciaAtual++;
    e.maiorSequencia = Math.max(e.maiorSequencia, e.sequenciaAtual);
    if (e.melhorTempo === null || tempo < e.melhorTempo) {
      recorde = e.melhorTempo !== null;
      e.melhorTempo = tempo;
    }
  } else {
    e.sequenciaAtual = 0;
  }
  todas[variante] = e;
  await gravar('estatisticas', jogo, todas);
  return recorde;
}

export function formatarTempo(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const dois = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dois(m % 60)}:${dois(s % 60)}` : `${m}:${dois(s % 60)}`;
}
