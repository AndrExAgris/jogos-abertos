<script lang="ts">
  import { Icone } from '@ja/ui';
  import Tela from '../lib/Tela.svelte';

  const creditos = [
    { item: 'Open Design (visual)', autor: 'André', licenca: 'Própria do projeto' },
    { item: 'Ícones Tabler', autor: 'Paweł Kuna', licenca: 'MIT' },
    { item: 'Fontes Geist', autor: 'Vercel', licenca: 'OFL 1.1' },
    { item: 'Fonte Literata', autor: 'TypeTogether', licenca: 'OFL 1.1' },
    { item: 'Fonte JetBrains Mono', autor: 'JetBrains', licenca: 'OFL 1.1' },
    { item: 'Symbols Nerd Font', autor: 'Ryan L McIntyre', licenca: 'MIT' },
    { item: 'Gerador do Minas (portado de Mines)', autor: 'Simon Tatham', licenca: 'MIT' },
  ];
</script>

<Tela titulo="Sobre o app" voltarPara="/mais">
  <div class="lista-config">
    <div class="linha-config"><span class="linha-texto"><span class="linha-titulo">Versão</span></span><span class="linha-valor">{__VERSAO__}</span></div>
    <div class="linha-config"><span class="linha-texto"><span class="linha-titulo">Licença</span><span class="linha-descricao">Código aberto: você pode usar, estudar, mudar e redistribuir</span></span><span class="linha-valor">GPL-3.0</span></div>
    <a class="linha-config" href="https://github.com/AndrExAgris/jogos-abertos" target="_blank" rel="noopener">
      <Icone nome="brand-github" />
      <span class="linha-texto"><span class="linha-titulo">Código-fonte</span><span class="linha-descricao">github.com/AndrExAgris/jogos-abertos</span></span>
      <Icone nome="chevron-right" classe="linha-seta" />
    </a>
  </div>
  <section class="grupo-config">
    <h2 class="grupo-config-titulo">Créditos</h2>
    <div class="lista-config">
      {#each creditos as c (c.item)}
        <div class="linha-config"><span class="linha-texto"><span class="linha-titulo">{c.item}</span><span class="linha-descricao">{c.autor}</span></span><span class="linha-valor">{c.licenca}</span></div>
      {/each}
    </div>
  </section>
</Tela>
