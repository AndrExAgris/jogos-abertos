<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icone } from '@ja/ui';
  import { layout } from './layout.svelte.ts';
  import { voltar } from './rotas.svelte.ts';

  interface Props {
    titulo: string;
    /** Caminho para onde o voltar leva se não houver tela anterior. Sem ele, não há botão voltar. */
    voltarPara?: string;
    acoes?: Snippet;
    /** Conteúdo sem a grade (jogos que ocupam a largura toda). */
    livre?: boolean;
    children: Snippet;
  }
  let { titulo, voltarPara, acoes, livre = false, children }: Props = $props();
</script>

<header class="barra-superior">
  {#if voltarPara !== undefined}
    <button class="botao botao-terciario botao-icone" type="button" aria-label="Voltar" title="Voltar" onclick={() => voltar(voltarPara)}>
      <Icone nome="chevron-left" />
    </button>
  {/if}
  <div class="contexto"><h1 class="ui-titulo">{titulo}</h1></div>
  {@render acoes?.()}
</header>
<main class="tela-conteudo" class:ja-livre={livre}>
  {#if livre}
    {@render children()}
  {:else if layout.largo}
    <div class="conteudo ja-pilha">{@render children()}</div>
  {:else}
    <div class="grade"><div class="ja-pilha">{@render children()}</div></div>
  {/if}
</main>
