<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { COLUNAS, LINHAS, novoQuatro, soltar, type EstadoQuatro } from '@ja/nucleo-tabuleiro/quatro';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { usarComputador } from '../../lib/jogo/computador.svelte.ts';
  import { nivelDoId, opcoesIA, type NivelIA } from '../../lib/jogo/ia.ts';

  const s = new Sessao<{ modo: string; ia?: NivelIA }, EstadoQuatro>('quatro', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Cada um, na sua vez, solta uma peça numa coluna; ela cai até a casa livre mais baixa.',
    'Vence quem alinhar quatro peças da sua cor: na horizontal, na vertical ou na diagonal.',
  ];
  const OPCOES = [...opcoesIA(), { id: '2', titulo: 'Dois jogadores', descricao: 'No mesmo aparelho' }];
  const ia = $derived(s.quebra?.ia);
  const nomes = $derived(ia ? ['Você', 'Computador'] : ['Jogador 1', 'Jogador 2']);
  const fim = $derived(s.estado?.vencedor ? (s.estado.vencedor === 'empate' ? 'Empate: o tabuleiro encheu.' : ia ? (s.estado.vencedor === 1 ? 'Você venceu!' : 'O computador venceu.') : `Jogador ${s.estado.vencedor} venceu!`) : '');
  const pc = usarComputador<EstadoQuatro, number>({ jogo: 'quatro', sessao: s, vez: (e) => e.vez === 2, aplicar: (c) => jogar(c) });
  function comecar(id: string) {
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id, ia: nivelDoId(id) }, estado: novoQuatro() }));
  }
  function jogar(c: number) {
    if (!s.estado || s.terminou) return;
    const n = soltar(s.estado, c);
    if (n === s.estado) return;
    s.mudar(n);
    if (n.vencedor) void s.terminar(n.vencedor === 'empate' ? 'empate' : ia && n.vencedor === 2 ? 'derrota' : 'vitoria');
  }

  function tocar(c: number) {
    if (ia && s.estado?.vez === 2) return;
    jogar(c);
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Quatro em Linha" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} aoDesfazer={pc.desfazer} tituloEscolha="Quem joga?" tituloFim={fim} textoFim="" semRelogio>
  {#if s.estado}
    <Jogadores {nomes} vez={s.terminou ? -1 : s.estado.vez - 1} pensando={pc.pensando} />
    <div class="ja-centro">
      <div class="ja-tab ja-tab-grade ja-quatro" style="--ja-colunas:{COLUNAS};--ja-linhas:{LINHAS}">
        {#each s.estado.casas as c, i (i)}
          <button type="button" class="ja-tab-casa" data-destaque={s.estado.linhaVencedora.includes(i) || undefined} aria-label="Coluna {(i % COLUNAS) + 1}{c ? `, peça do jogador ${c}` : ''}" onclick={() => tocar(i % COLUNAS)}>
            {#if c}<span class="ja-disco ja-j{c}"></span>{:else}<span class="ja-buraco"></span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
