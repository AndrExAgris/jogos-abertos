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
    'Toque numa casa para marcar um X; toque de novo para pôr a coroa; mais uma vez para limpar.',
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
    if (m.has(i)) { m.delete(i); c.add(i); }
    else if (c.has(i)) c.delete(i);
    else m.add(i);
    s.mudar({ coroas: [...c], marcas: [...m] });
    if (analisarRainhas(s.quebra, c).resolvido) void s.terminar('vitoria');
  }

  // Bordas grossas entre regiões diferentes.
  function bordas(q: QuebraRainhas, i: number) {
    const n = q.n, x = i % n, y = Math.floor(i / n), r = q.regioes[i];
    return {
      t: y === 0 || q.regioes[i - n] !== r,
      b: y === n - 1 || q.regioes[i + n] !== r,
      l: x === 0 || q.regioes[i - 1] !== r,
      rr: x === n - 1 || q.regioes[i + 1] !== r,
    };
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Rainhas" comoJogar={COMO} opcoes={TAMANHOS} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#if s.quebra && analise}
    {@const q = s.quebra}
    <div class="ja-centro">
      <div class="ja-grade ja-rainhas" style="--ja-colunas:{q.n}">
        {#each q.regioes as r, i (i)}
          {@const b = bordas(q, i)}
          <button
            type="button"
            class="ja-grade-casa"
            data-regiao={r}
            data-bt={b.t || undefined}
            data-bb={b.b || undefined}
            data-bl={b.l || undefined}
            data-br={b.rr || undefined}
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
      </div>
    </div>
  {/if}
</Casca>
