/**
 * Relógio de partida. Todo o estado é reativo, então a tela atualiza assim
 * que ele começa (o relógio antigo do Minas guardava o início numa variável
 * comum e só aparecia contando depois de a tela ser montada de novo).
 * Pausa sozinho quando o app vai para segundo plano.
 */
export class Relogio {
  acumulado = $state(0);
  inicio = $state<number | null>(null);
  private agora = $state(Date.now());
  private tique: ReturnType<typeof setInterval> | null = null;
  private pausadoPorFundo = false;

  constructor(acumulado = 0) {
    this.acumulado = acumulado;
    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
  }

  get rodando(): boolean {
    return this.inicio !== null;
  }

  /** Tempo total em milissegundos. */
  get ms(): number {
    return this.acumulado + (this.inicio !== null ? this.agora - this.inicio : 0);
  }

  iniciar(): void {
    if (this.inicio !== null) return;
    this.agora = Date.now();
    this.inicio = this.agora;
    this.tique ??= setInterval(() => (this.agora = Date.now()), 250);
  }

  parar(): void {
    if (this.inicio !== null) {
      this.acumulado += Date.now() - this.inicio;
      this.inicio = null;
    }
    if (this.tique) clearInterval(this.tique);
    this.tique = null;
  }

  zerar(acumulado = 0): void {
    this.parar();
    this.acumulado = acumulado;
  }

  destruir(): void {
    this.parar();
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
  }

  private aoMudarVisibilidade = () => {
    if (document.visibilityState === 'hidden' && this.rodando) {
      this.pausadoPorFundo = true;
      this.parar();
    } else if (document.visibilityState === 'visible' && this.pausadoPorFundo) {
      this.pausadoPorFundo = false;
      this.iniciar();
    }
  };
}
