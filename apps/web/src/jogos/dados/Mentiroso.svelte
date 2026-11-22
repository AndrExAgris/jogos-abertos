<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { apostaValida, apostar, duvidar, jogadaIA, novoMentiroso, totalDados, type EstadoMentiroso } from '@ja/nucleo-dados/mentiroso';
  import { agendar, nivelDoId, opcoesIA, NOMES_NIVEL, type NivelIA } from '../../lib/jogo/ia.ts';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import Dado from './Dado.svelte';

  const s = new Sessao<{ jogadores: number; ia?: NivelIA }, EstadoMentiroso>('mentiroso', { semRelogio: true, semEstatisticas: true });
  const OPCOES = [
    ...opcoesIA('Você contra dois computadores'),
    ...[2, 3, 4].map((n) => ({ id: String(n), titulo: `${n} jogadores`, descricao: 'Passando o aparelho a cada vez' })),
  ];
  const COMO = [
    'Cada jogador tem cinco dados escondidos. Na sua vez, aposte que há pelo menos tantos dados de uma face entre todos os dados da mesa, ou diga "Duvido" da aposta anterior.',
    'Cada aposta tem que subir: mais dados, ou a mesma quantidade com uma face maior. O 1 é coringa e conta para qualquer face.',
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
  function comecar(id: string) {
    const ia = nivelDoId(id);
    const n = ia ? 3 : Number(id);
    rodada++;
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { jogadores: n, ia }, estado: novoMentiroso(n, sorteio) }));
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
  const nomes = $derived(s.estado ? s.estado.dados.map((_, i) => nome(i)) : []);

  $effect(() => {
    // Sugere a menor aposta válida.
    const e = s.estado;
    if (!e) return;
    if (e.aposta) { quantidade = e.aposta.quantidade; face = e.aposta.face + 1; if (face > 6) { face = 2; quantidade++; } }
    else { quantidade = 1; face = 2; }
  });

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
    if (n.vencedor !== null) void s.terminar('vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Dado Mentiroso" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} tituloFim={s.estado?.vencedor != null ? (contraIA ? (s.estado.vencedor === 0 ? 'Você venceu!' : `${nome(s.estado.vencedor)} venceu`) : `Jogador ${s.estado.vencedor + 1} venceu!`) : ''} textoFim={contraIA ? `Nível: ${NOMES_NIVEL[s.quebra!.ia!].toLowerCase()}.` : ''} semRelogio semDesfazer tituloEscolha="Quem joga?">
  {#if s.estado}
    {@const e = s.estado}
    <Jogadores {nomes} vez={s.terminou ? -1 : e.vez} pontos={e.dados.map((d) => `${d.length} ${d.length === 1 ? 'dado' : 'dados'}`)} />
    <div class="ja-mentiroso-aposta" aria-live="polite">
      {#if e.aposta}
        <span class="ui-pequeno texto-2">{nome(e.aposta.jogador)} aposta que há pelo menos</span>
        <span class="ja-mentiroso-valor"><span class="ja-numero-grande">{e.aposta.quantidade}</span> × <Dado valor={e.aposta.face} /></span>
      {:else}
        <span class="ui-pequeno texto-2">Ninguém apostou ainda nesta rodada</span>
      {/if}
      <span class="ui-pequeno texto-2">{totalDados(e)} dados na mesa · o 1 é coringa</span>
    </div>
    {#if e.revelacao}
      {@const r = e.revelacao}
      <div class="aviso" role="status">
        <Icone nome="eye" />
        <div>
          <p class="aviso-titulo">{nome(r.duvidou)} duvidou de {r.aposta.quantidade} × {r.aposta.face}</p>
          <p>Havia {r.total} (contando os 1). {nome(r.perdeu)} perdeu um dado.</p>
        </div>
      </div>
      <div class="ja-revelacao">
        {#each r.dados as d, j (j)}
          <div class="ja-dados-linha ja-dados-mini"><span class="ui-pequeno texto-2 ja-revelacao-nome">{contraIA ? (j === 0 ? 'Você' : `C${j}`) : `J${j + 1}`}</span>{#each d as v, k (k)}<Dado valor={v} guardado={v === r.aposta.face || v === 1} />{/each}</div>
        {/each}
      </div>
    {/if}
    {#if !s.terminou}
      <div class="ja-dados-base">
        {#if vezIA}
          <p class="ja-dica">{nome(e.vez)} está pensando…</p>
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
                {#each [2, 3, 4, 5, 6] as f (f)}<button type="button" aria-pressed={face === f} onclick={() => (face = f)}>{f}</button>{/each}
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
