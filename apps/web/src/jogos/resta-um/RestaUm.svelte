<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { TABULEIROS, montar, pecas, pular, pulos, type EstadoRestaUm } from '@ja/nucleo-estado/resta-um';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  const s = new Sessao<{ id: string }, EstadoRestaUm>('resta-um');
  const OPCOES = TABULEIROS.map((t) => ({ id: t.id, titulo: t.nome, descricao: t.descricao }));
  const COMO = [
    'Pule uma peça por cima de outra vizinha (na horizontal ou na vertical) até uma casa vazia logo depois. A peça pulada sai do tabuleiro.',
    'O objetivo é deixar uma peça só. Terminar com ela no centro é a solução perfeita.',
    'Toque na peça e depois na casa vazia de destino.',
  ];

  let selecionada = $state(-1);
  const destinos = $derived(s.estado && selecionada >= 0 ? pulos(s.estado, selecionada) : []);
  const restam = $derived(s.estado ? pecas(s.estado) : 0);
  const texto = $derived.by(() => {
    if (!s.estado) return '';
    const centro = Math.floor(s.estado.casas.length / 2);
    if (restam === 1) return s.estado.casas[centro] === 1 ? 'Uma peça, no centro: perfeito!' : 'Sobrou uma peça só.';
    return `Sem pulos possíveis. Sobraram ${restam} peças.`;
  });

  function escolher(id: string) {
    const t = TABULEIROS.find((x) => x.id === id)!;
    selecionada = -1;
    void s.comecar(id, t.nome, () => ({ quebra: { id }, estado: montar(t) }));
  }

  function tocar(i: number) {
    if (!s.estado || s.terminou) return;
    const c = s.estado.casas[i];
    if (c === 1) { selecionada = selecionada === i ? -1 : i; return; }
    const p = destinos.find((d) => d.para === i);
    if (!p) return;
    const novo = pular(s.estado, p);
    s.mudar(novo);
    selecionada = pulos(novo, i).length ? i : -1;
    if (!pulos(novo).length) void s.terminar(pecas(novo) === 1 ? 'vitoria' : 'derrota');
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Resta Um" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha o tabuleiro" textoFim={texto} tituloFim={restam === 1 ? 'Resta um!' : 'Fim de jogo'}>
  {#snippet faixa()}<span class="ja-placar-item"><span class="ja-numero">{restam}</span> peças</span>{/snippet}
  {#if s.estado}
    <div class="ja-centro">
      <div class="ja-resta" style="--ja-colunas:{s.estado.largura}">
        {#each s.estado.casas as c, i (i)}
          {#if c < 0}
            <span></span>
          {:else}
            <button
              type="button"
              class="ja-resta-casa"
              data-peca={c === 1 || undefined}
              data-selecionada={selecionada === i || undefined}
              data-destino={destinos.some((d) => d.para === i) || undefined}
              aria-label={c === 1 ? 'Peça' : 'Casa vazia'}
              onclick={() => tocar(i)}
            ><span></span></button>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</Casca>
