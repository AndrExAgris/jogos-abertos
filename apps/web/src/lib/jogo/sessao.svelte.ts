/*
 * Sessão de um jogo de uma pessoa: fase (escolha, gerando, jogo), estado com
 * desfazer, relógio, salvamento automático da partida e registro do resultado.
 */
import { Relogio } from './relogio.svelte.ts';
import { apagarPartida, lerPartida, salvarPartida, vibrar } from './partida.ts';
import { registrarPartida } from '../estatisticas.ts';

interface Salvo<Q, E> {
  quebra: Q;
  estado: E;
  tempo: number;
  variante: string;
  nomeVariante: string;
  historico?: E[];
}

export class Sessao<Q, E> {
  fase = $state<'carregando' | 'escolha' | 'gerando' | 'jogo'>('carregando');
  quebra = $state<Q | null>(null);
  estado = $state<E | null>(null);
  variante = $state('');
  nomeVariante = $state('');
  terminou = $state<null | 'vitoria' | 'derrota' | 'empate'>(null);
  recorde = $state(false);
  erro = $state('');
  podeDesfazer = $state(false);
  relogio = new Relogio();
  private historico: E[] = [];

  constructor(private id: string, private opcoes: { semRelogio?: boolean; semEstatisticas?: boolean; pontuacao?: (e: E) => number } = {}) {
    document.addEventListener('visibilitychange', this.aoEsconder);
  }

  async carregar(): Promise<boolean> {
    const s = await lerPartida<Salvo<Q, E>>(this.id);
    if (s) {
      this.quebra = s.quebra;
      this.estado = s.estado;
      this.variante = s.variante;
      this.nomeVariante = s.nomeVariante;
      this.historico = s.historico ?? [];
      this.podeDesfazer = this.historico.length > 0;
      this.terminou = null;
      this.relogio.zerar(s.tempo);
      if (!this.opcoes.semRelogio) this.relogio.iniciar();
      this.fase = 'jogo';
      return true;
    }
    this.fase = 'escolha';
    return false;
  }

  /** Gera (talvez no Web Worker) e começa a partida. */
  async comecar(variante: string, nomeVariante: string, gerar: () => Promise<{ quebra: Q; estado: E }> | { quebra: Q; estado: E }) {
    this.fase = 'gerando';
    this.erro = '';
    try {
      const { quebra, estado } = await gerar();
      this.quebra = quebra;
      this.estado = estado;
      this.variante = variante;
      this.nomeVariante = nomeVariante;
      this.historico = [];
      this.podeDesfazer = false;
      this.terminou = null;
      this.recorde = false;
      this.relogio.zerar();
      if (!this.opcoes.semRelogio) this.relogio.iniciar();
      this.fase = 'jogo';
      void this.salvar();
    } catch (e) {
      this.erro = (e as Error).message;
      this.fase = 'escolha';
    }
  }

  /** Troca o estado guardando o anterior para desfazer. */
  mudar(novo: E, guardar = true) {
    if (this.terminou || !this.estado) return;
    if (guardar) {
      this.historico.push($state.snapshot(this.estado) as E);
      if (this.historico.length > 300) this.historico.shift();
      this.podeDesfazer = true;
    }
    this.estado = novo;
    void this.salvar();
  }

  desfazer() {
    const anterior = this.historico.pop();
    if (anterior === undefined || this.terminou) return;
    this.estado = anterior;
    this.podeDesfazer = this.historico.length > 0;
    void this.salvar();
  }

  async terminar(resultado: 'vitoria' | 'derrota' | 'empate') {
    if (this.terminou) return;
    this.terminou = resultado;
    this.relogio.parar();
    vibrar(resultado === 'vitoria' ? [30, 60, 30] : 200);
    await apagarPartida(this.id);
    if (this.opcoes.semEstatisticas) return;
    const pontos = this.opcoes.pontuacao && this.estado ? this.opcoes.pontuacao(this.estado) : undefined;
    this.recorde = await registrarPartida(this.id, this.variante, resultado === 'vitoria', this.relogio.ms, this.nomeVariante, pontos);
  }

  nova() {
    this.relogio.zerar();
    this.quebra = null;
    this.estado = null;
    this.terminou = null;
    void apagarPartida(this.id);
    this.fase = 'escolha';
  }

  salvar() {
    if (!this.quebra || !this.estado || this.terminou || this.fase !== 'jogo') return;
    return salvarPartida<Salvo<Q, E>>(this.id, {
      quebra: $state.snapshot(this.quebra) as Q,
      estado: $state.snapshot(this.estado) as E,
      tempo: this.relogio.ms,
      variante: this.variante,
      nomeVariante: this.nomeVariante,
      historico: this.historico.slice(-60),
    });
  }

  destruir() {
    this.relogio.parar();
    void this.salvar();
    this.relogio.destruir();
    document.removeEventListener('visibilitychange', this.aoEsconder);
  }

  private aoEsconder = () => {
    if (document.visibilityState === 'hidden') void this.salvar();
  };
}
