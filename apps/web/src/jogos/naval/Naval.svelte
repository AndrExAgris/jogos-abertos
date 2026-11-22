<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { LADO, NOMES_NAVIOS, afundado, atirar, derrotado, navioEm, posicionar, tiroIA, type Mar, type Resultado } from '@ja/nucleo-tabuleiro/naval';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import { avisar } from '../../lib/aviso.svelte.ts';
  import { agendar, nivelDoId, opcoesIA, NOMES_NIVEL, type NivelIA } from '../../lib/jogo/ia.ts';

  interface Estado {
    /** mares[j] = navios do jogador j e os tiros que ele recebeu. */
    mares: [Mar, Mar];
    vez: 0 | 1;
    fase: 'posicionar' | 'passar' | 'jogar';
    ultimo: { de: 0 | 1; i: number; resultado: Resultado } | null;
    vencedor: 0 | 1 | null;
  }
  const s = new Sessao<{ modo: string; ia?: NivelIA }, Estado>('naval', { semRelogio: true, semEstatisticas: true });
  const OPCOES = [...opcoesIA(), { id: '2', titulo: 'Dois jogadores', descricao: 'Passando o aparelho a cada tiro' }];
  const COMO = [
    'Cada um tem uma frota escondida numa grade 10 × 10: porta-aviões (5 casas), encouraçado (4), dois cruzadores (3) e submarino (2). Os navios nunca se encostam.',
    'Na sua vez, toque numa casa do mar do outro para atirar: água, acerto ou afundou (todas as casas do navio atingidas). Vence quem afundar a frota inteira primeiro.',
    'A dois, passe o aparelho a cada tiro; a frota de cada um só aparece quando a pessoa confirma que é a vez dela.',
  ];
  const ia = $derived(s.quebra?.ia);
  const nomes = $derived(ia ? ['Você', `Computador (${NOMES_NIVEL[ia].toLowerCase()})`] : ['Jogador 1', 'Jogador 2']);
  const outro = (j: 0 | 1) => (1 - j) as 0 | 1;

  function comecar(id: string) {
    const nivel = nivelDoId(id);
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({
      quebra: { modo: id, ia: nivel },
      estado: { mares: [{ navios: posicionar(sementeNova()), tiros: [] }, { navios: posicionar(sementeNova()), tiros: [] }], vez: 0, fase: 'posicionar', ultimo: null, vencedor: null },
    }));
  }
  function sortear() {
    if (!s.estado) return;
    const mares = [...s.estado.mares] as [Mar, Mar];
    mares[s.estado.vez] = { navios: posicionar(sementeNova()), tiros: [] };
    s.mudar({ ...s.estado, mares }, false);
  }
  function pronto() {
    const e = s.estado;
    if (!e) return;
    // Contra o computador, a frota dele já está pronta. A dois, o jogador 2 posiciona depois.
    if (ia || e.vez === 1) s.mudar({ ...e, vez: 0, fase: ia ? 'jogar' : 'passar' }, false);
    else s.mudar({ ...e, vez: 1, fase: 'passar' }, false);
  }
  const posicionando2 = $derived(!ia && s.estado?.fase === 'passar' && s.estado.vez === 1 && !s.estado.mares[1].tiros.length && !s.estado.mares[0].tiros.length && !s.estado.ultimo);
  function souEu() {
    if (!s.estado) return;
    s.mudar({ ...s.estado, fase: posicionando2 ? 'posicionar' : 'jogar' }, false);
  }
  const NOME_RES: Record<Resultado, string> = { agua: 'Água.', acerto: 'Acertou!', afundou: 'Afundou' };
  function tiro(i: number, peloComputador = false) {
    const e = s.estado;
    if (!e || e.fase !== 'jogar' || s.terminou || e.ultimo?.de === e.vez || (ia && e.vez === 1 && !peloComputador)) return;
    const alvo = outro(e.vez);
    const r = atirar(e.mares[alvo], i);
    if (!r) return;
    const mares = [...e.mares] as [Mar, Mar];
    mares[alvo] = r.mar;
    vibrar(r.resultado === 'agua' ? 10 : 60);
    const navio = navioEm(r.mar, i);
    avisar(r.resultado === 'afundou' ? `${nomes[e.vez]}: afundou o ${NOMES_NAVIOS[navio!.casas.length].toLowerCase()}!` : `${nomes[e.vez]}: ${NOME_RES[r.resultado].toLowerCase()}`, r.resultado === 'agua' ? 'info' : 'sucesso', 1600);
    const venceu = derrotado(r.mar);
    const n: Estado = { ...e, mares, ultimo: { de: e.vez, i, resultado: r.resultado }, vencedor: venceu ? e.vez : null };
    s.mudar(n, false);
    if (venceu) { void s.terminar(ia && e.vez === 1 ? 'derrota' : 'vitoria'); return; }
    // Passa a vez depois de dar tempo de ver o resultado.
    trocar = agendar(() => {
      if (!s.estado || s.terminou) return;
      s.mudar({ ...s.estado, vez: alvo, fase: ia ? 'jogar' : 'passar' }, false);
    }, ia ? 700 : 1100);
  }
  let trocar: (() => void) | null = null;
  // Vez do computador.
  $effect(() => {
    const e = s.estado;
    if (!e || !ia || e.vez !== 1 || e.fase !== 'jogar' || s.terminou || e.ultimo?.de === 1) return;
    const nivel = ia;
    return agendar(() => tiro(tiroIA($state.snapshot(e.mares[0]) as Mar, nivel), true), 650);
  });
  const vistaInimiga = $derived(s.estado ? s.estado.mares[outro(s.estado.vez)] : null);
  const meuMar = $derived(s.estado ? s.estado.mares[ia ? 0 : s.estado.vez] : null);
  const restam = (m: Mar) => m.navios.filter((n) => !afundado(m, n)).length;
  onMount(() => s.carregar());
  onDestroy(() => { trocar?.(); s.destruir(); });
