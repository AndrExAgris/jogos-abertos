<script lang="ts">
  import Tela from '../lib/Tela.svelte';
  import { formatarTempo, lerEstatisticas, type EstatisticasJogo } from '../lib/estatisticas.ts';
  import { GRUPOS } from '../jogos/registro.ts';

  const jogos = GRUPOS.flatMap((g) => g.jogos);
  let dados = $state<{ id: string; nome: string; est: EstatisticasJogo }[] | null>(null);

  Promise.all(jogos.map(async (j) => ({ id: j.id, nome: j.nome, est: await lerEstatisticas(j.id) }))).then((r) => {
    dados = r.filter((x) => Object.keys(x.est).length > 0);
  });
</script>

<Tela titulo="Recordes">
  {#if dados && dados.length === 0}
    <p class="ui texto-2 ja-sem-margem">Nenhuma partida terminada ainda. Os recordes aparecem aqui depois da primeira.</p>
  {/if}
  {#each dados ?? [] as jogo (jogo.id)}
    <section class="ja-grupo" aria-labelledby="r-{jogo.id}">
      <h2 class="grupo-config-titulo" id="r-{jogo.id}">{jogo.nome}</h2>
      <div class="lista-config">
        {#each Object.entries(jogo.est) as [variante, e] (variante)}
          <div class="linha-config">
            <span class="linha-texto">
              <span class="linha-titulo">{e.nome ?? variante}</span>
              <span class="linha-descricao">
                {e.vitorias} de {e.jogadas} vencidas ({Math.round((100 * e.vitorias) / Math.max(1, e.jogadas))}%), maior sequência {e.maiorSequencia}
              </span>
            </span>
            <span class="linha-valor numeros-tabulares">
              {#if e.melhorPontuacao != null}{e.melhorPontuacao} pts{:else if e.melhorTempo != null}{formatarTempo(e.melhorTempo)}{:else}—{/if}
            </span>
          </div>
        {/each}
      </div>
    </section>
  {/each}
  {#if dados && dados.length}
    <p class="ui-pequeno texto-2">À direita, o melhor tempo de vitória ou a maior pontuação.</p>
  {/if}
</Tela>
