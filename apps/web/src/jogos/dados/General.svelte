<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { NOMES_JOGADA, VALORES_REGRA, ordemJogadas, type RegraGeneral, guardar, lancar, marcar, novoGeneral, pontosJogada, total, type EstadoGeneral, type Jogada } from '@ja/nucleo-dados/general';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import Dado from './Dado.svelte';
  import { lerPreferencias, salvarPreferencias } from '../../lib/jogo/partida.ts';

  const s = new Sessao<{ jogadores: number }, EstadoGeneral>('general', { semRelogio: true, pontuacao: (e) => total(e.tabelas[0]) });
  const OPCOES = [1, 2, 3, 4].map((n) => ({ id: String(n), titulo: n === 1 ? 'Sozinho' : `${n} jogadores`, descricao: n === 1 ? 'Bata o seu recorde' : 'No mesmo aparelho, passando a vez' }));
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
  const nomes = $derived(s.estado ? Array.from({ length: s.estado.jogadores }, (_, i) => `Jogador ${i + 1}`) : []);
  const textoFim = $derived.by(() => {
    if (!s.estado) return '';
    const t = s.estado.tabelas.map(total);
    if (t.length === 1) return `Você fez ${t[0]} pontos.`;
    const max = Math.max(...t);
    const v = t.map((x, i) => (x === max ? i + 1 : 0)).filter(Boolean);
    return v.length > 1 ? `Empate com ${max} pontos.` : `Jogador ${v[0]} venceu com ${max} pontos!`;
  });

  function rolar() {
    if (!s.estado || s.terminou) return;
    s.mudar(lancar(s.estado, () => 1 + Math.floor(Math.random() * 6)), false);
  }
  function anotar(j: Jogada) {
    if (!s.estado || s.terminou) return;
    const n = marcar(s.estado, j);
    if (n === s.estado) return;
    s.mudar(n, false);
    if (n.fim) void s.terminar('vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="General" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { jogadores: Number(id) }, estado: novoGeneral(Number(id), regra) }))} tituloFim={textoFim} textoFim="" semRelogio semDesfazer tituloEscolha="Quantos jogadores?">
  {#snippet antesDaEscolha()}
    <div class="segmentado ja-segmentado-largo" role="group" aria-label="Tabela de pontos">
      <button type="button" aria-pressed={regra === 'seguida40'} onclick={() => { regra = 'seguida40'; void salvarPreferencias('general', { regra }); }}>Seguida maior (40)</button>
      <button type="button" aria-pressed={regra === 'classica'} onclick={() => { regra = 'classica'; void salvarPreferencias('general', { regra }); }}>Clássica (20)</button>
    </div>
  {/snippet}
  {#if s.estado}
    {@const e = s.estado}
    {#if e.jogadores > 1}<Jogadores {nomes} vez={s.terminou ? -1 : e.vez} pontos={e.tabelas.map(total)} />{/if}
    <div class="ja-dados-linha">
      {#each e.dados as d, i (i)}
        <Dado valor={d} guardado={e.guardados[i]} escondido={e.lancamentos === 0} aoTocar={e.lancamentos > 0 && e.lancamentos < 3 ? () => s.mudar(guardar(e, i), false) : undefined} />
      {/each}
    </div>
    {#if !s.terminou}
      <div class="ja-botoes">
        <button class="botao botao-primario" type="button" disabled={e.lancamentos >= 3} onclick={rolar}><Icone nome="dice" /><span>{e.lancamentos === 0 ? 'Lançar dados' : e.lancamentos >= 3 ? 'Marque uma jogada' : `Lançar de novo (${3 - e.lancamentos})`}</span></button>
      </div>
    {/if}
    <div class="ja-tabela-general">
      <div class="lista-config">
        {#each ordemJogadas(regraJogo) as j (j)}
          {@const feito = e.tabelas[e.vez][j]}
          <button class="linha-config" type="button" disabled={feito !== undefined || e.lancamentos === 0 || !!s.terminou} onclick={() => anotar(j)}>
            <span class="linha-texto"><span class="linha-titulo">{NOMES_JOGADA[j]}</span></span>
            <span class="linha-valor numeros-tabulares">
              {#if feito !== undefined}{feito}{:else if e.lancamentos > 0}<span class="ja-previa">+{pontosJogada(e.dados, j, e.lancamentos === 1, e.regra)}</span>{:else}—{/if}
            </span>
          </button>
        {/each}
        <div class="linha-config"><span class="linha-texto"><span class="linha-titulo">Total</span></span><span class="linha-valor numeros-tabulares">{total(e.tabelas[e.vez])}</span></div>
      </div>
    </div>
  {/if}
</Casca>
