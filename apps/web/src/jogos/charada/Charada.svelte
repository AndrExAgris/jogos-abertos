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
  import { ICONE_CATEGORIA, simbolo } from './simbolos.ts';

  /**
   * atrib[c][casa] = índice do valor, ou -1. riscadas = dicas que o jogador já marcou como resolvidas.
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
    'Há casas em fila, numeradas da esquerda para a direita. Em cada casa mora uma pessoa, e cada pessoa tem um valor de cada categoria (nome, cor da casa, bicho, bebida...), sem repetir. Cada linha do tabuleiro é uma categoria, indicada pelo ícone à esquerda.',
    'Toque numa célula do tabuleiro para escolhê-la: embaixo aparece a célula ampliada, com as opções grandes. Toque numa opção para colocá-la; segure para descartá-la naquela célula (segure de novo para devolver).',
    'Acima da célula ampliada fica uma dica por vez (só as que faltam). Deslize para o lado ou use as setas para ver outra; toque em "Resolvida" quando já tiver usado a dica, e ela sai da fila.',
    'O botão de lista mostra todas as dicas de uma vez, as resolvidas no fim. Toque numa dica da lista para marcar ou desmarcar. Escolher uma célula de novo volta para a dica única.',
    'Toque no ícone de uma linha (ou no número de uma casa) para destacar as dicas que falam dela. O sinal da dica mostra se o que você preencheu cumpre (✓) ou quebra (✗) a dica.',
    'Só existe uma resposta. Começar outro jogo guarda o atual: dá para voltar a ele na tela de escolha.',
  ];
  const q = $derived(s.quebra);

  /** Célula escolhida ([categoria, casa]) e o que aparece embaixo: uma dica com a célula ampliada, ou a lista. */
  let sel = $state<[number, number] | null>(null);
  let painel = $state<'um' | 'lista'>('lista');
  let indiceDica = $state(0);

  function escolher(id: string) {
    const [n, c] = parametros(id);
    sel = null;
    painel = 'lista';
    indiceDica = 0;
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, async () => {
      const quebra = (await tirarDaReserva(id)) ?? (await gerarNoFundo<QuebraCharada>('charada', [n, c, sementeNova()]));
      return { quebra, estado: { atrib: quebra.categorias.map(() => new Array(n).fill(-1)), riscadas: [], desc: quebra.categorias.map(() => new Array(n).fill(0)) } };
    });
  }

  const descartado = (c: number, casa: number, v: number) => !!((s.estado?.desc?.[c]?.[casa] ?? 0) & (1 << v));

  function escolherCelula(c: number, h: number) {
    sel = [c, h];
    painel = 'um';
  }

  function definir(c: number, casa: number, v: number) {
    if (!s.estado || !q || s.terminou) return;
    const atrib = s.estado.atrib.map((l) => l.slice());
    // O valor sai de onde estava (cada valor fica numa casa só).
    if (v >= 0) atrib[c] = atrib[c].map((x) => (x === v ? -1 : x));
    atrib[c][casa] = v;
    s.mudar({ ...s.estado, atrib });
    if (atrib.every((l, ci) => l.every((x, h) => x >= 0 && q.solucao[ci][x] === h))) void s.terminar('vitoria');
  }
  /** Segurar numa opção: descarta (ou devolve) a opção naquela casa. */
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

  /** Dicas que faltam, na ordem original; as resolvidas vão para o fim da lista. */
  const pendentes = $derived.by(() => {
    if (!q || !s.estado) return [];
    const r = new Set(s.estado.riscadas);
    return q.dicas.map((_, i) => i).filter((i) => !r.has(i));
  });
  const ordemDicas = $derived.by(() => {
    if (!q || !s.estado) return [];
    return [...pendentes, ...q.dicas.map((_, i) => i).filter((i) => s.estado!.riscadas.includes(i))];
  });
  const dicaAtual = $derived(pendentes.length ? pendentes[((indiceDica % pendentes.length) + pendentes.length) % pendentes.length] : -1);
  const passarDica = (passo: number) => (indiceDica += passo);
  /** Resolver a dica atual: ela sai da fila e a próxima toma o lugar (o índice fica onde está). */
  function resolverAtual() {
    if (dicaAtual < 0) return;
    const pos = pendentes.indexOf(dicaAtual);
    riscar(dicaAtual);
    indiceDica = pos;
  }

  // Deslizar a dica para o lado.
  let inicioToque: { x: number; y: number } | null = null;
  function toqueDica(ev: PointerEvent) { inicioToque = { x: ev.clientX, y: ev.clientY }; }
  function soltarDica(ev: PointerEvent) {
    if (!inicioToque) return;
    const dx = ev.clientX - inicioToque.x, dy = ev.clientY - inicioToque.y;
    inicioToque = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) passarDica(dx < 0 ? 1 : -1);
  }

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

