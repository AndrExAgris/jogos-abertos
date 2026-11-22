<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { sementeNova } from '@ja/contrato';
  import { PASSADAS, comprarPiramide, linhaColuna, livre, novaPiramide, tirar, venceuPiramide, type EstadoPiramide } from '@ja/nucleo-cartas/piramide';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';
  import Carta from './Carta.svelte';

  const s = new Sessao<{ modo: string }, EstadoPiramide>('piramide');
  const COMO = [
    'Tire da pirâmide pares de cartas que somem 13: Ás vale 1, Valete 11, Dama 12. O Rei sai sozinho.',
    'Só valem cartas livres (sem nenhuma carta por cima) e a carta de cima do descarte. O monte passa três vezes.',
    'Toque numa carta e depois no par dela.',
  ];
  let sel = $state<number | null>(null);

  function aplicar(n: EstadoPiramide | null) {
    if (!n) return false;
    sel = null;
    s.mudar(n);
    if (venceuPiramide(n)) void s.terminar('vitoria');
    return true;
  }
  function tocar(i: number) {
    if (!s.estado || s.terminou) return;
    if (sel !== null && sel !== i) { if (aplicar(tirar(s.estado, sel, i))) return; vibrar(40); }
    if (aplicar(tirar(s.estado, i))) return;
    sel = sel === i ? null : i;
  }
  function monte() {
    if (!s.estado || s.terminou) return;
    if (!aplicar(comprarPiramide(s.estado))) {
      window.OpenDesign.toast({ texto: 'O monte já passou três vezes.' });
      void s.terminar('derrota');
    }
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Pirâmide" comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Nova mão', descricao: 'Pares que somam 13' }]} aoEscolher={(id) => s.comecar(id, 'Pirâmide', () => ({ quebra: { modo: id }, estado: novaPiramide(sementeNova()) }))} textoFim={s.estado ? `${s.estado.piramide.filter(Boolean).length} cartas ficaram na pirâmide.` : ''}>
  {#if s.estado}
    {@const e = s.estado}
    <div class="ja-mesa" style="--cols:7">
      <div class="ja-piramide" style="height:calc(var(--carta-a) * 3.4)">
        {#each e.piramide as c, i (i)}
          {#if c}
            {@const [l, col] = linhaColuna(i)}
            <div class="ja-na-pilha" style="top:calc(var(--carta-a) * {l * 0.4});left:calc((var(--carta-l) + 4px) * {col + (6 - l) / 2})">
              <Carta carta={c} livre={livre(e, i)} selecionada={sel === i} aoTocar={() => tocar(i)} />
            </div>
          {/if}
        {/each}
      </div>
      <div class="ja-mesa-linha">
        <Carta carta={e.estoque.length ? e.estoque[0] : null} vazia="↻" rotulo="Monte, {e.estoque.length} cartas (passada {e.passadas} de {PASSADAS})" aoTocar={monte} />
        {#if e.descarte.length}
          <Carta carta={e.descarte[e.descarte.length - 1]} selecionada={sel === -1} aoTocar={() => tocar(-1)} />
        {:else}<Carta vazia="" rotulo="Descarte vazio" />{/if}
        <span class="ja-contador">Passada {e.passadas} de {PASSADAS}</span>
      </div>
    </div>
  {/if}
</Casca>
