<script lang="ts">
  /**
   * Faixa com os jogadores e de quem é a vez. Jogador 1 usa a primária e o
   * jogador 2 a secundária, como manda o projeto; do 3º em diante, neutro.
   */
  interface Props {
    nomes: string[];
    vez: number;
    pontos?: (number | string)[];
  }
  let { nomes, vez, pontos }: Props = $props();
</script>

<div class="ja-jogadores" data-muitos={nomes.length > 2 || undefined} role="status" aria-live="polite">
  {#each nomes as nome, i (i)}
    <div class="ja-jogador" data-jogador={i + 1} aria-current={vez === i ? 'true' : undefined}>
      <span class="ja-jogador-marca" aria-hidden="true"></span>
      <span class="ja-jogador-nome">{nome}</span>
      {#if pontos}<span class="ja-jogador-pontos numeros-tabulares">{pontos[i]}</span>{/if}
      {#if vez === i}<span class="sr-only">, é a vez</span>{/if}
    </div>
  {/each}
</div>
