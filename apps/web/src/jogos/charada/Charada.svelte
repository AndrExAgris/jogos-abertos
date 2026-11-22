<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { avaliarDica, textoDica, type QuebraCharada } from '@ja/nucleo-grade/charada';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Dialogo from '../../lib/jogo/Dialogo.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';

  /** atrib[c][casa] = índice do valor, ou -1. riscadas = dicas que o jogador já usou. */
  interface Estado { atrib: number[][]; riscadas: number[] }
  const s = new Sessao<QuebraCharada, Estado>('charada');
  const OPCOES = [
    { id: '3', titulo: 'Fácil', descricao: '3 casas, 3 categorias' },
    { id: '4', titulo: 'Médio', descricao: '4 casas, 4 categorias' },
    { id: '5', titulo: 'Difícil', descricao: '5 casas, 5 categorias' },
    { id: '6', titulo: 'Desafio', descricao: '5 casas, 6 categorias' },
  ];
  const COMO = [
    'Há casas em fila, numeradas da esquerda para a direita. Em cada casa mora uma pessoa, e cada pessoa tem um valor de cada categoria (cor da casa, bicho, bebida...), sem repetir.',
    'Use as dicas para descobrir tudo. Toque numa casa da tabela para escolher o valor. Toque numa dica para riscá-la quando já tiver usado.',
    'A dica fica verde quando o que você preencheu cumpre ela, e vermelha quando quebra. Só existe uma resposta.',
  ];
  let escolhendo = $state<{ c: number; casa: number } | null>(null);
  const q = $derived(s.quebra);

  function escolher(id: string) {
    const [n, c] = id === '6' ? [5, 6] : [Number(id), Number(id)];
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, async () => {
      const quebra = await gerarNoFundo<QuebraCharada>('charada', [n, c, sementeNova()]);
      return { quebra, estado: { atrib: quebra.categorias.map(() => new Array(n).fill(-1)), riscadas: [] } };
    });
  }
  function definir(v: number) {
    if (!escolhendo || !s.estado || !q) return;
    const { c, casa } = escolhendo;
    escolhendo = null;
    const atrib = s.estado.atrib.map((l) => l.slice());
    // O valor sai de onde estava (cada valor fica numa casa só).
    if (v >= 0) atrib[c] = atrib[c].map((x) => (x === v ? -1 : x));
    atrib[c][casa] = v;
    s.mudar({ ...s.estado, atrib });
    if (atrib.every((l, ci) => l.every((x, h) => x >= 0 && q.solucao[ci][x] === h))) void s.terminar('vitoria');
  }
  function riscar(k: number) {
    if (!s.estado) return;
    const r = s.estado.riscadas.includes(k) ? s.estado.riscadas.filter((x) => x !== k) : [...s.estado.riscadas, k];
    s.mudar({ ...s.estado, riscadas: r }, false);
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Charada de Einstein" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha a dificuldade">
  {#if q && s.estado}
    {@const e = s.estado}
    <div class="ja-charada-tabela" style="--n:{q.casas}">
      <span></span>
      {#each { length: q.casas } as _, h (h)}<span class="ja-charada-casa-num"><Icone nome="home" pequeno />{h + 1}</span>{/each}
      {#each q.categorias as cat, c (c)}
        <span class="ja-charada-cat">{cat.nome}</span>
        {#each { length: q.casas } as _, h (h)}
          {@const v = e.atrib[c][h]}
          <button type="button" class="ja-charada-celula" data-vazia={v < 0 || undefined} aria-label="{cat.nome}, casa {h + 1}: {v >= 0 ? cat.valores[v] : 'vazia'}" onclick={() => (escolhendo = { c, casa: h })}>{v >= 0 ? cat.valores[v] : '?'}</button>
        {/each}
      {/each}
    </div>
    <ol class="ja-charada-dicas">
      {#each q.dicas as d, k (k)}
        {@const st = avaliarDica(q.casas, d, e.atrib)}
        <li>
          <button type="button" class="ja-charada-dica" data-riscada={e.riscadas.includes(k) || undefined} data-ok={st === true || undefined} data-erro={st === false || undefined} onclick={() => riscar(k)}>
            <span class="ja-charada-marca">{#if st === true}<Icone nome="check" pequeno />{:else if st === false}<Icone nome="x" pequeno />{:else}{k + 1}{/if}</span>
            <span>{textoDica(q, d)}</span>
          </button>
        </li>
      {/each}
    </ol>
  {/if}
</Casca>

{#if q && escolhendo}
  {@const cat = q.categorias[escolhendo.c]}
  <Dialogo aberto={true} titulo="{cat.nome}, casa {escolhendo.casa + 1}" folha aoFechar={() => (escolhendo = null)}>
    <div class="ja-charada-opcoes">
      {#each cat.valores as v, i (i)}
        {@const onde = s.estado?.atrib[escolhendo.c].indexOf(i) ?? -1}
        <button class="botao" type="button" aria-pressed={onde === escolhendo.casa} onclick={() => definir(i)}><span>{v}</span>{#if onde >= 0 && onde !== escolhendo.casa}<small>casa {onde + 1}</small>{/if}</button>
      {/each}
      <button class="botao botao-terciario" type="button" onclick={() => definir(-1)}><Icone nome="eraser" /><span>Limpar</span></button>
    </div>
  </Dialogo>
{/if}
