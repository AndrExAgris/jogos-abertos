<script lang="ts">
  import type { Component } from 'svelte';
  import { acharJogo } from './registro.ts';
  import NaoEncontrada from '../telas/NaoEncontrada.svelte';

  let { id }: { id: string } = $props();
  const item = $derived(acharJogo(id));
  let Comp = $state<Component | null>(null);
  let falhou = $state(false);

  $effect(() => {
    const atual = item;
    Comp = null;
    falhou = false;
    if (!atual?.carregar) return;
    atual.carregar().then((m) => (Comp = m.default)).catch(() => (falhou = true));
  });
</script>

{#if !item?.carregar || falhou}
  <NaoEncontrada />
{:else if Comp}
  <Comp />
{/if}
