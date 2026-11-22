<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { resolvidoLigue, type QuebraLigue } from '@ja/nucleo-grade/ligue';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';

  interface Estado { caminhos: Record<number, number[]> }
  const s = new Sessao<QuebraLigue, Estado>('ligue');
  const TAMANHOS = [5, 6, 7, 8, 9].map((n) => ({ id: String(n), titulo: `${n} × ${n}` }));
  const COMO = [
    'Ligue cada par de números iguais com um caminho que anda de casa em casa, sem diagonal.',
    'Os caminhos não se cruzam e, no fim, ocupam a grade toda.',
    'Arraste o dedo a partir de um número. Voltar pelo caminho apaga o trecho; passar por cima de outro caminho corta o outro.',
  ];

  let desenhando = $state<number | null>(null);
  let rascunho = $state<Record<number, number[]>>({});
  let grade = $state<HTMLDivElement>();

  const caminhos = $derived(desenhando !== null ? rascunho : (s.estado?.caminhos ?? {}));
  const dono = $derived.by(() => {
    const d = new Map<number, number>();
    for (const [num, c] of Object.entries(caminhos)) for (const i of c) d.set(i, Number(num));
    return d;
  });

  function escolher(id: string) {
    const n = Number(id);
    void s.comecar(id, `${n} × ${n}`, async () => {
      const q = await gerarNoFundo<QuebraLigue>('ligue', [n, sementeNova()]);
      // Cores sorteadas da paleta ampla, uma por número.
      const cores = Array.from({ length: PALETA }, (_, k) => k).sort(() => Math.random() - 0.5);
      return { quebra: { n: q.n, pontas: q.pontas, cores }, estado: { caminhos: {} } };
    });
  }

  const PALETA = 15;
  function cor(num: number): number {
    const c = (s.quebra as (QuebraLigue & { cores?: number[] }) | null)?.cores;
    return c ? c[(num - 1) % c.length] : (num - 1) % PALETA;
  }

  function casaEm(x: number, y: number): number {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-casa]');
    return el ? Number(el.dataset.casa) : -1;
  }
  const vizinhas = (a: number, b: number) => {
    const n = s.quebra!.n;
    return Math.abs(a - b) === n || (Math.abs(a - b) === 1 && Math.floor(a / n) === Math.floor(b / n));
  };

  function inicio(e: PointerEvent) {
    if (!s.quebra || s.terminou) return;
    const i = casaEm(e.clientX, e.clientY);
    if (i < 0) return;
    const atual = $state.snapshot(s.estado!.caminhos) as Record<number, number[]>;
    const ponta = s.quebra.pontas[i];
    let num: number | undefined;
    if (ponta) {
      num = ponta;
      atual[num] = [i]; // recomeça desse número
    } else {
      // Continua um caminho existente a partir de qualquer casa dele.
      for (const [k, c] of Object.entries(atual)) {
        const pos = c.indexOf(i);
        if (pos >= 0) { num = Number(k); atual[num] = c.slice(0, pos + 1); break; }
      }
    }
    if (num === undefined) return;
    grade?.setPointerCapture(e.pointerId);
    rascunho = atual;
    desenhando = num;
  }

  function mover(e: PointerEvent) {
    if (desenhando === null || !s.quebra) return;
    const i = casaEm(e.clientX, e.clientY);
    if (i < 0) return;
    const num = desenhando;
    const c = rascunho[num];
    const ult = c[c.length - 1];
    if (i === ult) return;
    const pos = c.indexOf(i);
    if (pos >= 0) { rascunho = { ...rascunho, [num]: c.slice(0, pos + 1) }; return; }
    if (!vizinhas(ult, i)) return;
    // Caminho completo não cresce mais.
    if (c.length > 1 && s.quebra.pontas[ult] === num) return;
    const ponta = s.quebra.pontas[i];
    if (ponta && ponta !== num) return;
    const novo = { ...rascunho };
    // Corta o caminho de outro número que passa por aqui.
    for (const [k, outro] of Object.entries(novo)) {
      if (Number(k) === num) continue;
      const p = outro.indexOf(i);
      if (p >= 0) novo[Number(k)] = outro.slice(0, p);
    }
    novo[num] = [...c, i];
    rascunho = novo;
  }

  function fim() {
    if (desenhando === null || !s.quebra) return;
    const final = rascunho;
    desenhando = null;
    s.mudar({ caminhos: final });
    if (resolvidoLigue(s.quebra, final)) void s.terminar('vitoria');
  }

  // Segmentos entre casas vizinhas do mesmo caminho, para desenhar as linhas.
  function centro(i: number) {
    const n = s.quebra!.n;
    return { x: (i % n) + 0.5, y: Math.floor(i / n) + 0.5 };
  }
  function completo(num: number, c: number[]) {
    return c.length > 1 && s.quebra!.pontas[c[0]] === num && s.quebra!.pontas[c[c.length - 1]] === num && c[0] !== c[c.length - 1];
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Ligue os Números" comoJogar={COMO} opcoes={TAMANHOS} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#if s.quebra}
    {@const q = s.quebra}
    <div class="ja-centro">
      <div
        class="ja-grade ja-ligue"
        style="--ja-colunas:{q.n}"
        bind:this={grade}
        role="application"
        aria-label="Grade para ligar os números"
        onpointerdown={inicio}
        onpointermove={mover}
        onpointerup={fim}
        onpointercancel={fim}
      >
        {#each q.pontas as p, i (i)}
          <div class="ja-grade-casa ja-paleta-{dono.has(i) ? cor(dono.get(i)!) : 0}" data-casa={i} data-ocupada={dono.has(i) || undefined}>
            {#if p}<span class="ja-ligue-ponta ja-paleta-{cor(p)}" data-completa={(caminhos[p] && completo(p, caminhos[p])) || undefined}>{p}</span>{/if}
          </div>
        {/each}
        <svg class="ja-ligue-linhas" viewBox="0 0 {q.n} {q.n}" aria-hidden="true">
          {#each Object.entries(caminhos) as [num, c] (num)}
            {#if c.length > 1}
              <polyline
                class="ja-ligue-caminho ja-paleta-{cor(Number(num))}"
                data-completo={completo(Number(num), c) || undefined}
                points={c.map((i) => `${centro(i).x},${centro(i).y}`).join(' ')}
              />
            {/if}
          {/each}
        </svg>
      </div>
    </div>
  {/if}
</Casca>
