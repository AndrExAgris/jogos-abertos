<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { LADO, LINHA_SAIDA, limites, mover, resolvido, type Rush } from '@ja/nucleo-estado/rush';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';

  interface Estado { veiculos: Rush; movimentos: number }
  const s = new Sessao<{ minimo: number }, Estado>('rush');
  const OPCOES = [
    { id: 'facil', titulo: 'Fácil', descricao: '4 a 8 movimentos' },
    { id: 'medio', titulo: 'Médio', descricao: '9 a 16 movimentos' },
    { id: 'dificil', titulo: 'Difícil', descricao: '17 a 26 movimentos' },
    { id: 'expert', titulo: 'Especialista', descricao: '27 ou mais movimentos' },
  ];
  const FAIXAS: Record<string, [number, number]> = { facil: [4, 8], medio: [9, 16], dificil: [17, 26], expert: [27, 60] };
  const COMO = [
    'Tire o carro destacado pela saída à direita.',
    'Arraste os veículos: os deitados andam para os lados, os em pé para cima e para baixo. Ninguém passa por cima de ninguém.',
    'O número de movimentos mínimo aparece no alto; tente igualar.',
  ];

  let tabuleiro = $state<HTMLDivElement>();
  let arrasto = $state<{ k: number; inicio: number; desloc: number; lim: [number, number] } | null>(null);

  function escolher(id: string) {
    const [a, b] = FAIXAS[id];
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, async () => {
      const r = await gerarNoFundo<{ veiculos: Rush; movimentos: number }>('rush', [a, b, sementeNova(), 4000]);
      return { quebra: { minimo: r.movimentos }, estado: { veiculos: r.veiculos, movimentos: 0 } };
    });
  }

  function casaPx() { return (tabuleiro?.clientWidth ?? 300) / LADO; }

  function inicio(e: PointerEvent, k: number) {
    if (!s.estado || s.terminou) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const v = s.estado.veiculos[k];
    arrasto = { k, inicio: v.horizontal ? e.clientX : e.clientY, desloc: 0, lim: limites(s.estado.veiculos, k) };
  }
  function mexer(e: PointerEvent) {
    if (!arrasto || !s.estado) return;
    const v = s.estado.veiculos[arrasto.k];
    const d = ((v.horizontal ? e.clientX : e.clientY) - arrasto.inicio) / casaPx();
    arrasto = { ...arrasto, desloc: Math.max(arrasto.lim[0], Math.min(arrasto.lim[1], d)) };
  }
  function soltar() {
    if (!arrasto || !s.estado) return;
    const passos = Math.round(arrasto.desloc);
    const k = arrasto.k;
    arrasto = null;
    if (!passos) return;
    const veiculos = mover(s.estado.veiculos, k, passos);
    s.mudar({ veiculos, movimentos: s.estado.movimentos + 1 });
    if (resolvido(veiculos)) void s.terminar('vitoria');
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca
  sessao={s}
  titulo="Hora do Rush"
  comoJogar={COMO}
  opcoes={OPCOES}
  aoEscolher={escolher}
  tituloEscolha="Escolha a dificuldade"
  textoFim={s.estado && s.quebra ? `${s.estado.movimentos} movimentos (o mínimo é ${s.quebra.minimo}).` : undefined}
>
  {#snippet faixa()}
    {#if s.estado && s.quebra}<span class="ja-placar-item"><span class="ja-numero">{s.estado.movimentos}</span> / mín. {s.quebra.minimo}</span>{/if}
  {/snippet}
  {#if s.estado}
    <div class="ja-centro">
      <div class="ja-rush" bind:this={tabuleiro} role="application" aria-label="Estacionamento 6 por 6">
        <span class="ja-rush-saida" style="top:calc({LINHA_SAIDA} * 100% / {LADO})" aria-hidden="true"></span>
        {#each s.estado.veiculos as v, k (k)}
          {@const d = arrasto?.k === k ? arrasto.desloc : 0}
          <button
            type="button"
            class="ja-rush-carro"
            data-alvo={k === 0 || undefined}
            data-arrastando={arrasto?.k === k || undefined}
            style="left:calc(({v.x} + {v.horizontal ? d : 0}) * 100% / {LADO});top:calc(({v.y} + {v.horizontal ? 0 : d}) * 100% / {LADO});width:calc({v.horizontal ? v.tam : 1} * 100% / {LADO});height:calc({v.horizontal ? 1 : v.tam} * 100% / {LADO})"
            aria-label="{k === 0 ? 'Carro destacado' : v.tam === 3 ? 'Caminhão' : 'Carro'} {v.horizontal ? 'deitado' : 'em pé'}"
            onpointerdown={(e) => inicio(e, k)}
            onpointermove={mexer}
            onpointerup={soltar}
            onpointercancel={soltar}
          ></button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
