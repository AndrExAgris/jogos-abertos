<script lang="ts">
  /** Linha de aviso com altura reservada: o texto entra e sai sem mexer no tabuleiro. */
  let { texto = '' }: { texto?: string } = $props();
</script>

<p class="ja-dica ja-status" aria-live="polite">{texto || ' '}</p>
