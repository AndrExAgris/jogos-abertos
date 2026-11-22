<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { REGIOES, distanciaCentros, pais, rumo, seta, sortearPais, type Pais } from '@ja/geo/paises';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import CampoPais from './CampoPais.svelte';

  interface Estado { palpites: string[] }
  const MAX = 8;
  const s = new Sessao<{ segredo: string }, Estado>('pais-pistas');
  const COMO = [
    'Adivinhe o país em até oito palpites. Cada palpite mostra pistas comparando com o país secreto:',
    'continente e hemisfério (destacados quando iguais), população e área (a seta diz se o secreto tem mais ou menos), se tem litoral, e a distância e a direção até ele.',
  ];
  const seg = $derived(s.quebra ? pais(s.quebra.segredo) : null);
  const comparar = (a: number, b: number) => (Math.abs(a - b) / Math.max(a, b) < 0.1 ? '≈' : b > a ? '↑' : '↓');
  const hemisferio = (p: Pais) => (p.latlon[0] >= 0 ? 'Norte' : 'Sul');
  const milhoes = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : `${Math.round(n / 1000)} mil`);

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

<Casca sessao={s} titulo="País pelas Pistas" comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Novo país secreto', descricao: 'Países com mais de 1 milhão de habitantes' }]} aoEscolher={(id) => s.comecar(id, 'Pistas', () => ({ quebra: { segredo: sortearPais(sementeNova(), (p) => p.populacao > 1_000_000).id }, estado: { palpites: [] } }))} semDesfazer tituloFim={s.terminou === 'vitoria' ? 'Acertou!' : 'Não foi dessa vez'} textoFim={seg ? `Era ${seg.nome}.` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.palpites.length}</span> / {MAX}</span>{/if}{/snippet}
  {#if s.estado && seg}
    {#if !s.terminou}<CampoPais usados={s.estado.palpites} aoEscolher={tentar} />{/if}
    {#if s.estado.palpites.length}
      <div class="ja-pistas">
        <table>
          <thead><tr><th>País</th><th>Continente</th><th>Hemisf.</th><th>População</th><th>Área</th><th>Litoral</th><th>Distância</th></tr></thead>
          <tbody>
            {#each [...s.estado.palpites].reverse() as id (id)}
              {@const p = pais(id)}
              <tr>
                <td class="ja-pistas-nome" data-certo={id === seg.id || undefined}>{p.nome}</td>
                <td data-certo={p.regiao === seg.regiao || undefined}>{REGIOES[p.regiao] ?? p.regiao}</td>
                <td data-certo={hemisferio(p) === hemisferio(seg) || undefined}>{hemisferio(p)}</td>
                <td data-certo={comparar(p.populacao, seg.populacao) === '≈' || undefined}>{milhoes(p.populacao)} {comparar(p.populacao, seg.populacao)}</td>
                <td data-certo={comparar(p.area, seg.area) === '≈' || undefined}>{milhoes(p.area).replace(' mi', ' mi km²').replace(' mil', ' mil km²')} {comparar(p.area, seg.area)}</td>
                <td data-certo={p.semLitoral === seg.semLitoral || undefined}>{p.semLitoral ? 'Não' : 'Sim'}</td>
                <td data-certo={id === seg.id || undefined}>{id === seg.id ? '—' : `${distanciaCentros(id, seg.id).toLocaleString('pt-BR')} km ${seta(rumo(p.latlon, seg.latlon))}`}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</Casca>
