<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { jogarReversi, lancesReversi, novoReversi, placarReversi, type EstadoReversi } from '@ja/nucleo-tabuleiro/reversi';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  const s = new Sessao<{ modo: string }, EstadoReversi>('reversi', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Jogue numa casa que prenda peças do outro entre a nova peça e outra sua, em linha reta (inclusive na diagonal). As peças presas viram para a sua cor.',
    'Sem lance possível, a vez passa. Quando ninguém pode jogar, vence quem tiver mais peças.',
    'Os pontinhos mostram onde dá para jogar.',
  ];
  const lances = $derived(s.estado ? new Set(lancesReversi(s.estado)) : new Set<number>());
  const placar = $derived(s.estado ? placarReversi(s.estado) : [0, 0]);
  const fim = $derived(placar[0] === placar[1] ? `Empate: ${placar[0]} a ${placar[1]}.` : `Jogador ${placar[0] > placar[1] ? 1 : 2} venceu por ${Math.max(...placar)} a ${Math.min(...placar)}!`);

  function tocar(i: number) {
    if (!s.estado || s.terminou || !lances.has(i)) return;
    const n = jogarReversi(s.estado, i);
    s.mudar(n);
    if (n.passou) window.OpenDesign.toast({ texto: `Jogador ${n.vez === 1 ? 2 : 1} não tem lance e passou a vez.` });
    if (n.fim) { const [a, b] = placarReversi(n); void s.terminar(a === b ? 'empate' : 'vitoria'); }
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Reversi" comoJogar={COMO} opcoes={[{ id: '2', titulo: 'Dois jogadores', descricao: 'No mesmo aparelho' }]} aoEscolher={(id) => s.comecar(id, '2 jogadores', () => ({ quebra: { modo: id }, estado: novoReversi() }))} tituloFim={fim} textoFim="" semRelogio>
  {#if s.estado}
    <Jogadores nomes={['Jogador 1', 'Jogador 2']} vez={s.terminou ? -1 : s.estado.vez - 1} pontos={placar} />
    <div class="ja-centro">
      <div class="ja-tab ja-tab-grade" style="--ja-colunas:8">
        {#each s.estado.casas as c, i (i)}
          <button type="button" class="ja-tab-casa ja-reversi-casa" aria-label="Casa {i + 1}{c ? `, jogador ${c}` : lances.has(i) ? ', pode jogar' : ''}" onclick={() => tocar(i)}>
            {#if c}<span class="ja-disco ja-j{c}"></span>{:else if lances.has(i)}<span class="ja-alvo-ponto"></span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
