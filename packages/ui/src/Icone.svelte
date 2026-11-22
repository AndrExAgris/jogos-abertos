<script lang="ts">
  import { icones } from './icones.ts';

  interface Props {
    nome: string;
    preenchido?: boolean;
    pequeno?: boolean;
    classe?: string;
  }
  let { nome, preenchido = false, pequeno = false, classe = '' }: Props = $props();
  const icone = $derived(icones[preenchido ? `${nome}:preenchido` : nome] ?? icones[nome]);
</script>

{#if icone}
  <svg
    class="icone {pequeno ? 'icone-p' : ''} {classe}"
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={icone.preenchido ? 'fill: currentColor; stroke: none' : undefined}
    stroke-linecap="round"
    stroke-linejoin="round"
  >{@html icone.corpo}</svg>
{/if}
