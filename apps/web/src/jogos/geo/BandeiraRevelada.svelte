<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { criarAleatorio, sementeNova } from '@ja/contrato';
  import { distanciaCentros, pais, rumo, seta, sortearPais, type Pais } from '@ja/geo/paises';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import CampoPais from './CampoPais.svelte';
  import { bandeira } from './bandeiras.ts';

  interface Estado { palpites: string[] }
  const MAX = 6;
  const s = new Sessao<{ segredo: string; ordem: number[] }, Estado>('bandeira-revelada');
  const COMO = [
    'A bandeira de um país está coberta por seis peças. Uma peça já começa aberta; cada palpite errado abre mais uma.',
    'Você tem seis palpites. Os erros também mostram a distância e a direção até o país certo.',
  ];
  const seg = $derived(s.quebra ? pais(s.quebra.segredo) : null);
  const abertas = $derived(s.terminou ? 6 : 1 + (s.estado?.palpites.length ?? 0));

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

<Casca sessao={s} titulo="Bandeira Revelada" comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Nova bandeira', descricao: 'Qualquer país do mundo' }]} aoEscolher={(id) => { const sem = sementeNova(); return s.comecar(id, 'Bandeiras', () => ({ quebra: { segredo: sortearPais(sem).id, ordem: criarAleatorio(sem).embaralhar([0, 1, 2, 3, 4, 5]) }, estado: { palpites: [] } })); }} semDesfazer tituloFim={s.terminou === 'vitoria' ? 'Acertou!' : 'Não foi dessa vez'} textoFim={seg ? `Era ${seg.nome}.` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.palpites.length}</span> / {MAX}</span>{/if}{/snippet}
  {#if s.estado && seg && s.quebra}
    <div class="ja-centro">
      <div class="ja-bandeira-coberta">
        <img class="ja-bandeira" src={bandeira(seg.iso2)} alt="Bandeira escondida" />
        <div class="ja-cobertura" aria-hidden="true">{#each [0, 1, 2, 3, 4, 5] as k (k)}<span data-aberto={s.quebra.ordem.indexOf(k) < abertas || undefined}></span>{/each}</div>
      </div>
    </div>
    {#if !s.terminou}<CampoPais usados={s.estado.palpites} aoEscolher={tentar} />{/if}
    <div class="ja-palpites">
      {#each s.estado.palpites as id (id)}
        <div class="ja-palpite" data-certo={id === seg.id || undefined}>
          <span class="ja-palpite-nome">{pais(id).nome}</span>
          {#if id === seg.id}<span class="ja-palpite-valor">certo!</span>
          {:else}<span class="ja-palpite-valor">{distanciaCentros(id, seg.id).toLocaleString('pt-BR')} km</span><span class="ja-seta">{seta(rumo(pais(id).latlon, seg.latlon))}</span>{/if}
        </div>
      {/each}
    </div>
  {/if}
</Casca>
