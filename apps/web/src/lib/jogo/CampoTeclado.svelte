<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icone } from '@ja/ui';
  import TecladoLetras from './TecladoLetras.svelte';

  /** Campo de busca com o teclado do app e sugestões em botões (o teclado do sistema nunca abre). */
  interface Sugestao { id: string | number; titulo: string; sub?: string }
  interface Props {
    texto: string;
    dica: string;
    rotulo: string;
    erro?: string;
    sugestoes: Sugestao[];
    aoEscolher: (id: string | number) => void;
    /** Enter: sem isto, escolhe a única sugestão. */
    aoEnviar?: () => void;
    desabilitado?: boolean;
    /** Botões extras ao lado do campo. */
    extra?: Snippet;
  }
  let { texto = $bindable(''), dica, rotulo, erro = $bindable(''), sugestoes, aoEscolher, aoEnviar, desabilitado = false, extra }: Props = $props();

  function tecla(t: string) {
    if (desabilitado) return;
    erro = '';
    if (t === 'apagar') texto = texto.slice(0, -1);
    else if (t === 'enviar') {
      if (aoEnviar) aoEnviar();
      else if (sugestoes.length === 1) aoEscolher(sugestoes[0].id);
      else if (sugestoes.length) erro = 'Escolha uma das sugestões.';
    } else if (t === ' ') { if (texto && !texto.endsWith(' ')) texto += ' '; }
    else texto += t;
  }
</script>

<div class="ja-campo-pais">
  {#if sugestoes.length && texto.trim()}
    <div class="ja-sugestoes-chips" role="listbox" aria-label="Sugestões">
      {#each sugestoes as p (p.id)}
        <button class="botao ja-sugestao" type="button" role="option" aria-selected="false" onclick={() => aoEscolher(p.id)}>
          <span>{p.titulo}</span>{#if p.sub}<small>{p.sub}</small>{/if}
        </button>
      {/each}
    </div>
  {:else if texto.trim().length >= 2}
    <p class="ja-dica">Nada encontrado com “{texto.trim()}”.</p>
  {/if}
  <div class="campo" data-estado={erro ? 'erro' : undefined}>
    <div class="ja-campo-linha">
      <div class="ja-campo-falso" role="textbox" aria-label={rotulo} aria-readonly="true" data-vazio={!texto || undefined}>
        {#if texto}<span class="ja-campo-falso-texto">{texto}</span>{:else}<span class="ja-campo-falso-dica">{dica}</span>{/if}<span class="ja-cursor" aria-hidden="true"></span>
        {#if texto}<button class="botao botao-terciario botao-icone ja-campo-limpar" type="button" aria-label="Limpar" onclick={() => { texto = ''; erro = ''; }}><Icone nome="x" /></button>{/if}
      </div>
      {@render extra?.()}
    </div>
    {#if erro}<span class="mensagem mensagem-erro"><Icone nome="alert-triangle" pequeno />{erro}</span>{/if}
  </div>
  <TecladoLetras aoTecla={tecla} comEspaco enviarDesabilitado={desabilitado || !texto.trim()} />
</div>
