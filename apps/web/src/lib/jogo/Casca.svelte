<script lang="ts" generics="Q, E">
  import type { Snippet } from 'svelte';
  import { Icone } from '@ja/ui';
  import TelaJogo from './TelaJogo.svelte';
  import Escolha from './Escolha.svelte';
  import type { Opcao } from './tipos.ts';
  import Fim from './Fim.svelte';
  import type { Sessao } from './sessao.svelte.ts';
  import { formatarTempo } from '../estatisticas.ts';

  interface Props {
    sessao: Sessao<Q, E>;
    titulo: string;
    comoJogar: string[];
    opcoes: Opcao[];
    aoEscolher: (id: string) => void;
    tituloEscolha?: string;
    antesDaEscolha?: Snippet;
    /** Texto do fim de jogo; o padrão mostra o tempo. */
    textoFim?: string;
    tituloFim?: string;
    semDesfazer?: boolean;
    semRelogio?: boolean;
    /** Conteúdo extra na faixa (à esquerda do relógio). */
    faixa?: Snippet;
    children: Snippet;
  }
  let {
    sessao, titulo, comoJogar, opcoes, aoEscolher, tituloEscolha, antesDaEscolha, textoFim, tituloFim,
    semDesfazer = false, semRelogio = false, faixa, children,
  }: Props = $props();
</script>

<TelaJogo {titulo} {comoJogar} aoNova={sessao.fase === 'jogo' ? () => sessao.nova() : undefined}>
  {#if sessao.fase === 'escolha'}
    <Escolha titulo={tituloEscolha} {opcoes} {aoEscolher}>
      {#snippet antes()}
        {@render antesDaEscolha?.()}
        {#if sessao.erro}
          <div class="aviso" data-tipo="erro" role="alert"><Icone nome="alert-triangle" /><div><p class="aviso-titulo">Não deu para começar</p><p>{sessao.erro}</p></div></div>
        {/if}
      {/snippet}
    </Escolha>
  {:else if sessao.fase === 'gerando'}
    <p class="ja-dica" aria-busy="true">Montando a partida…</p>
  {:else if sessao.fase === 'jogo'}
    <div class="ja-faixa">
      <span class="etiqueta" data-cor="secundaria">{sessao.nomeVariante}</span>
      {@render faixa?.()}
      {#if !semRelogio}
        <span class="ja-placar-item"><Icone nome="clock" /><span class="sr-only">Tempo:</span><span class="ja-numero">{formatarTempo(sessao.relogio.ms)}</span></span>
      {/if}
      {#if !semDesfazer}
        <button class="botao botao-icone" type="button" aria-label="Desfazer" title="Desfazer" disabled={!sessao.podeDesfazer || !!sessao.terminou} onclick={() => sessao.desfazer()}><Icone nome="arrow-back-up" /></button>
      {/if}
    </div>
    {#if sessao.terminou}
      <Fim
        tipo={sessao.terminou}
        titulo={tituloFim ?? (sessao.terminou === 'vitoria' ? (sessao.recorde ? 'Novo recorde!' : 'Resolvido!') : 'Não foi dessa vez')}
        texto={textoFim ?? (semRelogio ? undefined : `Tempo: ${formatarTempo(sessao.relogio.ms)}.`)}
        aoNova={() => sessao.nova()}
      />
    {/if}
    {@render children()}
  {/if}
</TelaJogo>
