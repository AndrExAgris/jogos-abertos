<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { caixa, caminhoSvg, distanciaCentros, pais, cardeal, rumo, seta, sortearPais, type Pais } from '@ja/geo/paises';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import CampoPais from './CampoPais.svelte';

  interface Estado { palpites: string[] }
  const MAX = 6;
  const s = new Sessao<{ segredo: string }, Estado>('pais-contorno');
  const COMO = [
    'Que país tem esse formato? Você tem seis palpites.',
    'Cada palpite errado mostra a distância até o país certo, a direção e o ponto cardeal (norte, nordeste...).',
  ];
  const seg = $derived(s.quebra ? pais(s.quebra.segredo) : null);
  // A projeção estica a largura longe do equador; compensa pelo cosseno da latitude.
  const k = $derived.by(() => {
    if (!seg) return 1;
    const [, y, , h] = caixa(seg.id);
    return Math.max(0.3, Math.cos(((y + h / 2) * Math.PI) / 180));
  });
  const vb = $derived.by(() => {
    if (!seg) return '0 0 1 1';
    const [x, y, w, h] = caixa(seg.id);
    const m = Math.max(w * k, h) * 0.08;
    return `${x * k - m} ${y - m} ${w * k + 2 * m} ${h + 2 * m}`;
  });
  const d = $derived.by(() => {
    if (!seg) return '';
    const [x0, , w] = caixa(seg.id);
    // Para países que cruzam a linha de data, desloca as longitudes negativas.
    return x0 + w > 180 ? caminhoSvg(seg.id).replace(/(-?\d+(\.\d+)?),/g, (m, n) => `${Number(n) < 0 ? Number(n) + 360 : n},`) : caminhoSvg(seg.id);
  });

  function tentar(p: Pais) {
    if (!s.estado || !seg || s.terminou) return;
    const palpites = [...s.estado.palpites, p.id];
    s.mudar({ palpites }, false);
    if (p.id === seg.id) void s.terminar('vitoria');
    else if (palpites.length >= MAX) void s.terminar('derrota');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="País pelo Contorno" comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Novo contorno', descricao: 'Países com mais de 1 milhão de habitantes' }]} aoEscolher={(id) => s.comecar(id, 'Contorno', () => ({ quebra: { segredo: sortearPais(sementeNova(), (p) => p.temForma && p.populacao > 1_000_000).id }, estado: { palpites: [] } }))} semDesfazer tituloFim={s.terminou === 'vitoria' ? 'Acertou!' : 'Não foi dessa vez'} textoFim={seg ? `Era ${seg.nome}.` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.palpites.length}</span> / {MAX}</span>{/if}{/snippet}
  {#if s.estado && seg}
    <div class="ja-centro"><svg class="ja-silhueta" viewBox={vb} role="img" aria-label="Contorno do país secreto"><path {d} transform="scale({k} 1)" /></svg></div>
    {#if !s.terminou}<CampoPais usados={s.estado.palpites} aoEscolher={tentar} />{/if}
    <div class="ja-palpites">
      {#each s.estado.palpites as id (id)}
        {@const km = distanciaCentros(id, seg.id)}
        <div class="ja-palpite" data-certo={id === seg.id || undefined}>
          <span class="ja-palpite-nome">{pais(id).nome}</span>
          {#if id === seg.id}<span class="ja-palpite-valor">certo!</span>
          {:else}<span class="ja-palpite-valor">{km.toLocaleString('pt-BR')} km</span><span class="ja-rumo"><span class="ja-seta" aria-hidden="true">{seta(rumo(pais(id).latlon, seg.latlon))}</span>{cardeal(rumo(pais(id).latlon, seg.latlon))}</span>{/if}
        </div>
      {/each}
    </div>
  {/if}
</Casca>
