/*
 * Reserva de charadas já geradas para os níveis que demoram (Difícil e Desafio).
 * Começar um jogo tira um da reserva na hora; outro é gerado em segundo plano
 * (num worker só dela) para repor. Fica no IndexedDB, junto das preferências.
 */
import { sementeNova } from '@ja/contrato';
import type { QuebraCharada } from '@ja/nucleo-grade/charada';
import { gravar, ler } from '../../lib/armazenamento.ts';
import { gerarNoFundo } from '../../lib/jogo/gerar.ts';

const CHAVE = 'charada-reserva';
const TAMANHO = 5;
export const NIVEIS_COM_RESERVA = ['5', '6'];
type Reserva = Record<string, QuebraCharada[]>;

export const parametros = (id: string): [number, number] => (id === '6' ? [5, 6] : [Number(id), Number(id)]);

let memoria: Reserva | null = null;
let enchendo = false;

async function carregar(): Promise<Reserva> {
  memoria ??= (await ler<Reserva>('preferencias', CHAVE)) ?? {};
  return memoria;
}

/** Tira uma charada pronta do nível, se houver, e manda repor. */
export async function tirarDaReserva(id: string): Promise<QuebraCharada | null> {
  if (!NIVEIS_COM_RESERVA.includes(id)) return null;
  const r = await carregar();
  const q = r[id]?.shift() ?? null;
  if (q) await gravar('preferencias', CHAVE, r);
  void encherReserva();
  return q;
}

/** Gera, uma por vez, até cada nível ter a reserva cheia. */
export async function encherReserva(): Promise<void> {
  if (enchendo) return;
  enchendo = true;
  try {
    for (;;) {
      const r = await carregar();
      const id = NIVEIS_COM_RESERVA.find((k) => (r[k]?.length ?? 0) < TAMANHO);
      if (!id) return;
      const [n, c] = parametros(id);
      const q = await gerarNoFundo<QuebraCharada>('charada', [n, c, sementeNova()], 'reserva');
      (r[id] ??= []).push(q);
      await gravar('preferencias', CHAVE, r);
    }
  } catch {
    /* sem worker ou sem armazenamento: o jogo gera na hora, como antes */
  } finally {
    enchendo = false;
  }
}
