<script lang="ts">
  import Tela from '../lib/Tela.svelte';
  import { CATALOGO, rotuloJogadores } from '../lib/catalogo.ts';
  import { ir } from '../lib/rotas.svelte.ts';

  const prontos = CATALOGO.reduce((n, g) => n + g.jogos.filter((j) => j.disponivel).length, 0);
  const total = CATALOGO.reduce((n, g) => n + g.jogos.length, 0);
</script>

<Tela titulo="Jogos">
  <p class="ui texto-2 ja-sem-margem">{prontos} de {total} jogos prontos. Os outros chegam nas próximas versões.</p>
  {#each CATALOGO as grupo (grupo.id)}
    <section class="ja-grupo" aria-labelledby="g-{grupo.id}">
      <h2 class="grupo-config-titulo" id="g-{grupo.id}">{grupo.nome}</h2>
      <div class="ja-lista-jogos">
        {#each grupo.jogos as jogo (jogo.id)}
          {#if jogo.disponivel}
            <button class="ja-cartao-jogo" type="button" onclick={() => ir(`/jogo/${jogo.id}`)}>
              <span class="ja-cartao-titulo">{jogo.nome}</span>
              <span class="ja-cartao-descricao">{jogo.descricao}</span>
              <span class="ja-cartao-rodape"><span class="etiqueta" data-cor="secundaria">{rotuloJogadores[jogo.jogadores]}</span></span>
            </button>
          {:else}
            <div class="ja-cartao-jogo" aria-disabled="true">
              <span class="ja-cartao-titulo">{jogo.nome}</span>
              <span class="ja-cartao-descricao">{jogo.descricao}</span>
              <span class="ja-cartao-rodape"><span class="etiqueta">Em breve</span></span>
            </div>
          {/if}
        {/each}
      </div>
    </section>
  {/each}
</Tela>
