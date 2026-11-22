<script lang="ts">
  interface Props { valor: number; guardado?: boolean; escondido?: boolean; aoTocar?: () => void; desabilitado?: boolean; rolando?: boolean }
  let { valor, guardado = false, escondido = false, aoTocar, desabilitado = false, rolando = false }: Props = $props();
  // Giro curto ao aparecer, com um ângulo diferente por dado.
  const giro = `${Math.round(Math.random() * 360 - 180)}deg`;
  // Pontos acesos na grade 3×3 para cada face.
  const PONTOS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
</script>

<button type="button" class="ja-dado" data-guardado={guardado || undefined} data-escondido={escondido || undefined} data-rolando={rolando || undefined} style="--giro:{giro}" disabled={desabilitado || !aoTocar} aria-label={escondido ? 'Dado escondido' : `Dado ${valor}${guardado ? ', guardado' : ''}`} aria-pressed={aoTocar ? guardado : undefined} onclick={aoTocar}>
  {#if !escondido}
    {#each Array(9) as _, k (k)}<span class:aceso={PONTOS[valor]?.includes(k)}></span>{/each}
  {:else}?{/if}
</button>
