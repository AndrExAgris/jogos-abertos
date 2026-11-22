<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { NOMES_JOGADA, VALORES_REGRA, jogadaGeneralIA, ordemJogadas, type RegraGeneral, guardar, lancar, marcar, novoGeneral, pontosJogada, total, type EstadoGeneral, type Jogada } from '@ja/nucleo-dados/general';
  import { agendar, nivelDoId, opcoesIA, NOMES_NIVEL, type NivelIA } from '../../lib/jogo/ia.ts';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import Dado from './Dado.svelte';
  import { lerPreferencias, salvarPreferencias } from '../../lib/jogo/partida.ts';

  const s = new Sessao<{ jogadores: number; ia?: NivelIA }, EstadoGeneral>('general', { semRelogio: true, pontuacao: (e) => total(e.tabelas[0]) });
  const OPCOES = [
    { id: '1', titulo: 'Sozinho', descricao: 'Bata o seu recorde' },
    ...opcoesIA('Você contra o computador, passando a vez'),
    ...[2, 3, 4].map((n) => ({ id: String(n), titulo: `${n} jogadores`, descricao: 'No mesmo aparelho, passando a vez' })),
  ];
  function comecar(id: string) {
    const ia = nivelDoId(id);
    const n = ia ? 2 : Number(id);
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { jogadores: n, ia }, estado: novoGeneral(n, regra) }));
  }
  const vezIA = $derived(!!s.quebra?.ia && s.estado?.vez === 1 && !s.estado.fim && !s.terminou);
  // O computador joga sozinho na vez dele, um passo de cada vez.
  $effect(() => {
    if (!vezIA || !s.estado || !s.quebra?.ia) return;
    const e = s.estado, nivel = s.quebra.ia;
    return agendar(() => {
      const j = jogadaGeneralIA($state.snapshot(e) as EstadoGeneral, nivel);
      if (j.tipo === 'marcar') anotar(j.jogada, true);
      else {
        let n = e;
        if (n.lancamentos > 0) n.dados.forEach((_, i) => { if (n.guardados[i] !== j.guardados[i]) n = guardar(n, i); });
        s.mudar(lancar(n, () => 1 + Math.floor(Math.random() * 6)), false);
      }
    }, e.lancamentos === 0 ? 700 : 1000);
  });
  let regra = $state<RegraGeneral>('seguida40');
  onMount(async () => { regra = (await lerPreferencias('general', { regra: 'seguida40' as RegraGeneral })).regra; });
  const regraJogo = $derived(s.estado?.regra ?? 'classica');
  const v = $derived(VALORES_REGRA[s.estado ? regraJogo : regra]);
  const COMO = $derived([
    'Na sua vez, lance os cinco dados até três vezes. Entre um lançamento e outro, toque nos dados que quer guardar.',
    `Depois, marque uma das dez jogadas na tabela (cada uma só uma vez): 1 a 6 somam os dados daquela face; Seguida (1 a 5 ou 2 a 6) vale ${v.seguida}, Full (trinca + par) ${v.full}, Quadra ${v.quadra} e General (cinco iguais) 50.`,
    'Feitas no primeiro lançamento ("de boca"), Seguida, Full e Quadra valem 5 a mais e o General vale 100. Se nada servir, marque zero numa jogada. Ganha quem somar mais.',
    'Há duas tabelas, escolhidas antes da partida: "Seguida maior" (Seguida 40, Quadra 35, Full 30) e a clássica (Seguida 20, Full 30, Quadra 40).',
  ]);
  const nomes = $derived(s.estado ? Array.from({ length: s.estado.jogadores }, (_, i) => (s.quebra?.ia ? (i === 0 ? 'Você' : `Computador (${NOMES_NIVEL[s.quebra.ia].toLowerCase()})`) : `Jogador ${i + 1}`)) : []);
  const textoFim = $derived.by(() => {
    if (!s.estado) return '';
    const t = s.estado.tabelas.map(total);
    if (t.length === 1) return `Você fez ${t[0]} pontos.`;
    const max = Math.max(...t);
    const v = t.map((x, i) => (x === max ? i + 1 : 0)).filter(Boolean);
    if (v.length > 1) return `Empate com ${max} pontos.`;
    if (s.quebra?.ia) return v[0] === 1 ? `Você venceu com ${max} pontos!` : `O computador venceu com ${max} pontos.`;
    return `Jogador ${v[0]} venceu com ${max} pontos!`;
  });

  function rolar() {
    if (!s.estado || s.terminou || vezIA) return;
    s.mudar(lancar(s.estado, () => 1 + Math.floor(Math.random() * 6)), false);
  }
  function anotar(j: Jogada, peloComputador = false) {
    if (!s.estado || s.terminou || (vezIA && !peloComputador)) return;
    const n = marcar(s.estado, j);
    if (n === s.estado) return;
    s.mudar(n, false);
    if (n.fim) void s.terminar('vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="General" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} tituloFim={textoFim} textoFim="" semRelogio semDesfazer tituloEscolha="Quantos jogadores?">
  {#snippet antesDaEscolha()}
    <div class="segmentado ja-segmentado-largo" role="group" aria-label="Tabela de pontos">
      <button type="button" aria-pressed={regra === 'seguida40'} onclick={() => { regra = 'seguida40'; void salvarPreferencias('general', { regra }); }}>Seguida maior (40)</button>
      <button type="button" aria-pressed={regra === 'classica'} onclick={() => { regra = 'classica'; void salvarPreferencias('general', { regra }); }}>Clássica (20)</button>
    </div>
  {/snippet}
  {#if s.estado}
    {@const e = s.estado}
    {#if e.jogadores > 1}<Jogadores {nomes} vez={s.terminou ? -1 : e.vez} pontos={e.tabelas.map(total)} />{/if}
    <div class="ja-cartela" role="group" aria-label="Tabela de pontos">
      {#each ordemJogadas(regraJogo) as j (j)}
        {@const feito = e.tabelas[e.vez][j]}
        {@const previa = e.lancamentos > 0 && feito === undefined ? pontosJogada(e.dados, j, e.lancamentos === 1, e.regra) : null}
        <button class="ja-cartela-casa" type="button" data-feito={feito !== undefined || undefined} data-zero={previa === 0 || undefined} disabled={feito !== undefined || e.lancamentos === 0 || !!s.terminou || vezIA} onclick={() => anotar(j)}>
          <span class="ja-cartela-nome">{NOMES_JOGADA[j]}</span>
          <span class="ja-cartela-valor numeros-tabulares">{#if feito !== undefined}{feito}{:else if previa !== null}<span class="ja-previa">{previa}</span>{:else}·{/if}</span>
        </button>
      {/each}
    </div>
    <div class="ja-cartela-total"><span>Total</span><span class="numeros-tabulares">{total(e.tabelas[e.vez])}</span></div>
    <div class="ja-dados-base">
      <div class="ja-dados-linha ja-dados-grandes">
        {#each e.dados as d, i (i)}
          {#key e.guardados[i] ? `g${i}` : `${e.vez}-${e.lancamentos}-${i}`}
            <Dado valor={d} guardado={e.guardados[i]} escondido={e.lancamentos === 0} rolando={e.lancamentos > 0 && !e.guardados[i]} aoTocar={e.lancamentos > 0 && e.lancamentos < 3 && !vezIA ? () => s.mudar(guardar(e, i), false) : undefined} />
          {/key}
        {/each}
      </div>
      {#if !s.terminou}
        <p class="ja-dica ja-dica-curta">{vezIA ? 'O computador está jogando…' : e.lancamentos === 0 ? (e.jogadores > 1 ? `Vez de ${nomes[e.vez]}` : 'Lance os dados') : e.lancamentos >= 3 ? 'Marque uma jogada na tabela' : 'Toque nos dados para guardar, ou marque uma jogada'}</p>
        <button class="botao botao-primario ja-botao-largo ja-botao-alto" type="button" disabled={e.lancamentos >= 3 || vezIA} onclick={rolar}><Icone nome="dice" /><span>{e.lancamentos === 0 ? 'Lançar dados' : e.lancamentos >= 3 ? 'Sem lançamentos' : `Lançar de novo (${3 - e.lancamentos})`}</span></button>
      {/if}
    </div>
  {/if}
</Casca>
