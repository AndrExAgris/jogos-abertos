<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { CATEGORIAS, CATEGORIA_BRASIL, aleatorioDaRodada, sortearPergunta, type Pergunta } from '@ja/nucleo-trivia/perguntas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { lerPreferencias, salvarPreferencias, vibrar } from '../../lib/jogo/partida.ts';

  interface Config { semente: string; jogadores: number; rodadas: number; brasil: boolean }
  interface Estado {
    pontos: number[];
    vez: number;
    rodada: number;
    usadas: string[];
    categoria: string | null;
    aposta: number | null;
    pergunta: (Pergunta & { opcoes: string[] }) | null;
    resposta: string | null;
  }
  const s = new Sessao<Config, Estado>('perguntas', { semRelogio: true, pontuacao: (e) => e.pontos[0] });
  let brasil = $state(true);
  const OPCOES = [
    { id: '1', titulo: 'Sozinho', descricao: '12 perguntas; bata o seu recorde' },
    { id: '2', titulo: '2 jogadores', descricao: '8 perguntas para cada um, alternando' },
    { id: '3', titulo: '3 jogadores', descricao: '6 perguntas para cada um' },
    { id: '4', titulo: '4 jogadores', descricao: '5 perguntas para cada um' },
  ];
  const RODADAS: Record<string, number> = { '1': 12, '2': 8, '3': 6, '4': 5 };
  const COMO = [
    'Escolha uma categoria e aposte de 1 a 3 pontos antes de ver a pergunta. Acertou, ganha os pontos apostados; errou, perde.',
    'Com dois ou mais jogadores, cada um joga na sua vez, passando o aparelho. Ganha quem tiver mais pontos no fim.',
    'As perguntas são montadas a partir do Wikidata. A categoria Brasil é opcional.',
  ];
  const categorias = $derived(s.quebra?.brasil ? [...CATEGORIAS, CATEGORIA_BRASIL] : [...CATEGORIAS]);
  const nomes = $derived(s.quebra ? Array.from({ length: s.quebra.jogadores }, (_, i) => `Jogador ${i + 1}`) : []);
  const textoFim = $derived.by(() => {
    if (!s.estado || !s.quebra) return '';
    if (s.quebra.jogadores === 1) return `Você terminou com ${s.estado.pontos[0]} pontos.`;
    const max = Math.max(...s.estado.pontos);
    const v = s.estado.pontos.map((p, i) => (p === max ? i + 1 : 0)).filter(Boolean);
    return v.length > 1 ? `Empate com ${max} pontos.` : `Jogador ${v[0]} venceu com ${max} pontos!`;
  });

  function escolherCategoria(c: string) { if (s.estado) s.mudar({ ...s.estado, categoria: c }, false); }
  function apostar(v: number) {
    if (!s.estado || !s.quebra || !s.estado.categoria) return;
    const q = sortearPergunta(s.estado.categoria, s.estado.usadas, aleatorioDaRodada(s.quebra.semente, s.estado.usadas.length));
    if (!q) { window.OpenDesign.toast({ texto: 'As perguntas dessa categoria acabaram. Escolha outra.' }); s.mudar({ ...s.estado, categoria: null }, false); return; }
    s.mudar({ ...s.estado, aposta: v, pergunta: q, usadas: [...s.estado.usadas, q.p] }, false);
  }
  function responder(op: string) {
    if (!s.estado || !s.estado.pergunta || s.estado.resposta) return;
    const certo = op === s.estado.pergunta.r;
    if (!certo) vibrar(80);
    const pontos = [...s.estado.pontos];
    pontos[s.estado.vez] += certo ? s.estado.aposta! : -s.estado.aposta!;
    s.mudar({ ...s.estado, resposta: op, pontos }, false);
  }
  function proxima() {
    if (!s.estado || !s.quebra) return;
    const total = s.quebra.rodadas * s.quebra.jogadores;
    const feitas = s.estado.rodada + 1;
    if (feitas >= total) { void s.terminar('vitoria'); return; }
    s.mudar({ ...s.estado, rodada: feitas, vez: feitas % s.quebra.jogadores, categoria: null, aposta: null, pergunta: null, resposta: null }, false);
  }
  function comecar(id: string) {
    void salvarPreferencias('perguntas', { brasil });
    const n = Number(id);
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({
      quebra: { semente: sementeNova(), jogadores: n, rodadas: RODADAS[id], brasil },
      estado: { pontos: Array(n).fill(0), vez: 0, rodada: 0, usadas: [], categoria: null, aposta: null, pergunta: null, resposta: null },
    }));
  }
  onMount(async () => { brasil = (await lerPreferencias('perguntas', { brasil: true })).brasil; await s.carregar(); });
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Perguntas por Categoria" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} semRelogio semDesfazer tituloFim={s.recorde ? 'Novo recorde!' : 'Fim de jogo'} {textoFim} tituloEscolha="Quantos jogadores?">
  {#snippet antesDaEscolha()}
    <label class="escolha ja-escolha-brasil"><span>Incluir a categoria Brasil</span><input class="interruptor" type="checkbox" role="switch" bind:checked={brasil} /></label>
  {/snippet}
  {#snippet faixa()}{#if s.estado && s.quebra}<span class="ja-placar-item">Pergunta {Math.floor(s.estado.rodada / s.quebra.jogadores) + 1} de {s.quebra.rodadas}</span>{/if}{/snippet}
  {#if s.estado && s.quebra && !s.terminou}
    {@const e = s.estado}
    <Jogadores nomes={s.quebra.jogadores > 1 ? nomes : ['Pontos']} vez={e.vez} pontos={e.pontos} />
    {#if !e.categoria}
      <p class="ja-dica">{s.quebra.jogadores > 1 ? `Jogador ${e.vez + 1}, escolha` : 'Escolha'} uma categoria:</p>
      <div class="ja-opcoes-quiz">
        {#each categorias as c (c)}<button class="botao" type="button" onclick={() => escolherCategoria(c)}>{c}</button>{/each}
      </div>
    {:else if !e.pergunta}
      <p class="ja-dica"><strong>{e.categoria}</strong>. Quanto você aposta?</p>
      <div class="ja-botoes">
        {#each [1, 2, 3] as v (v)}<button class="botao botao-primario" type="button" onclick={() => apostar(v)}><span>{v} {v === 1 ? 'ponto' : 'pontos'}</span></button>{/each}
      </div>
    {:else}
      <div class="ja-pergunta">
        <span class="etiqueta" data-cor="secundaria">{e.categoria} · aposta {e.aposta}</span>
        <p class="ja-pergunta-texto">{e.pergunta.p}</p>
      </div>
      <div class="ja-opcoes-quiz">
        {#each e.pergunta.opcoes as op (op)}
          <button class="botao" type="button" data-certa={(e.resposta && op === e.pergunta.r) || undefined} data-errada={(e.resposta === op && op !== e.pergunta.r) || undefined} onclick={() => responder(op)}>{op}</button>
        {/each}
      </div>
      {#if e.resposta}
        <p class="ja-dica">{e.resposta === e.pergunta.r ? `Certo! +${e.aposta}` : `Errado: era ${e.pergunta.r}. −${e.aposta}`}</p>
        <div class="ja-botoes"><button class="botao botao-primario" type="button" onclick={proxima}><span>Continuar</span></button></div>
      {/if}
    {/if}
  {/if}
</Casca>
