<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icone } from '@ja/ui';
  import type { Opcao } from './tipos.ts';
  interface Props {
    titulo?: string;
    opcoes: Opcao[];
    aoEscolher: (id: string) => void;
    /** Conteúdo acima das opções (ex.: número de jogadores). */
    antes?: Snippet;
  }
  let { titulo = 'Escolha a partida', opcoes, aoEscolher, antes }: Props = $props();
</script>

<div class="ja-escolha">
  <h2 class="ui-subtitulo ja-sem-margem">{titulo}</h2>
  {@render antes?.()}
  <div class="lista-config">
    {#each opcoes as o (o.id)}
      <button class="linha-config" type="button" onclick={() => aoEscolher(o.id)}>
        <span class="linha-texto">
          <span class="linha-titulo">{o.titulo}</span>
          {#if o.descricao}<span class="linha-descricao">{o.descricao}</span>{/if}
        </span>
        <Icone nome="chevron-right" classe="linha-seta" />
      </button>
    {/each}
  </div>
</div>
