<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { COLUNAS, LINHAS, novoQuatro, soltar, type EstadoQuatro } from '@ja/nucleo-tabuleiro/quatro';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  const s = new Sessao<{ modo: string }, EstadoQuatro>('quatro', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Cada um, na sua vez, solta uma peça numa coluna; ela cai até a casa livre mais baixa.',
    'Vence quem alinhar quatro peças da sua cor: na horizontal, na vertical ou na diagonal.',
  ];
  const fim = $derived(s.estado?.vencedor ? (s.estado.vencedor === 'empate' ? 'Empate: o tabuleiro encheu.' : `Jogador ${s.estado.vencedor} venceu!`) : '');

  function tocar(c: number) {
    if (!s.estado || s.terminou) return;
    const n = soltar(s.estado, c);
    if (n === s.estado) return;
    s.mudar(n);
    if (n.vencedor) void s.terminar(n.vencedor === 'empate' ? 'empate' : 'vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Quatro em Linha" comoJogar={COMO} opcoes={[{ id: '2', titulo: 'Dois jogadores', descricao: 'No mesmo aparelho' }]} aoEscolher={(id) => s.comecar(id, '2 jogadores', () => ({ quebra: { modo: id }, estado: novoQuatro() }))} tituloFim={fim} textoFim="" semRelogio>
  {#if s.estado}
    <Jogadores nomes={['Jogador 1', 'Jogador 2']} vez={s.terminou ? -1 : s.estado.vez - 1} />
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
