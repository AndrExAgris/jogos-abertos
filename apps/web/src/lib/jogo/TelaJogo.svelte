<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icone } from '@ja/ui';
  import Tela from '../Tela.svelte';
  import Dialogo from './Dialogo.svelte';

  interface Props {
    titulo: string;
    /** Parágrafos do "Como jogar". */
    comoJogar: string[];
    /** Botão de reiniciar (nova partida) no canto direito da barra superior. */
    aoNova?: () => void;
    ajudaAberta?: boolean;
    children: Snippet;
  }
  let { titulo, comoJogar, aoNova, ajudaAberta = $bindable(false), children }: Props = $props();
</script>

<Tela {titulo} voltarPara="/" livre>
  {#snippet acoes()}
    {#if aoNova}
      <button class="botao botao-terciario botao-icone" type="button" aria-label="Reiniciar partida" title="Reiniciar partida" onclick={aoNova}>
        <Icone nome="refresh" />
      </button>
    {/if}
  {/snippet}
  <div class="ja-jogo">{@render children()}</div>
</Tela>

<Dialogo bind:aberto={ajudaAberta} titulo="Como jogar">
  {#each comoJogar as p, i (i)}<p>{p}</p>{/each}
  {#snippet acoes()}
    <button class="botao botao-primario" type="button" onclick={() => (ajudaAberta = false)}><span>Entendi</span></button>
  {/snippet}
</Dialogo>
