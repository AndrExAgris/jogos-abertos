<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { avaliarDica, textoDica, type Dica, type Item, type QuebraCharada } from '@ja/nucleo-grade/charada';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { segurar } from '../../lib/jogo/segurar.ts';
  import { encherReserva, parametros, tirarDaReserva } from './reserva.ts';
  import { simbolo } from './simbolos.ts';

  /**
   * atrib[c][casa] = índice do valor, ou -1. riscadas = dicas que o jogador já usou.
   * desc[c][casa] = valores descartados naquela casa (bits).
   */
  interface Estado { atrib: number[][]; riscadas: number[]; desc?: number[][] }
  const s = new Sessao<QuebraCharada, Estado>('charada', { guardarUltimo: true });
  const OPCOES = [
    { id: '3', titulo: 'Fácil', descricao: '3 casas, 3 categorias' },
    { id: '4', titulo: 'Médio', descricao: '4 casas, 4 categorias' },
    { id: '5', titulo: 'Difícil', descricao: '5 casas, 5 categorias' },
    { id: '6', titulo: 'Desafio', descricao: '5 casas, 6 categorias' },
  ];
  const COMO = [
    'Há casas em fila, numeradas da esquerda para a direita. Em cada casa mora uma pessoa, e cada pessoa tem um valor de cada categoria (cor da casa, bicho, bebida...), sem repetir.',
    'Cada casa vazia da tabela mostra as opções. Toque numa opção para colocá-la ali; segure para apagá-la, marcando que ela não fica naquela casa. Toque numa casa preenchida para limpar.',
    'Toque numa dica quando já tiver usado: ela ganha o sinal verde e vai para o fim da lista. Toque no nome de uma linha (ou no número de uma casa) para destacar as dicas que falam dela.',
    'O sinal da dica mostra se o que você preencheu cumpre (✓) ou quebra (✗) a dica. Só existe uma resposta. Começar outro jogo guarda o atual: dá para voltar a ele na tela de escolha.',
  ];
  const q = $derived(s.quebra);

  function escolher(id: string) {
    const [n, c] = parametros(id);
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, async () => {
      const quebra = (await tirarDaReserva(id)) ?? (await gerarNoFundo<QuebraCharada>('charada', [n, c, sementeNova()]));
      return { quebra, estado: { atrib: quebra.categorias.map(() => new Array(n).fill(-1)), riscadas: [], desc: quebra.categorias.map(() => new Array(n).fill(0)) } };
    });
  }

  const descartado = (c: number, casa: number, v: number) => !!((s.estado?.desc?.[c]?.[casa] ?? 0) & (1 << v));

  function definir(c: number, casa: number, v: number) {
    if (!s.estado || !q || s.terminou) return;
    const atrib = s.estado.atrib.map((l) => l.slice());
    // O valor sai de onde estava (cada valor fica numa casa só).
    if (v >= 0) atrib[c] = atrib[c].map((x) => (x === v ? -1 : x));
    atrib[c][casa] = v;
    s.mudar({ ...s.estado, atrib });
    if (atrib.every((l, ci) => l.every((x, h) => x >= 0 && q.solucao[ci][x] === h))) void s.terminar('vitoria');
  }
  /** Segurar numa opção: apaga (ou devolve) a opção naquela casa. */
  function alternarDescarte(c: number, casa: number, v: number) {
    if (!s.estado || !q || s.terminou) return;
    const desc = s.estado.desc?.map((l) => l.slice()) ?? q.categorias.map(() => new Array(q.casas).fill(0));
    desc[c][casa] ^= 1 << v;
    s.mudar({ ...s.estado, desc });
  }
  function riscar(k: number) {
    if (!s.estado) return;
    const r = s.estado.riscadas.includes(k) ? s.estado.riscadas.filter((x) => x !== k) : [...s.estado.riscadas, k];
    s.mudar({ ...s.estado, riscadas: r }, false);
  }

  // --- Destaque das dicas de uma linha (categoria) ou de uma casa ---
  let foco = $state<{ tipo: 'cat' | 'casa'; i: number } | null>(null);
  const alternarFoco = (tipo: 'cat' | 'casa', i: number) => (foco = foco?.tipo === tipo && foco.i === i ? null : { tipo, i });
  const itens = (d: Dica): Item[] => [d.a, ...('b' in d ? [d.b] : [])];
  function relacionada(d: Dica): boolean {
    if (!foco || !q || !s.estado) return false;
    if (foco.tipo === 'cat') return itens(d).some((it) => it[0] === foco!.i);
    const h = foco.i;
    if (d.tipo === 'posicao' && d.casa === h) return true;
    if (d.tipo === 'ponta' && (h === 0 || h === q.casas - 1)) return true;
    return itens(d).some(([c, v]) => s.estado!.atrib[c][h] === v);
  }

  /** Dicas em uso primeiro, na ordem original; as já usadas vão para o fim. */
  const ordemDicas = $derived.by(() => {
    if (!q || !s.estado) return [];
    const r = new Set(s.estado.riscadas);
    const k = q.dicas.map((_, i) => i);
    return [...k.filter((i) => !r.has(i)), ...k.filter((i) => r.has(i))];
  });

  /** Texto da dica em pedaços, com o símbolo antes de cada valor que tem um. */
  function partes(d: Dica): ({ texto: string } | { c: number; v: number; texto: string })[] {
    const t = textoDica(q!, d);
    const marcas: { ini: number; fim: number; c: number; v: number }[] = [];
    for (const [c, v] of itens(d)) {
      const cat = q!.categorias[c];
      if (simbolo(cat.nome, cat.valores[v]).tipo === 'texto') continue;
      const m = new RegExp(`(?<!\\p{L})${cat.valores[v]}(?!\\p{L})`, 'u').exec(t);
      if (m) marcas.push({ ini: m.index, fim: m.index + m[0].length, c, v });
    }
    marcas.sort((x, y) => x.ini - y.ini);
    const r: ({ texto: string } | { c: number; v: number; texto: string })[] = [];
    let p = 0;
    for (const m of marcas) {
      if (m.ini < p) continue;
      r.push({ texto: t.slice(p, m.ini) }, { c: m.c, v: m.v, texto: t.slice(m.ini, m.fim) });
      p = m.fim;
    }
    r.push({ texto: t.slice(p) });
    return r;
  }

  onMount(async () => {
    await s.carregar();
    void encherReserva();
  });
  onDestroy(() => s.destruir());
