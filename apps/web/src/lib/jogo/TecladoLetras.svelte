<script lang="ts">
  import { Icone } from '@ja/ui';

  /** Teclado do app (o teclado do sistema nunca abre). Teclas: letra, 'apagar', 'enviar', ' '. */
  interface Props {
    aoTecla: (t: string) => void;
    /** Marca de cada letra (Termo): 'certa', 'lugar', 'nao'. */
    marca?: (l: string) => string | undefined;
    comEnviar?: boolean;
    enviarDesabilitado?: boolean;
    comEspaco?: boolean;
    /** Aceita também o teclado físico (computador). */
    fisico?: boolean;
  }
  let { aoTecla, marca, comEnviar = true, enviarDesabilitado = false, comEspaco = false, fisico = true }: Props = $props();
  const LINHAS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  function aoTeclado(e: KeyboardEvent) {
    if (!fisico || e.ctrlKey || e.metaKey || e.altKey) return;
    const alvo = e.target as HTMLElement | null;
    if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA')) return;
    if (e.key === 'Backspace') { e.preventDefault(); aoTecla('apagar'); }
    else if (e.key === 'Enter' && comEnviar) { e.preventDefault(); aoTecla('enviar'); }
    else if (e.key === ' ' && comEspaco) { e.preventDefault(); aoTecla(' '); }
    else if (/^[a-zà-úç]$/i.test(e.key)) aoTecla(e.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
  }
</script>

<svelte:window onkeydown={aoTeclado} />

<div class="ja-teclado-letras" role="group" aria-label="Teclado">
  {#each LINHAS as linha, li (li)}
    <div class="ja-teclado-linha">
      {#if li === 2 && comEnviar}<button class="botao ja-tecla-letra ja-tecla-larga" type="button" aria-label="Apagar" onclick={() => aoTecla('apagar')}><Icone nome="backspace" /></button>{/if}
      {#each linha as l (l)}<button class="botao ja-tecla-letra" type="button" data-marca={marca?.(l)} onclick={() => aoTecla(l)}>{l}</button>{/each}
      {#if li === 2 && !comEnviar}<button class="botao ja-tecla-letra ja-tecla-larga" type="button" aria-label="Apagar" onclick={() => aoTecla('apagar')}><Icone nome="backspace" /></button>{/if}
      {#if li === 2 && comEnviar}<button class="botao botao-primario ja-tecla-letra ja-tecla-larga" type="button" aria-label="Enviar" disabled={enviarDesabilitado} onclick={() => aoTecla('enviar')}><Icone nome="corner-down-left" /></button>{/if}
    </div>
  {/each}
  {#if comEspaco}
    <div class="ja-teclado-linha"><button class="botao ja-tecla-letra ja-tecla-espaco" type="button" aria-label="Espaço" onclick={() => aoTecla(' ')}>espaço</button></div>
  {/if}
</div>
