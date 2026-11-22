<script lang="ts" generics="Q, E">
  import type { Snippet } from 'svelte';
  import { Icone } from '@ja/ui';
  import TelaJogo from './TelaJogo.svelte';
  import Escolha from './Escolha.svelte';
  import Faixa from './Faixa.svelte';
  import Retomar from './Retomar.svelte';
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
    /** Informação à esquerda da faixa (o padrão é o nome da variante). */
    faixa?: Snippet;
    /** Centro da faixa, para jogos sem relógio (placar, vez etc.). */
    centro?: Snippet;
    /** Botões e opções abaixo do tabuleiro, ao lado do desfazer. */
    rodape?: Snippet;
    children: Snippet;
  }
  let {
    sessao, titulo, comoJogar, opcoes, aoEscolher, tituloEscolha, antesDaEscolha, textoFim, tituloFim,
    semDesfazer = false, semRelogio = false, faixa, centro, rodape, children,
  }: Props = $props();
  let ajuda = $state(false);
</script>

<TelaJogo {titulo} {comoJogar} bind:ajudaAberta={ajuda} aoNova={sessao.fase === 'jogo' ? () => sessao.nova() : undefined}>
  {#if sessao.fase === 'retomar' && sessao.pendente}
    <Retomar descricao={sessao.pendente.nomeVariante} tempo={semRelogio ? undefined : sessao.pendente.tempo} aoContinuar={() => sessao.continuar()} aoNova={() => sessao.nova()} />
  {:else if sessao.fase === 'escolha'}
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
    <Faixa tempo={semRelogio ? undefined : sessao.relogio.ms} aoAjuda={() => (ajuda = true)} {centro}>
      {#snippet esquerda()}
        {#if faixa}{@render faixa()}{:else}<span class="ja-faixa-texto">{sessao.nomeVariante}</span>{/if}
      {/snippet}
    </Faixa>
    {#if sessao.terminou}
      <Fim
        tipo={sessao.terminou}
        titulo={tituloFim ?? (sessao.terminou === 'vitoria' ? (sessao.recorde ? 'Novo recorde!' : 'Resolvido!') : 'Não foi dessa vez')}
        texto={textoFim ?? (semRelogio ? undefined : `Tempo: ${formatarTempo(sessao.relogio.ms)}.`)}
        aoNova={() => sessao.nova()}
      />
    {/if}
    {@render children()}
    {#if !semDesfazer || rodape}
      <div class="ja-rodape-jogo">
        {#if !semDesfazer}
          <button class="botao" type="button" disabled={!sessao.podeDesfazer || !!sessao.terminou} onclick={() => sessao.desfazer()}><Icone nome="arrow-back-up" /><span>Desfazer</span></button>
        {/if}
        {@render rodape?.()}
      </div>
    {/if}
  {/if}
</TelaJogo>
