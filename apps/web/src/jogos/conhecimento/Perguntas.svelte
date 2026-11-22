<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { CATEGORIAS, aleatorioDaRodada, sortearPergunta, type Pergunta } from '@ja/nucleo-trivia/perguntas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import { avisar } from '../../lib/aviso.svelte.ts';

  const VIDAS = 3;
  interface Config { semente: string; jogadores: number }
  interface Estado {
    pontos: number[];
    erros: number[];
    vez: number;
    usadas: string[];
    categoria: string | null;
    pergunta: (Pergunta & { opcoes: string[] }) | null;
    resposta: string | null;
  }
  const s = new Sessao<Config, Estado>('perguntas', { semRelogio: true, pontuacao: (e) => e.pontos[0] });
  const OPCOES = [
    { id: '1', titulo: 'Sozinho', descricao: 'Até errar três vezes; bata o seu recorde' },
    { id: '2', titulo: '2 jogadores', descricao: 'Alternando; três erros e o jogador sai' },
    { id: '3', titulo: '3 jogadores', descricao: 'Alternando; três erros e o jogador sai' },
    { id: '4', titulo: '4 jogadores', descricao: 'Alternando; três erros e o jogador sai' },
  ];
  const COMO = [
    'Escolha uma categoria e responda. Cada acerto vale 1 ponto. Com três erros, o jogo acaba.',
    'Com dois ou mais jogadores, cada um joga na sua vez, passando o aparelho. Quem erra três vezes sai; quando todos saem, ganha quem fez mais pontos.',
    'As perguntas são montadas a partir do Wikidata.',
  ];
  const ICONES: Record<string, string> = {
    Mundo: 'world', 'Artes e Entretenimento': 'movie', Sociedade: 'users', 'Ciência e Tecnologia': 'flask', 'Esporte e Lazer': 'ball-football', Variedades: 'sparkles',
  };
  const nomes = $derived(s.quebra ? Array.from({ length: s.quebra.jogadores }, (_, i) => `Jogador ${i + 1}`) : []);
  const textoFim = $derived.by(() => {
    if (!s.estado || !s.quebra) return '';
    const n = s.estado.pontos[0];
    if (s.quebra.jogadores === 1) return `Você fez ${n} ${n === 1 ? 'ponto' : 'pontos'}.`;
    const max = Math.max(...s.estado.pontos);
    const v = s.estado.pontos.map((p, i) => (p === max ? i + 1 : 0)).filter(Boolean);
    return v.length > 1 ? `Empate com ${max} pontos.` : `Jogador ${v[0]} venceu com ${max} pontos!`;
  });

  function escolherCategoria(c: string) {
    if (!s.estado || !s.quebra) return;
    const q = sortearPergunta(c, s.estado.usadas, aleatorioDaRodada(s.quebra.semente, s.estado.usadas.length));
    if (!q) { avisar('As perguntas dessa categoria acabaram. Escolha outra.'); return; }
    s.mudar({ ...s.estado, categoria: c, pergunta: q, usadas: [...s.estado.usadas, q.p] }, false);
  }
  function responder(op: string) {
    if (!s.estado || !s.estado.pergunta || s.estado.resposta) return;
    const certo = op === s.estado.pergunta.r;
    const pontos = [...s.estado.pontos], erros = [...s.estado.erros];
    if (certo) pontos[s.estado.vez]++;
    else { erros[s.estado.vez]++; vibrar(80); }
    s.mudar({ ...s.estado, resposta: op, pontos, erros }, false);
  }
  function proxima() {
    if (!s.estado || !s.quebra) return;
    const n = s.quebra.jogadores;
    const vivos = s.estado.erros.map((e, i) => (e < VIDAS ? i : -1)).filter((i) => i >= 0);
    if (!vivos.length) { void s.terminar('vitoria'); return; }
    let vez = s.estado.vez;
    do vez = (vez + 1) % n; while (s.estado.erros[vez] >= VIDAS);
    s.mudar({ ...s.estado, vez, categoria: null, pergunta: null, resposta: null }, false);
  }
  function comecar(id: string) {
    const n = Number(id);
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({
      quebra: { semente: sementeNova(), jogadores: n },
      estado: { pontos: Array(n).fill(0), erros: Array(n).fill(0), vez: 0, usadas: [], categoria: null, pergunta: null, resposta: null },
    }));
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Perguntas por Categoria" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} semRelogio semDesfazer tituloFim={s.recorde ? 'Novo recorde!' : 'Fim de jogo'} {textoFim} tituloEscolha="Quantos jogadores?">
  {#snippet faixa()}
    {#if s.estado}
      <span class="ja-vidas" aria-label="Erros: {s.estado.erros[s.estado.vez]} de {VIDAS}">
        {#each Array(VIDAS) as _, k (k)}<span class="ja-vida" data-perdida={k < s.estado.erros[s.estado.vez] || undefined}><Icone nome="heart" preenchido={k >= s.estado.erros[s.estado.vez]} /></span>{/each}
      </span>
    {/if}
  {/snippet}
  {#snippet centro()}{#if s.estado && s.quebra?.jogadores === 1}<span class="ja-placar-item"><span class="ja-numero">{s.estado.pontos[0]}</span> pontos</span>{/if}{/snippet}
  {#if s.estado && s.quebra && !s.terminou}
    {@const e = s.estado}
    {#if s.quebra.jogadores > 1}<Jogadores nomes={nomes} vez={e.vez} pontos={e.pontos} />{/if}
    {#if !e.pergunta}
      <p class="ja-dica">{s.quebra.jogadores > 1 ? `Jogador ${e.vez + 1}, escolha` : 'Escolha'} uma categoria:</p>
      <div class="ja-categorias">
        {#each CATEGORIAS as c (c)}<button class="botao ja-categoria" type="button" onclick={() => escolherCategoria(c)}><Icone nome={ICONES[c]} /><span>{c}</span></button>{/each}
      </div>
    {:else}
      <div class="ja-pergunta">
        <span class="etiqueta" data-cor="secundaria">{e.categoria}</span>
        <p class="ja-pergunta-texto">{e.pergunta.p}</p>
      </div>
      <div class="ja-opcoes-quiz">
        {#each e.pergunta.opcoes as op (op)}
          <button class="botao" type="button" data-certa={(e.resposta && op === e.pergunta.r) || undefined} data-errada={(e.resposta === op && op !== e.pergunta.r) || undefined} onclick={() => responder(op)}>{op}</button>
        {/each}
      </div>
      {#if e.resposta}
        <p class="ja-dica">{e.resposta === e.pergunta.r ? 'Certo! +1' : `Errado: era ${e.pergunta.r}.`}</p>
        <div class="ja-botoes"><button class="botao botao-primario" type="button" onclick={proxima}><span>Continuar</span></button></div>
      {/if}
    {/if}
  {/if}
</Casca>
