<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { gerarCruzada, solucaoCruzada, type Cruzada, type Entrada } from '@ja/nucleo-palavras/cruzadas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  interface Estado { letras: Record<string, string>; verificar: boolean }
  const s = new Sessao<Cruzada, Estado>('cruzadas');
  const OPCOES = [
    { id: 'p', titulo: 'Pequena', descricao: 'Cerca de 8 palavras' },
    { id: 'm', titulo: 'Média', descricao: 'Cerca de 14 palavras' },
    { id: 'g', titulo: 'Grande', descricao: 'Cerca de 20 palavras' },
  ];
  const PARAM: Record<string, [number, number, number]> = { p: [8, 9, 3000], m: [14, 12, 5000], g: [20, 13, 8000] };
  const COMO = [
    'Preencha a grade com as respostas das dicas. Respostas sem acento nem cedilha.',
    'Toque numa casa para escolher a palavra (toque de novo para trocar entre horizontal e vertical) e digite no teclado. A dica da palavra escolhida aparece acima do teclado.',
    'Verificar marca as letras erradas. As dicas vêm do Wikcionário (CC BY-SA).',
  ];
  const TECLAS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
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

<Casca sessao={s} titulo="Palavras Cruzadas" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => { const [n, lado, comuns] = PARAM[id]; return { quebra: gerarCruzada(n, sementeNova(), comuns, lado), estado: { letras: {}, verificar: false } }; })} semDesfazer>
  {#snippet faixa()}
    {#if s.estado}<button class="botao botao-terciario" type="button" aria-pressed={s.estado.verificar} onclick={() => s.mudar({ ...s.estado!, verificar: !s.estado!.verificar }, false)}><Icone nome="check" /><span>Verificar</span></button>{/if}
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
              <span class="ja-cruz-vazia"></span>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
    {#if entradaAtual && !s.terminou}
      <p class="ja-cruz-dica"><strong>{entradaAtual.numero} {entradaAtual.horizontal ? 'horizontal' : 'vertical'} ({entradaAtual.palavra.length}):</strong> {entradaAtual.dica}</p>
    {/if}
    {#if !s.terminou}
      <div class="ja-teclado-letras">
        {#each TECLAS as linha, li (li)}
          <div class="ja-teclado-linha">
            {#each linha as l (l)}<button class="botao ja-tecla-letra" type="button" onclick={() => digitar(l)}>{l}</button>{/each}
            {#if li === 2}<button class="botao ja-tecla-letra ja-tecla-larga" type="button" aria-label="Apagar" onclick={() => digitar('apagar')}><Icone nome="backspace" /></button>{/if}
          </div>
        {/each}
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
