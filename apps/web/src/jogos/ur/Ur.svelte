<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { FIM, ROSETAS, casaUr, lancarUr, moverUr, movimentosUr, novoUr, type EstadoUr } from '@ja/nucleo-tabuleiro/ur';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { iaUr } from '@ja/nucleo-tabuleiro/ia';
  import { agendar, nivelDoId, opcoesIA, NOMES_NIVEL, type NivelIA } from '../../lib/jogo/ia.ts';

  const s = new Sessao<{ modo: string; ia?: NivelIA }, EstadoUr>('ur', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Cada jogador tem 7 peças e precisa levá-las do começo ao fim do caminho: 4 casas na sua fileira, 8 na do meio (compartilhada) e mais 2 na sua. Para sair, o número tem que ser exato.',
    'Lance os quatro dados: cada um vale 0 ou 1, então anda-se de 0 a 4 casas. Toque na peça que quer mover (as peças "fora" aparecem nos lados).',
    'Cair numa roseta dá outra jogada, e a roseta do meio protege a peça. Cair sobre uma peça do outro na fileira do meio manda ela de volta ao começo.',
  ];
  let dados = $state<number[]>([]);
  const OPCOES = [...opcoesIA(), { id: '2', titulo: 'Dois jogadores', descricao: 'Regras de Irving Finkel, no mesmo aparelho' }];
  const ia = $derived(s.quebra?.ia);
  const nomes = $derived(ia ? ['Você', `Computador (${NOMES_NIVEL[ia].toLowerCase()})`] : ['Jogador 1', 'Jogador 2']);
  const vezPC = $derived(!!ia && s.estado?.vez === 1 && s.estado.vencedor === null && !s.terminou);
  function comecar(id: string) {
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id, ia: nivelDoId(id) }, estado: novoUr() }));
  }
  // Na vez do computador: lança os dados e depois move, com pausas para dar para ver.
  $effect(() => {
    if (!vezPC || !s.estado || !ia) return;
    const e = s.estado, nivel = ia;
    return agendar(() => {
      if (e.dado === null) lancar(true);
      else mover(iaUr($state.snapshot(e) as EstadoUr, nivel), true);
    }, e.dado === null ? 700 : 900);
  });
  const movs = $derived(s.estado ? new Set(movimentosUr(s.estado)) : new Set<number>());

  function lancar(peloComputador = false) {
    if (!s.estado || s.terminou || s.estado.dado !== null || (vezPC && !peloComputador)) return;
    dados = [0, 1, 2, 3].map(() => (Math.random() < 0.5 ? 1 : 0));
    const total = dados.reduce((a, b) => a + b, 0);
    const n = lancarUr(s.estado, total);
    s.mudar(n);
    if (n.dado === null) window.OpenDesign.toast({ texto: total === 0 ? 'Saiu 0: a vez passa.' : `Saiu ${total}, mas não há movimento: a vez passa.` });
  }
  function mover(k: number, peloComputador = false) {
    if (!s.estado || !movimentosUr(s.estado).includes(k) || (vezPC && !peloComputador)) return;
    const n = moverUr(s.estado, k);
    s.mudar(n);
    if (n.vencedor !== null) void s.terminar(ia && n.vencedor === 1 ? 'derrota' : 'vitoria');
  }
  function pecaEm(l: number, c: number): { j: 0 | 1; k: number } | null {
    if (!s.estado) return null;
    for (const j of [0, 1] as const) for (let k = 0; k < 7; k++) {
      const pos = casaUr(j, s.estado.pecas[j][k]);
      if (pos && pos[0] === l && pos[1] === c) return { j, k };
    }
    return null;
  }
  const existe = (l: number, c: number) => l === 1 || c < 4 || c > 5;
  const roseta = (l: number, c: number) => (l !== 1 && (c === 0 || c === 6)) || (l === 1 && c === 3);
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
  void ROSETAS;
</script>

<Casca sessao={s} titulo="Jogo Real de Ur" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} tituloEscolha="Quem joga?" tituloFim={s.estado ? (ia ? (s.estado.vencedor === 0 ? 'Você venceu!' : 'O computador venceu.') : `Jogador ${(s.estado.vencedor ?? 0) + 1} venceu!`) : ''} textoFim="" semRelogio>
  {#if s.estado}
    {@const e = s.estado}
    <Jogadores {nomes} vez={s.terminou ? -1 : e.vez} pontos={[0, 1].map((j) => `${e.pecas[j].filter((p) => p === FIM).length}/7`)} />
    {#each [1, 0] as j (j)}
      {@const fora = e.pecas[j].map((p, k) => ({ p, k })).filter((x) => x.p === 0)}
      <div class="ja-ur-fora" aria-label="Peças fora do jogador {j + 1}">
        {#each fora as f (f.k)}
          <button type="button" class="ja-ur-peca ja-j{j + 1}" disabled={e.vez !== j || !movs.has(f.k)} aria-label="Peça fora do jogador {j + 1}" onclick={() => mover(f.k)}></button>
        {/each}
        {#if !fora.length}<span class="ui-pequeno texto-2">Sem peças fora</span>{/if}
      </div>
      {#if j === 1}
        <div class="ja-centro">
          <div class="ja-ur" role="group" aria-label="Tabuleiro de Ur">
            {#each [0, 1, 2] as l (l)}
              {#each Array(8) as _, c (c)}
                {#if existe(l, c)}
                  {@const p = pecaEm(l, c)}
                  <div class="ja-ur-casa" data-roseta={roseta(l, c) || undefined}>
                    {#if roseta(l, c)}<Icone nome="rosette" />{/if}
                    {#if p}<button type="button" class="ja-ur-peca ja-j{p.j + 1}" disabled={e.vez !== p.j || !movs.has(p.k)} data-pode={(e.vez === p.j && movs.has(p.k)) || undefined} aria-label="Peça do jogador {p.j + 1}" onclick={() => mover(p.k)}></button>{/if}
                  </div>
                {:else}
                  <span></span>
                {/if}
              {/each}
            {/each}
          </div>
        </div>
      {/if}
    {/each}
    <div class="ja-ur-dados">
      {#each dados as d, i (i)}<span class="ja-ur-dado" data-um={d || undefined}>{d}</span>{/each}
      <button class="botao botao-primario" type="button" disabled={e.dado !== null || !!s.terminou || vezPC} onclick={() => lancar()}><Icone nome="dice" /><span>{e.dado !== null ? `Saiu ${e.dado}: mova uma peça` : 'Lançar dados'}</span></button>
    </div>
    {#if e.dado !== null}<p class="ja-dica">Toque numa peça destacada para mover.</p>{/if}
  {/if}
</Casca>
