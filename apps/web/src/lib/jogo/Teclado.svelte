<script lang="ts">
  import { Icone } from '@ja/ui';

  interface Props {
    digitos: number[];
    /** Dígitos que já completaram a grade (ficam apagados). */
    completos?: Set<number>;
    notas?: boolean;
    aoDigito: (d: number) => void;
    aoApagar: () => void;
    aoDesfazer?: () => void;
    podeDesfazer?: boolean;
  }
  let { digitos, completos = new Set(), notas = $bindable(false), aoDigito, aoApagar, aoDesfazer, podeDesfazer = false }: Props = $props();
</script>

<div class="ja-teclado">
  <div class="ja-teclado-digitos" style="--ja-teclas:{digitos.length}">
    {#each digitos as d (d)}
      <button class="botao ja-tecla" type="button" disabled={completos.has(d)} onclick={() => aoDigito(d)}>{d}</button>
    {/each}
  </div>
  <div class="ja-teclado-acoes">
    {#if aoDesfazer}
      <button class="botao" type="button" disabled={!podeDesfazer} onclick={aoDesfazer}><Icone nome="arrow-back-up" /><span>Desfazer</span></button>
    {/if}
    <button class="botao" type="button" onclick={aoApagar}><Icone nome="backspace" /><span>Apagar</span></button>
    <button class="botao" type="button" aria-pressed={notas} aria-label="Notas {notas ? 'ligadas' : 'desligadas'}" onclick={() => (notas = !notas)}><Icone nome="pencil" /><span>Notas</span></button>
  </div>
</div>
