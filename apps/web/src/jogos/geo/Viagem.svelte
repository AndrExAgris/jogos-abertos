<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { caixa, caminhoFronteiras, pais, sortearViagem, type Pais } from '@ja/geo/paises';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import CampoPais from './CampoPais.svelte';
  import Mapa from './Mapa.svelte';

  interface Estado { palpites: string[] }
  const s = new Sessao<{ de: string; para: string; minimo: number }, Estado>('viagem-fronteiras');
  const COMO = [
    'Vá de um país ao outro só por terra. Diga os países do caminho, um por vez; quando os países que você disse ligarem as duas pontas pelas fronteiras, você chega.',
    'Você tem o número mínimo de países mais 4 tentativas. No mapa, os países que fazem parte de um caminho mais curto ficam fortes; os que não ajudam ficam cinza.',
  ];
  const limite = $derived(s.quebra ? s.quebra.minimo + 4 : 0);
  const otimos = $derived.by(() => {
    if (!s.quebra) return new Set<string>();
    // Países que estão em algum caminho mais curto.
    const c = caminhoFronteiras(s.quebra.de, s.quebra.para) ?? [];
    const set = new Set<string>();
    for (const id of s.estado?.palpites ?? []) {
      const a = caminhoFronteiras(s.quebra.de, id), b = caminhoFronteiras(id, s.quebra.para);
      if (a && b && a.length + b.length - 1 === c.length) set.add(id);
    }
    return set;
  });
  const destaques = $derived.by(() => {
    if (!s.quebra || !s.estado) return {};
    const d: Record<string, string> = { [s.quebra.de]: 'ponta', [s.quebra.para]: 'ponta' };
    for (const id of s.estado.palpites) d[id] = otimos.has(id) ? 'certo' : 'fora';
    return d;
  });
  const visao = $derived.by((): [number, number, number, number] => {
    if (!s.quebra) return [-170, -84, 345, 145];
    const c = caminhoFronteiras(s.quebra.de, s.quebra.para) ?? [s.quebra.de, s.quebra.para];
    const cx = c.map(caixa);
    const x0 = Math.min(...cx.map((b) => b[0])), y0 = Math.min(...cx.map((b) => b[1]));
    const x1 = Math.max(...cx.map((b) => b[0] + b[2])), y1 = Math.max(...cx.map((b) => b[1] + b[3]));
    const m = 6;
    return [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m];
  });

  function tentar(p: Pais) {
    if (!s.estado || !s.quebra || s.terminou) return;
    const palpites = [...s.estado.palpites, p.id];
    s.mudar({ palpites }, false);
    if (caminhoFronteiras(s.quebra.de, s.quebra.para, new Set(palpites))) void s.terminar('vitoria');
    else if (palpites.length >= limite) void s.terminar('derrota');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Viagem pelas Fronteiras" comoJogar={COMO} opcoes={[{ id: 'curta', titulo: 'Viagem curta', descricao: '2 ou 3 países no meio' }, { id: 'longa', titulo: 'Viagem longa', descricao: '4 a 6 países no meio' }]} aoEscolher={(id) => s.comecar(id, id === 'curta' ? 'Curta' : 'Longa', () => { const v = sortearViagem(sementeNova(), id === 'curta' ? 2 : 4, id === 'curta' ? 3 : 6); return { quebra: { de: v.de, para: v.para, minimo: v.caminho.length - 2 }, estado: { palpites: [] } }; })} semDesfazer tituloFim={s.terminou === 'vitoria' ? 'Chegou!' : 'Não deu desta vez'} textoFim={s.quebra ? `Um caminho mais curto: ${(caminhoFronteiras(s.quebra.de, s.quebra.para) ?? []).map((id) => pais(id).nome).join(' → ')}.` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.palpites.length}</span> / {limite}</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    <p class="ja-dica">De <strong>{pais(s.quebra.de).nome}</strong> até <strong>{pais(s.quebra.para).nome}</strong> (no mínimo {s.quebra.minimo} países no meio).</p>
    <Mapa {destaques} {visao} />
    {#if !s.terminou}<CampoPais usados={[s.quebra.de, s.quebra.para, ...s.estado.palpites]} aoEscolher={tentar} />{/if}
    <div class="ja-palpites">
      {#each s.estado.palpites as id (id)}
        <div class="ja-palpite" data-certo={otimos.has(id) || undefined}><span class="ja-palpite-nome">{pais(id).nome}</span><span class="ja-palpite-valor">{otimos.has(id) ? 'no caminho' : 'fora do caminho mais curto'}</span></div>
      {/each}
    </div>
  {/if}
</Casca>
