<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { LIVRE, PAREDE, analisar, type QuebraAkari } from '@ja/nucleo-grade/akari';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { segurar } from '../../lib/jogo/segurar.ts';

  interface Estado { lampadas: number[]; marcas: number[] }
  const s = new Sessao<QuebraAkari, Estado>('akari');
  const TAMANHOS = [
    { id: '7', titulo: 'Pequeno', descricao: '7 × 7' },
    { id: '10', titulo: 'Médio', descricao: '10 × 10' },
    { id: '14', titulo: 'Grande', descricao: '14 × 14' },
  ];
  const COMO = [
    'Ponha lâmpadas nas casas brancas até iluminar todas. Uma lâmpada ilumina a linha e a coluna até bater numa parede.',
    'Duas lâmpadas não podem se iluminar. Um número numa parede diz quantas lâmpadas encostam nela (em cima, embaixo e dos lados).',
    'Toque numa casa para pôr uma lâmpada; toque de novo para marcar que ali não tem lâmpada; mais uma vez para limpar. Segure numa casa vazia para marcar direto.',
  ];

  const lampadas = $derived(new Set(s.estado?.lampadas ?? []));
  const marcas = $derived(new Set(s.estado?.marcas ?? []));
  const analise = $derived(s.quebra ? analisar(s.quebra, lampadas) : null);

  function escolher(id: string) {
    const n = Number(id);
    void s.comecar(id, TAMANHOS.find((t) => t.id === id)!.descricao, async () => {
      const q = await gerarNoFundo<QuebraAkari>('akari', [n, n, sementeNova()]);
      return { quebra: { largura: q.largura, altura: q.altura, casas: q.casas }, estado: { lampadas: [], marcas: [] } };
    });
  }

  function tocar(i: number) {
    if (!s.quebra || !s.estado || s.terminou || s.quebra.casas[i] !== LIVRE) return;
    const l = new Set(lampadas), m = new Set(marcas);
    if (l.has(i)) { l.delete(i); m.add(i); }
    else if (m.has(i)) m.delete(i);
    else l.add(i);
    s.mudar({ lampadas: [...l], marcas: [...m] });
    if (analisar(s.quebra, l).resolvido) void s.terminar('vitoria');
  }

  /** Segurar numa casa marca direto que ali não tem lâmpada. */
  function descartar(i: number) {
    if (!s.quebra || !s.estado || s.terminou || lampadas.has(i) || marcas.has(i)) return;
    s.mudar({ lampadas: [...lampadas], marcas: [...marcas, i] });
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Akari" comoJogar={COMO} opcoes={TAMANHOS} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#if s.quebra && analise}
    <div class="ja-centro">
      <div class="ja-grade" style="--ja-colunas:{s.quebra.largura}">
        {#each s.quebra.casas as v, i (i)}
          {#if v === LIVRE}
            <button
              type="button"
              class="ja-grade-casa"
              data-acesa={analise.iluminadas.has(i) || undefined}
              aria-label={lampadas.has(i) ? 'Lâmpada' : marcas.has(i) ? 'Marcada sem lâmpada' : analise.iluminadas.has(i) ? 'Iluminada' : 'Apagada'}
              onclick={() => tocar(i)}
              use:segurar={() => descartar(i)}
            >
              {#if lampadas.has(i)}
                <span class:ja-erro-icone={analise.conflitos.has(i)} class="ja-icone-primaria"><Icone nome="bulb" /></span>
              {:else if marcas.has(i)}
                <span class="ja-marca-ponto" aria-hidden="true"></span>
              {/if}
            </button>
          {:else}
            <div class="ja-grade-casa ja-parede" data-erro={analise.paredesErradas.has(i) || undefined} role="img" aria-label={v === PAREDE ? 'Parede' : `Parede ${v}`}>
              {v === PAREDE ? '' : v}
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</Casca>
