<script lang="ts">
  import type { Component } from 'svelte';
  import { Icone } from '@ja/ui';
  import { rota, ir } from './lib/rotas.svelte.ts';
  import { layout } from './lib/layout.svelte.ts';
  import Inicio from './telas/Inicio.svelte';
  import Recordes from './telas/Recordes.svelte';
  import Mais from './telas/Mais.svelte';
  import Aparencia from './telas/Aparencia.svelte';
  import Sobre from './telas/Sobre.svelte';
  import NaoEncontrada from './telas/NaoEncontrada.svelte';
  import Carregar from './jogos/Carregar.svelte';
  import Avisos from './lib/Avisos.svelte';

  type Area = 'jogos' | 'recordes' | 'mais';

  const areas: { id: Area; nome: string; caminho: string; icone: string }[] = [
    { id: 'jogos', nome: 'Jogos', caminho: '/', icone: 'device-gamepad-2' },
    { id: 'recordes', nome: 'Recordes', caminho: '/recordes', icone: 'trophy' },
  ];

  const telas: Record<string, { componente: Component; area: Area; subtela?: boolean }> = {
    '/': { componente: Inicio, area: 'jogos' },
    '/recordes': { componente: Recordes, area: 'recordes' },
    '/mais': { componente: Mais, area: 'mais' },
    '/mais/aparencia': { componente: Aparencia, area: 'mais', subtela: true },
    '/mais/sobre': { componente: Sobre, area: 'mais', subtela: true },
  };

  const idJogo = $derived(rota.caminho.startsWith('/jogo/') ? rota.caminho.slice(6) : null);
  const atual = $derived(
    idJogo ? { componente: NaoEncontrada as Component, area: 'jogos' as Area, subtela: true }
    : telas[rota.caminho] ?? { componente: NaoEncontrada as Component, area: 'jogos' as Area, subtela: true },
  );
  const Componente = $derived(atual.componente);

  function navegar(e: MouseEvent, caminho: string) {
    e.preventDefault();
    ir(caminho);
  }
</script>

{#if layout.largo}
  <div class="app">
    <nav class="nav-lateral" aria-label="Principal">
      <div class="nav-lista">
        {#each areas as a (a.id)}
          <a class="nav-item" href="#{a.caminho}" data-dica={a.nome} aria-current={atual.area === a.id ? 'page' : undefined} onclick={(e) => navegar(e, a.caminho)}>
            <Icone nome={a.icone} /><span class="nav-rotulo">{a.nome}</span>
          </a>
        {/each}
      </div>
      <div class="nav-rodape">
        <a class="nav-item" href="#/mais" data-dica="Configurações" aria-current={atual.area === 'mais' ? 'page' : undefined} onclick={(e) => navegar(e, '/mais')}>
          <Icone nome="settings" /><span class="nav-rotulo">Configurações</span>
        </a>
      </div>
    </nav>
    <div class="principal ja-principal">
      {#key rota.caminho}{#if idJogo}<Carregar id={idJogo} />{:else}<Componente />{/if}{/key}
    </div>
  </div>
{:else}
  <div class="tela-app">
    {#key rota.caminho}{#if idJogo}<Carregar id={idJogo} />{:else}<Componente />{/if}{/key}
    {#if !atual.subtela}
      <nav class="nav-inferior" aria-label="Principal">
        {#each [areas[1], areas[0], { id: 'mais' as Area, nome: 'Mais', caminho: '/mais', icone: 'dots' }] as a (a.id)}
          <a href="#{a.caminho}" aria-current={atual.area === a.id ? 'page' : undefined} onclick={(e) => navegar(e, a.caminho)}>
            <span class="marca-icone"><Icone nome={a.icone} classe="icone-repouso" /><Icone nome={a.icone} preenchido classe="icone-ativo" /></span>{a.nome}
          </a>
        {/each}
      </nav>
    {/if}
  </div>
{/if}

<Avisos />
