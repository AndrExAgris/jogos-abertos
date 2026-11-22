<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { MODOS, avaliar, marcasDoTeclado, palavraValida, sortearRespostas, type Marca, type Modo } from '@ja/nucleo-palavras/termo';
  import Casca from '../../lib/jogo/Casca.svelte';
  import TecladoLetras from '../../lib/jogo/TecladoLetras.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  /** `atual` tem sempre 5 posições (espaço = vazia); `cursor` é a casa onde a próxima letra entra. */
  interface Estado { palpites: string[]; atual: string; cursor?: number }
  const s = new Sessao<{ modo: Modo; respostas: string[] }, Estado>('termo');
  const OPCOES = [
    { id: 'termo', titulo: 'Termo', descricao: 'Uma palavra, seis tentativas' },
    { id: 'dueto', titulo: 'Dueto', descricao: 'Duas palavras ao mesmo tempo, sete tentativas' },
    { id: 'quarteto', titulo: 'Quarteto', descricao: 'Quatro palavras ao mesmo tempo, nove tentativas' },
  ];
  const COMO = [
    'Descubra a palavra de cinco letras. Cada palpite precisa ser uma palavra que existe.',
    'Depois de cada palpite, as letras mudam de cor: verde é letra certa no lugar certo; amarelo é letra que existe em outro lugar; apagada não existe na palavra.',
    'Toque numa casa da linha atual para escrever nela, em qualquer ordem.',
    'Acentos e cedilha não contam: são preenchidos sozinhos. No Dueto e no Quarteto, cada palpite vale para todas as palavras.',
  ];
  const sem = (p: string) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const respostas = $derived(s.quebra?.respostas ?? []);
  const limite = $derived(s.quebra ? MODOS[s.quebra.modo].tentativas : 6);
  const resolvidas = $derived(respostas.map((r) => (s.estado?.palpites ?? []).findIndex((p) => sem(p) === sem(r))));

  function terminarSePreciso(e: Estado) {
    const acertou = respostas.every((r) => e.palpites.some((p) => sem(p) === sem(r)));
    if (acertou) void s.terminar('vitoria');
    else if (e.palpites.length >= limite) void s.terminar('derrota');
  }
  const VAZIA = '     ';
  const casas = (e: Estado) => (e.atual + VAZIA).slice(0, 5).split('');
  const cursorDe = (e: Estado) => e.cursor ?? Math.min(e.atual.trimEnd().length, 5);
  function proximaVazia(c: string[], depois: number): number {
    for (let k = depois; k < 5; k++) if (c[k] === ' ') return k;
    for (let k = 0; k < depois; k++) if (c[k] === ' ') return k;
    return 5;
  }
  function tecla(l: string) {
    if (!s.estado || s.terminou) return;
    const e = s.estado;
    const c = casas(e);
    let cur = cursorDe(e);
    if (l === 'apagar') {
      if (cur < 5 && c[cur] !== ' ') c[cur] = ' ';
      else if (cur > 0) { cur--; c[cur] = ' '; }
      s.mudar({ ...e, atual: c.join(''), cursor: cur }, false);
      return;
    }
    if (l === 'enviar') {
      const palavra = c.join('');
      if (palavra.includes(' ')) { vibrar(60); window.OpenDesign.toast({ texto: 'A palavra tem cinco letras.' }); return; }
      if (!palavraValida(palavra)) { vibrar(80); window.OpenDesign.toast({ texto: 'Essa palavra não está na lista.' }); return; }
      const n = { palpites: [...e.palpites, palavra], atual: VAZIA, cursor: 0 };
      s.mudar(n, false);
      terminarSePreciso(n);
      return;
    }
    if (cur >= 5) return;
    c[cur] = l;
    s.mudar({ ...e, atual: c.join(''), cursor: proximaVazia(c, cur + 1) }, false);
  }
  function irPara(k: number) {
    if (!s.estado || s.terminou) return;
    s.mudar({ ...s.estado, atual: casas(s.estado).join(''), cursor: k }, false);
  }
  /** Marca da tecla somando as palavras ainda não resolvidas. */
  function marcaTecla(l: string): Marca | undefined {
    if (!s.estado) return;
    const ordem = { nao: 0, lugar: 1, certa: 2 };
    let melhor: Marca | undefined;
    let todasNao = true, viu = false;
    respostas.forEach((r, k) => {
      if (resolvidas[k] >= 0) return;
      const m = marcasDoTeclado(s.estado!.palpites, r)[l];
      if (m) { viu = true; if (m !== 'nao') todasNao = false; if (!melhor || ordem[m] > ordem[melhor]) melhor = m; }
    });
    return viu ? (todasNao ? 'nao' : melhor) : undefined;
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Termo" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id as Modo, respostas: sortearRespostas(id as Modo, sementeNova()) }, estado: { palpites: [], atual: '     ', cursor: 0 } }))} semDesfazer tituloFim={s.terminou === 'vitoria' ? (s.recorde ? 'Novo recorde!' : 'Acertou!') : 'Não foi dessa vez'} textoFim={`${respostas.length > 1 ? 'As palavras eram' : 'A palavra era'}: ${respostas.join(', ').toUpperCase()}.`}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.palpites.length}</span> / {limite}</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    {@const e = s.estado}
    <div class="ja-termo-quadros" data-n={respostas.length}>
      {#each respostas as r, k (k)}
        <div class="ja-termo" aria-label="Palavra {k + 1}">
          {#each Array(limite) as _, li (li)}
            {@const linhaAtual = li === e.palpites.length && resolvidas[k] < 0 && !s.terminou}
            {@const palpite = li < e.palpites.length && (resolvidas[k] < 0 || li <= resolvidas[k]) ? e.palpites[li] : linhaAtual ? casas(e).join('') : ''}
            {@const marcas = li < e.palpites.length && (resolvidas[k] < 0 || li <= resolvidas[k]) ? avaliar(e.palpites[li], r) : null}
            {#each Array(5) as __, ci (ci)}
              {@const letra = marcas && marcas.every((m) => m === 'certa') ? r[ci] : (palpite[ci] ?? '')}
              {#if linhaAtual}
                <button type="button" class="ja-termo-letra" data-atual data-cursor={cursorDe(e) === ci || undefined} aria-label="Casa {ci + 1}{letra.trim() ? `, ${letra}` : ', vazia'}" onclick={() => irPara(ci)}>{letra.trim()}</button>
              {:else}
                <span class="ja-termo-letra" data-marca={marcas?.[ci]}>{letra}</span>
              {/if}
            {/each}
          {/each}
        </div>
      {/each}
    </div>
    {#if !s.terminou}
      <TecladoLetras aoTecla={tecla} marca={marcaTecla} />
    {/if}
  {/if}
</Casca>
