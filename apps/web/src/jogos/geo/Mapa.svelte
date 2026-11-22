<script lang="ts">
  import { Icone } from '@ja/ui';
  import { PAISES, caminhoSvg } from '@ja/geo/paises';

  interface Props {
    /** Classe de destaque por país (ex.: 'segredo', 'perto-3'). */
    destaques?: Record<string, string>;
    /** Caixa de visão [x, y, largura, altura] em graus (x = longitude, y = −latitude). */
    visao?: [number, number, number, number];
    pontos?: { lat: number; lon: number; classe: string }[];
    /** Permite aproximar (pinça, roda do mouse ou botões) e arrastar. */
    zoom?: boolean;
  }
  let { destaques = {}, visao = [-170, -84, 345, 145], pontos = [], zoom = true }: Props = $props();
  const caminhos = PAISES.filter((p) => p.temForma).map((p) => ({ id: p.id, d: caminhoSvg(p.id) }));

  // Volta ao mapa inteiro sempre que a visão pedida muda; pode ser reescrita pelo zoom.
  let vista = $derived<[number, number, number, number]>([...visao]);
  const ampliado = $derived(vista[2] < visao[2] * 0.98);

  let svg = $state<SVGSVGElement>();
  const toques = new Map<number, { x: number; y: number }>();
  let distanciaInicial = 0;

  /** Unidades do mapa por pixel (preserveAspectRatio="meet"). */
  function escala(): number {
    const r = svg!.getBoundingClientRect();
    return Math.max(vista[2] / r.width, vista[3] / r.height);
  }
  function limitar(v: [number, number, number, number]): [number, number, number, number] {
    const [bx, by, bw, bh] = visao;
    const w = Math.min(bw, Math.max(bw / 12, v[2]));
    const h = (w * bh) / bw;
    const x = Math.min(bx + bw - w, Math.max(bx, v[0]));
    const y = Math.min(by + bh - h, Math.max(by, v[1]));
    return [x, y, w, h];
  }
  /** Aproxima por `f` mantendo fixo o ponto (px, py) da tela. */
  function aproximar(f: number, px?: number, py?: number) {
    const r = svg!.getBoundingClientRect();
    const k = escala();
    const cx = px === undefined ? vista[0] + vista[2] / 2 : vista[0] + (px - r.left - (r.width - vista[2] / k) / 2) * k;
    const cy = py === undefined ? vista[1] + vista[3] / 2 : vista[1] + (py - r.top - (r.height - vista[3] / k) / 2) * k;
    const w = vista[2] / f, h = vista[3] / f;
    vista = limitar([cx - (cx - vista[0]) / f, cy - (cy - vista[1]) / f, w, h]);
  }
  function aoPressionar(e: PointerEvent) {
    if (!zoom) return;
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svg!.setPointerCapture(e.pointerId);
    if (toques.size === 2) {
      const [a, b] = [...toques.values()];
      distanciaInicial = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function aoMover(e: PointerEvent) {
    const antes = toques.get(e.pointerId);
    if (!antes) return;
    const agora = { x: e.clientX, y: e.clientY };
    if (toques.size === 1) {
      if (!ampliado) return;
      const k = escala();
      vista = limitar([vista[0] - (agora.x - antes.x) * k, vista[1] - (agora.y - antes.y) * k, vista[2], vista[3]]);
      toques.set(e.pointerId, agora);
    } else if (toques.size === 2) {
      toques.set(e.pointerId, agora);
      const [a, b] = [...toques.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (distanciaInicial > 0) aproximar(d / distanciaInicial, (a.x + b.x) / 2, (a.y + b.y) / 2);
      distanciaInicial = d;
    }
  }
  function aoSoltar(e: PointerEvent) {
    toques.delete(e.pointerId);
    distanciaInicial = 0;
  }
  function aoRolar(e: WheelEvent) {
    if (!zoom) return;
    e.preventDefault();
    aproximar(e.deltaY < 0 ? 1.25 : 1 / 1.25, e.clientX, e.clientY);
  }
</script>

<div class="ja-mapa-area">
  <svg
    bind:this={svg}
    class="ja-mapa"
    class:ja-mapa-zoom={zoom}
    viewBox={vista.join(' ')}
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Mapa-múndi"
    onpointerdown={aoPressionar}
    onpointermove={aoMover}
    onpointerup={aoSoltar}
    onpointercancel={aoSoltar}
    onwheel={aoRolar}
  >
    {#each caminhos as c (c.id)}<path d={c.d} class="ja-mapa-pais {destaques[c.id] ?? ''}" />{/each}
    {#each pontos as p, k (k)}<circle cx={p.lon} cy={-p.lat} r={Math.max(0.5, vista[2] / 120)} class="ja-mapa-ponto {p.classe}" />{/each}
  </svg>
  {#if zoom}
    <div class="ja-mapa-botoes">
      <button class="botao botao-icone" type="button" aria-label="Aproximar" title="Aproximar" onclick={() => aproximar(1.5)}><Icone nome="zoom-in" /></button>
      <button class="botao botao-icone" type="button" aria-label="Afastar" title="Afastar" onclick={() => aproximar(1 / 1.5)}><Icone nome="zoom-out" /></button>
      {#if ampliado}<button class="botao botao-icone" type="button" aria-label="Mapa inteiro" title="Mapa inteiro" onclick={() => (vista = [...visao])}><Icone nome="zoom-reset" /></button>{/if}
    </div>
  {/if}
</div>
