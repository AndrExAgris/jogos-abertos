<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icone } from '@ja/ui';
  import { formatarTempo } from '../estatisticas.ts';

  /** Linha de informações acima do tabuleiro: informação à esquerda, relógio no centro, "?" à direita. */
  interface Props {
    /** Tempo em ms; sem ele, o centro fica vazio (ou mostra `centro`). */
    tempo?: number;
    aoAjuda: () => void;
    esquerda?: Snippet;
    centro?: Snippet;
  }
  let { tempo, aoAjuda, esquerda, centro }: Props = $props();
</script>

<div class="ja-faixa-jogo">
  <div class="ja-faixa-esq">{@render esquerda?.()}</div>
  <div class="ja-faixa-centro">
    {#if centro}
      {@render centro()}
    {:else if tempo !== undefined}
      <span class="ja-placar-item"><Icone nome="clock" /><span class="sr-only">Tempo:</span><span class="ja-numero">{formatarTempo(tempo)}</span></span>
    {/if}
  </div>
  <div class="ja-faixa-dir">
    <button class="botao botao-terciario botao-icone ja-botao-ajuda" type="button" aria-label="Como jogar" title="Como jogar" onclick={aoAjuda}>
      <Icone nome="help-circle" />
    </button>
  </div>
</div>
