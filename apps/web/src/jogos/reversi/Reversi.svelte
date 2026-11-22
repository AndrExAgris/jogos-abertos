<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { jogarReversi, lancesReversi, novoReversi, placarReversi, type EstadoReversi } from '@ja/nucleo-tabuleiro/reversi';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { usarComputador } from '../../lib/jogo/computador.svelte.ts';
  import { nivelDoId, opcoesIA, type NivelIA } from '../../lib/jogo/ia.ts';

  const s = new Sessao<{ modo: string; ia?: NivelIA }, EstadoReversi>('reversi', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Jogue numa casa que prenda peças do outro entre a nova peça e outra sua, em linha reta (inclusive na diagonal). As peças presas viram para a sua cor.',
    'Sem lance possível, a vez passa. Quando ninguém pode jogar, vence quem tiver mais peças.',
    'Os pontinhos mostram onde dá para jogar.',
  ];
  const lances = $derived(s.estado ? new Set(lancesReversi(s.estado)) : new Set<number>());
  const placar = $derived(s.estado ? placarReversi(s.estado) : [0, 0]);
  const OPCOES = [...opcoesIA(), { id: '2', titulo: 'Dois jogadores', descricao: 'No mesmo aparelho' }];
  const ia = $derived(s.quebra?.ia);
  const nomes = $derived(ia ? ['Você', 'Computador'] : ['Jogador 1', 'Jogador 2']);
  const fim = $derived(placar[0] === placar[1] ? `Empate: ${placar[0]} a ${placar[1]}.` : `${ia ? (placar[0] > placar[1] ? 'Você venceu' : 'O computador venceu') : `Jogador ${placar[0] > placar[1] ? 1 : 2} venceu`} por ${Math.max(...placar)} a ${Math.min(...placar)}!`);
  const pc = usarComputador<EstadoReversi, number>({ jogo: 'reversi', sessao: s, vez: (e) => e.vez === 2 && !e.fim, aplicar: (i) => jogar(i) });
  function comecar(id: string) {
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id, ia: nivelDoId(id) }, estado: novoReversi() }));
  }

  function tocar(i: number) {
    if (ia && s.estado?.vez === 2) return;
    jogar(i);
  }
  function jogar(i: number) {
    if (!s.estado || s.terminou || !lancesReversi(s.estado).includes(i)) return;
    const n = jogarReversi(s.estado, i);
    s.mudar(n);
    if (n.passou) window.OpenDesign.toast({ texto: `${nomes[n.vez === 1 ? 1 : 0]} não tem lance e passou a vez.` });
    if (n.fim) { const [a, b] = placarReversi(n); void s.terminar(a === b ? 'empate' : ia && b > a ? 'derrota' : 'vitoria'); }
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Reversi" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} aoDesfazer={pc.desfazer} tituloEscolha="Quem joga?" tituloFim={fim} textoFim="" semRelogio>
  {#if s.estado}
    <Jogadores {nomes} vez={s.terminou ? -1 : s.estado.vez - 1} pontos={placar} pensando={pc.pensando} />
    <div class="ja-centro">
      <div class="ja-tab ja-tab-grade" style="--ja-colunas:8">
        {#each s.estado.casas as c, i (i)}
          <button type="button" class="ja-tab-casa ja-reversi-casa" aria-label="Casa {i + 1}{c ? `, jogador ${c}` : lances.has(i) ? ', pode jogar' : ''}" onclick={() => tocar(i)}>
            {#if c}<span class="ja-disco ja-j{c}"></span>{:else if lances.has(i) && !(ia && s.estado.vez === 2)}<span class="ja-alvo-ponto"></span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
