<script lang="ts">
  import { acharCapital, acharPais, sugerir, type Pais } from '@ja/geo/paises';
  import CampoTeclado from '../../lib/jogo/CampoTeclado.svelte';

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
  const achados = $derived(sugerir(texto, campo).filter((p) => !usados.includes(p.id)).slice(0, 4));
  const sugestoes = $derived(achados.map((p) => ({ id: p.id, titulo: campo === 'nome' ? p.nome : p.capital, sub: campo === 'capital' ? p.nome : undefined })));

  function escolher(p: Pais) {
    if (usados.includes(p.id)) { erro = 'Você já tentou esse.'; return; }
    texto = '';
    erro = '';
    aoEscolher(p);
  }
  function enviar() {
    const p = campo === 'nome' ? acharPais(texto) : acharCapital(texto);
    if (p) escolher(p);
    else if (achados.length === 1) escolher(achados[0]);
    else erro = campo === 'nome' ? 'País não encontrado. Escolha uma das sugestões.' : 'Capital não encontrada. Escolha uma das sugestões.';
  }
</script>

<CampoTeclado bind:texto bind:erro {rotulo} dica={campo === 'nome' ? 'Digite um país' : 'Digite uma capital'} {sugestoes} {desabilitado}
  aoEscolher={(id) => escolher(achados.find((p) => p.id === id)!)} aoEnviar={enviar} />
