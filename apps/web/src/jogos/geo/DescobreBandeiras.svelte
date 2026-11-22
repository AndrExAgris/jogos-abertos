<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { criarAleatorio, sementeNova } from '@ja/contrato';
  import { PAISES, pais } from '@ja/geo/paises';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import { bandeira } from './bandeiras.ts';

  interface Rodada { certo: string; opcoes: string[] }
  interface Estado { atual: number; acertos: number; resposta: string | null }
  const s = new Sessao<{ rodadas: Rodada[]; modo: string }, Estado>('descobre-bandeiras', { pontuacao: (e) => e.acertos });
  const OPCOES = [
    { id: 'facil', titulo: 'Países mais populosos', descricao: '10 bandeiras dos países com mais de 20 milhões de habitantes' },
    { id: 'todos', titulo: 'O mundo todo', descricao: '10 bandeiras de qualquer país' },
    { id: 'maratona', titulo: 'Maratona', descricao: '30 bandeiras de qualquer país' },
  ];
  const COMO = ['De que país é a bandeira? Escolha uma das opções. As duas primeiras têm 2 opções, da 3ª à 5ª são 4, e da 6ª em diante, 6. No fim, veja quantas acertou.'];

  function montar(modo: string, semente: string): Rodada[] {
    const a = criarAleatorio(semente);
    const base = modo === 'facil' ? PAISES.filter((p) => p.populacao > 20_000_000) : PAISES;
    const n = modo === 'maratona' ? 30 : 10;
    return a.embaralhar([...base]).slice(0, n).map((p, k) => {
      // Dificuldade progressiva: 2 opções nas duas primeiras, 4 da 3ª à 5ª e 6 da 6ª em diante.
      const quantas = k < 2 ? 2 : k < 5 ? 4 : 6;
      // Opções erradas de preferência da mesma região, para não ficar fácil demais.
      const mesma = a.embaralhar(PAISES.filter((q) => q.id !== p.id && q.regiao === p.regiao));
      const outras = a.embaralhar(PAISES.filter((q) => q.id !== p.id && q.regiao !== p.regiao));
      const erradas = [...mesma, ...outras].slice(0, quantas - 1).map((q) => q.id);
      return { certo: p.id, opcoes: a.embaralhar([p.id, ...erradas]) };
    });
  }
  const rodada = $derived(s.quebra && s.estado ? s.quebra.rodadas[s.estado.atual] : null);

  function responder(id: string) {
    if (!s.estado || !rodada || s.estado.resposta) return;
    const certo = id === rodada.certo;
    if (!certo) vibrar(80);
    s.mudar({ ...s.estado, resposta: id, acertos: s.estado.acertos + (certo ? 1 : 0) }, false);
  }
  function proxima() {
    if (!s.estado || !s.quebra) return;
    if (s.estado.atual + 1 >= s.quebra.rodadas.length) { void s.terminar('vitoria'); return; }
    s.mudar({ ...s.estado, atual: s.estado.atual + 1, resposta: null }, false);
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Descobre Bandeiras" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id, rodadas: montar(id, sementeNova()) }, estado: { atual: 0, acertos: 0, resposta: null } }))} semDesfazer tituloFim={s.recorde ? 'Novo recorde!' : 'Fim da rodada'} textoFim={s.estado && s.quebra ? `Você acertou ${s.estado.acertos} de ${s.quebra.rodadas.length}.` : ''}>
  {#snippet faixa()}{#if s.estado && s.quebra}<span class="ja-placar-item">{s.estado.atual + 1} / {s.quebra.rodadas.length} · <span class="ja-numero">{s.estado.acertos}</span> acertos</span>{/if}{/snippet}
  {#if rodada && s.estado && !s.terminou}
    <div class="ja-centro"><img class="ja-bandeira" src={bandeira(pais(rodada.certo).iso2)} alt="Bandeira de qual país?" /></div>
    <div class="ja-opcoes-quiz">
      {#each rodada.opcoes as id (id)}
        <button class="botao" type="button" data-certa={(s.estado.resposta && id === rodada.certo) || undefined} data-errada={(s.estado.resposta === id && id !== rodada.certo) || undefined} onclick={() => responder(id)}>{pais(id).nome}</button>
      {/each}
    </div>
    {#if s.estado.resposta}
      <p class="ja-dica">{s.estado.resposta === rodada.certo ? 'Isso!' : `Era ${pais(rodada.certo).nome}.`}</p>
      <div class="ja-botoes"><button class="botao botao-primario" type="button" onclick={proxima}><span>{s.estado.atual + 1 >= (s.quebra?.rodadas.length ?? 0) ? 'Ver resultado' : 'Próxima'}</span></button></div>
    {/if}
  {/if}
</Casca>
