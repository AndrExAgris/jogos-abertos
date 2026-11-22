<script lang="ts">
  import { Icone } from '@ja/ui';
  import Tela from '../lib/Tela.svelte';
  import { GRUPOS } from '../jogos/registro.ts';
  import { ir } from '../lib/rotas.svelte.ts';
</script>

<Tela titulo="Jogos">
  {#each GRUPOS as grupo (grupo.id)}
    <section class="ja-grupo" aria-labelledby="g-{grupo.id}">
      <h2 class="grupo-config-titulo" id="g-{grupo.id}">{grupo.nome}</h2>
      <div class="ja-grade-jogos">
        {#each grupo.jogos as jogo (jogo.id)}
          <button class="ja-quadro-jogo" type="button" onclick={() => ir(`/jogo/${jogo.id}`)} disabled={!jogo.carregar}>
            <span class="ja-quadro-nome">{jogo.nome}</span>
            <span class="ja-quadro-icone"><Icone nome={jogo.icone} /></span>
            <span class="ja-quadro-descricao">{jogo.carregar ? jogo.descricao : 'Em breve'}</span>
          </button>
        {/each}
      </div>
    </section>
  {/each}
</Tela>
