<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { analisarRainhas, type QuebraRainhas } from '@ja/nucleo-grade/rainhas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';

  interface Estado { coroas: number[]; marcas: number[] }
  const s = new Sessao<QuebraRainhas, Estado>('rainhas');
  const TAMANHOS = [6, 7, 8, 9].map((n) => ({ id: String(n), titulo: `${n} × ${n}`, descricao: `${n} regiões` }));
  const COMO = [
    'Ponha uma coroa em cada linha, em cada coluna e em cada região (as áreas separadas pelas bordas grossas).',
    'Duas coroas nunca se encostam, nem na diagonal.',
    'Toque numa casa para pôr a coroa; toque de novo para trocar por um X (lugar sem coroa); mais uma vez para limpar.',
  ];

  const coroas = $derived(new Set(s.estado?.coroas ?? []));
  const marcas = $derived(new Set(s.estado?.marcas ?? []));
  const analise = $derived(s.quebra ? analisarRainhas(s.quebra, coroas) : null);

  function escolher(id: string) {
    const n = Number(id);
    void s.comecar(id, `${n} × ${n}`, async () => {
      const q = await gerarNoFundo<QuebraRainhas>('rainhas', [n, sementeNova()]);
      return { quebra: { n: q.n, regioes: q.regioes }, estado: { coroas: [], marcas: [] } };
    });
  }

  function tocar(i: number) {
    if (!s.quebra || s.terminou) return;
    const c = new Set(coroas), m = new Set(marcas);
    if (c.has(i)) { c.delete(i); m.add(i); }
    else if (m.has(i)) m.delete(i);
    else c.add(i);
    s.mudar({ coroas: [...c], marcas: [...m] });
    if (analisarRainhas(s.quebra, c).resolvido) void s.terminar('vitoria');
  }

  // Linhas simples entre regiões diferentes, desenhadas por cima da grade.
  const divisas = $derived.by(() => {
    const q = s.quebra;
    if (!q) return '';
    const n = q.n;
    let d = '';
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = Math.floor(i / n), r = q.regioes[i];
      if (x < n - 1 && q.regioes[i + 1] !== r) d += `M${x + 1} ${y}V${y + 1}`;
      if (y < n - 1 && q.regioes[i + n] !== r) d += `M${x} ${y + 1}H${x + 1}`;
    }
    return d;
  });

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Rainhas" comoJogar={COMO} opcoes={TAMANHOS} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#if s.quebra && analise}
    {@const q = s.quebra}
    <div class="ja-centro">
      <div class="ja-grade ja-rainhas" style="--ja-colunas:{q.n}">
        {#each q.regioes as r, i (i)}
          <button
            type="button"
            class="ja-grade-casa ja-cor-{r}"
            data-regiao={r}
            aria-label="Linha {Math.floor(i / q.n) + 1}, coluna {(i % q.n) + 1}, região {r + 1}{coroas.has(i) ? ', coroa' : marcas.has(i) ? ', marcada' : ''}"
            onclick={() => tocar(i)}
          >
            {#if coroas.has(i)}
              <span class="ja-icone-texto" class:ja-erro-icone={analise.conflitos.has(i)}><Icone nome="crown" /></span>
            {:else if marcas.has(i)}
              <span class="ja-marca-x"><Icone nome="x" pequeno /></span>
            {/if}
          </button>
        {/each}
        <svg class="ja-rainhas-divisas" viewBox="0 0 {q.n} {q.n}" preserveAspectRatio="none" aria-hidden="true"><path d={divisas} /></svg>
      </div>
    </div>
  {/if}
</Casca>