<!-- Símbolo de um valor: emoji, quadradinho de cor ou nome (inicial no tabuleiro, nome inteiro no resto). -->
{#snippet marcaValor(c: number, v: number, inteiro: boolean)}
  {@const cat = q!.categorias[c]}
  {@const sb = simbolo(cat.nome, cat.valores[v])}
  {#if sb.tipo === 'emoji'}<span class="ja-ch-emoji" aria-hidden="true">{sb.texto}</span>
  {:else if sb.tipo === 'cor'}<span class="ja-ch-cor" style="--c:{sb.cor}" aria-hidden="true"></span>
  {:else}<span class="ja-ch-nome" aria-hidden="true">{inteiro ? sb.texto : sb.curto}</span>{/if}
{/snippet}

{#snippet textoDaDica(d: Dica)}
  <span>{#each partes(d) as p, j (j)}{#if 'c' in p}<span class="ja-ch-valor">{@render marcaValor(p.c, p.v, true)}{p.texto}</span>{:else}{p.texto}{/if}{/each}</span>
{/snippet}

{#snippet marcaDica(k: number, d: Dica, usada: boolean)}
  {@const st = avaliarDica(q!.casas, d, s.estado!.atrib)}
  <span class="ja-charada-marca" data-ok={st === true || undefined} data-erro={st === false || undefined} data-usada={usada || undefined}>
    {#if usada || st === true}<Icone nome="check" pequeno />{:else if st === false}<Icone nome="x" pequeno />{:else}{k + 1}{/if}
  </span>
{/snippet}

<Casca sessao={s} titulo="Charada de Einstein" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha a dificuldade">
  {#if q && s.estado}
    {@const e = s.estado}
    <!-- Tabuleiro: fica sempre à vista, preso ao topo mesmo quando a lista de dicas rola. -->
    <div class="ja-charada-topo">
      <div class="ja-charada-tabela" style="--n:{q.casas};--op:{q.casas <= 4 ? 2 : 3}">
        <span></span>
        {#each { length: q.casas } as _, h (h)}
          <button type="button" class="ja-charada-casa-num" aria-label="Casa {h + 1}: destacar dicas" aria-pressed={foco?.tipo === 'casa' && foco.i === h} onclick={() => alternarFoco('casa', h)}>{h + 1}</button>
        {/each}
        {#each q.categorias as cat, c (c)}
          <button type="button" class="ja-charada-cat" aria-label="{cat.nome}: destacar dicas" title={cat.nome} aria-pressed={foco?.tipo === 'cat' && foco.i === c} onclick={() => alternarFoco('cat', c)}>
            {#if ICONE_CATEGORIA[cat.nome]}<Icone nome={ICONE_CATEGORIA[cat.nome]} />{:else}{cat.nome.slice(0, 3)}{/if}
          </button>
          {#each { length: q.casas } as _, h (h)}
            {@const v = e.atrib[c][h]}
            <button type="button" class="ja-charada-celula" data-cheia={v >= 0 || undefined}
              data-selecionada={(sel?.[0] === c && sel[1] === h) || undefined}
              data-foco={(foco?.tipo === 'cat' && foco.i === c) || (foco?.tipo === 'casa' && foco.i === h) || undefined}
              aria-label="{cat.nome}, casa {h + 1}{v >= 0 ? `: ${cat.valores[v]}` : ''}" onclick={() => escolherCelula(c, h)}>
              {#if v >= 0}
                {@render marcaValor(c, v, false)}
              {:else}
                <span class="ja-charada-mini" aria-hidden="true">
                  {#each cat.valores as _, i (i)}
                    <span class="ja-ch-mini" data-descartada={descartado(c, h, i) || undefined}>{#if !e.atrib[c].includes(i)}{@render marcaValor(c, i, false)}{/if}</span>
                  {/each}
                </span>
              {/if}
            </button>
          {/each}
        {/each}
      </div>
    </div>

    {#if painel === 'um' && sel}
      {@const [c, h] = sel}
      {@const cat = q.categorias[c]}
      {@const v = e.atrib[c][h]}
      <div class="ja-charada-painel">
        <!-- Uma dica por vez: só as que faltam. -->
        <div class="ja-charada-umadica" onpointerdown={toqueDica} onpointerup={soltarDica} onpointercancel={() => (inicioToque = null)} role="group" aria-label="Dica">
          {#if dicaAtual >= 0}
            {@const d = q.dicas[dicaAtual]}
            <button class="ja-charada-seta" type="button" aria-label="Dica anterior" disabled={pendentes.length < 2} onclick={() => passarDica(-1)}><Icone nome="chevron-left" /></button>
            <div class="ja-charada-dica ja-charada-dica-unica" data-foco={relacionada(d) || undefined}>
              {@render marcaDica(dicaAtual, d, false)}
              {@render textoDaDica(d)}
            </div>
            <button class="ja-charada-seta" type="button" aria-label="Próxima dica" disabled={pendentes.length < 2} onclick={() => passarDica(1)}><Icone nome="chevron-right" /></button>
          {:else}
            <p class="ja-dica">Todas as dicas estão marcadas como resolvidas.</p>
          {/if}
        </div>
        <!-- Célula ampliada: as mesmas opções, grandes e com o nome inteiro. -->
        <div class="ja-charada-zoom-linha">
          <div class="ja-charada-zoom" style="--op:{q.casas <= 4 ? 2 : 3}" role="group" aria-label="{cat.nome}, casa {h + 1}">
            {#if v >= 0}
              <div class="ja-charada-zoom-cheia">
                {@render marcaValor(c, v, true)}
                <span>{cat.valores[v]}</span>
              </div>
            {:else}
              {#each cat.valores as nome, i (i)}
                {#if !e.atrib[c].includes(i)}
                  <button type="button" class="ja-ch-opcao" data-descartada={descartado(c, h, i) || undefined}
                    aria-label="{nome}{descartado(c, h, i) ? ' (descartado)' : ''}"
                    onclick={() => definir(c, h, i)} use:segurar={() => alternarDescarte(c, h, i)}>
                    {@render marcaValor(c, i, true)}<span class="ja-ch-opcao-nome">{nome}</span>
                  </button>
                {:else}
                  <span class="ja-ch-opcao ja-ch-opcao-vaga" aria-hidden="true"></span>
                {/if}
              {/each}
            {/if}
          </div>
          <div class="ja-charada-zoom-info">
            <span class="ja-charada-zoom-titulo">{#if ICONE_CATEGORIA[cat.nome]}<Icone nome={ICONE_CATEGORIA[cat.nome]} pequeno />{/if}{cat.nome} · casa {h + 1}</span>
            {#if v >= 0}
              <button class="botao" type="button" disabled={!!s.terminou} onclick={() => definir(c, h, -1)}><Icone nome="eraser" /><span>Limpar</span></button>
            {:else}
              <span class="ja-dica">Toque para colocar, segure para descartar.</span>
            {/if}
            <span class="ja-charada-zoom-espaco"></span>
            <button class="botao" type="button" disabled={dicaAtual < 0} onclick={resolverAtual}><Icone nome="check" /><span>Resolvida</span></button>
            <button class="botao" type="button" onclick={() => (painel = 'lista')}><Icone nome="list-details" /><span>Todas ({pendentes.length})</span></button>
          </div>
        </div>
      </div>
    {:else}
      <div class="ja-charada-painel">
        {#if !sel}<p class="ja-dica ja-charada-aviso">Toque numa célula do tabuleiro para preencher.</p>{/if}
        <ol class="ja-charada-dicas">
          {#each ordemDicas as k (k)}
            {@const d = q.dicas[k]}
            {@const usada = e.riscadas.includes(k)}
            <li>
              <button type="button" class="ja-charada-dica" data-riscada={usada || undefined} data-foco={relacionada(d) || undefined} aria-pressed={usada} onclick={() => riscar(k)}>
                {@render marcaDica(k, d, usada)}
                {@render textoDaDica(d)}
              </button>
            </li>
          {/each}
        </ol>
      </div>
    {/if}
  {/if}
</Casca>
