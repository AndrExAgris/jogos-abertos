<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova, criarAleatorio } from '@ja/contrato';
  import { aleatorioDaRodada, sortearQualquer, type Pergunta } from '@ja/nucleo-trivia/perguntas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  /** Prêmios em mil reais; as casas 5 e 10 são garantidas. */
  const PREMIOS = [1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 400, 500, 750, 1000];
  const GARANTIDAS = [4, 9];
  interface Estado {
    nivel: number;
    usadas: string[];
    pergunta: (Pergunta & { opcoes: string[] }) | null;
    resposta: string | null;
    eliminadas: string[];
    plateia: number[] | null;
    ajudas: { eliminar: boolean; pular: number; plateia: boolean };
    ganho: number;
  }
  const s = new Sessao<{ semente: string }, Estado>('milhao', { semRelogio: true, pontuacao: (e) => e.ganho });
  const OPCOES = [{ id: 'jogo', titulo: 'Começar', descricao: '15 perguntas até R$ 1 milhão' }];
  const COMO = [
    'Responda 15 perguntas seguidas para chegar a R$ 1 milhão (de mentirinha). Cada acerto sobe um degrau da escada de prêmios.',
    'Errou: você fica com o último prêmio garantido (R$ 10 mil e R$ 100 mil). Pode parar antes de responder e levar o prêmio atual.',
    'Ajudas, uma vez cada: eliminar duas respostas erradas, ouvir a plateia e pular a pergunta (duas vezes).',
  ];
  const fmt = (mil: number) => (mil >= 1000 ? 'R$ 1 milhão' : `R$ ${mil} mil`);
  const garantido = (nivel: number) => { let g = 0; for (const k of GARANTIDAS) if (nivel > k) g = PREMIOS[k]; return g; };

  function nova(e: Estado, semente: string): Estado {
    const p = sortearQualquer(e.usadas, aleatorioDaRodada(semente, e.usadas.length));
    return { ...e, pergunta: p, usadas: p ? [...e.usadas, p.p] : e.usadas, resposta: null, eliminadas: [], plateia: null };
  }
  function comecar(id: string) {
    const semente = sementeNova();
    void s.comecar(id, 'Rumo ao Milhão', () => ({
      quebra: { semente },
      estado: nova({ nivel: 0, usadas: [], pergunta: null, resposta: null, eliminadas: [], plateia: null, ajudas: { eliminar: true, pular: 2, plateia: true }, ganho: 0 }, semente),
    }));
  }
  function responder(op: string) {
    const e = s.estado;
    if (!e?.pergunta || e.resposta || e.eliminadas.includes(op)) return;
    const certo = op === e.pergunta.r;
    vibrar(certo ? 30 : 150);
    if (!certo) {
      s.mudar({ ...e, resposta: op, ganho: garantido(e.nivel) }, false);
      setTimeout(() => void s.terminar('derrota'), 1400);
      return;
    }
    const ganho = PREMIOS[e.nivel];
    s.mudar({ ...e, resposta: op, ganho }, false);
    if (e.nivel === PREMIOS.length - 1) setTimeout(() => void s.terminar('vitoria'), 1200);
  }
  function proxima() {
    const e = s.estado;
    if (!e || !s.quebra) return;
    s.mudar(nova({ ...e, nivel: e.nivel + 1 }, s.quebra.semente), false);
  }
  function parar() {
    const e = s.estado;
    if (!e) return;
    s.mudar({ ...e, ganho: e.nivel > 0 ? PREMIOS[e.nivel - 1] : 0 }, false);
    void s.terminar('vitoria');
  }
  function eliminar() {
    const e = s.estado;
    if (!e?.pergunta || !e.ajudas.eliminar || e.resposta) return;
    const erradas = criarAleatorio(e.pergunta.p).embaralhar(e.pergunta.opcoes.filter((o) => o !== e.pergunta!.r)).slice(0, 2);
    s.mudar({ ...e, eliminadas: erradas, ajudas: { ...e.ajudas, eliminar: false } }, false);
  }
  function pular() {
    const e = s.estado;
    if (!e || !s.quebra || e.ajudas.pular <= 0 || e.resposta) return;
    s.mudar(nova({ ...e, ajudas: { ...e.ajudas, pular: e.ajudas.pular - 1 } }, s.quebra.semente), false);
  }
  function plateia() {
    const e = s.estado;
    if (!e?.pergunta || !e.ajudas.plateia || e.resposta) return;
    // A plateia acerta mais nas primeiras perguntas e vai ficando em dúvida.
    const a = criarAleatorio(e.pergunta.p + 'p');
    const acerto = 0.75 - e.nivel * 0.03;
    const pesos = e.pergunta.opcoes.map((o) => (e.eliminadas.includes(o) ? 0 : o === e.pergunta!.r ? acerto * 100 + a.inteiro(15) : a.inteiro(Math.round((1 - acerto) * 100)) + 2));
    const total = pesos.reduce((x, y) => x + y, 0);
    s.mudar({ ...e, plateia: pesos.map((p) => Math.round((p / total) * 100)), ajudas: { ...e.ajudas, plateia: false } }, false);
  }
  const textoFim = $derived(s.estado ? `Você levou ${s.estado.ganho ? fmt(s.estado.ganho) : 'nada'}.` : '');
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Rumo ao Milhão" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} tituloEscolha="Rumo ao Milhão" semRelogio semDesfazer
  tituloFim={s.terminou === 'vitoria' && s.estado?.nivel === PREMIOS.length - 1 && s.estado.resposta ? 'Um milhão!' : s.recorde ? 'Novo recorde!' : 'Fim de jogo'} {textoFim}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item">Pergunta <span class="ja-numero">{s.estado.nivel + 1}</span> / 15</span>{/if}{/snippet}
  {#if s.estado && !s.terminou}
    {@const e = s.estado}
    <div class="ja-milhao-escada" aria-label="Prêmios">
      {#each PREMIOS as p, k (k)}
        <span data-atual={k === e.nivel || undefined} data-feito={k < e.nivel || undefined} data-garantido={GARANTIDAS.includes(k) || undefined}>{p >= 1000 ? '1 mi' : `${p} mil`}</span>
      {/each}
    </div>
    {#if e.pergunta}
      <div class="ja-pergunta">
        <span class="etiqueta" data-cor="secundaria">{fmt(PREMIOS[e.nivel])}</span>
        <p class="ja-pergunta-texto">{e.pergunta.p}</p>
      </div>
      <div class="ja-opcoes-quiz ja-milhao-opcoes">
        {#each e.pergunta.opcoes as op, k (op)}
          <button class="botao" type="button" disabled={e.eliminadas.includes(op)} data-certa={(e.resposta && op === e.pergunta.r) || undefined} data-errada={(e.resposta === op && op !== e.pergunta.r) || undefined} onclick={() => responder(op)}>
            <span class="ja-milhao-letra">{'ABCD'[k]}</span><span class="ja-milhao-texto">{e.eliminadas.includes(op) ? '' : op}</span>
            {#if e.plateia}<span class="ja-milhao-plateia" style="--p:{e.plateia[k]}%">{e.plateia[k]}%</span>{/if}
          </button>
        {/each}
      </div>
      {#if e.resposta === e.pergunta.r && e.nivel < PREMIOS.length - 1}
        <div class="ja-botoes"><button class="botao botao-primario ja-botao-alto" type="button" onclick={proxima}><span>Próxima: {fmt(PREMIOS[e.nivel + 1])}</span></button></div>
      {:else if !e.resposta}
        <div class="ja-milhao-ajudas">
          <button class="botao" type="button" disabled={!e.ajudas.eliminar} onclick={eliminar}><span>Eliminar 2</span></button>
          <button class="botao" type="button" disabled={!e.ajudas.plateia} onclick={plateia}><Icone nome="users" /><span>Plateia</span></button>
          <button class="botao" type="button" disabled={e.ajudas.pular <= 0} onclick={pular}><span>Pular ({e.ajudas.pular})</span></button>
          <button class="botao botao-terciario" type="button" onclick={parar}><span>Parar com {e.nivel > 0 ? fmt(PREMIOS[e.nivel - 1]) : 'nada'}</span></button>
        </div>
      {/if}
    {:else}
      <p class="ja-dica">As perguntas acabaram.</p>
    {/if}
  {/if}
</Casca>
