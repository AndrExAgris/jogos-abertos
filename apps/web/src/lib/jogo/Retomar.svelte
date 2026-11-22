<script lang="ts">
  import { Icone } from '@ja/ui';
  import { formatarTempo } from '../estatisticas.ts';

  interface Props {
    descricao: string;
    tempo?: number;
    aoContinuar: () => void;
    aoNova: () => void;
  }
  let { descricao, tempo, aoContinuar, aoNova }: Props = $props();
</script>

<div class="ja-retomar">
  <div class="ja-retomar-cartao">
    <span class="ja-retomar-icone"><Icone nome="player-pause" /></span>
    <h2 class="ui-subtitulo ja-sem-margem">Partida em andamento</h2>
    <p class="ja-dica">{descricao}{tempo ? ` · ${formatarTempo(tempo)}` : ''}</p>
    <div class="ja-retomar-acoes">
      <button class="botao botao-primario" type="button" onclick={aoContinuar}><Icone nome="player-play" /><span>Continuar</span></button>
      <button class="botao" type="button" onclick={aoNova}><Icone nome="plus" /><span>Nova partida</span></button>
    </div>
  </div>
</div>
