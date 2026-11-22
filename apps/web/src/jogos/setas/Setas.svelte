<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { caminhoLivre, gerarSetas, tirar, vazio, type Setas } from '@ja/nucleo-estado/setas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { setas: Setas; erros: number }
  const s = new Sessao<{ n: number }, Estado>('setas');
  const OPCOES = [
    { id: '5', titulo: 'Pequeno', descricao: '5 × 6' },
    { id: '7', titulo: 'Médio', descricao: '7 × 9' },
    { id: '9', titulo: 'Grande', descricao: '9 × 12' },
  ];
  const COMO = [
    'Tire todas as setas da grade. Uma seta tocada voa para onde aponta, mas só se o caminho até a borda estiver livre.',
    'Tocar numa seta bloqueada conta um erro. Pense na ordem antes de tocar.',
  ];
  const ICONES = ['arrow-up', 'arrow-right', 'arrow-down', 'arrow-left'];
  let tremendo = $state(-1);

  function escolher(id: string) {
    const n = Number(id);
    const h = Math.round((n * 4) / 3);
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.descricao, () => ({ quebra: { n }, estado: { setas: gerarSetas(n, h, 0.8, sementeNova()), erros: 0 } }));
  }

  function tocar(i: number) {
    if (!s.estado || s.terminou || s.estado.setas.setas[i] < 0) return;
    if (!caminhoLivre(s.estado.setas, i)) {
      vibrar(80);
      tremendo = i;
      setTimeout(() => (tremendo = -1), 350);
      s.mudar({ ...s.estado, erros: s.estado.erros + 1 }, false);
      return;
    }
    const novo = tirar(s.estado.setas, i);
    s.mudar({ ...s.estado, setas: novo });
    if (vazio(novo)) void s.terminar('vitoria');
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Setas" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha o tamanho" textoFim={s.estado ? `${s.estado.erros} erros.` : undefined}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.erros}</span> erros</span>{/if}{/snippet}
  {#if s.estado}
    {@const g = s.estado.setas}
    <div class="ja-centro">
      <div class="ja-grade ja-setas" style="--ja-colunas:{g.largura}">
        {#each g.setas as d, i (i)}
          {#if d >= 0}
            <button type="button" class="ja-grade-casa" data-treme={tremendo === i || undefined} aria-label="Seta para {['cima', 'direita', 'baixo', 'esquerda'][d]}" onclick={() => tocar(i)}>
              <Icone nome={ICONES[d]} />
            </button>
          {:else}
            <span class="ja-grade-casa ja-setas-vazia"></span>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</Casca>
