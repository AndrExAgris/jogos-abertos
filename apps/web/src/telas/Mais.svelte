<script lang="ts">
  import { onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import Tela from '../lib/Tela.svelte';
  import { layout } from '../lib/layout.svelte.ts';
  import { ir } from '../lib/rotas.svelte.ts';
  import { apagarTudo, exportar, importar, validarCopia, type Copia } from '../lib/armazenamento.ts';
  import { salvarArquivo } from '../lib/plataforma.ts';

  let arquivo: HTMLInputElement;
  let dialogoImportar: HTMLDialogElement;
  let dialogoApagar: HTMLDialogElement;
  let copiaPendente = $state<Copia | null>(null);
  let ocupado = $state(false);

  // Mantém o resumo da linha Aparência (data-od-valor) atualizado.
  onMount(() => window.OpenDesign.definir({}));

  async function fazerExportacao() {
    ocupado = true;
    try {
      const copia = await exportar();
      const data = copia.exportadoEm.slice(0, 10);
      await salvarArquivo(`jogos-abertos-${data}.json`, JSON.stringify(copia, null, 2));
      window.OpenDesign.toast({ tipo: 'sucesso', texto: 'Cópia do progresso exportada.' });
    } catch (e) {
      if ((e as Error)?.message?.includes('cancel')) return;
      window.OpenDesign.toast({ tipo: 'erro', texto: 'Não foi possível exportar. Tente de novo.' });
    } finally {
      ocupado = false;
    }
  }

  async function escolherArquivo(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    let dados: unknown;
    try {
      dados = JSON.parse(await f.text());
    } catch {
      window.OpenDesign.toast({ tipo: 'erro', texto: 'O arquivo não é uma cópia válida. Escolha o .json exportado pelo app.' });
      return;
    }
    const erro = validarCopia(dados);
    if (erro) {
      window.OpenDesign.toast({ tipo: 'erro', texto: erro });
      return;
    }
    copiaPendente = dados as Copia;
    dialogoImportar.showModal();
  }

  async function confirmarImportacao() {
    if (!copiaPendente) return;
    dialogoImportar.close();
    try {
      await importar(copiaPendente);
      window.OpenDesign.toast({ tipo: 'sucesso', texto: 'Progresso importado.' });
    } catch {
      window.OpenDesign.toast({ tipo: 'erro', texto: 'Não foi possível importar. O progresso atual foi mantido.' });
    }
    copiaPendente = null;
  }

  async function confirmarApagar() {
    dialogoApagar.close();
    await apagarTudo();
    window.OpenDesign.toast({ texto: 'Progresso apagado.' });
  }

  const dataCopia = $derived(copiaPendente ? new Date(copiaPendente.exportadoEm).toLocaleDateString('pt-BR') : '');
</script>

<Tela titulo={layout.largo ? 'Configurações' : 'Mais'}>
  <section class="grupo-config">
    <div class="lista-config">
      <button class="linha-config" type="button" onclick={() => ir('/mais/aparencia')}>
        <Icone nome="palette" />
        <span class="linha-texto">
          <span class="linha-titulo">Aparência</span>
          <span class="linha-descricao"><span data-od-valor="tema">Sistema</span>, <span data-od-valor="primaria">Laranja</span>, <span data-od-valor="densidade">Equilibrada</span></span>
        </span>
        <Icone nome="chevron-right" classe="linha-seta" />
      </button>
    </div>
  </section>

  <!-- Opções escondidas para o script do Open Design achar os nomes do resumo acima. -->
  <div hidden>
    <button type="button" data-od-definir="tema=sistema">Sistema</button><button type="button" data-od-definir="tema=claro">Claro</button><button type="button" data-od-definir="tema=escuro">Escuro</button>
    {#each [['laranja', 'Laranja'], ['teal', 'Teal'], ['roxo', 'Roxo'], ['indigo', 'Índigo'], ['malva', 'Malva'], ['lima', 'Lima'], ['fucsia', 'Fúcsia'], ['oliva', 'Oliva'], ['bronze', 'Bronze'], ['grafite', 'Grafite']] as [id, nome] (id)}
      <button type="button" data-od-definir="primaria={id}">{nome}</button>
    {/each}
    <button type="button" data-od-definir="densidade=compacta">Compacta</button><button type="button" data-od-definir="densidade=equilibrada">Equilibrada</button><button type="button" data-od-definir="densidade=arejada">Arejada</button>
  </div>

  <section class="grupo-config">
    <h2 class="grupo-config-titulo">Progresso</h2>
    <div class="lista-config">
      <button class="linha-config" type="button" onclick={fazerExportacao} aria-busy={ocupado}>
        <Icone nome="download" />
        <span class="linha-texto"><span class="linha-titulo">Exportar progresso</span><span class="linha-descricao">Salva partidas, recordes e aparência num arquivo</span></span>
      </button>
      <button class="linha-config" type="button" onclick={() => arquivo.click()}>
        <Icone nome="upload" />
        <span class="linha-texto"><span class="linha-titulo">Importar progresso</span><span class="linha-descricao">Troca o progresso deste aparelho pelo de um arquivo</span></span>
      </button>
      <button class="linha-config linha-config-perigo" type="button" onclick={() => dialogoApagar.showModal()}>
        <Icone nome="trash" />
        <span class="linha-texto"><span class="linha-titulo">Apagar todo o progresso</span></span>
      </button>
    </div>
    <input bind:this={arquivo} type="file" accept="application/json,.json" hidden onchange={escolherArquivo}>
  </section>

  <section class="grupo-config">
    <div class="lista-config">
      <button class="linha-config" type="button" onclick={() => ir('/mais/sobre')}>
        <Icone nome="info-circle" />
        <span class="linha-texto"><span class="linha-titulo">Sobre o app</span></span>
        <span class="linha-valor">{__VERSAO__}</span>
        <Icone nome="chevron-right" classe="linha-seta" />
      </button>
    </div>
  </section>
</Tela>

<dialog class="dialogo" bind:this={dialogoImportar} aria-labelledby="di-t">
  <h2 id="di-t">Importar a cópia de {dataCopia}?</h2>
  <p>As partidas e os recordes deste aparelho serão trocados pelos da cópia. Se quiser guardar os atuais, exporte antes.</p>
  <div class="grupo-acoes">
    <button class="botao botao-terciario" type="button" onclick={() => dialogoImportar.close()}><span>Cancelar</span></button>
    <button class="botao botao-primario" type="button" onclick={confirmarImportacao}><span>Importar progresso</span></button>
  </div>
</dialog>

<dialog class="dialogo" bind:this={dialogoApagar} aria-labelledby="da-t">
  <h2 id="da-t">Apagar todo o progresso?</h2>
  <p>Partidas em andamento, estatísticas e recordes de todos os jogos serão apagados deste aparelho. A aparência continua como está. Não dá para desfazer.</p>
  <div class="grupo-acoes">
    <button class="botao botao-terciario" type="button" onclick={() => dialogoApagar.close()}><span>Cancelar</span></button>
    <button class="botao botao-destrutivo botao-forte" type="button" onclick={confirmarApagar}><Icone nome="trash" /><span>Apagar progresso</span></button>
  </div>
</dialog>
