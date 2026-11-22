<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { apagadas, gerarLuzes, tocarLuz } from '@ja/nucleo-grade/luzes';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { acesas: boolean[]; toques: number }
  const s = new Sessao<{ n: number; minimo: number }, Estado>('luzes', { pontuacao: (e) => -e.toques });
  const OPCOES = [3, 4, 5, 6, 7].map((n) => ({ id: String(n), titulo: `${n} × ${n}`, descricao: n === 3 ? 'Para aprender' : n <= 5 ? 'Clássico' : 'Desafio' }));
  const COMO = [
    'Apague todas as luzes. Tocar numa casa inverte ela e as quatro vizinhas (em cima, embaixo e dos lados): acesa vira apagada e vice-versa.',
    'Tocar duas vezes na mesma casa desfaz o toque, então a ordem não importa: só importa quais casas você toca.',
  ];
  function escolher(id: string) {
    const n = Number(id);
    void s.comecar(id, `${n} × ${n}`, () => {
      const q = gerarLuzes(n, sementeNova());
      return { quebra: { n, minimo: q.toques }, estado: { acesas: q.acesas, toques: 0 } };
    });
  }
  function tocar(i: number) {
    if (!s.estado || !s.quebra || s.terminou) return;
    vibrar(8);
    const acesas = tocarLuz(s.estado.acesas, s.quebra.n, i);
    s.mudar({ acesas, toques: s.estado.toques + 1 });
    if (apagadas(acesas)) void s.terminar('vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Apague as Luzes" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha o tamanho" textoFim={s.estado ? `${s.estado.toques} toques.` : undefined}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.acesas.filter(Boolean).length}</span> acesas</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    <div class="ja-centro">
      <div class="ja-luzes" style="--n:{s.quebra.n}">
        {#each s.estado.acesas as acesa, i (i)}
          <button type="button" class="ja-luz" data-acesa={acesa || undefined} aria-label="Casa {i + 1}, {acesa ? 'acesa' : 'apagada'}" onclick={() => tocar(i)}></button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
