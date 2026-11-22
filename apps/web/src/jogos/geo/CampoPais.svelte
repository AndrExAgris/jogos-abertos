<script lang="ts">
  import { Icone } from '@ja/ui';
  import { acharCapital, acharPais, sugerir, type Pais } from '@ja/geo/paises';

  interface Props {
    campo?: 'nome' | 'capital';
    usados?: string[];
    aoEscolher: (p: Pais) => void;
    desabilitado?: boolean;
    rotulo?: string;
  }
  let { campo = 'nome', usados = [], aoEscolher, desabilitado = false, rotulo = 'Seu palpite' }: Props = $props();
  let texto = $state('');
  let erro = $state('');
  const sugestoes = $derived(sugerir(texto, campo).filter((p) => !usados.includes(p.id)));

  function escolher(p: Pais) {
    if (usados.includes(p.id)) { erro = 'Você já tentou esse.'; return; }
    texto = '';
    erro = '';
    aoEscolher(p);
  }
  function enviar(e: SubmitEvent) {
    e.preventDefault();
    const p = campo === 'nome' ? acharPais(texto) : acharCapital(texto);
    if (p) escolher(p);
    else if (sugestoes.length === 1) escolher(sugestoes[0]);
    else erro = campo === 'nome' ? 'País não encontrado. Escolha uma das sugestões.' : 'Capital não encontrada. Escolha uma das sugestões.';
  }
</script>

<form class="ja-campo-pais" onsubmit={enviar}>
  <div class="campo" data-estado={erro ? 'erro' : undefined}>
    <label for="campo-pais" class="sr-only">{rotulo}</label>
    <div class="ja-campo-linha">
      <input id="campo-pais" class="entrada" autocomplete="off" placeholder={campo === 'nome' ? 'Digite um país' : 'Digite uma capital'} bind:value={texto} disabled={desabilitado} oninput={() => (erro = '')} />
      <button class="botao botao-primario" type="submit" disabled={desabilitado || !texto.trim()}><span>Tentar</span></button>
    </div>
    {#if erro}<span class="mensagem mensagem-erro"><Icone nome="alert-triangle" pequeno />{erro}</span>{/if}
  </div>
  {#if sugestoes.length && texto.trim()}
    <div class="lista-config ja-sugestoes">
      {#each sugestoes as p (p.id)}
        <button class="linha-config" type="button" onclick={() => escolher(p)}>
          <span class="linha-texto"><span class="linha-titulo">{campo === 'nome' ? p.nome : p.capital}</span>{#if campo === 'capital'}<span class="linha-descricao">{p.nome}</span>{/if}</span>
        </button>
      {/each}
    </div>
  {/if}
</form>
