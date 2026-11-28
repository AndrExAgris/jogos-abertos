<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova, criarAleatorio } from '@ja/contrato';
  import { aleatorioDaRodada, chave, sortearNivel, type Pergunta } from '@ja/nucleo-trivia/perguntas';
  import ImagemPergunta from '../conhecimento/ImagemPergunta.svelte';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  /** Prêmios em mil reais. */
  const PREMIOS = [1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 400, 500, 750, 1000];
  /** Dificuldade de cada degrau (1 a 5): sobe aos poucos, nunca desce. */
  const NIVEL = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5];
  const ESTUDANTES = ['Bia', 'Caio', 'Duda'];

  interface Ajudas { pular: number; eliminar: boolean; plateia: boolean; universitarios: boolean; assistente: boolean; segunda: boolean }
  interface Estado {
    nivel: number;
    usadas: string[];
    pergunta: (Pergunta & { opcoes: string[] }) | null;
    resposta: string | null;
    eliminadas: string[];
    plateia: number[] | null;
    /** Palpite de cada universitário (índice da opção). */
    universitarios?: number[] | null;
    assistente?: boolean;
    /** Segunda chance ligada nesta pergunta: o primeiro erro só elimina a opção. */
    segundaAtiva?: boolean;
    ajudas: Ajudas;
    ganho: number;
    /** Como terminou: parou, errou ou ganhou o milhão. */
    fim?: 'parou' | 'errou' | 'milhao';
  }
  const PADRAO: Ajudas = { pular: 3, eliminar: true, plateia: true, universitarios: true, assistente: true, segunda: true };
  const s = new Sessao<{ semente: string }, Estado>('milhao', { semRelogio: true, pontuacao: (e) => e.ganho });
  const OPCOES = [{ id: 'jogo', titulo: 'Começar', descricao: '15 perguntas até R$ 1 milhão' }];
  const COMO = [
    'Responda 15 perguntas seguidas para chegar a R$ 1 milhão (de mentirinha). As perguntas ficam mais difíceis a cada degrau.',
    'Dá para parar a qualquer momento e levar o que já ganhou. Se errar, leva a metade.',
    'Ajudas: pular a pergunta (3 vezes), eliminar (um dado de 4 lados sorteia quantas erradas saem, de 0 a 3), plateia, universitários (três estudantes dão palpite e podem errar), assistente virtual (diz a resposta certa) e segunda chance (se errar, pode responder de novo). Cada uma vale uma vez.',
  ];
  const reais = (mil: number) => (mil >= 1000 ? 'R$ 1 milhão' : `R$ ${Math.round(mil * 1000).toLocaleString('pt-BR')}`);
  const curto = (mil: number) => (mil >= 1000 ? '1 mi' : mil >= 1 ? `${mil} mil` : `${mil * 1000}`);
  const acumulado = (e: Estado) => (e.nivel > 0 ? PREMIOS[e.nivel - 1] : 0);
  const ajudas = (e: Estado): Ajudas => ({ ...PADRAO, ...e.ajudas });

  /** Dado de 4 lados do "eliminar": mostra números girando antes do resultado. */
  let dado = $state<{ valor: number; rolando: boolean } | null>(null);
  let temporizador: ReturnType<typeof setInterval> | undefined;

  function nova(e: Estado, semente: string): Estado {
    const p = sortearNivel(NIVEL[Math.min(e.nivel, NIVEL.length - 1)], e.usadas, aleatorioDaRodada(semente, e.usadas.length));
    dado = null;
    return { ...e, pergunta: p, usadas: p ? [...e.usadas, chave(p)] : e.usadas, resposta: null, eliminadas: [], plateia: null, universitarios: null, assistente: false, segundaAtiva: false };
  }
  function comecar(id: string) {
    const semente = sementeNova();
    dado = null;
    void s.comecar(id, 'Rumo ao Milhão', () => ({
      quebra: { semente },
      estado: nova({ nivel: 0, usadas: [], pergunta: null, resposta: null, eliminadas: [], plateia: null, ajudas: { ...PADRAO }, ganho: 0 }, semente),
    }));
  }
  const livre = (e: Estado) => !!e.pergunta && !e.resposta && !dado?.rolando;
  function responder(op: string) {
    const e = s.estado;
    if (!e?.pergunta || !livre(e) || e.eliminadas.includes(op)) return;
    const certo = op === e.pergunta.r;
    vibrar(certo ? 30 : 150);
    if (!certo && e.segundaAtiva) {
      s.mudar({ ...e, eliminadas: [...e.eliminadas, op], segundaAtiva: false }, false);
      return;
    }
    if (!certo) {
      s.mudar({ ...e, resposta: op, ganho: acumulado(e) / 2, fim: 'errou' }, false);
      setTimeout(() => void s.terminar('derrota'), 1500);
      return;
    }
    const ganho = PREMIOS[e.nivel];
    const ultima = e.nivel === PREMIOS.length - 1;
    s.mudar({ ...e, resposta: op, ganho, fim: ultima ? 'milhao' : undefined }, false);
    if (ultima) setTimeout(() => void s.terminar('vitoria'), 1200);
  }
  function proxima() {
    const e = s.estado;
    if (!e || !s.quebra) return;
    s.mudar(nova({ ...e, nivel: e.nivel + 1 }, s.quebra.semente), false);
  }
  function parar() {
    const e = s.estado;
    if (!e || dado?.rolando) return;
    s.mudar({ ...e, ganho: acumulado(e), fim: 'parou' }, false);
    void s.terminar('vitoria');
  }
  function usar(e: Estado, nome: keyof Ajudas, extra: Partial<Estado>) {
    s.mudar({ ...e, ...extra, ajudas: { ...ajudas(e), [nome]: nome === 'pular' ? ajudas(e).pular - 1 : false } }, false);
  }
  function eliminar() {
    const e = s.estado;
    if (!e?.pergunta || !ajudas(e).eliminar || !livre(e)) return;
    const pergunta = e.pergunta;
    const a = criarAleatorio(`${pergunta.p}:dado`);
    const n = a.inteiro(4);
    const erradas = a.embaralhar(pergunta.opcoes.filter((o) => o !== pergunta.r && !e.eliminadas.includes(o))).slice(0, n);
    usar(e, 'eliminar', {});
    dado = { valor: 1 + Math.floor(Math.random() * 4), rolando: true };
    let voltas = 0;
    clearInterval(temporizador);
    temporizador = setInterval(() => {
      voltas++;
      if (voltas < 12) { dado = { valor: ((dado?.valor ?? 0) % 4) + 1, rolando: true }; return; }
      clearInterval(temporizador);
      // O dado mostra 1 a 4: o número de erradas eliminadas é a face menos 1.
      dado = { valor: n + 1, rolando: false };
      vibrar(30);
      const atual = s.estado;
      if (atual?.pergunta?.p === pergunta.p) s.mudar({ ...atual, eliminadas: [...atual.eliminadas, ...erradas] }, false);
    }, 75);
  }
  function pular() {
    const e = s.estado;
    if (!e || !s.quebra || ajudas(e).pular <= 0 || !livre(e)) return;
    s.mudar(nova({ ...e, ajudas: { ...ajudas(e), pular: ajudas(e).pular - 1 } }, s.quebra.semente), false);
  }
  /** Chance de acerto de quem sabe um pouco, pela dificuldade da pergunta. */
  const chance = (e: Estado, base: number) => base - ((e.pergunta?.d ?? 3) - 1) * 0.08;
  function plateia() {
    const e = s.estado;
    if (!e?.pergunta || !ajudas(e).plateia || !livre(e)) return;
    // A plateia acerta mais nas perguntas fáceis e fica em dúvida nas difíceis.
    const a = criarAleatorio(e.pergunta.p + 'p');
    const acerto = chance(e, 0.72);
    const pesos = e.pergunta.opcoes.map((o) => (e.eliminadas.includes(o) ? 0 : o === e.pergunta!.r ? acerto * 100 + a.inteiro(15) : a.inteiro(Math.round((1 - acerto) * 100)) + 2));
    const total = pesos.reduce((x, y) => x + y, 0);
    usar(e, 'plateia', { plateia: pesos.map((p) => Math.round((p / total) * 100)) });
  }
  function universitarios() {
    const e = s.estado;
    if (!e?.pergunta || !ajudas(e).universitarios || !livre(e)) return;
    const q = e.pergunta;
    const a = criarAleatorio(q.p + 'u');
    const abertas = q.opcoes.map((o, k) => (e.eliminadas.includes(o) ? -1 : k)).filter((k) => k >= 0);
    const certa = q.opcoes.indexOf(q.r);
    const erradas = abertas.filter((k) => k !== certa);
    // Os três costumam pensar parecido: há uma resposta "da turma" e cada um segue a turma na maioria das vezes.
    const turma = !erradas.length || a.inteiro(1000) / 1000 < chance(e, 0.9) ? certa : erradas[a.inteiro(erradas.length)];
    const palpites = ESTUDANTES.map(() => {
      if (a.inteiro(1000) / 1000 < 0.8) return turma;
      const outras = abertas.filter((k) => k !== turma);
      return outras.length ? outras[a.inteiro(outras.length)] : turma;
    });
    usar(e, 'universitarios', { universitarios: palpites });
  }
  function assistente() {
    const e = s.estado;
    if (!e?.pergunta || !ajudas(e).assistente || !livre(e)) return;
    usar(e, 'assistente', { assistente: true });
  }
  function segunda() {
    const e = s.estado;
    if (!e?.pergunta || !ajudas(e).segunda || !livre(e)) return;
    usar(e, 'segunda', { segundaAtiva: true });
  }

  const textoFim = $derived.by(() => {
    const e = s.estado;
    if (!e) return '';
    const valor = e.ganho ? reais(e.ganho) : 'nada';
    if (e.fim === 'errou') return `Era “${e.pergunta?.r}”. Você leva a metade: ${valor}.`;
    if (e.fim === 'parou') return `Você parou e levou ${valor}.`;
    return `Você levou ${valor}.`;
  });
  onMount(() => s.carregar());
  onDestroy(() => { clearInterval(temporizador); s.destruir(); });
