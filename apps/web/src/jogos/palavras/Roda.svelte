<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { criarAleatorio, sementeNova } from '@ja/contrato';
  import { gerarRoda, palavraExiste, type Roda } from '@ja/nucleo-palavras/roda';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { achadas: string[]; bonus: string[]; letras: string[]; dicas: number }
  const s = new Sessao<Roda, Estado>('roda');
  const OPCOES = [
    { id: '5', titulo: 'Cinco letras', descricao: 'Mais fácil' },
    { id: '6', titulo: 'Seis letras', descricao: 'Médio' },
    { id: '7', titulo: 'Sete letras', descricao: 'Mais palavras escondidas' },
  ];
  const COMO = [
    'Forme as palavras escondidas usando as letras da roda. Cada letra vale uma vez por palavra; as palavras têm de 3 letras até o tamanho da roda.',
    'Encoste o dedo na primeira letra e arraste pelas outras, sem soltar; ao soltar, a palavra é enviada. Voltar o dedo para a letra anterior desfaz a última. Também dá para tocar letra por letra e usar "Enviar".',
    'Palavras que existem mas não estão escondidas contam como bônus.',
    'Embaralhar troca a ordem das letras; Dica mostra uma letra de uma palavra que falta.',
  ];
  let atual = $state<number[]>([]);
  const palavra = $derived(s.estado ? atual.map((i) => s.estado!.letras[i]).join('') : '');

  function enviar() {
    if (!s.estado || !s.quebra || palavra.length < 3) return;
    const e = s.estado;
    if (e.achadas.includes(palavra) || e.bonus.includes(palavra)) { window.OpenDesign.toast({ texto: 'Essa já foi.' }); atual = []; return; }
    if (s.quebra.palavras.includes(palavra)) {
      const n = { ...e, achadas: [...e.achadas, palavra] };
      s.mudar(n, false);
      if (n.achadas.length === s.quebra.palavras.length) void s.terminar('vitoria');
    } else if (palavraExiste(palavra)) {
      s.mudar({ ...e, bonus: [...e.bonus, palavra] }, false);
      window.OpenDesign.toast({ texto: `Bônus: ${palavra.toUpperCase()}` });
    } else vibrar(80);
    atual = [];
  }
  function embaralhar() {
    if (!s.estado) return;
    atual = [];
    s.mudar({ ...s.estado, letras: criarAleatorio(sementeNova()).embaralhar([...s.estado.letras]) }, false);
  }
  function dica() {
    if (!s.estado || !s.quebra) return;
    s.mudar({ ...s.estado, dicas: s.estado.dicas + 1 }, false);
  }
  /** Letras reveladas por dica: a k-ésima dica revela uma letra a mais da primeira palavra que falta. */
  function revelado(p: string, i: number): boolean {
    if (!s.estado || !s.quebra) return false;
    const faltam = s.quebra.palavras.filter((x) => !s.estado!.achadas.includes(x));
    let resto = s.estado.dicas;
    for (const f of faltam) { const n = Math.min(resto, f.length - 1); if (f === p) return i < n; resto -= n; if (resto <= 0) return false; }
    return false;
  }
  const raio = 36;
  // --- Arrastar o dedo pelas letras ---
  let roda = $state<HTMLDivElement>();
  let arrastando = $state(false);
  let dedo = $state<[number, number] | null>(null);
  let tamanhoAntes = 0;
  const posLetra = (i: number, n: number): [number, number] => {
    const ang = (2 * Math.PI * i) / n - Math.PI / 2;
    return [50 + raio * Math.cos(ang), 50 + raio * Math.sin(ang)];
  };
  function emPorcento(e: PointerEvent): [number, number] {
    const r = roda!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100];
  }
  function letraEm(p: [number, number]): number {
    const n = s.estado!.letras.length;
    for (let i = 0; i < n; i++) {
      const [x, y] = posLetra(i, n);
      if (Math.hypot(p[0] - x, p[1] - y) < 13) return i;
    }
    return -1;
  }
  function aoPressionar(e: PointerEvent) {
    if (!s.estado || s.terminou) return;
    const p = emPorcento(e);
    const i = letraEm(p);
    if (i < 0) return;
    e.preventDefault();
    roda!.setPointerCapture(e.pointerId);
    arrastando = true;
    tamanhoAntes = atual.length;
    if (!atual.includes(i)) { atual = [...atual, i]; vibrar(8); }
    dedo = p;
  }
  function aoMover(e: PointerEvent) {
    if (!arrastando) return;
    const p = emPorcento(e);
    dedo = p;
    const j = letraEm(p);
    if (j < 0) return;
    if (atual.length >= 2 && j === atual[atual.length - 2]) { atual = atual.slice(0, -1); vibrar(8); }
    else if (!atual.includes(j)) { atual = [...atual, j]; vibrar(8); }
  }
  function aoSoltar() {
    if (!arrastando) return;
    arrastando = false;
    dedo = null;
    // Arrastou por várias letras: envia. Só tocou numa letra: continua no modo de toque.
    if (atual.length - tamanhoAntes >= 2 || (tamanhoAntes === 0 && atual.length >= 3)) {
      if (palavra.length >= 3) enviar(); else atual = [];
    }
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Roda de Letras" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => { const r = gerarRoda(Number(id) as 5 | 6 | 7, sementeNova()); return { quebra: r, estado: { achadas: [], bonus: [], letras: r.letras, dicas: 0 } }; })} semDesfazer textoFim={s.estado ? `${s.estado.bonus.length} palavras bônus, ${s.estado.dicas} dicas.` : ''}>
  {#snippet faixa()}{#if s.estado && s.quebra}<span class="ja-placar-item"><span class="ja-numero">{s.estado.achadas.length}</span> / {s.quebra.palavras.length}</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    {@const e = s.estado}
    <div class="ja-roda-palavras">
      {#each s.quebra.palavras as p (p)}
        <div class="ja-roda-palavra" aria-label={e.achadas.includes(p) ? p : `${p.length} letras`}>
          {#each p as l, i (i)}<span class="ja-roda-casa" data-achada={e.achadas.includes(p) || undefined}>{e.achadas.includes(p) || revelado(p, i) ? l : ''}</span>{/each}
        </div>
      {/each}
    </div>
    <div class="ja-roda-atual" aria-live="polite">{palavra.toUpperCase() || ' '}</div>
    <div class="ja-centro">
      <div
        class="ja-roda"
        bind:this={roda}
        role="application"
        aria-label="Roda de letras: arraste o dedo pelas letras"
        onpointerdown={aoPressionar}
        onpointermove={aoMover}
        onpointerup={aoSoltar}
        onpointercancel={aoSoltar}
      >
        <svg class="ja-roda-linhas" viewBox="0 0 100 100" aria-hidden="true">
          {#if atual.length}
            <polyline points={[...atual.map((i) => posLetra(i, e.letras.length)), ...(dedo ? [dedo] : [])].map(([x, y]) => `${x},${y}`).join(' ')} />
          {/if}
        </svg>
        {#each e.letras as l, i (i)}
          {@const [x, y] = posLetra(i, e.letras.length)}
          <button type="button" class="ja-roda-letra" data-usada={atual.includes(i) || undefined} style="left:{x}%;top:{y}%" tabindex="-1" aria-hidden="true">{l}</button>
        {/each}
      </div>
    </div>
    <div class="ja-botoes">
      <button class="botao" type="button" onclick={() => (atual = atual.slice(0, -1))} aria-label="Apagar letra"><Icone nome="backspace" /></button>
      <button class="botao" type="button" onclick={embaralhar} aria-label="Embaralhar"><Icone nome="refresh" /></button>
      <button class="botao" type="button" onclick={dica}><Icone nome="bulb" /><span>Dica</span></button>
      <button class="botao botao-primario" type="button" disabled={palavra.length < 3} onclick={enviar}><span>Enviar</span></button>
    </div>
  {/if}
</Casca>
