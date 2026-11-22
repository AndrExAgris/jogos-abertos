<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { NAIPES } from '@ja/nucleo-cartas/baralho';
  import {
    comprar, destinoAutomatico, mover, novaPaciencia, podeTerminarSozinho, terminarSozinho, venceu,
    type EstadoPaciencia, type Local,
  } from '@ja/nucleo-cartas/paciencia';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import Carta from './Carta.svelte';
  import { alturaColuna, deslocamentos } from './pilha.ts';

  const s = new Sessao<{ virar: number }, EstadoPaciencia>('paciencia');
  const OPCOES = [
    { id: '1', titulo: 'Virando 1 carta', descricao: 'Mais fácil' },
    { id: '3', titulo: 'Virando 3 cartas', descricao: 'O clássico, mais difícil' },
  ];
  const COMO = [
    'Monte as quatro pilhas da direita, uma por naipe, do Ás ao Rei.',
    'Nas colunas, ponha cartas em ordem decrescente alternando vermelho e preto. Só o Rei vai para uma coluna vazia. Sequências abertas andam juntas.',
    'Toque numa carta para ela ir sozinha ao melhor lugar. Se não houver, ela fica selecionada: toque depois na coluna de destino. Toque no monte para virar cartas.',
  ];
  let sel = $state<Local | null>(null);

  function aplicar(n: EstadoPaciencia | null) {
    if (!n) return false;
    sel = null;
    s.mudar(n);
    if (venceu(n)) void s.terminar('vitoria');
    return true;
  }
  function tocar(de: Local) {
    if (!s.estado || s.terminou) return;
    if (sel && !(sel.tipo === de.tipo && (sel as { i?: number }).i === (de as { i?: number }).i)) {
      const para = de.tipo === 'coluna' ? { tipo: 'coluna' as const, i: de.i } : de.tipo === 'fundacao' ? { tipo: 'fundacao' as const, i: de.i } : null;
      if (para && aplicar(mover(s.estado, sel, para))) return;
    }
    if (aplicar(destinoAutomatico(s.estado, de))) return;
    vibrar(40);
    sel = de;
  }
  function tocarVazia(tipo: 'coluna' | 'fundacao', i: number) {
    if (!s.estado || !sel) return;
    if (!aplicar(mover(s.estado, sel, { tipo, i }))) { vibrar(40); sel = null; }
  }
  const selecionada = (de: Local) => !!sel && sel.tipo === de.tipo && JSON.stringify(sel) === JSON.stringify(de);
  const selNaColuna = (i: number, k: number) => sel?.tipo === 'coluna' && sel.i === i && k >= sel.k;

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Paciência" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { virar: Number(id) }, estado: novaPaciencia(sementeNova(), Number(id) as 1 | 3) }))} tituloEscolha="Como virar o monte?">
  {#if s.estado}
    {@const e = s.estado}
    <div class="ja-mesa" style="--cols:7">
      <div class="ja-mesa-linha">
        <Carta carta={e.estoque.length ? e.estoque[e.estoque.length - 1] : null} vazia="↻" rotulo={e.estoque.length ? `Monte, ${e.estoque.length} cartas` : 'Virar o descarte de volta'} aoTocar={() => !s.terminou && s.mudar(comprar(e))} />
        <div class="ja-descarte" style="--n:{Math.min(e.virar, e.descarte.length)}">
          {#each e.descarte.slice(-e.virar) as c, k (`${c.n}-${c.v}`)}
            {@const topo = k === Math.min(e.virar, e.descarte.length) - 1}
            <Carta carta={c} livre={topo} selecionada={topo && selecionada({ tipo: 'descarte' })} aoTocar={() => topo && tocar({ tipo: 'descarte' })} />
          {/each}
        </div>
        <span class="ja-espaco"></span>
        {#each e.fundacoes as f, i (i)}
          {#if f.length}
            <Carta carta={f[f.length - 1]} selecionada={selecionada({ tipo: 'fundacao', i })} aoTocar={() => (sel ? tocarVazia('fundacao', i) : tocar({ tipo: 'fundacao', i }))} />
          {:else}
            <Carta vazia={NAIPES[i]} rotulo="Fundação vazia" aoTocar={() => tocarVazia('fundacao', i)} />
          {/if}
        {/each}
      </div>
      <div class="ja-mesa-colunas">
        {#each e.colunas as col, i (i)}
          {@const d = deslocamentos(col)}
          <div class="ja-pilha-col" style="height:calc(var(--carta-a) * {alturaColuna(col)})">
            {#if !col.length}<Carta vazia="K" rotulo="Coluna vazia" aoTocar={() => tocarVazia('coluna', i)} />{/if}
            {#each col as c, k (`${c.n}-${c.v}-${k}`)}
              <div class="ja-na-pilha" style="top:calc(var(--carta-a) * {d[k]})">
                <Carta carta={c} selecionada={selNaColuna(i, k)} aoTocar={() => (c.aberta ? tocar({ tipo: 'coluna', i, k }) : sel && tocarVazia('coluna', i))} />
              </div>
            {/each}
          </div>
        {/each}
      </div>
      {#if podeTerminarSozinho(e) && !s.terminou}
        <div class="ja-centro"><button class="botao botao-primario" type="button" onclick={() => aplicar(terminarSozinho(e))}><span>Terminar sozinho</span></button></div>
      {/if}
    </div>
  {/if}
</Casca>