</script>

<Casca sessao={s} titulo="Rumo ao Milhão" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} tituloEscolha="Rumo ao Milhão" semRelogio semDesfazer
  tituloFim={s.estado?.fim === 'milhao' ? 'Um milhão!' : s.recorde ? 'Novo recorde!' : s.estado?.fim === 'errou' ? 'Errou!' : 'Fim de jogo'} {textoFim}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item">Pergunta <span class="ja-numero">{s.estado.nivel + 1}</span> / 15</span>{/if}{/snippet}
  {#if s.estado && !s.terminou}
    {@const e = s.estado}
    {@const aj = ajudas(e)}
    <div class="ja-milhao-escada" aria-label="Prêmios">
      {#each PREMIOS as p, k (k)}
        <span data-atual={k === e.nivel || undefined} data-feito={k < e.nivel || undefined}>{curto(p)}</span>
      {/each}
    </div>
    {#if e.pergunta}
      {@const q = e.pergunta}
      <div class="ja-milhao-valores" aria-label="Valores desta pergunta">
        <span><small>Errar</small>{reais(acumulado(e) / 2)}</span>
        <span><small>Parar</small>{reais(acumulado(e))}</span>
        <span data-acertar><small>Acertar</small>{reais(PREMIOS[e.nivel])}</span>
      </div>
      <div class="ja-pergunta">
        <p class="ja-pergunta-texto">{q.p}</p>
        {#if q.img}<ImagemPergunta tipo={q.img.tipo} pais={q.img.pais} />{/if}
      </div>
      <div class="ja-opcoes-quiz ja-milhao-opcoes">
        {#each q.opcoes as op, k (op)}
          {@const fora = e.eliminadas.includes(op)}
          <button class="botao" type="button" disabled={fora} data-certa={(e.resposta && op === q.r) || undefined} data-errada={(e.resposta === op && op !== q.r) || undefined} onclick={() => responder(op)}>
            <span class="ja-milhao-letra">{'ABCD'[k]}</span><span class="ja-milhao-texto">{fora ? '' : op}</span>
            {#if !fora && e.universitarios}
              {@const quem = ESTUDANTES.filter((_, j) => e.universitarios![j] === k)}
              {#if quem.length}<span class="ja-milhao-palpite" title="Universitários">{quem.join(', ')}</span>{/if}
            {/if}
            {#if e.assistente && op === q.r}<span class="ja-milhao-palpite" data-assistente><Icone nome="robot" pequeno />Assistente</span>{/if}
            {#if e.plateia && !fora}<span class="ja-milhao-plateia" style="--p:{e.plateia[k]}%">{e.plateia[k]}%</span>{/if}
          </button>
        {/each}
      </div>
      <div class="ja-milhao-rodape">
        {#if e.resposta === q.r && e.nivel < PREMIOS.length - 1}
          <button class="botao botao-primario ja-botao-alto ja-botao-largo" type="button" onclick={proxima}><span>Próxima: {reais(PREMIOS[e.nivel + 1])}</span></button>
        {:else if !e.resposta}
          <div class="ja-milhao-ajudas">
            <button class="botao" type="button" disabled={aj.pular <= 0 || !!dado?.rolando} onclick={pular}><Icone nome="player-skip-forward" /><span>Pular ({aj.pular})</span></button>
            <button class="botao ja-milhao-eliminar" type="button" disabled={!aj.eliminar || !!dado?.rolando} onclick={eliminar}>
              {#if dado}<span class="ja-d4" data-rolando={dado.rolando || undefined} aria-label="Dado: {dado.valor}"><svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 1.5 L22.5 20.5 H1.5 Z" /></svg><span>{dado.valor}</span></span>
              {:else}<Icone nome="dice" />{/if}
              <span>{dado && !dado.rolando ? (dado.valor - 1 === 1 ? 'Saiu 1' : `Saíram ${dado.valor - 1}`) : 'Eliminar'}</span>
            </button>
            <button class="botao" type="button" disabled={!aj.plateia || !!dado?.rolando} onclick={plateia}><Icone nome="users" /><span>Plateia</span></button>
            <button class="botao" type="button" disabled={!aj.universitarios || !!dado?.rolando} onclick={universitarios}><Icone nome="school" /><span>Universitários</span></button>
            <button class="botao" type="button" disabled={!aj.assistente || !!dado?.rolando} onclick={assistente}><Icone nome="robot" /><span>Assistente</span></button>
            <button class="botao" type="button" aria-pressed={e.segundaAtiva || undefined} disabled={(!aj.segunda && !e.segundaAtiva) || !!dado?.rolando} onclick={segunda}><Icone nome="heart" /><span>{e.segundaAtiva ? 'Chance extra' : '2ª chance'}</span></button>
          </div>
          <button class="botao botao-terciario ja-botao-largo" type="button" disabled={!!dado?.rolando} onclick={parar}><Icone nome="hand-stop" /><span>Parar e levar {acumulado(e) ? reais(acumulado(e)) : 'nada'}</span></button>
        {/if}
      </div>
    {:else}
      <p class="ja-dica">As perguntas acabaram.</p>
    {/if}
  {/if}
</Casca>
