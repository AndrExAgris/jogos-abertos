<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { CAPACIDADE, despejar, podeDespejar, resolvido, type Tubos } from '@ja/nucleo-estado/separe';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  const s = new Sessao<{ cores: number }, Tubos>('separe');
  const OPCOES = [
    { id: '4', titulo: 'Fácil', descricao: '4 cores, 2 tubos vazios' },
    { id: '6', titulo: 'Médio', descricao: '6 cores, 2 tubos vazios' },
    { id: '8', titulo: 'Difícil', descricao: '8 cores, 2 tubos vazios' },
    { id: '9', titulo: 'Desafio', descricao: '9 cores, 2 tubos vazios' },
  ];
  const COMO = [
    'Separe as cores: no fim, cada tubo tem uma cor só.',
    'Toque num tubo e depois em outro para despejar a camada de cima. Só dá para despejar num tubo vazio ou com a mesma cor em cima, e cada tubo leva quatro camadas.',
    'As camadas também têm um número, para quem distingue mal as cores.',
  ];

  let origem = $state(-1);

  function escolher(id: string) {
    const cores = Number(id);
    origem = -1;
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, async () => ({
      quebra: { cores },
      estado: await gerarNoFundo<Tubos>('separe', [cores, 2, sementeNova()]),
    }));
  }

  function tocar(i: number) {
    if (!s.estado || s.terminou) return;
    if (origem < 0) { if (s.estado[i].length) origem = i; return; }
    if (origem === i) { origem = -1; return; }
    if (!podeDespejar(s.estado, origem, i)) { vibrar(60); origem = s.estado[i].length ? i : -1; return; }
    const novo = despejar(s.estado, origem, i);
    origem = -1;
    s.mudar(novo);
    if (resolvido(novo)) void s.terminar('vitoria');
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Separe as Cores" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha a dificuldade">
  {#if s.estado}
    <div class="ja-tubos">
      {#each s.estado as tubo, i (i)}
        <button type="button" class="ja-tubo" data-selecionado={origem === i || undefined} aria-label="Tubo {i + 1}: {tubo.length ? tubo.map((c) => c + 1).join(', ') : 'vazio'}" onclick={() => tocar(i)}>
          {#each Array(CAPACIDADE) as _, k (k)}
            {@const c = tubo[CAPACIDADE - 1 - k]}
            {#if c !== undefined}
              <span class="ja-camada ja-cor-{c}" data-topo={k === CAPACIDADE - tubo.length || undefined}></span>
            {:else}
              <span class="ja-camada-vazia"></span>
            {/if}
          {/each}
        </button>
      {/each}
    </div>
  {/if}
</Casca>
