<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { distanciaBordas, pais, sortearPais, type Pais } from '@ja/geo/paises';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import CampoPais from './CampoPais.svelte';
  import Mapa from './Mapa.svelte';

  interface Estado { palpites: { id: string; km: number }[] }
  const s = new Sessao<{ segredo: string }, Estado>('pais-distancia', { pontuacao: (e) => -e.palpites.length });
  const COMO = [
    'Descubra o país secreto. A cada palpite, o mapa pinta o país que você tentou: quanto mais forte a cor, mais perto ele está do segredo.',
    'A lista mostra a distância entre as fronteiras mais próximas (0 km quer dizer que fazem fronteira).',
  ];
  const nivel = (km: number) => (km === 0 ? 3 : km < 1000 ? 3 : km < 2500 ? 2 : km < 5000 ? 1 : 0);
  const ordenados = $derived([...(s.estado?.palpites ?? [])].sort((a, b) => a.km - b.km));
  const destaques = $derived(Object.fromEntries((s.estado?.palpites ?? []).map((p) => [p.id, p.id === s.quebra?.segredo ? 'certo' : `perto-${nivel(p.km)}`])));

  function tentar(p: Pais) {
    if (!s.estado || !s.quebra || s.terminou) return;
    const km = p.id === s.quebra.segredo ? 0 : Math.max(distanciaBordas(p.id, s.quebra.segredo), 0);
    s.mudar({ palpites: [...s.estado.palpites, { id: p.id, km }] }, false);
    if (p.id === s.quebra.segredo) void s.terminar('vitoria');
  }
  const desistir = () => s.estado && void s.terminar('derrota');
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="País pela Distância" comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Novo país secreto', descricao: 'Qualquer país do mundo' }]} aoEscolher={(id) => s.comecar(id, 'Mundo', () => ({ quebra: { segredo: sortearPais(sementeNova(), (p) => p.temForma).id }, estado: { palpites: [] } }))} semDesfazer tituloFim={s.terminou === 'vitoria' ? 'Achou!' : `Era ${s.quebra ? pais(s.quebra.segredo).nome : ''}`} textoFim={s.estado ? `${s.estado.palpites.length} palpites.` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.palpites.length}</span> palpites</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    <Mapa destaques={s.terminou ? { ...destaques, [s.quebra.segredo]: 'certo' } : destaques} />
    {#if !s.terminou}
      <CampoPais usados={s.estado.palpites.map((p) => p.id)} aoEscolher={tentar} />
      {#if s.estado.palpites.length >= 5}<div class="ja-centro"><button class="botao botao-terciario" type="button" onclick={desistir}><span>Desistir e ver a resposta</span></button></div>{/if}
    {/if}
    <div class="ja-palpites">
      {#each ordenados as p (p.id)}
        <div class="ja-palpite" data-certo={p.id === s.quebra.segredo || undefined}><span class="ja-palpite-nome">{pais(p.id).nome}</span><span class="ja-palpite-valor">{p.id === s.quebra.segredo ? 'é este!' : `${p.km.toLocaleString('pt-BR')} km`}</span></div>
      {/each}
    </div>
  {/if}
</Casca>
