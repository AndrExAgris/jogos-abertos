<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { jogarGo, novoGo, passarGo, pontuacaoGo, type EstadoGo } from '@ja/nucleo-tabuleiro/go';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  const s = new Sessao<{ lado: number }, EstadoGo>('go', { semRelogio: true, semEstatisticas: true });
  const OPCOES = [9, 13, 19].map((n) => ({ id: String(n), titulo: `${n} × ${n}`, descricao: n === 9 ? 'Partidas curtas, bom para começar' : n === 13 ? 'Médio' : 'O tabuleiro completo' }));
  const COMO = [
    'As pretas começam. Na vez, ponha uma pedra num cruzamento livre. Pedras sem nenhuma liberdade (cruzamento vazio ao lado) saem do tabuleiro.',
    'Não vale jogar onde sua pedra ficaria sem liberdade (a não ser que capture), nem repetir a posição de um lance atrás (ko).',
    'Dois passes seguidos encerram a partida. A contagem é por área: pedras + território cercado; as brancas ganham 6,5 de komi. Capture as pedras mortas antes de passar.',
  ];
  const pontos = $derived(s.estado ? pontuacaoGo(s.estado) : null);
  const textoFim = $derived(pontos ? `${pontos.pretas > pontos.brancas ? 'Pretas' : 'Brancas'} venceram: ${pontos.pretas} a ${pontos.brancas}.` : '');

  function tocar(i: number) {
    if (!s.estado || s.terminou) return;
    const n = jogarGo(s.estado, i);
    if (!n) { vibrar(60); return; }
    s.mudar(n);
  }
  function passar() {
    if (!s.estado || s.terminou) return;
    const n = passarGo(s.estado);
    s.mudar(n);
    if (n.fim) void s.terminar('vitoria');
    else window.OpenDesign.toast({ texto: `${n.vez === 1 ? 'Brancas' : 'Pretas'} passaram.` });
  }
  const estrelas = (lado: number) => {
    const p = lado === 9 ? [2, 6] : lado === 13 ? [3, 6, 9] : [3, 9, 15];
    return p.flatMap((a) => p.map((b) => [a, b])).filter(([a, b]) => lado !== 9 || (a !== 4 && b !== 4) || true);
  };
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Go" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, `${id} × ${id}`, () => ({ quebra: { lado: Number(id) }, estado: novoGo(Number(id)) }))} tituloFim={textoFim} textoFim="" semRelogio tituloEscolha="Escolha o tamanho">
  {#snippet rodape()}
    <button class="botao" type="button" disabled={!!s.terminou} onclick={passar}><span>Passar</span></button>
  {/snippet}
  {#if s.estado && pontos}
    {@const L = s.estado.lado}
    <Jogadores nomes={['Pretas', 'Brancas']} vez={s.terminou ? -1 : s.estado.vez - 1} pontos={[`${s.estado.capturas[0]} capt.`, `${s.estado.capturas[1]} capt.`]} />
    <div class="ja-centro">
      <svg class="ja-tab ja-go" viewBox="-1 -1 {L + 1} {L + 1}" role="group" aria-label="Tabuleiro de Go {L} por {L}">
        <rect x="-1" y="-1" width={L + 1} height={L + 1} class="ja-go-fundo" />
        {#each Array(L) as _, k (k)}
          <line x1="0" y1={k} x2={L - 1} y2={k} /><line x1={k} y1="0" x2={k} y2={L - 1} />
        {/each}
        {#each estrelas(L) as [a, b] (`${a}-${b}`)}<circle cx={a} cy={b} r="0.1" class="ja-go-estrela" />{/each}
        {#each s.estado.casas as c, i (i)}
          {@const x = i % L}
          {@const y = Math.floor(i / L)}
          <g role="button" tabindex="-1" aria-label="Cruzamento {x + 1}, {y + 1}{c ? (c === 1 ? ', pedra preta' : ', pedra branca') : ''}" onclick={() => tocar(i)} onkeydown={(e) => e.key === 'Enter' && tocar(i)}>
            <rect x={x - 0.5} y={y - 0.5} width="1" height="1" class="ja-toque" />
            {#if c}<circle cx={x} cy={y} r="0.46" class="ja-pedra" data-cor={c} />
            {:else if s.terminou && pontos.territorio[i]}<rect x={x - 0.15} y={y - 0.15} width="0.3" height="0.3" class="ja-pedra" data-cor={pontos.territorio[i]} />{/if}
          </g>
        {/each}
      </svg>
    </div>
  {/if}
</Casca>
