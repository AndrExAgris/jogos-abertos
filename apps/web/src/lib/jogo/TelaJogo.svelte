<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icone } from '@ja/ui';
  import Tela from '../Tela.svelte';
  import Dialogo from './Dialogo.svelte';

  interface Props {
    titulo: string;
    /** Parágrafos do "Como jogar". */
    comoJogar: string[];
    /** Botão de nova partida na barra superior. */
    aoNova?: () => void;
    /** Esconde o botão "Como jogar" da barra (o jogo o põe em outro lugar). */
    semAjudaNaBarra?: boolean;
    ajudaAberta?: boolean;
    children: Snippet;
  }
  let { titulo, comoJogar, aoNova, semAjudaNaBarra = false, ajudaAberta = $bindable(false), children }: Props = $props();
</script>

<Tela {titulo} voltarPara="/" livre>
  {#snippet acoes()}
    {#if !semAjudaNaBarra}
      <button class="botao botao-terciario botao-icone" type="button" aria-label="Como jogar" title="Como jogar" onclick={() => (ajudaAberta = true)}>
        <Icone nome="help-circle" />
      </button>
    {/if}
    {#if aoNova}
      <button class="botao botao-terciario botao-icone" type="button" aria-label="Nova partida" title="Nova partida" onclick={aoNova}>
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
