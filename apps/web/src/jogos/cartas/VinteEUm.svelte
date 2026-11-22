<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { apostar, dobrar, novoVinte, parar, pedir, pontos, type EstadoVinte } from '@ja/nucleo-cartas/vinte-e-um';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import Carta from './Carta.svelte';

  const s = new Sessao<{ semente: string }, EstadoVinte>('vinte-e-um', { semRelogio: true, pontuacao: (e) => e.fichas });
  const COMO = [
    'Chegue mais perto de 21 que a banca, sem passar. Figuras valem 10; o Ás vale 1 ou 11, o que for melhor.',
    'Aposte, depois peça cartas ou pare. Dobrar dobra a aposta e compra só mais uma carta. A banca compra até ter 17 ou mais.',
    'Vinte e um com as duas primeiras cartas paga 3 para 2. Você começa com 100 fichas; a partida acaba quando quiser sair ou se as fichas acabarem.',
  ];
  const RESULTADO: Record<string, string> = { vitoria: 'Você ganhou a mão!', derrota: 'A banca ganhou a mão.', empate: 'Empate: a aposta volta.', blackjack: 'Vinte e um! Paga 3 para 2.' };

  function jogar(n: EstadoVinte) {
    s.mudar(n, false);
    if (n.fase === 'fim' && n.fichas <= 0) void s.terminar('derrota');
  }
  const sair = () => s.estado && void s.terminar(s.estado.fichas >= 100 ? 'vitoria' : 'derrota');

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Vinte e Um" comoJogar={COMO} opcoes={[{ id: 'n', titulo: 'Sentar à mesa', descricao: 'Começa com 100 fichas' }]} aoEscolher={(id) => { const semente = sementeNova(); return s.comecar(id, 'Contra a banca', () => ({ quebra: { semente }, estado: novoVinte(semente) })); }} semRelogio semDesfazer tituloFim={s.estado && s.estado.fichas <= 0 ? 'As fichas acabaram' : 'Você saiu da mesa'} textoFim={s.estado ? `Terminou com ${s.estado.fichas} fichas.` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.fichas}</span> fichas</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    {@const e = s.estado}
    <div class="ja-mesa" style="--cols:5">
      <div class="ja-vinte-mao">
        <span class="ui-medio">Banca {e.fase === 'fim' ? `· ${pontos(e.banca)}` : ''}</span>
        <div class="ja-mesa-linha">{#each e.banca as c, k (k)}<Carta carta={c} />{/each}</div>
      </div>
      <div class="ja-vinte-mao">
        <span class="ui-medio">Você {e.jogador.length ? `· ${pontos(e.jogador)}` : ''} {e.aposta && e.fase !== 'apostando' ? `· aposta ${e.aposta}` : ''}</span>
        <div class="ja-mesa-linha">{#each e.jogador as c, k (k)}<Carta carta={c} />{/each}</div>
      </div>
      {#if e.fase === 'fim'}<p class="ja-dica">{RESULTADO[e.resultado]}</p>{/if}
      {#if !s.terminou}
        {#if e.fase === 'jogando'}
          <div class="ja-botoes">
            <button class="botao botao-primario" type="button" onclick={() => jogar(pedir(e))}><Icone nome="plus" /><span>Pedir</span></button>
            <button class="botao" type="button" onclick={() => jogar(parar(e))}><Icone nome="hand-stop" /><span>Parar</span></button>
            <button class="botao" type="button" disabled={e.jogador.length !== 2 || e.fichas < e.aposta} onclick={() => jogar(dobrar(e))}><span>Dobrar</span></button>
          </div>
        {:else}
          <p class="ja-dica">Quanto apostar?</p>
          <div class="ja-botoes">
            {#each [5, 10, 25, 50] as v (v)}
              <button class="botao" type="button" disabled={v > e.fichas} onclick={() => jogar(apostar(e, v, s.quebra!.semente))}><span>{v}</span></button>
            {/each}
            <button class="botao" type="button" disabled={e.fichas <= 0} onclick={() => jogar(apostar(e, e.fichas, s.quebra!.semente))}><span>Tudo</span></button>
          </div>
          {#if e.rodada > 0}<div class="ja-centro"><button class="botao botao-terciario" type="button" onclick={sair}><span>Sair da mesa</span></button></div>{/if}
        {/if}
      {/if}
    </div>
  {/if}
</Casca>
