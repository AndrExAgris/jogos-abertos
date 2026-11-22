<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { ALTURA, CACAPA, CACAPAS, LARGURA, RAIO, arbitrar, novaSinuca, passo, podePorBranca, tacada, type Bola, type EstadoSinuca, type Eventos } from '@ja/nucleo-tabuleiro/sinuca';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { layout } from '../../lib/layout.svelte.ts';

  const s = new Sessao<{ modo: string }, EstadoSinuca>('sinuca', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Arraste o dedo a partir da bola branca, para trás, como quem puxa o taco: a tacada sai na direção oposta, e quanto mais longe, mais forte. Solte para tacar.',
    'A primeira bola encaçapada define o grupo: lisas (1 a 7) ou listradas (9 a 15). Encaçapou do seu grupo, joga de novo.',
    'Falta (branca na caçapa, ou tocar primeiro numa bola que não é do seu grupo): o outro põe a branca onde quiser, tocando na mesa. Vence quem encaçapar a 8 depois do seu grupo; a 8 antes da hora perde a partida.',
  ];
  let svg = $state<SVGSVGElement>();
  let animando = $state(false);
  let bolasVivas = $state<Bola[] | null>(null);
  let mira = $state<{ x: number; y: number } | null>(null);
  let quadro = 0;
  const bolas = $derived(bolasVivas ?? s.estado?.bolas ?? []);
  const branca = $derived(bolas.find((b) => b.n === 0));
  const FORCA_MAX = 9;

  // No celular em pé, a mesa gira 90° com a cabeceira (onde fica a branca) embaixo: (x, y) da mesa vira (y, LARGURA − x) na tela.
  const retrato = !layout.largo && window.innerHeight > window.innerWidth;
  function ponto(e: PointerEvent) {
    const r = svg!.getBoundingClientRect();
    if (retrato) {
      const sx = ((e.clientX - r.left) / r.width) * (ALTURA + 16) - 8;
      const sy = ((e.clientY - r.top) / r.height) * (LARGURA + 16) - 8;
      return { x: LARGURA - sy, y: sx };
    }
    return { x: ((e.clientX - r.left) / r.width) * (LARGURA + 16) - 8, y: ((e.clientY - r.top) / r.height) * (ALTURA + 16) - 8 };
  }
  function inicio(e: PointerEvent) {
    if (!s.estado || animando || s.terminou) return;
    const p = ponto(e);
    if (s.estado.bolaNaMao) {
      if (podePorBranca(s.estado, p.x, p.y)) {
        const bs = s.estado.bolas.map((b) => (b.n === 0 ? { ...b, x: p.x, y: p.y } : b));
        s.mudar({ ...s.estado, bolas: bs, bolaNaMao: false }, false);
      }
      return;
    }
    svg!.setPointerCapture(e.pointerId);
    mira = p;
  }
  function mexer(e: PointerEvent) { if (mira) mira = ponto(e); }
  function soltar() {
    if (!mira || !s.estado || !branca) return;
    const dx = branca.x - mira.x, dy = branca.y - mira.y;
    const dist = Math.hypot(dx, dy);
    mira = null;
    if (dist < 3) return;
    const forca = Math.min(FORCA_MAX, dist / 7);
    const pronto = tacada(s.estado, Math.atan2(dy, dx), forca);
    animar(pronto);
  }
  function animar(e: EstadoSinuca) {
    const vivas = e.bolas.map((b) => ({ ...b }));
    const ev: Eventos = { encacapadas: [], primeiroToque: null };
    animando = true;
    const quadroFn = () => {
      let andando = false;
      for (let k = 0; k < 2; k++) andando = passo(vivas, ev);
      bolasVivas = vivas.map((b) => ({ ...b }));
      if (andando) { quadro = requestAnimationFrame(quadroFn); return; }
      animando = false;
      bolasVivas = null;
      const n = arbitrar({ ...e, bolas: vivas }, ev);
      s.mudar(n);
      window.OpenDesign.toast({ texto: n.mensagem });
      if (n.vencedor !== null) void s.terminar('vitoria');
    };
    quadro = requestAnimationFrame(quadroFn);
  }
  const grupoTxt = (g: string | null) => (g === 'lisas' ? 'lisas' : g === 'listradas' ? 'listradas' : '—');
  onMount(() => s.carregar());
  onDestroy(() => { cancelAnimationFrame(quadro); s.destruir(); });
