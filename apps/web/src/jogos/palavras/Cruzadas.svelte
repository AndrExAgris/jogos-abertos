<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { gerarCruzada, solucaoCruzada, type Cruzada, type Entrada } from '@ja/nucleo-palavras/cruzadas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import TecladoLetras from '../../lib/jogo/TecladoLetras.svelte';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  interface Estado { letras: Record<string, string>; verificar: boolean }
  const s = new Sessao<Cruzada, Estado>('cruzadas');
  const OPCOES = [
    { id: 'p', titulo: 'Pequena', descricao: 'Cerca de 8 palavras' },
    { id: 'm', titulo: 'Média', descricao: 'Cerca de 14 palavras' },
    { id: 'g', titulo: 'Grande', descricao: 'Cerca de 20 palavras' },
    { id: 'd5', titulo: 'Densa 5 × 5', descricao: 'Grade cheia, estilo jornal: tudo se cruza' },
    { id: 'd7', titulo: 'Densa 7 × 7', descricao: 'Grade cheia, estilo jornal' },
    { id: 'd9', titulo: 'Densa 9 × 9', descricao: 'Grade cheia, estilo jornal (pode demorar uns segundos)' },
  ];
  // Densa: [lado, palavras comuns usadas, fração de casas pretas]
  const DENSA: Record<string, [number, number, number]> = { d5: [5, 5000, 0.2], d7: [7, 6000, 0.22], d9: [9, 8000, 0.26] };
  function escolher(id: string) {
    const nome = OPCOES.find((o) => o.id === id)!.titulo;
    if (DENSA[id]) {
      const [n, comuns, pretas] = DENSA[id];
      void s.comecar(id, nome, async () => ({ quebra: await gerarNoFundo<Cruzada>('cruzadaDensa', [n, sementeNova(), 20000, comuns, pretas]), estado: { letras: {}, verificar: false } }));
      return;
    }
    const [n, lado, comuns] = PARAM[id];
    void s.comecar(id, nome, () => ({ quebra: gerarCruzada(n, sementeNova(), comuns, lado), estado: { letras: {}, verificar: false } }));
  }
  const PARAM: Record<string, [number, number, number]> = { p: [8, 9, 3000], m: [14, 12, 5000], g: [20, 13, 8000] };
  const COMO = [
    'Preencha a grade com as respostas das dicas. Respostas sem acento nem cedilha.',
    'Toque numa casa para escolher a palavra (toque de novo para trocar entre horizontal e vertical) e digite no teclado. A dica da palavra escolhida aparece acima do teclado; as setas ao lado de Verificar passam para a palavra anterior ou a próxima (em ordem de número).',
    'Verificar marca as letras erradas enquanto estiver ligado (aparece "Verificando" no alto). As grades densas, no estilo de jornal, têm casas pretas e quase toda letra pertence a duas palavras. As dicas vêm do Wikcionário (CC BY-SA).',
  ];
  let sel = $state<{ x: number; y: number; horizontal: boolean } | null>(null);
  const sol = $derived(s.quebra ? solucaoCruzada(s.quebra) : new Map<string, string>());
  const entradaAtual = $derived.by((): Entrada | null => {
    if (!sel || !s.quebra) return null;
    const cobre = (e: Entrada) => e.horizontal ? e.y === sel!.y && sel!.x >= e.x && sel!.x < e.x + e.palavra.length : e.x === sel!.x && sel!.y >= e.y && sel!.y < e.y + e.palavra.length;
    return s.quebra.entradas.find((e) => e.horizontal === sel!.horizontal && cobre(e)) ?? s.quebra.entradas.find(cobre) ?? null;
  });
  const naEntrada = (x: number, y: number) => {
    const e = entradaAtual;
    if (!e) return false;
    return e.horizontal ? y === e.y && x >= e.x && x < e.x + e.palavra.length : x === e.x && y >= e.y && y < e.y + e.palavra.length;
  };
  const numeroEm = $derived(new Map((s.quebra?.entradas ?? []).map((e) => [`${e.x},${e.y}`, e.numero])));

  function tocar(x: number, y: number) {
    if (sel && sel.x === x && sel.y === y) sel = { ...sel, horizontal: !sel.horizontal };
    else sel = { x, y, horizontal: sel?.horizontal ?? true };
    // Ajusta a direção se só houver palavra numa.
    const e = entradaAtual;
    if (e && sel) sel = { ...sel, horizontal: e.horizontal };
  }
  function digitar(l: string) {
    if (!s.estado || !sel || s.terminou) return;
    const e = entradaAtual;
    if (!e) return;
    const letras = { ...s.estado.letras };
    const k = `${sel.x},${sel.y}`;
    if (l === 'apagar') {
      if (letras[k]) delete letras[k];
      else {
        const px = sel.x - (e.horizontal ? 1 : 0), py = sel.y - (e.horizontal ? 0 : 1);
        if (sol.has(`${px},${py}`)) { delete letras[`${px},${py}`]; sel = { ...sel, x: px, y: py }; }
      }
    } else {
      letras[k] = l;
      const nx = sel.x + (e.horizontal ? 1 : 0), ny = sel.y + (e.horizontal ? 0 : 1);
      if (sol.has(`${nx},${ny}`) && naEntradaPos(e, nx, ny)) sel = { ...sel, x: nx, y: ny, horizontal: e.horizontal };
    }
    s.mudar({ ...s.estado, letras }, false);
    if ([...sol.entries()].every(([pos, letra]) => letras[pos] === letra)) void s.terminar('vitoria');
  }
  /** Ordem fixa das palavras: pelo número; no mesmo número, a horizontal antes. */
  const ordem = $derived([...(s.quebra?.entradas ?? [])].sort((a, b) => a.numero - b.numero || Number(b.horizontal) - Number(a.horizontal)));
  function irPara(passo: number) {
    if (!s.quebra || !s.estado || !ordem.length) return;
    const atual = entradaAtual ? ordem.indexOf(entradaAtual) : -1;
    const e = ordem[(atual + passo + ordem.length) % ordem.length];
    // Vai para a primeira casa vazia da palavra (ou o começo, se já estiver cheia).
    let alvo = 0;
    for (let k = 0; k < e.palavra.length; k++) {
      const pos = e.horizontal ? `${e.x + k},${e.y}` : `${e.x},${e.y + k}`;
      if (!s.estado.letras[pos]) { alvo = k; break; }
    }
    sel = { x: e.x + (e.horizontal ? alvo : 0), y: e.y + (e.horizontal ? 0 : alvo), horizontal: e.horizontal };
  }
  const naEntradaPos = (e: Entrada, x: number, y: number) => (e.horizontal ? y === e.y && x < e.x + e.palavra.length : x === e.x && y < e.y + e.palavra.length);
  function aoTeclado(ev: KeyboardEvent) {
    if (ev.ctrlKey || ev.metaKey) return;
    if (ev.key === 'Backspace') digitar('apagar');
    else if (/^[a-zA-Z]$/.test(ev.key)) digitar(ev.key.toLowerCase());
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<svelte:window onkeydown={aoTeclado} />

<Casca sessao={s} titulo="Palavras Cruzadas" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} semDesfazer>
  {#snippet faixa()}
    {#if s.estado?.verificar}<span class="etiqueta ja-etiqueta-verificar" data-cor="secundaria"><Icone nome="checks" pequeno />Verificando</span>{:else if s.quebra}<span class="ja-faixa-texto">{s.nomeVariante}</span>{/if}
  {/snippet}
  {#if s.estado && s.quebra}
    {@const c = s.quebra}
    <div class="ja-centro">
      <div class="ja-grade ja-cruzadas" style="--ja-colunas:{c.largura}">
        {#each Array(c.altura) as _, y (y)}
          {#each Array(c.largura) as __, x (x)}
            {@const k = `${x},${y}`}
            {#if sol.has(k)}
              {@const l = s.estado.letras[k]}
              <button type="button" class="ja-grade-casa ja-cruz-casa" data-selecionada={(sel?.x === x && sel?.y === y) || undefined} data-relacionada={naEntrada(x, y) || undefined} data-erro={(s.estado.verificar && l && l !== sol.get(k)) || undefined} aria-label="Casa {x + 1}, {y + 1}{l ? `, ${l}` : ''}" onclick={() => tocar(x, y)}>
                {#if numeroEm.has(k)}<span class="ja-cruz-num">{numeroEm.get(k)}</span>{/if}
                <span class="ja-cruz-letra">{(l ?? '').toUpperCase()}</span>
              </button>
            {:else}
              <span class="ja-cruz-vazia" data-preta={c.densa || undefined}></span>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
    {#if !s.terminou}
      <!-- Dica, botões e teclado presos juntos ao pé da tela: nada fica escondido atrás do teclado. -->
      <div class="ja-painel-teclado">
        <p class="ja-cruz-dica">
          {#if entradaAtual}<strong>{entradaAtual.numero} {entradaAtual.horizontal ? 'horizontal' : 'vertical'} ({entradaAtual.palavra.length}):</strong> {entradaAtual.dica}{:else}Toque numa casa para ver a dica.{/if}
        </p>
        <div class="ja-cruz-botoes">
          <button class="botao" type="button" aria-label="Palavra anterior" onclick={() => irPara(-1)}><Icone nome="chevron-left" /></button>
          <button class="botao ja-botao-alternar" type="button" aria-pressed={s.estado.verificar} onclick={() => s.mudar({ ...s.estado!, verificar: !s.estado!.verificar }, false)}><Icone nome={s.estado.verificar ? 'checks' : 'check'} /><span>{s.estado.verificar ? 'Verificação ligada' : 'Verificar'}</span></button>
          <button class="botao" type="button" aria-label="Próxima palavra" onclick={() => irPara(1)}><Icone nome="chevron-right" /></button>
        </div>
        <TecladoLetras aoTecla={digitar} comEnviar={false} fisico={false} />
      </div>
    {/if}
    <details class="ja-cruz-lista">
      <summary>Todas as dicas</summary>
      {#each [true, false] as h (h)}
        <h3 class="ui-subtitulo">{h ? 'Horizontais' : 'Verticais'}</h3>
        <ol>{#each c.entradas.filter((e) => e.horizontal === h).sort((a, b) => a.numero - b.numero) as e (e.numero + e.palavra)}<li value={e.numero}>{e.dica} ({e.palavra.length})</li>{/each}</ol>
      {/each}
    </details>
  {/if}
</Casca>
