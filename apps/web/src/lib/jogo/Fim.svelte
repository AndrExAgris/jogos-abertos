<script lang="ts">
  import { Icone } from '@ja/ui';

  interface Props {
    tipo: 'vitoria' | 'derrota' | 'empate' | 'info';
    titulo: string;
    texto?: string;
    rotulo?: string;
    aoNova: () => void;
  }
  let { tipo, titulo, texto, rotulo = 'Nova partida', aoNova }: Props = $props();
  const dados = $derived(
    tipo === 'vitoria' ? { cor: 'sucesso', icone: 'circle-check' }
    : tipo === 'derrota' ? { cor: 'erro', icone: 'alert-triangle' }
    : { cor: 'info', icone: 'info-circle' },
  );
</script>

<div class="ja-fim">
  <div class="aviso" data-tipo={dados.cor} role="status">
    <Icone nome={dados.icone} />
    <div>
      <p class="aviso-titulo">{titulo}</p>
      {#if texto}<p>{texto}</p>{/if}
    </div>
  </div>
  <div class="grupo-acoes">
    <button class="botao botao-primario" type="button" onclick={aoNova}><Icone nome="refresh" /><span>{rotulo}</span></button>
  </div>
</div>
