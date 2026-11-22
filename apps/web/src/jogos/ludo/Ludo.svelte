<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { CHEGADA, SEGURAS, absoluta, moverLudo, movimentosLudo, novoLudo, rolar, type EstadoLudo } from '@ja/nucleo-tabuleiro/ludo';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  const s = new Sessao<{ jogadores: number }, EstadoLudo>('ludo', { semRelogio: true, semEstatisticas: true });
  const OPCOES = [2, 3, 4].map((n) => ({ id: String(n), titulo: `${n} jogadores`, descricao: 'No mesmo aparelho, passando a vez' }));
  const NOMES_COR = ['Laranja', 'Teal', 'Roxo', 'Lima'];
  const COMO = [
    'Cada jogador tem 4 peões na base. Tire 6 no dado para pôr um peão na saída.',
    'Dê a volta no tabuleiro e entre na reta da sua cor até o centro, com o número exato. Cair sobre um peão sozinho do outro (fora das casas com estrela e das saídas) manda ele de volta à base.',
    'Tirar 6 dá outra jogada (três seis seguidos perdem a vez). Vence quem levar os 4 peões ao centro primeiro.',
  ];

  // Trilha de 52 casas (linha, coluna) no tabuleiro 15×15, começando na saída da cor 0.
  const TRILHA: [number, number][] = [
    ...[1, 2, 3, 4, 5].map((c) => [6, c]), ...[5, 4, 3, 2, 1, 0].map((l) => [l, 6]), [0, 7],
    ...[0, 1, 2, 3, 4, 5].map((l) => [l, 8]), ...[9, 10, 11, 12, 13, 14].map((c) => [6, c]), [7, 14],
    ...[14, 13, 12, 11, 10, 9].map((c) => [8, c]), ...[9, 10, 11, 12, 13, 14].map((l) => [l, 8]), [14, 7],
    ...[14, 13, 12, 11, 10, 9].map((l) => [l, 6]), ...[5, 4, 3, 2, 1, 0].map((c) => [8, c]), [7, 0], [6, 0],
  ] as [number, number][];
  const RETA: [number, number][][] = [
    [1, 2, 3, 4, 5].map((c) => [7, c]), [1, 2, 3, 4, 5].map((l) => [l, 7]),
    [13, 12, 11, 10, 9].map((c) => [7, c]), [13, 12, 11, 10, 9].map((l) => [l, 7]),
  ] as [number, number][][];
  const BASE: [number, number][] = [[1, 1], [1, 10], [10, 10], [10, 1]];
  const CENTRO: [number, number][] = [[7, 6.2], [6.2, 7], [7, 7.8], [7.8, 7]];

  function posicao(cor: number, rel: number, k: number): [number, number] {
    if (rel < 0) { const [l, c] = BASE[cor]; return [l + 1 + (k >> 1) * 2, c + 1 + (k & 1) * 2]; }
    if (rel === CHEGADA) return CENTRO[cor];
    if (rel > 50) return RETA[cor][rel - 51];
    return TRILHA[absoluta(cor, rel)];
  }

  const movs = $derived(s.estado ? new Set(movimentosLudo(s.estado)) : new Set<number>());
  const corVez = $derived(s.estado ? s.estado.cores[s.estado.vez] : 0);

  function lancar() {
    if (!s.estado || s.terminou || s.estado.dado !== null) return;
    const v = 1 + Math.floor(Math.random() * 6);
    const n = rolar(s.estado, v);
    s.mudar(n);
    if (n.dado === null) window.OpenDesign.toast({ texto: n.vez !== s.estado.vez || v !== 6 ? `Saiu ${v}: sem movimento, a vez passa.` : `Saiu ${v}.` });
  }
  function mover(k: number) {
    if (!s.estado || !movs.has(k)) return;
    const n = moverLudo(s.estado, k);
    s.mudar(n);
    if (n.vencedor !== null) void s.terminar('vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Ludo" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, `${id} jogadores`, () => ({ quebra: { jogadores: Number(id) }, estado: novoLudo(Number(id)) }))} tituloFim={s.estado?.vencedor != null ? `${NOMES_COR[s.estado.vencedor]} venceu!` : ''} textoFim="" semRelogio tituloEscolha="Quantos jogadores?">
  {#if s.estado}
    {@const e = s.estado}
    <Jogadores nomes={e.cores.map((c) => NOMES_COR[c])} vez={s.terminou ? -1 : e.vez} pontos={e.cores.map((c) => `${e.peoes[c].filter((p) => p === CHEGADA).length}/4`)} />
    <div class="ja-centro">
      <svg class="ja-tab ja-ludo" viewBox="0 0 15 15" role="group" aria-label="Tabuleiro do Ludo">
        {#each BASE as [l, c], cor (cor)}<rect x={c - 1} y={l - 1} width="6" height="6" rx="0.4" class="ja-ludo-base ja-cor-{cor}" />{/each}
        {#each TRILHA as [l, c], i (i)}
          <rect x={c + 0.04} y={l + 0.04} width="0.92" height="0.92" rx="0.12" class="ja-ludo-casa" data-saida={[0, 13, 26, 39].indexOf(i) >= 0 ? [0, 13, 26, 39].indexOf(i) : undefined} />
          {#if SEGURAS.includes(i) && ![0, 13, 26, 39].includes(i)}<text x={c + 0.5} y={l + 0.55} class="ja-ludo-estrela">★</text>{/if}
        {/each}
        {#each RETA as reta, cor (cor)}{#each reta as [l, c], k (k)}<rect x={c + 0.04} y={l + 0.04} width="0.92" height="0.92" rx="0.12" class="ja-ludo-reta ja-cor-{cor}" />{/each}{/each}
        <rect x="6" y="6" width="3" height="3" class="ja-ludo-meio" />
        {#each e.cores as cor (cor)}
          {#each e.peoes[cor] as rel, k (k)}
            {@const [l, c] = posicao(cor, rel, k)}
            {@const pode = cor === corVez && movs.has(k) && !s.terminou}
            <g class="ja-cor-{cor}" role="button" tabindex={pode ? 0 : -1} aria-label="Peão {k + 1} {NOMES_COR[cor]}" onclick={() => cor === corVez && mover(k)} onkeydown={(ev) => ev.key === 'Enter' && cor === corVez && mover(k)}>
              <circle cx={c + 0.5} cy={l + 0.5} r="0.38" class="ja-ludo-peao" data-pode={pode || undefined} />
              <text x={c + 0.5} y={l + 0.52} class="ja-ludo-num">{k + 1}</text>
            </g>
          {/each}
        {/each}
      </svg>
    </div>
    <div class="ja-ur-dados">
      {#if e.dado !== null}<span class="ja-ur-dado ja-dado-grande">{e.dado}</span>{/if}
      <button class="botao botao-primario" type="button" disabled={e.dado !== null || !!s.terminou} onclick={lancar}><Icone nome="dice" /><span>{e.dado !== null ? `${NOMES_COR[corVez]}: toque num peão` : `${NOMES_COR[corVez]}: lançar o dado`}</span></button>
    </div>
  {/if}
</Casca>
