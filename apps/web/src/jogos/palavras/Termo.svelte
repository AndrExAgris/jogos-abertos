<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { MODOS, avaliar, marcasDoTeclado, palavraValida, sortearRespostas, type Marca, type Modo } from '@ja/nucleo-palavras/termo';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { palpites: string[]; atual: string }
  const s = new Sessao<{ modo: Modo; respostas: string[] }, Estado>('termo');
  const OPCOES = [
    { id: 'termo', titulo: 'Termo', descricao: 'Uma palavra, seis tentativas' },
    { id: 'dueto', titulo: 'Dueto', descricao: 'Duas palavras ao mesmo tempo, sete tentativas' },
    { id: 'quarteto', titulo: 'Quarteto', descricao: 'Quatro palavras ao mesmo tempo, nove tentativas' },
  ];
  const COMO = [
    'Descubra a palavra de cinco letras. Cada palpite precisa ser uma palavra que existe.',
    'Depois de cada palpite, as letras mudam: destacada e cheia é letra certa no lugar certo; com contorno é letra que existe em outro lugar; apagada não existe na palavra.',
    'Acentos e cedilha não contam: são preenchidos sozinhos. No Dueto e no Quarteto, cada palpite vale para todas as palavras.',
  ];
  const TECLAS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const sem = (p: string) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const respostas = $derived(s.quebra?.respostas ?? []);
  const limite = $derived(s.quebra ? MODOS[s.quebra.modo].tentativas : 6);
  const resolvidas = $derived(respostas.map((r) => (s.estado?.palpites ?? []).findIndex((p) => sem(p) === sem(r))));

  function terminarSePreciso(e: Estado) {
    const acertou = respostas.every((r) => e.palpites.some((p) => sem(p) === sem(r)));
    if (acertou) void s.terminar('vitoria');
    else if (e.palpites.length >= limite) void s.terminar('derrota');
  }
  function tecla(l: string) {
    if (!s.estado || s.terminou) return;
    const e = s.estado;
    if (l === 'apagar') { s.mudar({ ...e, atual: e.atual.slice(0, -1) }, false); return; }
    if (l === 'enviar') {
      if (e.atual.length < 5) { vibrar(60); window.OpenDesign.toast({ texto: 'A palavra tem cinco letras.' }); return; }
      if (!palavraValida(e.atual)) { vibrar(80); window.OpenDesign.toast({ texto: 'Essa palavra não está na lista.' }); return; }
      const n = { palpites: [...e.palpites, e.atual], atual: '' };
      s.mudar(n, false);
      terminarSePreciso(n);
      return;
    }
    if (e.atual.length < 5) s.mudar({ ...e, atual: e.atual + l }, false);
  }
  function aoTeclado(ev: KeyboardEvent) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === 'Enter') tecla('enviar');
    else if (ev.key === 'Backspace') tecla('apagar');
    else if (/^[a-zA-Zçáéíóúâêôãõà]$/.test(ev.key)) tecla(sem(ev.key) === 'c' && ev.key === 'ç' ? 'c' : sem(ev.key));
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

<svelte:window onkeydown={aoTeclado} />

<Casca sessao={s} titulo="Termo" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id as Modo, respostas: sortearRespostas(id as Modo, sementeNova()) }, estado: { palpites: [], atual: '' } }))} semDesfazer tituloFim={s.terminou === 'vitoria' ? (s.recorde ? 'Novo recorde!' : 'Acertou!') : 'Não foi dessa vez'} textoFim={`${respostas.length > 1 ? 'As palavras eram' : 'A palavra era'}: ${respostas.join(', ').toUpperCase()}.`}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.palpites.length}</span> / {limite}</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    {@const e = s.estado}
    <div class="ja-termo-quadros" data-n={respostas.length}>
      {#each respostas as r, k (k)}
        <div class="ja-termo" aria-label="Palavra {k + 1}">
          {#each Array(limite) as _, li (li)}
            {@const palpite = li < e.palpites.length && (resolvidas[k] < 0 || li <= resolvidas[k]) ? e.palpites[li] : li === e.palpites.length && resolvidas[k] < 0 && !s.terminou ? e.atual : ''}
            {@const marcas = li < e.palpites.length && (resolvidas[k] < 0 || li <= resolvidas[k]) ? avaliar(e.palpites[li], r) : null}
            {#each Array(5) as __, ci (ci)}
              {@const letra = marcas && marcas.every((m) => m === 'certa') ? r[ci] : (palpite[ci] ?? '')}
              <span class="ja-termo-letra" data-marca={marcas?.[ci]} data-atual={!marcas && li === e.palpites.length || undefined}>{letra}</span>
            {/each}
          {/each}
        </div>
      {/each}
    </div>
    {#if !s.terminou}
      <div class="ja-teclado-letras">
        {#each TECLAS as linha, li (li)}
          <div class="ja-teclado-linha">
            {#if li === 2}<button class="botao ja-tecla-letra ja-tecla-larga" type="button" aria-label="Apagar" onclick={() => tecla('apagar')}><Icone nome="backspace" /></button>{/if}
            {#each linha as l (l)}<button class="botao ja-tecla-letra" type="button" data-marca={marcaTecla(l)} onclick={() => tecla(l)}>{l}</button>{/each}
            {#if li === 2}<button class="botao botao-primario ja-tecla-letra ja-tecla-larga" type="button" onclick={() => tecla('enviar')}><span>Enviar</span></button>{/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</Casca>
