<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { analisarTendas, type QuebraTendas } from '@ja/nucleo-grade/tendas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';

  interface Estado { tendas: number[]; marcas: number[] }
  const s = new Sessao<QuebraTendas, Estado>('tendas');
  const TAMANHOS = [
    { id: '6', titulo: 'Pequeno', descricao: '6 × 6' },
    { id: '8', titulo: 'Médio', descricao: '8 × 8' },
    { id: '10', titulo: 'Grande', descricao: '10 × 10' },
  ];
  const COMO = [
    'Cada árvore tem uma tenda ao lado dela (em cima, embaixo ou dos lados), uma tenda por árvore.',
    'Tendas não se encostam, nem na diagonal. Os números da borda dizem quantas tendas há em cada linha e coluna.',
    'Toque numa casa para pôr uma tenda; de novo para marcar grama (sem tenda); mais uma vez para limpar.',
  ];

  const tendas = $derived(new Set(s.estado?.tendas ?? []));
  const marcas = $derived(new Set(s.estado?.marcas ?? []));
  const arvores = $derived(new Set(s.quebra?.arvores ?? []));
  const analise = $derived(s.quebra ? analisarTendas(s.quebra, tendas) : null);
  const porLinha = $derived.by(() => {
    if (!s.quebra) return [];
    const w = s.quebra.largura;
    const r = new Array(s.quebra.altura).fill(0);
    for (const t of tendas) r[Math.floor(t / w)]++;
    return r;
  });
  const porColuna = $derived.by(() => {
    if (!s.quebra) return [];
    const r = new Array(s.quebra.largura).fill(0);
    for (const t of tendas) r[t % s.quebra.largura]++;
    return r;
  });

  function escolher(id: string) {
    const n = Number(id);
    void s.comecar(id, TAMANHOS.find((t) => t.id === id)!.descricao, async () => {
      const q = await gerarNoFundo<QuebraTendas & { solucao: number[] }>('tendas', [n, n, sementeNova()]);
      return { quebra: { largura: q.largura, altura: q.altura, arvores: q.arvores, linhas: q.linhas, colunas: q.colunas }, estado: { tendas: [], marcas: [] } };
    });
  }

  function tocar(i: number) {
    if (!s.quebra || s.terminou || arvores.has(i)) return;
    const t = new Set(tendas), m = new Set(marcas);
    if (t.has(i)) { t.delete(i); m.add(i); }
    else if (m.has(i)) m.delete(i);
    else t.add(i);
    s.mudar({ tendas: [...t], marcas: [...m] });
    if (analisarTendas(s.quebra, t).resolvido) void s.terminar('vitoria');
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Tendas" comoJogar={COMO} opcoes={TAMANHOS} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#if s.quebra && analise}
    {@const w = s.quebra.largura}
    <div class="ja-centro">
      <div class="ja-grade ja-grade-bordas" style="--ja-colunas:{w + 1}">
        <span></span>
        {#each s.quebra.colunas as n, x (x)}
          <span class="ja-borda-numero" data-erro={analise.colunasErradas.has(x) || undefined} data-ok={porColuna[x] === n || undefined}>{n}</span>
        {/each}
        {#each Array(s.quebra.altura) as _, y (y)}
          <span class="ja-borda-numero" data-erro={analise.linhasErradas.has(y) || undefined} data-ok={porLinha[y] === s.quebra.linhas[y] || undefined}>{s.quebra.linhas[y]}</span>
          {#each Array(w) as __, x (x)}
            {@const i = y * w + x}
            {#if arvores.has(i)}
              <div class="ja-grade-casa ja-arvore" role="img" aria-label="Árvore"><Icone nome="tree" /></div>
            {:else}
              <button type="button" class="ja-grade-casa" data-grama={marcas.has(i) || undefined} aria-label={tendas.has(i) ? 'Tenda' : marcas.has(i) ? 'Grama' : 'Vazia'} onclick={() => tocar(i)}>
                {#if tendas.has(i)}
                  <span class="ja-icone-primaria" class:ja-erro-icone={analise.coladas.has(i)}><Icone nome="tent" /></span>
                {:else if marcas.has(i)}
                  <span class="ja-marca-ponto" aria-hidden="true"></span>
                {/if}
              </button>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
  {/if}
</Casca>
