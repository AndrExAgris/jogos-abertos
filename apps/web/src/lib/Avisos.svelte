<script lang="ts">
  import { Icone } from '@ja/ui';
  import { avisos } from './aviso.svelte.ts';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each avisos as a (a.id)}
    <div class="toast" data-tipo={a.tipo}><Icone nome={a.icone} /><span class="toast-texto">{a.texto}</span></div>
  {/each}
</div>
