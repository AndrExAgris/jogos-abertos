<script lang="ts">
  /**
   * Faixa com os jogadores e de quem é a vez. Jogador 1 usa a primária e o
   * jogador 2 a secundária, como manda o projeto; do 3º em diante, neutro.
   */
  interface Props {
    nomes: string[];
    vez: number;
    pontos?: (number | string)[];
    /** O jogador da vez (computador) está pensando: mostra reticências animadas no lugar, sem mexer no layout. */
    pensando?: boolean;
  }
  let { nomes, vez, pontos, pensando = false }: Props = $props();
</script>

<div class="ja-jogadores" data-muitos={nomes.length > 2 || undefined} role="status" aria-live="polite">
  {#each nomes as nome, i (i)}
    <div class="ja-jogador" data-jogador={i + 1} aria-current={vez === i ? 'true' : undefined}>
      <span class="ja-jogador-marca" aria-hidden="true"></span>
      <span class="ja-jogador-nome">{nome}</span>
      {#if pensando && vez === i}<span class="ja-pensando" aria-label="pensando"><span></span><span></span><span></span></span>{/if}
      {#if pontos}<span class="ja-jogador-pontos numeros-tabulares">{pontos[i]}</span>{/if}
      {#if vez === i}<span class="sr-only">, é a vez</span>{/if}
    </div>
  {/each}
</div>
