<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { Icone } from '@ja/ui';
  import { apostaValida, apostar, duvidar, faceMinima, jogadaIA, novoMentiroso, temCoringa, totalDados, type EstadoMentiroso } from '@ja/nucleo-dados/mentiroso';
  import { lerPreferencias, salvarPreferencias } from '../../lib/jogo/partida.ts';
  import { agendar, nivelDoId, opcoesIA, NOMES_NIVEL, type NivelIA } from '../../lib/jogo/ia.ts';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import Dado from './Dado.svelte';

  const s = new Sessao<{ jogadores: number; ia?: NivelIA; coringa?: boolean }, EstadoMentiroso>('mentiroso', { semRelogio: true, semEstatisticas: true });
  const OPCOES = [
    ...opcoesIA('Você contra dois computadores'),
    ...[2, 3, 4].map((n) => ({ id: String(n), titulo: `${n} jogadores`, descricao: 'Passando o aparelho a cada vez' })),
  ];
  const COMO = [
    'Cada jogador tem cinco dados escondidos. Na sua vez, aposte que há pelo menos tantos dados de uma face entre todos os dados da mesa, ou diga "Duvido" da aposta anterior.',
    'Cada aposta tem que subir: mais dados, ou a mesma quantidade com uma face maior.',
    'Com coringa, o 1 conta para qualquer face e não se aposta nele. Sem coringa, cada face conta só por si e dá para apostar no 1.',
    'No "Duvido", todos os dados aparecem: se a aposta estava certa, quem duvidou perde um dado; senão, quem apostou. Sem dados, a pessoa sai. Vence quem sobrar.',
    'Passe o aparelho na vez de cada um; os dados só aparecem quando a pessoa tocar em "Ver meus dados".',
  ];
  let vendoManual = $state(false);
  const contraIA = $derived(!!s.quebra?.ia);
  // Contra o computador só há uma pessoa: os dados dela ficam sempre à mostra.
  const vendo = $derived(contraIA ? s.estado?.vez === 0 : vendoManual);
  const vezIA = $derived(contraIA && !!s.estado && s.estado.vez !== 0 && s.estado.vencedor === null && !s.terminou);
  /** Rolagem dos dados (animação) a cada rodada nova. */
  let rodada = $state(0);
  /** Modo escolhido antes de começar: o 1 é coringa ou não. */
  let coringa = $state(true);
  function comecar(id: string) {
    const ia = nivelDoId(id);
    const n = ia ? 3 : Number(id);
    rodada++;
    void salvarPreferencias('mentiroso', { coringa });
    const titulo = `${OPCOES.find((o) => o.id === id)!.titulo}, ${coringa ? 'com coringa' : 'sem coringa'}`;
    void s.comecar(`${id}-${coringa ? 'c' : 's'}`, titulo, () => ({ quebra: { jogadores: n, ia, coringa }, estado: novoMentiroso(n, sorteio, coringa) }));
  }
  $effect(() => {
    if (!vezIA || !s.estado || !s.quebra?.ia) return;
    const e = s.estado, nivel = s.quebra.ia;
    return agendar(() => {
      const j = jogadaIA($state.snapshot(e) as EstadoMentiroso, nivel);
      if (j.tipo === 'duvidar') fazerDuvido(true);
      else s.mudar(apostar(e, j.quantidade, j.face), false);
    }, 1100);
  });
  const nome = (i: number) => (contraIA ? (i === 0 ? 'Você' : `Computador ${i}`) : `Jogador ${i + 1}`);
  let quantidade = $state(1);
  let face = $state(2);
  const sorteio = () => 1 + Math.floor(Math.random() * 6);
  // Nas fichas dos jogadores, nome curto para caber três lado a lado.
  const nomes = $derived(s.estado ? s.estado.dados.map((_, i) => (contraIA && i > 0 ? `PC ${i}` : nome(i))) : []);
  const textoTitulo = $derived.by(() => {
    const e = s.estado;
    if (!e) return '';
    if (contraIA && e.vencedor !== 0 && e.dados[0].length === 0) return 'Você perdeu';
    if (e.vencedor == null) return '';
    return contraIA ? (e.vencedor === 0 ? 'Você venceu!' : `${nome(e.vencedor)} venceu`) : `Jogador ${e.vencedor + 1} venceu!`;
  });

  $effect(() => {
    // Sugere a menor aposta válida quando a aposta da mesa muda (sem depender da escolha da pessoa).
    const e = s.estado;
    if (!e) return;
    const a = e.aposta, min = faceMinima(e);
    untrack(() => {
      if (a) {
        let q = a.quantidade, f = a.face + 1;
        if (f > 6) { f = min; q++; }
        quantidade = Math.min(q, totalDados(e)); face = f;
      } else { quantidade = 1; face = min; }
    });
  });
  /** Escolher uma face ajusta a quantidade para a menor aposta válida com ela. */
  function escolherFace(f: number) {
    const e = s.estado;
    face = f;
    if (!e?.aposta) return;
    const minimo = f > e.aposta.face ? e.aposta.quantidade : e.aposta.quantidade + 1;
    if (quantidade < minimo) quantidade = Math.min(minimo, totalDados(e));
  }

  function fazerAposta() {
    if (!s.estado || vezIA) return;
    s.mudar(apostar(s.estado, quantidade, face), false);
    vendoManual = false;
  }
  function fazerDuvido(peloComputador = false) {
    if (!s.estado || (vezIA && !peloComputador)) return;
    const n = duvidar(s.estado, sorteio);
    s.mudar(n, false);
    rodada++;
    vendoManual = false;
    // Contra o computador: sem dados, a pessoa perdeu; não faz sentido ver os computadores jogando sozinhos.
    if (contraIA && n.dados[0].length === 0) void s.terminar('derrota');
    else if (n.vencedor !== null) void s.terminar(contraIA && n.vencedor !== 0 ? 'derrota' : 'vitoria');
  }
  onMount(async () => {
    coringa = (await lerPreferencias('mentiroso', { coringa: true })).coringa;
    await s.carregar();
  });
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Dado Mentiroso" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} tituloFim={textoTitulo} textoFim={contraIA ? `${s.estado?.vencedor == null && s.estado?.dados[0].length === 0 ? 'Você ficou sem dados. ' : ''}Nível: ${NOMES_NIVEL[s.quebra!.ia!].toLowerCase()}.` : ''} semRelogio semDesfazer tituloEscolha="Quem joga?">
  {#snippet antesDaEscolha()}
    <div class="segmentado ja-segmentado-largo" role="group" aria-label="Coringa">
      <button type="button" aria-pressed={coringa} onclick={() => (coringa = true)}>O 1 é coringa</button>
      <button type="button" aria-pressed={!coringa} onclick={() => (coringa = false)}>Sem coringa</button>
    </div>
  {/snippet}
  {#if s.estado}
    {@const e = s.estado}
    <Jogadores {nomes} vez={s.terminou ? -1 : e.vez} pensando={vezIA} pontos={e.dados.map((d) => `${d.length} ${d.length === 1 ? 'dado' : 'dados'}`)} />
    <div class="ja-mentiroso-aposta" aria-live="polite">
      {#if e.aposta}
        <span class="ui-pequeno texto-2">{nome(e.aposta.jogador)} aposta que há pelo menos</span>
        <span class="ja-mentiroso-valor"><span class="ja-numero-grande">{e.aposta.quantidade}</span> × <Dado valor={e.aposta.face} /></span>
      {:else}
        <span class="ui-pequeno texto-2">Ninguém apostou ainda nesta rodada</span>
      {/if}
      <span class="ui-pequeno texto-2">{totalDados(e)} dados na mesa · {temCoringa(e) ? 'o 1 é coringa' : 'sem coringa'}</span>
    </div>
    {#if e.revelacao}
      {@const r = e.revelacao}
      <div class="aviso" role="status">
        <Icone nome="eye" />
        <div>
          <p class="aviso-titulo">{nome(r.duvidou)} duvidou de {r.aposta.quantidade} × {r.aposta.face}</p>
          <p>Havia {r.total}{temCoringa(e) ? ' (contando os 1)' : ''}. {nome(r.perdeu)} perdeu um dado.</p>
        </div>
      </div>
      <div class="ja-revelacao">
        {#each r.dados as d, j (j)}
          <div class="ja-dados-linha ja-dados-mini"><span class="ui-pequeno texto-2 ja-revelacao-nome">{contraIA ? (j === 0 ? 'Você' : `C${j}`) : `J${j + 1}`}</span>{#each d as v, k (k)}<Dado valor={v} guardado={v === r.aposta.face || (temCoringa(e) && v === 1)} />{/each}</div>
        {/each}
      </div>
    {/if}
    {#if !s.terminou}
      <div class="ja-dados-base">
        {#if vezIA}
          <p class="ja-dica ja-status">{nome(e.vez)} está pensando…</p>
          <div class="ja-dados-linha ja-dados-grandes">{#each e.dados[0] as v, k (k)}{#key `${rodada}-${k}`}<Dado valor={v} rolando />{/key}{/each}</div>
        {:else if !vendo}
          <button class="botao botao-primario ja-botao-largo ja-botao-alto" type="button" onclick={() => (vendoManual = true)}><Icone nome="eye" /><span>Jogador {e.vez + 1}: ver meus dados</span></button>
        {:else}
          <div class="ja-dados-linha ja-dados-grandes">{#each e.dados[e.vez] as v, k (k)}{#key `${rodada}-${e.vez}-${k}`}<Dado valor={v} rolando />{/key}{/each}</div>
          <div class="ja-aposta">
            <div class="ja-aposta-campo">
              <span class="ui-pequeno texto-2">Quantidade</span>
              <div class="ja-botoes">
                <button class="botao botao-icone" type="button" aria-label="Menos" onclick={() => (quantidade = Math.max(1, quantidade - 1))}><Icone nome="minus" /></button>
                <span class="ja-numero">{quantidade}</span>
                <button class="botao botao-icone" type="button" aria-label="Mais" onclick={() => (quantidade = Math.min(totalDados(e), quantidade + 1))}><Icone nome="plus" /></button>
              </div>
            </div>
            <div class="ja-aposta-campo">
              <span class="ui-pequeno texto-2">Face</span>
              <div class="segmentado" role="group" aria-label="Face">
                {#each [1, 2, 3, 4, 5, 6].filter((f) => f >= faceMinima(e)) as f (f)}<button type="button" aria-pressed={face === f} onclick={() => escolherFace(f)}>{f}</button>{/each}
              </div>
            </div>
          </div>
          <div class="ja-acoes-dados">
            <button class="botao botao-destrutivo ja-botao-alto" type="button" disabled={!e.aposta} onclick={() => fazerDuvido()}><span>Duvido!</span></button>
            <button class="botao botao-primario ja-botao-alto" type="button" disabled={!apostaValida(e, quantidade, face)} onclick={fazerAposta}><span>Apostar {quantidade} × {face}</span></button>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</Casca>