</script>

<Casca sessao={s} titulo="Sinuca" comoJogar={COMO} opcoes={[{ id: '2', titulo: 'Dois jogadores', descricao: '8 bolas, no mesmo aparelho' }]} aoEscolher={(id) => s.comecar(id, '8 bolas', () => ({ quebra: { modo: id }, estado: novaSinuca() }))} tituloFim={s.estado?.mensagem ?? ''} textoFim="" semRelogio semDesfazer>
  {#if s.estado}
    {@const e = s.estado}
    <Jogadores nomes={['Jogador 1', 'Jogador 2']} vez={s.terminou ? -1 : e.vez} pontos={[grupoTxt(e.grupos[0]), grupoTxt(e.grupos[1])]} />
    {#if e.bolaNaMao && !s.terminou}<p class="ja-dica">Toque na mesa para pôr a bola branca.</p>{/if}
    <div class="ja-centro">
      <svg
        class="ja-sinuca"
        viewBox={retrato ? `-8 -8 ${ALTURA + 16} ${LARGURA + 16}` : `-8 -8 ${LARGURA + 16} ${ALTURA + 16}`}
        data-retrato={retrato || undefined}
        bind:this={svg}
        role="application"
        aria-label="Mesa de sinuca"
        onpointerdown={inicio}
        onpointermove={mexer}
        onpointerup={soltar}
        onpointercancel={() => (mira = null)}
      >
        <g transform={retrato ? `translate(0 ${LARGURA}) rotate(-90)` : undefined}>
        <rect x="-8" y="-8" width={LARGURA + 16} height={ALTURA + 16} rx="5" class="ja-sinuca-borda" />
        <rect x="0" y="0" width={LARGURA} height={ALTURA} class="ja-sinuca-pano" />
        {#each CACAPAS as [cx, cy], k (k)}<circle {cx} {cy} r={CACAPA} class="ja-sinuca-cacapa" />{/each}
        {#if mira && branca}
          {@const dx = branca.x - mira.x}
          {@const dy = branca.y - mira.y}
          {@const d = Math.hypot(dx, dy) || 1}
          <line x1={branca.x} y1={branca.y} x2={branca.x + (dx / d) * 60} y2={branca.y + (dy / d) * 60} class="ja-sinuca-mira" />
          <line x1={branca.x} y1={branca.y} x2={mira.x} y2={mira.y} class="ja-sinuca-taco" />
        {/if}
        {#each bolas as b (b.n)}
          {#if !b.dentro}
            <g class="ja-bola-grupo ja-bola-c{b.n > 8 ? b.n - 8 : b.n}">
              <circle cx={b.x} cy={b.y} r={RAIO} class="ja-bola" data-n={b.n} data-listrada={b.n > 8 || undefined} />
              {#if b.n > 8}
                <clipPath id="ja-bola-{b.n}"><circle cx={b.x} cy={b.y} r={RAIO} /></clipPath>
                <rect x={retrato ? b.x - RAIO * 0.55 : b.x - RAIO} y={retrato ? b.y - RAIO : b.y - RAIO * 0.55} width={retrato ? RAIO * 1.1 : RAIO * 2} height={retrato ? RAIO * 2 : RAIO * 1.1} class="ja-bola-faixa" clip-path="url(#ja-bola-{b.n})" />
              {/if}
              {#if b.n > 0}<circle cx={b.x} cy={b.y} r={RAIO * 0.48} class="ja-bola-disco" /><text x={b.x} y={b.y + 0.1} class="ja-bola-num" transform={retrato ? `rotate(90 ${b.x} ${b.y})` : undefined}>{b.n}</text>{/if}
              <circle cx={b.x - RAIO * 0.35} cy={b.y - RAIO * 0.35} r={RAIO * 0.28} class="ja-bola-brilho" />
            </g>
          {/if}
        {/each}
        </g>
      </svg>
    </div>
    <p class="ja-dica">Encaçapadas: {e.bolas.filter((b) => b.dentro && b.n > 0).map((b) => b.n).join(', ') || 'nenhuma'}</p>
  {/if}
</Casca>
