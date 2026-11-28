<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { pistas, type QuebraNonograma } from '@ja/nucleo-grade/nonograma';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import { TEMPO_SEGURAR } from '../../lib/jogo/segurar.ts';

  /** 0 = vazia, 1 = pintada, 2 = marcada com X. */
  interface Estado { casas: number[] }
  const s = new Sessao<QuebraNonograma, Estado>('nonograma');
  const OPCOES = [
    { id: '5', titulo: '5 × 5', descricao: 'Para aprender' },
    { id: '10', titulo: '10 × 10', descricao: 'Médio' },
    { id: '15', titulo: '15 × 15', descricao: 'Difícil' },
  ];
  const COMO = [
    'Pinte as casas certas. Os números de cada linha e coluna são os tamanhos dos blocos pintados, na ordem, com pelo menos uma casa vazia entre eles.',
    'Exemplo: "3 1" numa linha quer dizer um bloco de três casas, uma ou mais vazias, e um bloco de uma.',
    'Toque para pintar. Com o modo X ligado, o toque marca as casas que com certeza ficam vazias. Arraste o dedo para pintar várias de uma vez. Segure numa casa vazia para marcar X sem trocar de modo (arrastando depois, segue marcando X).',
    'Todo nonograma daqui se resolve só com lógica, sem chute.',
  ];
  let modoX = $state(false);
  const q = $derived(s.quebra);

  function escolher(id: string) {
    const n = Number(id);
    void s.comecar(id, `${n} × ${n}`, async () => {
      const quebra = await gerarNoFundo<QuebraNonograma>('nonograma', [n, n, sementeNova()]);
      return { quebra, estado: { casas: new Array(n * n).fill(0) } };
    });
  }

  const linhaOk = (y: number) => !!q && !!s.estado && pistas(s.estado.casas.slice(y * q.largura, (y + 1) * q.largura).map((v) => v === 1)).join() === q.linhas[y].join();
  const colunaOk = (x: number) => !!q && !!s.estado && pistas(Array.from({ length: q.altura }, (_, y) => s.estado!.casas[y * q.largura + x] === 1)).join() === q.colunas[x].join();

  // --- Pintar com toque e arraste ---
  let arrasto: { valor: number; inicio: number; eixo: 'x' | 'y' | null; antes: number[] } | null = null;
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  const pararTempo = () => { if (temporizador) clearTimeout(temporizador); temporizador = null; };
  function aplicar(i: number) {
    if (!arrasto || !q || !s.estado) return;
    const casas = [...s.estado.casas];
    if (casas[i] === arrasto.valor) return;
    // Só mexe nas casas que estavam como a primeira do traço.
    if (arrasto.antes[i] !== arrasto.antes[arrasto.inicio]) return;
    casas[i] = arrasto.valor;
    s.mudar({ casas }, false);
  }
  function pressionar(e: PointerEvent, i: number) {
    if (!s.estado || !q || s.terminou) return;
    e.preventDefault();
    const atual = s.estado.casas[i];
    const alvo = modoX ? 2 : 1;
    s.mudar({ ...s.estado }, true); // guarda para desfazer o traço inteiro
    arrasto = { valor: atual === alvo ? 0 : alvo, inicio: i, eixo: null, antes: [...s.estado.casas] };
    aplicar(i);
    // Segurar numa casa vazia (sem arrastar) marca X e o traço segue marcando X.
    pararTempo();
    if (atual === 0 && !modoX) temporizador = setTimeout(() => {
      temporizador = null;
      if (!arrasto || arrasto.inicio !== i || arrasto.eixo || !s.estado) return;
      arrasto.valor = 2;
      const casas = [...s.estado.casas];
      casas[i] = 2;
      s.mudar({ casas }, false);
      vibrar(20);
    }, TEMPO_SEGURAR);
  }
  function mover(e: PointerEvent) {
    if (!arrasto || !q) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const k = el?.dataset?.casa;
    if (k === undefined) return;
    let i = Number(k);
    const x0 = arrasto.inicio % q.largura, y0 = Math.floor(arrasto.inicio / q.largura);
    const x = i % q.largura, y = Math.floor(i / q.largura);
    if (!arrasto.eixo && (x !== x0 || y !== y0)) { arrasto.eixo = x !== x0 ? 'x' : 'y'; pararTempo(); }
    // Trava o traço na linha ou na coluna em que começou.
    if (arrasto.eixo === 'x') i = y0 * q.largura + x;
    if (arrasto.eixo === 'y') i = y * q.largura + x0;
    aplicar(i);
  }
  function soltar() {
    pararTempo();
    if (!arrasto || !q || !s.estado) return;
    arrasto = null;
    // Vale qualquer pintura que bata com todas as pistas, não só a guardada.
    const ok = q.linhas.every((_, y) => linhaOk(y)) && q.colunas.every((_, x) => colunaOk(x));
    if (ok) void s.terminar('vitoria');
  }

  // Largura das pistas da esquerda e altura das de cima, em casas, pelo texto real.
  const larguraPistas = $derived(q ? Math.max(...q.linhas.map((l) => (l.length ? l : [0]).reduce((t, v) => t + String(v).length * 0.25, 0) + (Math.max(l.length, 1) - 1) * 0.16), 0.25) + 0.3 : 1);
  const alturaPistas = $derived(q ? Math.max(...q.colunas.map((c) => Math.max(c.length, 1))) * 0.44 + 0.25 : 1);
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<svelte:window onpointerup={soltar} onpointercancel={soltar} />

<Casca sessao={s} titulo="Nonograma" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#snippet rodape()}
    <button class="botao ja-botao-alternar" type="button" aria-pressed={modoX} onclick={() => (modoX = !modoX)}><Icone nome="x" /><span>{modoX ? 'Marcando X' : 'Modo X'}</span></button>
  {/snippet}
  {#if q && s.estado}
    <div class="ja-centro">
      <div class="ja-nonograma" style="--l:{q.largura};--pl:{larguraPistas};--pc:{alturaPistas}" onpointermove={mover} role="grid" aria-label="Nonograma" tabindex="-1">
        <div class="ja-nono-canto"></div>
        <div class="ja-nono-colunas">
          {#each q.colunas as c, x (x)}<div class="ja-nono-pista-col" data-ok={colunaOk(x) || undefined} data-quinta={x % 5 === 4 && x < q.largura - 1 || undefined}>{#each c.length ? c : [0] as v, k (k)}<span>{v}</span>{/each}</div>{/each}
        </div>
        <div class="ja-nono-linhas">
          {#each q.linhas as l, y (y)}<div class="ja-nono-pista-lin" data-ok={linhaOk(y) || undefined} data-quinta={y % 5 === 4 && y < q.altura - 1 || undefined}>{#each l.length ? l : [0] as v, k (k)}<span>{v}</span>{/each}</div>{/each}
        </div>
        <div class="ja-nono-grade">
          {#each s.estado.casas as v, i (i)}
            {@const x = i % q.largura}
            {@const y = Math.floor(i / q.largura)}
            <button type="button" class="ja-nono-casa" data-casa={i} data-v={v || undefined} data-bd={x % 5 === 4 && x < q.largura - 1 || undefined} data-bb={y % 5 === 4 && y < q.altura - 1 || undefined}
              aria-label="Linha {y + 1}, coluna {x + 1}{v === 1 ? ', pintada' : v === 2 ? ', vazia' : ''}" onpointerdown={(e) => pressionar(e, i)}>{#if v === 2}<Icone nome="x" />{/if}</button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</Casca>
