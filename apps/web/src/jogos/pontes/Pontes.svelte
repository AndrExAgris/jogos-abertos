<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { chave, cruza, grau, resolvido, vizinhas, type Pontes, type QuebraPontes } from '@ja/nucleo-grade/pontes';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { pontes: Pontes }
  const s = new Sessao<QuebraPontes, Estado>('pontes');
  const TAMANHOS = [
    { id: 'p', titulo: 'Pequeno', descricao: '7 × 7, cerca de 10 ilhas' },
    { id: 'm', titulo: 'Médio', descricao: '9 × 11, cerca de 18 ilhas' },
    { id: 'g', titulo: 'Grande', descricao: '11 × 14, cerca de 28 ilhas' },
  ];
  const PARAM: Record<string, [number, number, number]> = { p: [7, 7, 10], m: [9, 11, 18], g: [11, 14, 28] };
  const COMO = [
    'Ligue as ilhas com pontes retas, na horizontal ou na vertical. Entre duas ilhas cabem até duas pontes.',
    'Cada ilha tem exatamente o número de pontes que mostra. Pontes não se cruzam, e no fim todas as ilhas ficam ligadas entre si.',
    'Arraste o dedo de uma ilha até a vizinha para pôr uma ponte; repita para pôr a segunda; mais uma vez para tirar as duas.',
    'Também dá para tocar numa ilha e depois na vizinha.',
  ];

  let selecionada = $state(-1);
  const viz = $derived(s.quebra ? vizinhas(s.quebra) : []);
  const pontes = $derived(s.estado?.pontes ?? {});

  function escolher(id: string) {
    void s.comecar(id, TAMANHOS.find((t) => t.id === id)!.titulo, async () => {
      const q = await gerarNoFundo<QuebraPontes>('pontes', [...PARAM[id], sementeNova()]);
      return { quebra: { largura: q.largura, altura: q.altura, ilhas: q.ilhas }, estado: { pontes: {} } };
    });
    selecionada = -1;
  }

  /** Põe, dobra ou tira a ponte entre a e b. */
  function ligar(a: number, b: number) {
    if (!s.quebra || s.terminou || !viz[a].includes(b)) return;
    const k = chave(a, b);
    const atual = pontes[k] ?? 0;
    const novo = (atual + 1) % 3;
    if (novo > 0 && atual === 0 && cruza(s.quebra, pontes, a, b)) { vibrar(60); return; }
    const p = { ...pontes };
    if (novo) p[k] = novo; else delete p[k];
    s.mudar({ pontes: p });
    if (resolvido(s.quebra, p)) void s.terminar('vitoria');
  }

  function tocarIlha(i: number) {
    if (!s.quebra || s.terminou) return;
    if (selecionada < 0 || selecionada === i) { selecionada = selecionada === i ? -1 : i; return; }
    if (!viz[selecionada].includes(i)) { selecionada = i; return; }
    ligar(selecionada, i);
    selecionada = -1;
  }

  // --- Arrastar de uma ilha a outra ---
  let svg = $state<SVGSVGElement>();
  let arrasto = $state<{ de: number; x: number; y: number; x0: number; y0: number; alvo: number; moveu: boolean } | null>(null);

  function ponto(e: PointerEvent): [number, number] {
    const m = svg!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return [p.x, p.y];
  }
  /** Vizinha na direção do dedo (a mais próxima do dedo entre as alcançáveis). */
  function alvoEm(de: number, x: number, y: number): number {
    const q = s.quebra!;
    const A = q.ilhas[de];
    const dx = x - A.x, dy = y - A.y;
    if (Math.hypot(dx, dy) < 0.5) return -1;
    let melhor = -1, menor = Infinity;
    for (const v of viz[de]) {
      const B = q.ilhas[v];
      const horizontal = B.y === A.y;
      // Só vale se o dedo foi mais na direção da vizinha.
      if (horizontal ? Math.abs(dx) < Math.abs(dy) || Math.sign(dx) !== Math.sign(B.x - A.x) : Math.abs(dy) < Math.abs(dx) || Math.sign(dy) !== Math.sign(B.y - A.y)) continue;
      const d = Math.hypot(B.x - x, B.y - y);
      if (d < menor) { menor = d; melhor = v; }
    }
    return melhor;
  }
  /** Ilha mais perto do dedo, com uma folga ao redor de cada uma (não precisa acertar em cima). */
  const ALCANCE = 0.78;
  function ilhaPerto(x: number, y: number): number {
    let melhor = -1, menor = ALCANCE;
    s.quebra!.ilhas.forEach((il, i) => {
      const d = Math.hypot(il.x - x, il.y - y);
      if (d < menor) { menor = d; melhor = i; }
    });
    return melhor;
  }
  function aoPressionar(e: PointerEvent) {
    if (!s.quebra || s.terminou) return;
    const [x, y] = ponto(e);
    const i = ilhaPerto(x, y);
    if (i < 0) return;
    e.preventDefault();
    svg!.setPointerCapture(e.pointerId);
    arrasto = { de: i, x, y, x0: x, y0: y, alvo: -1, moveu: false };
  }
  function aoMover(e: PointerEvent) {
    if (!arrasto) return;
    const [x, y] = ponto(e);
    arrasto = { ...arrasto, x, y, alvo: alvoEm(arrasto.de, x, y), moveu: arrasto.moveu || Math.hypot(x - arrasto.x0, y - arrasto.y0) > 0.45 };
  }
  function aoSoltar() {
    if (!arrasto) return;
    const { de, alvo, moveu } = arrasto;
    arrasto = null;
    if (!moveu) { tocarIlha(de); return; }
    if (alvo >= 0) { ligar(de, alvo); selecionada = -1; }
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Pontes" comoJogar={COMO} opcoes={TAMANHOS} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#if s.quebra}
    {@const q = s.quebra}
    <div class="ja-centro">
      <svg bind:this={svg} class="ja-pontes" onpointerdown={aoPressionar} onpointermove={aoMover} onpointerup={aoSoltar} onpointercancel={() => (arrasto = null)} viewBox="-0.6 -0.6 {q.largura + 0.2} {q.altura + 0.2}" role="group" aria-label="Ilhas">
        {#each Object.entries(pontes) as [k, n] (k)}
          {@const [a, b] = k.split('-').map(Number)}
          {@const A = q.ilhas[a]}
          {@const B = q.ilhas[b]}
          {@const h = A.y === B.y}
          {#if n === 1}
            <line class="ja-ponte" x1={A.x} y1={A.y} x2={B.x} y2={B.y} />
          {:else}
            <line class="ja-ponte" x1={A.x + (h ? 0 : -0.1)} y1={A.y + (h ? -0.1 : 0)} x2={B.x + (h ? 0 : -0.1)} y2={B.y + (h ? -0.1 : 0)} />
            <line class="ja-ponte" x1={A.x + (h ? 0 : 0.1)} y1={A.y + (h ? 0.1 : 0)} x2={B.x + (h ? 0 : 0.1)} y2={B.y + (h ? 0.1 : 0)} />
          {/if}
        {/each}
        {#if selecionada >= 0}
          {#each viz[selecionada] as v (v)}
            <line class="ja-ponte-guia" x1={q.ilhas[selecionada].x} y1={q.ilhas[selecionada].y} x2={q.ilhas[v].x} y2={q.ilhas[v].y} />
          {/each}
        {/if}
        {#if arrasto?.moveu}
          {@const A = q.ilhas[arrasto.de]}
          {#if arrasto.alvo >= 0}
            <line class="ja-ponte-arrasto" x1={A.x} y1={A.y} x2={q.ilhas[arrasto.alvo].x} y2={q.ilhas[arrasto.alvo].y} />
          {:else}
            <line class="ja-ponte-guia" x1={A.x} y1={A.y} x2={arrasto.x} y2={arrasto.y} />
          {/if}
        {/if}
        {#each q.ilhas as il, i (i)}
          {@const g = grau(pontes, i)}
          <g
            class="ja-ilha"
            data-selecionada={selecionada === i || arrasto?.de === i || arrasto?.alvo === i || undefined}
            data-completa={g === il.n || undefined}
            data-erro={g > il.n || undefined}
            role="button"
            tabindex="-1"
            aria-label="Ilha {il.n}, {g} pontes"
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && tocarIlha(i)}
          >
            <circle cx={il.x} cy={il.y} r="0.42" />
            <text x={il.x} y={il.y} dy="0.02">{il.n}</text>
          </g>
        {/each}
      </svg>
    </div>
  {/if}
</Casca>
