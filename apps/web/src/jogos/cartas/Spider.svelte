<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { destinoSpider, distribuir, moverSpider, movel, novoSpider, podeDistribuir, venceuSpider, type EstadoSpider } from '@ja/nucleo-cartas/spider';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import Carta from './Carta.svelte';
  import { alturaColuna, deslocamentos } from './pilha.ts';

  const s = new Sessao<{ naipes: number }, EstadoSpider>('spider');
  const OPCOES = [
    { id: '1', titulo: 'Um naipe', descricao: 'Para começar' },
    { id: '2', titulo: 'Dois naipes', descricao: 'Médio' },
    { id: '4', titulo: 'Quatro naipes', descricao: 'Difícil' },
  ];
  const COMO = [
    'Monte sequências do Rei ao Ás do mesmo naipe: cada sequência completa sai da mesa. Tire as oito para vencer.',
    'Qualquer carta vai sobre outra um valor acima, mas só sequências do mesmo naipe andam juntas. Qualquer carta vai para coluna vazia.',
    'Toque numa carta para movê-la ao melhor lugar, ou selecione e toque na coluna. O monte dá uma carta para cada coluna (nenhuma pode estar vazia).',
  ];
  let sel = $state<{ i: number; k: number } | null>(null);

  function aplicar(n: EstadoSpider | null) {
    if (!n) return false;
    sel = null;
    s.mudar(n);
    if (venceuSpider(n)) void s.terminar('vitoria');
    return true;
  }
  function tocar(i: number, k: number) {
    if (!s.estado || s.terminou) return;
    if (sel && sel.i !== i && aplicar(moverSpider(s.estado, sel.i, sel.k, i))) return;
    if (!movel(s.estado.colunas[i], k)) { if (sel) { vibrar(40); sel = null; } return; }
    if (aplicar(destinoSpider(s.estado, i, k))) return;
    vibrar(40);
    sel = { i, k };
  }
  function dar() {
    if (!s.estado || s.terminou) return;
    if (!podeDistribuir(s.estado)) { window.OpenDesign.toast({ texto: s.estado.estoque.length ? 'Preencha as colunas vazias antes de distribuir.' : 'O monte acabou.' }); return; }
    aplicar(distribuir(s.estado));
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Spider" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { naipes: Number(id) }, estado: novoSpider(sementeNova(), Number(id) as 1 | 2 | 4) }))} tituloEscolha="Com quantos naipes?">
  {#if s.estado}
    {@const e = s.estado}
    <div class="ja-mesa" style="--cols:10">
      <div class="ja-mesa-linha">
        <Carta carta={e.estoque.length ? e.estoque[0] : null} vazia="" rotulo="Monte, {e.estoque.length / 10} distribuições" aoTocar={dar} />
        <span class="ja-contador">{e.estoque.length / 10} no monte</span>
        <span class="ja-espaco"></span>
        <span class="ja-contador">{e.completas} de 8 completas</span>
      </div>
      <div class="ja-mesa-colunas">
        {#each e.colunas as col, i (i)}
          {@const d = deslocamentos(col, 5)}
          <div class="ja-pilha-col" style="height:calc(var(--carta-a) * {alturaColuna(col, 5)})">
            {#if !col.length}<Carta vazia="" rotulo="Coluna vazia" aoTocar={() => sel && tocar(i, 0)} />{/if}
            {#each col as c, k (`${c.n}-${c.v}-${k}`)}
              <div class="ja-na-pilha" style="top:calc(var(--carta-a) * {d[k]})">
                <Carta carta={c} selecionada={!!sel && sel.i === i && k >= sel.k} aoTocar={() => tocar(i, k)} />
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
