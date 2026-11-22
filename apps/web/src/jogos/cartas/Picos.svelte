<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { comprarPicos, jogarPicos, livrePicos, novoPicos, posicaoTP, travouPicos, venceuPicos, type EstadoPicos, type Variante } from '@ja/nucleo-cartas/picos';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import Carta from './Carta.svelte';

  let props: { variante: Variante } = $props();
  // A variante é fixa para cada tela (TriPeaks.svelte e Golf.svelte).
  const variante = untrack(() => props.variante);
  const tp = variante === 'tripeaks';
  const s = new Sessao<{ variante: Variante }, EstadoPicos>(variante);
  const COMO = tp ? [
    'Tire todas as cartas dos três picos. Uma carta livre (sem cartas por cima) sai se for um valor acima ou abaixo da carta do descarte, de qualquer naipe; Ás e Rei se emendam.',
    'Sem jogada, toque no monte para virar outra carta. Sequências longas sem usar o monte valem mais.',
  ] : [
    'Tire todas as cartas das sete colunas. A carta de baixo de cada coluna sai se for um valor acima ou abaixo da carta do descarte, de qualquer naipe (Ás e Rei não se emendam).',
    'Sem jogada, toque no monte para virar outra carta.',
  ];

  function aplicar(n: EstadoPicos | null) {
    if (!n) return false;
    s.mudar(n);
    if (venceuPicos(n)) void s.terminar('vitoria');
    else if (travouPicos(n)) void s.terminar('derrota');
    return true;
  }
  const tocar = (i: number) => { if (s.estado && !s.terminou && !aplicar(jogarPicos(s.estado, i))) vibrar(40); };
  const monte = () => s.estado && !s.terminou && aplicar(comprarPicos(s.estado));
  const pontuacao = $derived(s.estado ? s.estado.mesa.filter((c) => !c).length : 0);

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo={tp ? 'TriPeaks' : 'Golf'} comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Nova mão', descricao: tp ? 'Três picos de cartas' : 'Sete colunas de cinco' }]} aoEscolher={(id) => s.comecar(id, tp ? 'TriPeaks' : 'Golf', () => ({ quebra: { variante }, estado: novoPicos(sementeNova(), variante) }))} textoFim={s.estado ? `Você tirou ${pontuacao} de ${s.estado.mesa.length} cartas; maior sequência: ${s.estado.melhorSequencia}.` : ''}>
  {#if s.estado}
    {@const e = s.estado}
    <div class="ja-mesa" style="--cols:{tp ? 10 : 7}">
      {#if tp}
        <div class="ja-piramide" style="height:calc(var(--carta-a) * 2.5)">
          {#each e.mesa as c, i (i)}
            {#if c}
              {@const [x, l] = posicaoTP(i)}
              <div class="ja-na-pilha" style="top:calc(var(--carta-a) * {l * 0.5});left:calc((var(--carta-l) + 4px) * {x / 2})">
                <Carta carta={c} livre={livrePicos(e, i)} aoTocar={() => tocar(i)} />
              </div>
            {/if}
          {/each}
        </div>
      {:else}
        <div class="ja-mesa-colunas">
          {#each Array(7) as _, col (col)}
            <div class="ja-pilha-col" style="height:calc(var(--carta-a) * 2.2)">
              {#each Array(5) as __, l (l)}
                {@const i = col * 5 + l}
                {#if e.mesa[i]}
                  <div class="ja-na-pilha" style="top:calc(var(--carta-a) * {l * 0.3})"><Carta carta={e.mesa[i]} livre={livrePicos(e, i)} aoTocar={() => tocar(i)} /></div>
                {/if}
              {/each}
            </div>
          {/each}
        </div>
      {/if}
      <div class="ja-mesa-linha">
        <Carta carta={e.estoque.length ? e.estoque[0] : null} vazia="" rotulo="Monte, {e.estoque.length} cartas" aoTocar={monte} />
        <Carta carta={e.descarte[e.descarte.length - 1]} />
        <span class="ja-contador">{e.estoque.length} no monte · sequência {e.sequencia}</span>
      </div>
    </div>
  {/if}
</Casca>
