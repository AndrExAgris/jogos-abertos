<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { resolvido, somas, type MarcaSumplete, type QuebraSumplete } from '@ja/nucleo-grade/sumplete';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';

  interface Estado { marcas: MarcaSumplete[] }
  const s = new Sessao<QuebraSumplete, Estado>('sumplete');
  const TAMANHOS = [3, 4, 5, 6, 7, 8, 9].map((n) => ({
    id: String(n), titulo: `${n} × ${n}`, descricao: n <= 4 ? 'Para aquecer' : n <= 6 ? 'Médio' : n <= 7 ? 'Difícil' : 'Muito difícil',
  }));
  const COMO = [
    'Cada linha e cada coluna tem uma soma-alvo, fora da grade. Apague números até que a soma dos que sobram bata com o alvo de todas as linhas e colunas.',
    'Exemplo: se a linha tem 1, 2 e 3 e o alvo é 4, apague o 2 e mantenha o 1 e o 3.',
    'Toque num número para apagá-lo; toque de novo para marcar que ele fica (com um círculo); mais uma vez para limpar. O alvo fica verde quando a soma bate.',
    'Toda grade tem uma única solução.',
  ];

  const soma = $derived(s.quebra && s.estado ? somas(s.quebra, s.estado.marcas) : null);

  function escolher(id: string) {
    const n = Number(id);
    void s.comecar(id, `${n} × ${n}`, async () => {
      const q = await gerarNoFundo<QuebraSumplete>('sumplete', [n, sementeNova()]);
      return { quebra: q, estado: { marcas: new Array(n * n).fill(0) } };
    });
  }

  function tocar(i: number) {
    if (!s.quebra || !s.estado || s.terminou) return;
    const marcas = [...s.estado.marcas];
    marcas[i] = ((marcas[i] + 1) % 3) as MarcaSumplete;
    s.mudar({ marcas });
    if (resolvido(s.quebra, marcas)) void s.terminar('vitoria');
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Sumplete" comoJogar={COMO} opcoes={TAMANHOS} aoEscolher={escolher} tituloEscolha="Escolha o tamanho">
  {#if s.quebra && s.estado && soma}
    {@const q = s.quebra}
    <div class="ja-centro">
      <div class="ja-sumplete" style="--ja-colunas:{q.n + 1}">
        {#each { length: q.n } as _, y (y)}
          {#each { length: q.n } as _, x (x)}
            {@const i = y * q.n + x}
            {@const m = s.estado.marcas[i]}
            <button
              type="button"
              class="ja-sumplete-casa"
              data-marca={m || undefined}
              aria-label="Linha {y + 1}, coluna {x + 1}: {q.numeros[i]}{m === 1 ? ', apagado' : m === 2 ? ', fica' : ''}"
              onclick={() => tocar(i)}
            >{q.numeros[i]}</button>
          {/each}
          <span class="ja-sumplete-alvo" data-ok={soma.linhas[y] === q.alvoLinhas[y] || undefined} data-faltou={soma.linhas[y] < q.alvoLinhas[y] || undefined} aria-label="Alvo da linha {y + 1}: {q.alvoLinhas[y]}, agora {soma.linhas[y]}">{q.alvoLinhas[y]}</span>
        {/each}
        {#each { length: q.n } as _, x (x)}
          <span class="ja-sumplete-alvo" data-ok={soma.colunas[x] === q.alvoColunas[x] || undefined} data-faltou={soma.colunas[x] < q.alvoColunas[x] || undefined} aria-label="Alvo da coluna {x + 1}: {q.alvoColunas[x]}, agora {soma.colunas[x]}">{q.alvoColunas[x]}</span>
        {/each}
        <span class="ja-sumplete-canto" aria-hidden="true"><Icone nome="sum" pequeno /></span>
      </div>
    </div>
  {/if}
</Casca>
