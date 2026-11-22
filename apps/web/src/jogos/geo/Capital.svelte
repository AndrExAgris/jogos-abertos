<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { distanciaCapitais, pais, cardeal, rumo, seta, sortearPais, type Pais } from '@ja/geo/paises';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import CampoPais from './CampoPais.svelte';
  import Mapa from './Mapa.svelte';

  interface Estado { palpites: string[] }
  const s = new Sessao<{ segredo: string }, Estado>('capital-distancia', { pontuacao: (e) => -e.palpites.length });
  const COMO = [
    'Descubra a capital secreta. A cada palpite (uma capital), aparecem a distância até a capital secreta, a direção da seta e o ponto cardeal (norte, nordeste...).',
    'O mapa marca as capitais que você tentou.',
  ];
  const seg = $derived(s.quebra ? pais(s.quebra.segredo) : null);

  function tentar(p: Pais) {
    if (!s.estado || !s.quebra || s.terminou) return;
    s.mudar({ palpites: [...s.estado.palpites, p.id] }, false);
    if (p.id === s.quebra.segredo) void s.terminar('vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Capital pela Distância" comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Nova capital secreta', descricao: 'Capitais de países com mais de 1 milhão de habitantes' }]} aoEscolher={(id) => s.comecar(id, 'Capitais', () => ({ quebra: { segredo: sortearPais(sementeNova(), (p) => p.populacao > 1_000_000).id }, estado: { palpites: [] } }))} semDesfazer tituloFim={s.terminou === 'vitoria' ? 'Achou!' : `Era ${seg?.capital}`} textoFim={seg ? `${seg.capital}, capital de ${seg.nome}. ${s.estado?.palpites.length} palpites.` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.palpites.length}</span> palpites</span>{/if}{/snippet}
  {#if s.estado && seg}
    <Mapa pontos={[...s.estado.palpites.map((id) => ({ lat: pais(id).capitalLatLon[0], lon: pais(id).capitalLatLon[1], classe: '' })), ...(s.terminou ? [{ lat: seg.capitalLatLon[0], lon: seg.capitalLatLon[1], classe: 'segredo' }] : [])]} />
    {#if !s.terminou}
      <CampoPais campo="capital" usados={s.estado.palpites} aoEscolher={tentar} />
      {#if s.estado.palpites.length >= 6}<div class="ja-centro"><button class="botao botao-terciario" type="button" onclick={() => s.terminar('derrota')}><span>Desistir e ver a resposta</span></button></div>{/if}
    {/if}
    <div class="ja-palpites">
      {#each [...s.estado.palpites].reverse() as id (id)}
        {@const p = pais(id)}
        {@const km = distanciaCapitais(id, seg.id)}
        <div class="ja-palpite" data-certo={id === seg.id || undefined}>
          <span class="ja-palpite-nome">{p.capital} <span class="texto-2">({p.nome})</span></span>
          {#if id === seg.id}<span class="ja-palpite-valor">é esta!</span>
          {:else}<span class="ja-palpite-valor">{km.toLocaleString('pt-BR')} km</span><span class="ja-rumo"><span class="ja-seta" aria-hidden="true">{seta(rumo(p.capitalLatLon, seg.capitalLatLon))}</span>{cardeal(rumo(p.capitalLatLon, seg.capitalLatLon))}</span>{/if}
        </div>
      {/each}
    </div>
  {/if}
</Casca>