</script>

{#snippet grade(m: Mar, mostrarNavios: boolean, aoTocar: ((i: number) => void) | null, pequena: boolean)}
  <div class="ja-naval" data-pequena={pequena || undefined} role="grid">
    {#each { length: LADO * LADO } as _, i (i)}
      {@const navio = navioEm(m, i)}
      {@const atingida = m.tiros.includes(i)}
      {@const afund = navio && afundado(m, navio)}
      <button type="button" class="ja-naval-casa" disabled={!aoTocar || atingida}
        data-navio={(navio && (mostrarNavios || afund)) || undefined}
        data-agua={(atingida && !navio) || undefined}
        data-acerto={(atingida && navio) || undefined}
        data-afundado={afund || undefined}
        data-ultimo={s.estado?.ultimo?.i === i && m === s.estado.mares[outro(s.estado.ultimo.de)] || undefined}
        aria-label="{String.fromCharCode(65 + Math.floor(i / LADO))}{(i % LADO) + 1}{atingida ? (navio ? ', acerto' : ', água') : ''}"
        onclick={() => aoTocar?.(i)}>
        {#if atingida && navio}<Icone nome="x" />{:else if atingida}<span class="ja-naval-pingo"></span>{/if}
      </button>
    {/each}
  </div>
{/snippet}

<Casca sessao={s} titulo="Batalha Naval" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} tituloEscolha="Quem joga?" semRelogio semDesfazer
  tituloFim={s.estado?.vencedor != null ? (ia ? (s.estado.vencedor === 0 ? 'Você venceu!' : 'O computador venceu.') : `${nomes[s.estado.vencedor]} venceu!`) : ''} textoFim="">
  {#if s.estado && meuMar && vistaInimiga}
    {@const e = s.estado}
    <Jogadores {nomes} vez={s.terminou || e.fase !== 'jogar' ? -1 : e.vez} pontos={[0, 1].map((j) => `${restam(e.mares[j])} navios`)} />
    {#if e.fase === 'posicionar'}
      <p class="ja-dica">{ia ? 'Sua frota' : `Frota do ${nomes[e.vez]}`}: sorteie até gostar da posição.</p>
      <div class="ja-centro">{@render grade(e.mares[e.vez], true, null, false)}</div>
      <div class="ja-botoes">
        <button class="botao" type="button" onclick={sortear}><Icone nome="refresh" /><span>Sortear de novo</span></button>
        <button class="botao botao-primario" type="button" onclick={pronto}><Icone nome="check" /><span>Pronto</span></button>
      </div>
    {:else if e.fase === 'passar'}
      <div class="ja-passar">
        <Icone nome="ship" />
        <p class="ui-subtitulo">Passe o aparelho para o {nomes[e.vez]}</p>
        <p class="ja-dica">{posicionando2 ? 'Agora é a vez de posicionar a outra frota.' : 'Só toque quando o outro não estiver olhando.'}</p>
        <button class="botao botao-primario ja-botao-alto" type="button" onclick={souEu}><span>Sou o {nomes[e.vez]}</span></button>
      </div>
    {:else}
      <p class="ja-dica">{s.terminou ? '' : ia && e.vez === 1 ? 'O computador está mirando…' : e.ultimo?.de === e.vez ? 'Passando a vez…' : 'Toque no mar do adversário para atirar.'}</p>
      <div class="ja-centro">{@render grade(ia ? e.mares[1] : vistaInimiga, !!s.terminou, ia && e.vez === 1 ? null : (i) => tiro(i), false)}</div>
      <p class="ja-dica ja-dica-curta">{ia ? 'Sua frota' : 'Sua frota'}</p>
      <div class="ja-centro">{@render grade(meuMar, true, null, true)}</div>
    {/if}
  {/if}
</Casca>
