<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { FILMES, pistas, semAcento, sortearFilme, sugerirFilmes } from '@ja/nucleo-trivia/filme';
  import Casca from '../../lib/jogo/Casca.svelte';
  import CampoTeclado from '../../lib/jogo/CampoTeclado.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { palpites: number[]; puladas: number }
  const MAX = 6;
  const s = new Sessao<{ filme: number }, Estado>('filme', { pontuacao: (e) => MAX - e.palpites.length - e.puladas + 1 });
  const OPCOES = [
    { id: 'famosos', titulo: 'Filmes muito conhecidos', descricao: 'Os 200 filmes mais famosos' },
    { id: 'todos', titulo: 'Todos os filmes', descricao: `Mais de ${Math.floor(FILMES.length / 100) * 100} filmes` },
  ];
  const COMO = [
    'Adivinhe o filme com até seis pistas: ano, gênero, país, direção, elenco principal e prêmios. Cada palpite errado (ou "Mais uma pista") revela a próxima.',
    'Digite parte do título e escolha da lista. Os filmes e as pistas vêm do Wikidata.',
  ];
  let texto = $state('');
  const filme = $derived(s.quebra ? FILMES[s.quebra.filme] : null);
  const reveladas = $derived(s.terminou ? MAX : Math.min(MAX, 1 + (s.estado?.palpites.length ?? 0) + (s.estado?.puladas ?? 0)));
  const sugestoes = $derived(sugerirFilmes(texto).filter((i) => !s.estado?.palpites.includes(i)).slice(0, 5).map((i) => ({ id: i, titulo: FILMES[i].titulo, sub: String(FILMES[i].ano) })));

  function tentar(i: number) {
    if (!s.estado || !filme || s.terminou) return;
    texto = '';
    const palpites = [...s.estado.palpites, i];
    s.mudar({ ...s.estado, palpites }, false);
    // Títulos iguais (refilmagens) também valem.
    if (semAcento(FILMES[i].titulo) === semAcento(filme.titulo)) void s.terminar('vitoria');
    else { vibrar(60); if (palpites.length + s.estado.puladas >= MAX) void s.terminar('derrota'); }
  }
  function pular() {
    if (!s.estado || s.terminou) return;
    const puladas = s.estado.puladas + 1;
    s.mudar({ ...s.estado, puladas }, false);
    if (s.estado.palpites.length + puladas >= MAX) void s.terminar('derrota');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Adivinhe o Filme" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { filme: sortearFilme(sementeNova(), id === 'famosos' ? 200 : FILMES.length) }, estado: { palpites: [], puladas: 0 } }))} semDesfazer tituloFim={s.terminou === 'vitoria' ? 'Acertou!' : 'Não foi dessa vez'} textoFim={filme ? `${filme.titulo} (${filme.ano}).` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item">Pista <span class="ja-numero">{reveladas}</span> / {MAX}</span>{/if}{/snippet}
  {#if s.estado && filme}
    <div class="lista-config ja-pistas-filme">
      {#each pistas(filme) as p, k (k)}
        <div class="linha-config">
          <span class="linha-texto"><span class="linha-descricao">{p.rotulo}</span><span class="linha-titulo">{k < reveladas ? p.valor : '•••'}</span></span>
        </div>
      {/each}
    </div>
    {#if !s.terminou}
      <CampoTeclado bind:texto rotulo="Título do filme" dica="Digite parte do título" {sugestoes} aoEscolher={(id) => tentar(Number(id))}>
        {#snippet extra()}<button class="botao" type="button" onclick={pular}><Icone nome="eye" /><span>Pista</span></button>{/snippet}
      </CampoTeclado>
    {/if}
    {#if s.estado.palpites.length}
      <div class="ja-palpites">
        {#each s.estado.palpites as i, k (k)}<div class="ja-palpite" data-certo={semAcento(FILMES[i].titulo) === semAcento(filme.titulo) || undefined}><span class="ja-palpite-nome">{FILMES[i].titulo}</span></div>{/each}
      </div>
    {/if}
  {/if}
</Casca>
