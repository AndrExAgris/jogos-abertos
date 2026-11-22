<script lang="ts">
  import { onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import Tela from '../lib/Tela.svelte';

  // Tela igual em todos os projetos do Open Design. As opções usam data-od-definir.
  const cores = [
    ['laranja', 'Laranja'], ['teal', 'Teal'], ['roxo', 'Roxo'], ['indigo', 'Índigo'], ['malva', 'Malva'],
    ['lima', 'Lima'], ['fucsia', 'Fúcsia'], ['oliva', 'Oliva'], ['bronze', 'Bronze'], ['grafite', 'Grafite'],
  ] as const;

  // O script do Open Design marca as opções atuais quando as preferências são aplicadas.
  onMount(() => window.OpenDesign.definir({}));
</script>

<Tela titulo="Aparência" voltarPara="/mais">
  <section class="grupo-config">
    <div class="lista-config">
      <div class="linha-config linha-config-empilhada">
        <Icone nome="brightness-half" />
        <span class="linha-texto"><span class="linha-titulo">Tema</span><span class="linha-descricao">Sistema segue o modo claro ou escuro do aparelho</span></span>
        <div class="segmentado" role="group" aria-label="Tema">
          <button type="button" data-od-definir="tema=sistema">Sistema</button>
          <button type="button" data-od-definir="tema=claro">Claro</button>
          <button type="button" data-od-definir="tema=escuro">Escuro</button>
        </div>
      </div>
      <div class="linha-config linha-config-empilhada">
        <Icone nome="palette" />
        <span class="linha-texto"><span class="linha-titulo">Cor principal</span><span class="linha-descricao">Botões principais, seleção e destaques</span></span>
        <div class="amostras-cor">
          {#each cores as [id, nome] (id)}
            <button type="button" class="amostra-cor" data-od-definir="primaria={id}" style="--cor:var(--{id});--sobre:var(--{id}-sobre)" aria-label={nome} title={nome}><Icone nome="check" /></button>
          {/each}
        </div>
      </div>
      <div class="linha-config linha-config-empilhada">
        <Icone nome="color-swatch" />
        <span class="linha-texto"><span class="linha-titulo">Cor secundária</span><span class="linha-descricao">Etiquetas, categorias e o segundo jogador</span></span>
        <div class="amostras-cor">
          {#each cores as [id, nome] (id)}
            <button type="button" class="amostra-cor" data-od-definir="secundaria={id}" style="--cor:var(--{id});--sobre:var(--{id}-sobre)" aria-label={nome} title={nome}><Icone nome="check" /></button>
          {/each}
        </div>
      </div>
      <div class="linha-config linha-config-empilhada">
        <Icone nome="baseline-density-medium" />
        <span class="linha-texto"><span class="linha-titulo">Densidade</span><span class="linha-descricao">Espaço entre os elementos</span></span>
        <div class="segmentado" role="group" aria-label="Densidade">
          <button type="button" data-od-definir="densidade=compacta">Compacta</button>
          <button type="button" data-od-definir="densidade=equilibrada">Equilibrada</button>
          <button type="button" data-od-definir="densidade=arejada">Arejada</button>
        </div>
      </div>
      <label class="linha-config">
        <Icone nome="player-pause" />
        <span class="linha-texto"><span class="linha-titulo">Reduzir animações</span><span class="linha-descricao">Sem transições nem pulsos</span></span>
        <input class="interruptor" type="checkbox" role="switch" data-od-definir="movimento=reduzido">
      </label>
    </div>
  </section>
  <section class="grupo-config">
    <div class="lista-config">
      <button class="linha-config" type="button" data-od-restaurar>
        <Icone nome="refresh" />
        <span class="linha-texto"><span class="linha-titulo">Restaurar aparência padrão</span></span>
      </button>
    </div>
  </section>
</Tela>
