<script lang="ts">
  import { NAIPES, VALORES, nomeCarta, vermelha, type Carta } from '@ja/nucleo-cartas/baralho';

  interface Props {
    carta?: Carta | null;
    selecionada?: boolean;
    livre?: boolean;
    vazia?: string;
    aoTocar?: () => void;
    rotulo?: string;
  }
  let { carta, selecionada = false, livre = true, vazia = '', aoTocar, rotulo }: Props = $props();
</script>

{#if carta}
  <button
    type="button"
    class="ja-carta"
    data-aberta={carta.aberta || undefined}
    data-vermelha={(carta.aberta && vermelha(carta)) || undefined}
    data-selecionada={selecionada || undefined}
    data-bloqueada={(!livre && carta.aberta) || undefined}
    aria-label={rotulo ?? nomeCarta(carta)}
    onclick={aoTocar}
  >
    {#if carta.aberta}
      <span class="ja-carta-canto">{VALORES[carta.v]}<span>{NAIPES[carta.n]}</span></span>
      <span class="ja-carta-centro">{NAIPES[carta.n]}</span>
    {/if}
  </button>
{:else}
  <button type="button" class="ja-carta ja-carta-vazia" aria-label={rotulo ?? 'Espaço vazio'} onclick={aoTocar}>{vazia}</button>
{/if}
