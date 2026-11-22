<script lang="ts">
  import Tela from '../lib/Tela.svelte';
  import { formatarTempo, lerEstatisticas, type EstatisticasJogo } from '../lib/estatisticas.ts';
  import { NIVEIS_MINAS } from '@ja/nucleo-grade/minas';

  const variantes: { id: string; nome: string }[] = [
    ...Object.entries(NIVEIS_MINAS).map(([id, n]) => ({ id, nome: `${n.nome} (${n.largura}×${n.altura}, ${n.minas} minas)` })),
    { id: 'personalizado', nome: 'Personalizado' },
  ];

  let minas = $state<EstatisticasJogo | null>(null);
  lerEstatisticas('minas').then((e) => (minas = e));
</script>

<Tela titulo="Recordes">
  <section class="ja-grupo" aria-labelledby="r-minas">
    <h2 class="grupo-config-titulo" id="r-minas">Minas</h2>
    {#if minas}
      <div class="lista-config">
        {#each variantes as v (v.id)}
          {@const e = minas[v.id]}
          <div class="linha-config">
            <span class="linha-texto">
              <span class="linha-titulo">{v.nome}</span>
              <span class="linha-descricao">
                {#if e && e.jogadas}
                  {e.vitorias} de {e.jogadas} vencidas ({Math.round((100 * e.vitorias) / e.jogadas)}%), maior sequência {e.maiorSequencia}
                {:else}
                  Nenhuma partida ainda
                {/if}
              </span>
            </span>
            <span class="linha-valor numeros-tabulares">{e?.melhorTempo != null ? formatarTempo(e.melhorTempo) : '—'}</span>
          </div>
        {/each}
      </div>
      <p class="ui-pequeno texto-2">O valor à direita é o melhor tempo de vitória.</p>
    {/if}
  </section>
</Tela>
