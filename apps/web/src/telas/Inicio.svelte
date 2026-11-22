<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Icone } from '@ja/ui';
  import Tela from '../lib/Tela.svelte';
  import { GRUPOS } from '../jogos/registro.ts';
  import { ir } from '../lib/rotas.svelte.ts';
  import { inicio } from '../lib/inicio.svelte.ts';

  function alternar(id: string) {
    inicio.abertos = inicio.abertos.includes(id) ? inicio.abertos.filter((g) => g !== id) : [...inicio.abertos, id];
    inicio.salvar();
  }

  function rolavel(): HTMLElement | null {
    return document.querySelector('.tela-conteudo');
  }

  function abrir(id: string) {
    inicio.rolagem = rolavel()?.scrollTop ?? 0;
    ir(`/jogo/${id}`);
  }

  onMount(async () => {
    await tick();
    const el = rolavel();
    if (el) el.scrollTop = inicio.rolagem;
  });
</script>

<Tela titulo="Jogos">
  {#each GRUPOS as grupo (grupo.id)}
    {@const aberto = inicio.abertos.includes(grupo.id)}
    <section class="ja-grupo" data-aberto={aberto || undefined}>
      <button class="ja-grupo-cabeca" type="button" aria-expanded={aberto} aria-controls="g-{grupo.id}" onclick={() => alternar(grupo.id)}>
        <span class="ja-grupo-icone"><Icone nome={grupo.icone} /></span>
        <span class="ja-grupo-texto">
          <span class="ja-grupo-nome">{grupo.nome}</span>
          <span class="ja-grupo-conta">{grupo.jogos.length} {grupo.jogos.length === 1 ? 'jogo' : 'jogos'}</span>
        </span>
        <Icone nome="chevron-down" classe="ja-grupo-seta" />
      </button>
      {#if aberto}
        <div class="ja-grade-jogos" id="g-{grupo.id}">
          {#each grupo.jogos as jogo (jogo.id)}
            <button class="ja-quadro-jogo" type="button" onclick={() => abrir(jogo.id)} disabled={!jogo.carregar}>
              <span class="ja-quadro-nome">{jogo.nome}</span>
              <span class="ja-quadro-icone"><Icone nome={jogo.icone} /></span>
              <span class="ja-quadro-descricao">{jogo.carregar ? jogo.descricao : 'Em breve'}</span>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  {/each}
</Tela>