</script>

{#snippet marcaValor(c: number, v: number, grande: boolean)}
  {@const cat = q!.categorias[c]}
  {@const sb = simbolo(cat.nome, cat.valores[v])}
  {#if sb.tipo === 'emoji'}<span class="ja-ch-emoji" aria-hidden="true">{sb.texto}</span>
  {:else if sb.tipo === 'cor'}<span class="ja-ch-cor" style="--c:{sb.cor}" aria-hidden="true"></span>
  {:else}<span class="ja-ch-nome" aria-hidden="true">{grande ? sb.texto : sb.curto}</span>{/if}
{/snippet}

<Casca sessao={s} titulo="Charada de Einstein" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha a dificuldade">
  {#if q && s.estado}
    {@const e = s.estado}
    <div class="ja-charada-tabela" style="--n:{q.casas};--op:{q.casas <= 3 ? q.casas : q.casas === 4 ? 2 : 3}">
      <span></span>
      {#each { length: q.casas } as _, h (h)}
        <button type="button" class="ja-charada-casa-num" aria-pressed={foco?.tipo === 'casa' && foco.i === h} onclick={() => alternarFoco('casa', h)}><Icone nome="home" pequeno />{h + 1}</button>
      {/each}
      {#each q.categorias as cat, c (c)}
        <button type="button" class="ja-charada-cat" aria-pressed={foco?.tipo === 'cat' && foco.i === c} onclick={() => alternarFoco('cat', c)}>{cat.nome}</button>
        {#each { length: q.casas } as _, h (h)}
          {@const v = e.atrib[c][h]}
          {#if v >= 0}
            <button type="button" class="ja-charada-celula" data-foco={(foco?.tipo === 'cat' && foco.i === c) || (foco?.tipo === 'casa' && foco.i === h) || undefined} aria-label="{cat.nome}, casa {h + 1}: {cat.valores[v]}. Toque para limpar." onclick={() => definir(c, h, -1)}>
              {@render marcaValor(c, v, true)}
            </button>
          {:else}
            <div class="ja-charada-celula ja-charada-opcoes-casa" data-foco={(foco?.tipo === 'cat' && foco.i === c) || (foco?.tipo === 'casa' && foco.i === h) || undefined} role="group" aria-label="{cat.nome}, casa {h + 1}">
              {#each cat.valores as nome, i (i)}
                {#if !e.atrib[c].includes(i)}
                  <button type="button" class="ja-ch-opcao" data-descartada={descartado(c, h, i) || undefined}
                    aria-label="{nome}{descartado(c, h, i) ? ' (descartado)' : ''}"
                    onclick={() => definir(c, h, i)} use:segurar={() => alternarDescarte(c, h, i)}>{@render marcaValor(c, i, false)}</button>
                {:else}
                  <span class="ja-ch-opcao" aria-hidden="true"></span>
                {/if}
              {/each}
            </div>
          {/if}
        {/each}
      {/each}
    </div>
    <ol class="ja-charada-dicas">
      {#each ordemDicas as k (k)}
        {@const d = q.dicas[k]}
        {@const st = avaliarDica(q.casas, d, e.atrib)}
        {@const usada = e.riscadas.includes(k)}
        <li>
          <button type="button" class="ja-charada-dica" data-riscada={usada || undefined} data-ok={st === true || undefined} data-erro={st === false || undefined} data-foco={relacionada(d) || undefined} aria-pressed={usada} onclick={() => riscar(k)}>
            <span class="ja-charada-marca">{#if usada || st === true}<Icone nome="check" pequeno />{:else if st === false}<Icone nome="x" pequeno />{:else}{k + 1}{/if}</span>
            <span>{#each partes(d) as p, j (j)}{#if 'c' in p}<span class="ja-ch-valor">{@render marcaValor(p.c, p.v, false)}{p.texto}</span>{:else}{p.texto}{/if}{/each}</span>
          </button>
        </li>
      {/each}
    </ol>
  {/if}
</Casca>
