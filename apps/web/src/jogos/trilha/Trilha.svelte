<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { LIGACOES, PONTOS, colocar, destinos, fase, moverTrilha, novaTrilha, remover, removiveis, type EstadoTrilha } from '@ja/nucleo-tabuleiro/trilha';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import Status from '../../lib/jogo/Status.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { usarComputador } from '../../lib/jogo/computador.svelte.ts';
  import { nivelDoId, opcoesIA, type NivelIA } from '../../lib/jogo/ia.ts';

  const s = new Sessao<{ modo: string; ia?: NivelIA }, EstadoTrilha>('trilha', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Primeiro cada um coloca suas 9 peças, uma por vez, nos pontos livres. Depois, as peças andam para um ponto vizinho pela linha.',
    'Três peças suas em linha formam um moinho: você tira uma peça do outro (que não esteja num moinho, se houver outra opção).',
    'Para mover, toque na peça e depois no destino, ou arraste a peça até lá. Quem fica com 3 peças pode voar para qualquer ponto livre. Perde quem ficar com 2 peças ou sem movimento.',
  ];
  let selecionada = $state(-1);
  const OPCOES = [...opcoesIA(), { id: '2', titulo: 'Dois jogadores', descricao: 'Nove peças cada, no mesmo aparelho' }];
  const ia = $derived(s.quebra?.ia);
  const nomes = $derived(ia ? ['Você', 'Computador'] : ['Jogador 1', 'Jogador 2']);
  type LanceT = { tipo: 'colocar'; i: number } | { tipo: 'mover'; de: number; para: number } | { tipo: 'remover'; i: number };
  const pc = usarComputador<EstadoTrilha, LanceT>({
    jogo: 'trilha', sessao: s, vez: (e) => e.vez === 2,
    aplicar: (l) => aplicar(l.tipo === 'colocar' ? colocar(s.estado!, l.i) : l.tipo === 'remover' ? remover(s.estado!, l.i) : moverTrilha(s.estado!, l.de, l.para)),
  });
  function comecar(id: string) {
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id, ia: nivelDoId(id) }, estado: novaTrilha() }));
  }
  function aplicar(n: EstadoTrilha) {
    if (!s.estado || n === s.estado) return;
    s.mudar(n);
    if (n.vencedor) void s.terminar(ia && n.vencedor === 2 ? 'derrota' : 'vitoria');
  }
  const alvos = $derived(s.estado && selecionada >= 0 ? destinos(s.estado, selecionada) : []);
  const tirar = $derived(s.estado?.removendo ? new Set(removiveis(s.estado)) : new Set<number>());
  const dica = $derived.by(() => {
    if (!s.estado || s.terminou) return '';
    if (ia && s.estado.vez === 2) return 'Vez do computador.';
    if (s.estado.removendo) return 'Moinho! Toque numa peça do outro para tirar.';
    const f = fase(s.estado);
    return f === 'colocar' ? `Coloque uma peça (${s.estado.mao[s.estado.vez - 1]} na mão).` : f === 'voar' ? 'Com 3 peças, você pode voar para qualquer ponto.' : 'Mova uma peça para um ponto vizinho.';
  });

  function tocar(i: number) {
    if (engolirClique) return;
    if (!s.estado || s.terminou || (ia && s.estado.vez === 2)) return;
    const e = s.estado;
    let n = e;
    if (e.removendo) n = remover(e, i);
    else if (fase(e) === 'colocar') n = colocar(e, i);
    else if (e.casas[i] === e.vez) { selecionada = selecionada === i ? -1 : i; return; }
    else if (selecionada >= 0) { n = moverTrilha(e, selecionada, i); selecionada = -1; }
    aplicar(n);
  }
  // --- Arrastar a peça até o destino (além de tocar na peça e depois no ponto) ---
  let svg = $state<SVGSVGElement>();
  let arrasto = $state<{ de: number; x: number; y: number; x0: number; y0: number; moveu: boolean; id: number } | null>(null);
  let engolirClique = false;
  function pontoSvg(e: PointerEvent): [number, number] {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg!.getScreenCTM()!.inverse());
    return [p.x, p.y];
  }
  function pontoPerto(x: number, y: number, alcance: number): number {
    let melhor = -1, menor = alcance;
    PONTOS.forEach(([px, py], i) => { const d = Math.hypot(px - x, py - y); if (d < menor) { menor = d; melhor = i; } });
    return melhor;
  }
  function aoPressionar(e: PointerEvent) {
    const est = s.estado;
    if (!est || s.terminou || (ia && est.vez === 2) || est.removendo || fase(est) === 'colocar') return;
    const [x, y] = pontoSvg(e);
    const i = pontoPerto(x, y, 0.45);
    if (i < 0 || est.casas[i] !== est.vez) return;
    arrasto = { de: i, x, y, x0: x, y0: y, moveu: false, id: e.pointerId };
  }
  function aoMover(e: PointerEvent) {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const [x, y] = pontoSvg(e);
    const moveu = arrasto.moveu || Math.hypot(x - arrasto.x0, y - arrasto.y0) > 0.25;
    if (moveu && !arrasto.moveu) { svg!.setPointerCapture(e.pointerId); selecionada = arrasto.de; }
    arrasto = { ...arrasto, x, y, moveu };
  }
  function aoSoltar(e: PointerEvent) {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const { de, x, y, moveu } = arrasto;
    arrasto = null;
    if (!moveu || !s.estado) return;
    engolirClique = true;
    setTimeout(() => (engolirClique = false), 0);
    const para = pontoPerto(x, y, 0.55);
    if (para >= 0 && para !== de && destinos(s.estado, de).includes(para)) {
      selecionada = -1;
      aplicar(moverTrilha(s.estado, de, para));
    }
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Trilha" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} aoDesfazer={pc.desfazer} tituloEscolha="Quem joga?" tituloFim={s.estado ? (ia ? (s.estado.vencedor === 1 ? 'Você venceu!' : 'O computador venceu.') : `Jogador ${s.estado.vencedor} venceu!`) : ''} textoFim="" semRelogio>
  {#if s.estado}
    <Jogadores {nomes} vez={s.terminou ? -1 : s.estado.vez - 1} pensando={pc.pensando} pontos={[`${s.estado.casas.filter((c) => c === 1).length + s.estado.mao[0]} peças`, `${s.estado.casas.filter((c) => c === 2).length + s.estado.mao[1]} peças`]} />
    <Status texto={dica} />
    <div class="ja-centro">
      <svg bind:this={svg} class="ja-tab ja-trilha" onpointerdown={aoPressionar} onpointermove={aoMover} onpointerup={aoSoltar} onpointercancel={() => (arrasto = null)} viewBox="-0.6 -0.6 7.2 7.2" role="group" aria-label="Tabuleiro da trilha">
        {#each LIGACOES as [a, b], k (k)}<line x1={PONTOS[a][0]} y1={PONTOS[a][1]} x2={PONTOS[b][0]} y2={PONTOS[b][1]} />{/each}
        {#each PONTOS as [x, y], i (i)}
          {@const c = s.estado.casas[i]}
          <g role="button" tabindex="-1" aria-label="Ponto {i + 1}{c ? `, jogador ${c}` : ''}" onclick={() => tocar(i)} onkeydown={(e) => e.key === 'Enter' && tocar(i)} class="ja-trilha-ponto" data-alvo={alvos.includes(i) || undefined} data-tirar={tirar.has(i) || undefined} data-selecionada={selecionada === i || undefined}>
            <circle cx={x} cy={y} r="0.42" class="ja-toque" />
            {#if c}<circle cx={x} cy={y} r="0.3" class="ja-trilha-peca ja-j{c}" opacity={arrasto?.moveu && arrasto.de === i ? 0.35 : 1} />{:else}<circle cx={x} cy={y} r="0.1" class="ja-trilha-vazio" />{/if}
          </g>
        {/each}
        {#if arrasto?.moveu}
          <circle cx={arrasto.x} cy={arrasto.y} r="0.34" class="ja-trilha-peca ja-j{s.estado.vez}" pointer-events="none" />
        {/if}
      </svg>
    </div>
  {/if}
</Casca>
