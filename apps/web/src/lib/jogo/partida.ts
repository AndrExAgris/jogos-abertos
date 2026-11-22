import { apagar, gravar, ler } from '../armazenamento.ts';

/** Uma partida em andamento por jogo, guardada como um objeto simples (JSON). */
export function salvarPartida<T>(jogo: string, dados: T): Promise<void> {
  return gravar('partidas', jogo, JSON.parse(JSON.stringify(dados)) as T);
}

export function lerPartida<T>(jogo: string): Promise<T | undefined> {
  return ler<T>('partidas', jogo);
}

export function apagarPartida(jogo: string): Promise<void> {
  return apagar('partidas', jogo);
}

export async function lerPreferencias<T extends object>(jogo: string, padrao: T): Promise<T> {
  return { ...padrao, ...((await ler<Partial<T>>('preferencias', jogo)) ?? {}) };
}

export function salvarPreferencias<T>(jogo: string, p: T): Promise<void> {
  return gravar('preferencias', jogo, JSON.parse(JSON.stringify(p)) as T);
}

/** Avisa o usuário com vibração curta, quando o aparelho permite. */
export function vibrar(padrao: number | number[] = 15): void {
  try {
    navigator.vibrate?.(padrao);
  } catch {
    /* sem vibração */
  }
}
