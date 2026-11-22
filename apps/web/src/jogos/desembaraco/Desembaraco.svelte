<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { cruzadas, gerarDesembaraco, type Grafo, type Ponto } from '@ja/nucleo-estado/desembaraco';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  const s = new Sessao<{ arestas: [number, number][] }, Ponto[]>('desembaraco');
  const OPCOES = [
    { id: '8', titulo: 'Fácil', descricao: '8 pontos' },
    { id: '12', titulo: 'Médio', descricao: '12 pontos' },
    { id: '18', titulo: 'Difícil', descricao: '18 pontos' },
    { id: '25', titulo: 'Muito difícil', descricao: '25 pontos' },
  ];
  const COMO = [
    'Arraste os pontos até nenhuma linha cruzar outra.',
    'As linhas destacadas ainda cruzam alguma outra.',
  ];

  let svg = $state<SVGSVGElement>();
  let arrastando = $state(-1);
  let pontosTemp = $state<Ponto[] | null>(null);
  const pontos = $derived(pontosTemp ?? s.estado ?? []);
  const grafo = $derived<Grafo | null>(s.quebra ? { pontos, arestas: s.quebra.arestas } : null);
  const cruz = $derived(grafo ? cruzadas(grafo) : new Set<number>());

  function escolher(id: string) {
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.descricao, () => {
      const g = gerarDesembaraco(Number(id), sementeNova());
      return { quebra: { arestas: g.arestas }, estado: g.pontos };
    });
  }

  function paraCoordenada(e: PointerEvent): Ponto {
    const r = svg!.getBoundingClientRect();
    return { x: Math.max(0.02, Math.min(0.98, (e.clientX - r.left) / r.width)), y: Math.max(0.02, Math.min(0.98, (e.clientY - r.top) / r.height)) };
  }
  /** Toque no tabuleiro: pega o ponto mais perto do dedo, com folga generosa. */
  function inicio(e: PointerEvent) {
    if (s.terminou || !s.estado) return;
    const c = paraCoordenada(e);
    let i = -1, menor = 0.075;
    s.estado.forEach((p, k) => { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < menor) { menor = d; i = k; } });
    if (i < 0) return;
    svg!.setPointerCapture(e.pointerId);
    arrastando = i;
    pontosTemp = [...(s.estado ?? [])];
  }
  function mexer(e: PointerEvent) {
    if (arrastando < 0 || !pontosTemp) return;
    const p = [...pontosTemp];
    p[arrastando] = paraCoordenada(e);
    pontosTemp = p;
  }
  function soltar() {
    if (arrastando < 0 || !pontosTemp || !s.quebra) return;
    const final = pontosTemp;
    arrastando = -1;
    pontosTemp = null;
    s.mudar(final);
    if (cruzadas({ pontos: final, arestas: s.quebra.arestas }).size === 0) void s.terminar('vitoria');
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Desembaraço" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha a dificuldade">
  {#snippet faixa()}<span class="ja-placar-item"><span class="ja-numero">{cruz.size}</span> linhas cruzando</span>{/snippet}
  {#if grafo}
    <div class="ja-centro">
      <svg class="ja-desembaraco" viewBox="0 0 1 1" bind:this={svg} role="application" aria-label="Pontos e linhas para desembaraçar" onpointerdown={inicio} onpointermove={mexer} onpointerup={soltar} onpointercancel={soltar}>
        {#each grafo.arestas as [a, b], k (k)}
          <line class="ja-aresta" data-cruza={cruz.has(k) || undefined} x1={pontos[a].x} y1={pontos[a].y} x2={pontos[b].x} y2={pontos[b].y} />
        {/each}
        {#each pontos as p, i (i)}
          <circle
            class="ja-no"
            data-arrastando={arrastando === i || undefined}
            cx={p.x}
            cy={p.y}
            r={arrastando === i ? 0.036 : 0.03}
          />
        {/each}
      </svg>
    </div>
  {/if}
</Casca>
