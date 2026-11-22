<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { NAIPES } from '@ja/nucleo-cartas/baralho';
  import { destinoFC, moverFC, novoFreecell, venceuFC, type EstadoFreecell, type LocalFC } from '@ja/nucleo-cartas/freecell';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import Carta from './Carta.svelte';
  import { alturaColuna, deslocamentos } from './pilha.ts';

  const s = new Sessao<{ modo: string }, EstadoFreecell>('freecell');
  const COMO = [
    'Todas as cartas estão abertas. Monte as quatro fundações (à direita), uma por naipe, do Ás ao Rei.',
    'Nas colunas, desça alternando vermelho e preto. As quatro células da esquerda guardam uma carta cada. Sequências andam juntas quando há espaço livre suficiente.',
    'Toque numa carta para movê-la ao melhor lugar, ou selecione e toque no destino.',
  ];
  let sel = $state<LocalFC | null>(null);

  function aplicar(n: EstadoFreecell | null) {
    if (!n) return false;
    sel = null;
    s.mudar(n);
    if (venceuFC(n)) void s.terminar('vitoria');
    return true;
  }
  function tocar(de: LocalFC) {
    if (!s.estado || s.terminou) return;
    if (sel && JSON.stringify(sel) !== JSON.stringify(de)) {
      const para = de.tipo === 'coluna' ? { tipo: 'coluna' as const, i: de.i } : de;
      if (aplicar(moverFC(s.estado, sel, para))) return;
    }
    if (de.tipo !== 'fundacao' && aplicar(destinoFC(s.estado, de))) return;
    vibrar(40);
    sel = de;
  }
  function vazio(tipo: 'celula' | 'coluna' | 'fundacao', i: number) {
    if (!s.estado || !sel) return;
    if (!aplicar(moverFC(s.estado, sel, { tipo, i }))) { vibrar(40); sel = null; }
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="FreeCell" comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Nova mão', descricao: 'Quase toda mão tem solução' }]} aoEscolher={(id) => s.comecar(id, 'FreeCell', () => ({ quebra: { modo: id }, estado: novoFreecell(sementeNova()) }))}>
  {#if s.estado}
    {@const e = s.estado}
    <div class="ja-mesa" style="--cols:8">
      <div class="ja-mesa-linha">
        {#each e.celulas as c, i (i)}
          {#if c}<Carta carta={c} selecionada={sel?.tipo === 'celula' && sel.i === i} aoTocar={() => tocar({ tipo: 'celula', i })} />
          {:else}<Carta vazia="" rotulo="Célula livre" aoTocar={() => vazio('celula', i)} />{/if}
        {/each}
        {#each e.fundacoes as f, i (i)}
          {#if f.length}<Carta carta={f[f.length - 1]} aoTocar={() => vazio('fundacao', i)} />
          {:else}<Carta vazia={NAIPES[i]} rotulo="Fundação vazia" aoTocar={() => vazio('fundacao', i)} />{/if}
        {/each}
      </div>
      <div class="ja-mesa-colunas">
        {#each e.colunas as col, i (i)}
          {@const d = deslocamentos(col, 4.5)}
          <div class="ja-pilha-col" style="height:calc(var(--carta-a) * {alturaColuna(col, 4.5)})">
            {#if !col.length}<Carta vazia="" rotulo="Coluna vazia" aoTocar={() => vazio('coluna', i)} />{/if}
            {#each col as c, k (`${c.n}-${c.v}`)}
              <div class="ja-na-pilha" style="top:calc(var(--carta-a) * {d[k]})">
                <Carta carta={c} selecionada={sel?.tipo === 'coluna' && sel.i === i && k >= sel.k} aoTocar={() => tocar({ tipo: 'coluna', i, k })} />
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
