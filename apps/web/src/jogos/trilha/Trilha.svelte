<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { LIGACOES, PONTOS, colocar, destinos, fase, moverTrilha, novaTrilha, remover, removiveis, type EstadoTrilha } from '@ja/nucleo-tabuleiro/trilha';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  const s = new Sessao<{ modo: string }, EstadoTrilha>('trilha', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Primeiro cada um coloca suas 9 peças, uma por vez, nos pontos livres. Depois, as peças andam para um ponto vizinho pela linha.',
    'Três peças suas em linha formam um moinho: você tira uma peça do outro (que não esteja num moinho, se houver outra opção).',
    'Quem fica com 3 peças pode voar para qualquer ponto livre. Perde quem ficar com 2 peças ou sem movimento.',
  ];
  let selecionada = $state(-1);
  const alvos = $derived(s.estado && selecionada >= 0 ? destinos(s.estado, selecionada) : []);
  const tirar = $derived(s.estado?.removendo ? new Set(removiveis(s.estado)) : new Set<number>());
  const dica = $derived.by(() => {
    if (!s.estado || s.terminou) return '';
    if (s.estado.removendo) return 'Moinho! Toque numa peça do outro para tirar.';
    const f = fase(s.estado);
    return f === 'colocar' ? `Coloque uma peça (${s.estado.mao[s.estado.vez - 1]} na mão).` : f === 'voar' ? 'Com 3 peças, você pode voar para qualquer ponto.' : 'Mova uma peça para um ponto vizinho.';
  });

  function tocar(i: number) {
    if (!s.estado || s.terminou) return;
    const e = s.estado;
    let n = e;
    if (e.removendo) n = remover(e, i);
    else if (fase(e) === 'colocar') n = colocar(e, i);
    else if (e.casas[i] === e.vez) { selecionada = selecionada === i ? -1 : i; return; }
    else if (selecionada >= 0) { n = moverTrilha(e, selecionada, i); selecionada = -1; }
    if (n === e) return;
    s.mudar(n);
    if (n.vencedor) void s.terminar('vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Trilha" comoJogar={COMO} opcoes={[{ id: '2', titulo: 'Dois jogadores', descricao: 'Nove peças cada, no mesmo aparelho' }]} aoEscolher={(id) => s.comecar(id, '2 jogadores', () => ({ quebra: { modo: id }, estado: novaTrilha() }))} tituloFim={s.estado ? `Jogador ${s.estado.vencedor} venceu!` : ''} textoFim="" semRelogio>
  {#if s.estado}
    <Jogadores nomes={['Jogador 1', 'Jogador 2']} vez={s.terminou ? -1 : s.estado.vez - 1} pontos={[`${s.estado.casas.filter((c) => c === 1).length + s.estado.mao[0]} peças`, `${s.estado.casas.filter((c) => c === 2).length + s.estado.mao[1]} peças`]} />
    {#if dica}<p class="ja-dica">{dica}</p>{/if}
    <div class="ja-centro">
      <svg class="ja-tab ja-trilha" viewBox="-0.6 -0.6 7.2 7.2" role="group" aria-label="Tabuleiro da trilha">
        {#each LIGACOES as [a, b], k (k)}<line x1={PONTOS[a][0]} y1={PONTOS[a][1]} x2={PONTOS[b][0]} y2={PONTOS[b][1]} />{/each}
        {#each PONTOS as [x, y], i (i)}
          {@const c = s.estado.casas[i]}
          <g role="button" tabindex="-1" aria-label="Ponto {i + 1}{c ? `, jogador ${c}` : ''}" onclick={() => tocar(i)} onkeydown={(e) => e.key === 'Enter' && tocar(i)} class="ja-trilha-ponto" data-alvo={alvos.includes(i) || undefined} data-tirar={tirar.has(i) || undefined} data-selecionada={selecionada === i || undefined}>
            <circle cx={x} cy={y} r="0.42" class="ja-toque" />
            {#if c}<circle cx={x} cy={y} r="0.3" class="ja-trilha-peca ja-j{c}" />{:else}<circle cx={x} cy={y} r="0.1" class="ja-trilha-vazio" />{/if}
          </g>
        {/each}
      </svg>
    </div>
  {/if}
</Casca>
