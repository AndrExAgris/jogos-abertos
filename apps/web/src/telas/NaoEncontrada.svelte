<script lang="ts">
  import Tela from '../lib/Tela.svelte';
  import { ir } from '../lib/rotas.svelte.ts';
</script>

<Tela titulo="Tela não encontrada" voltarPara="/">
  <p class="ui">Este endereço não existe no app. Talvez o jogo ainda não esteja pronto.</p>
  <div class="grupo-acoes">
    <button class="botao botao-primario" type="button" onclick={() => ir('/', true)}><span>Ir para os jogos</span></button>
  </div>
</Tela>
