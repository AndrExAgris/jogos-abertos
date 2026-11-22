<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { SEM_PISTA, analisarMosaico, type QuebraMosaico } from '@ja/nucleo-grade/mosaico';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';

  interface Estado { pintadas: number[]; brancas: number[] }
  const s = new Sessao<QuebraMosaico, Estado>('mosaico');
  const TAMANHOS = [
    { id: '6', titulo: 'Pequeno', descricao: '6 × 6' },
    { id: '8', titulo: 'Médio', descricao: '8 × 8' },
    { id: '10', titulo: 'Grande', descricao: '10 × 10' },
  ];
  const COMO = [
    'Cada número diz quantas casas estão pintadas no quadrado 3 × 3 em volta dele, contando a própria casa.',
    'Pinte as casas certas para que todos os números batam.',
    'Toque numa casa para pintar; de novo para marcar como branca; mais uma vez para limpar.',
  ];

  const pintadas = $derived(new Set(s.estado?.pintadas ?? []));
  const brancas = $derived(new Set(s.estado?.brancas ?? []));
  const analise = $derived(s.quebra ? analisarMosaico(s.quebra, pintadas) : null);

  function escolher(id: string) {
    const n = Number(id);
    void s.comecar(id, TAMANHOS.find((t) => t.id === id)!.descricao, async () => {
      const q = await gerarNoFundo<QuebraMosaico>('mosaico', [n, n, sementeNova()]);
      return { quebra: { largura: q.largura, altura: q.altura, pistas: q.pistas }, estado: { pintadas: [], brancas: [] } };
    });
  }

  function tocar(i: number) {
    if (!s.quebra || s.terminou) return;
    const p = new Set(pintadas), b = new Set(brancas);
    if (p.has(i)) { p.delete(i); b.add(i); }
    else if (b.has(i)) b.delete(i);
    else p.add(i);
    s.mudar({ pintadas: [...p], brancas: [...b] });
    if (analisarMosaico(s.quebra, p).resolvido) void s.terminar('vitoria');
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Mosaico" comoJogar={COMO} opcoes={TAMANHOS} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#if s.quebra && analise}
    <div class="ja-centro">
      <div class="ja-grade" style="--ja-colunas:{s.quebra.largura}">
        {#each s.quebra.pistas as p, i (i)}
          <button
            type="button"
            class="ja-grade-casa ja-mosaico-casa"
            data-pintada={pintadas.has(i) || undefined}
            data-certa={analise.certas.has(i) || undefined}
            data-erro={analise.erradas.has(i) || undefined}
            aria-label="{p === SEM_PISTA ? 'Sem número' : `Número ${p}`}, {pintadas.has(i) ? 'pintada' : brancas.has(i) ? 'branca' : 'vazia'}"
            onclick={() => tocar(i)}
          >
            {#if p !== SEM_PISTA}{p}{:else if brancas.has(i)}<span class="ja-marca-x"><Icone nome="x" pequeno /></span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
