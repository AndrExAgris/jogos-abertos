<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    aberto: boolean;
    titulo: string;
    folha?: boolean;
    children: Snippet;
    acoes?: Snippet;
    aoFechar?: () => void;
  }
  let { aberto = $bindable(), titulo, folha = false, children, acoes, aoFechar }: Props = $props();
  let el: HTMLDialogElement;
  const id = `d-${Math.random().toString(36).slice(2, 8)}`;

  $effect(() => {
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  });
</script>

<dialog
  bind:this={el}
  class={folha ? 'folha-inferior' : 'dialogo'}
  aria-labelledby={id}
  onclose={() => {
    aberto = false;
    aoFechar?.();
  }}
>
  {#if folha}
    <button class="folha-alca" type="button" aria-label="Fechar" onclick={() => (aberto = false)}></button>
  {/if}
  <h2 id={id}>{titulo}</h2>
  {@render children()}
  {#if acoes}
    <div class="grupo-acoes">{@render acoes()}</div>
  {/if}
</dialog>
