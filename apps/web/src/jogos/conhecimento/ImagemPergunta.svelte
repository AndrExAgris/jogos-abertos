<script lang="ts">
  /*
   * Imagem da pergunta: a bandeira (flag-icons, MIT) ou o contorno do país (Natural Earth,
   * domínio público). A base de países só é carregada quando sai uma pergunta com imagem.
   */
  interface Props { tipo: 'bandeira' | 'contorno'; pais: string }
  let { tipo, pais }: Props = $props();

  const geo = import('@ja/geo/paises');
  const bandeiras = import('../geo/bandeiras.ts');

  async function desenho(id: string) {
    const { caixa, caminhoSvg, pais: dados } = await geo;
    if (tipo === 'bandeira') return { url: (await bandeiras).bandeira(dados(id).iso2) };
    const [x, y, w, h] = caixa(id);
    // Mesma correção do jogo do contorno: compensa o esticado da projeção longe do equador.
    const k = Math.max(0.3, Math.cos(((y + h / 2) * Math.PI) / 180));
    const m = Math.max(w * k, h) * 0.08;
    const d = x + w > 180 ? caminhoSvg(id).replace(/(-?\d+(\.\d+)?),/g, (_, n) => `${Number(n) < 0 ? Number(n) + 360 : n},`) : caminhoSvg(id);
    return { vb: `${x * k - m} ${y - m} ${w * k + 2 * m} ${h + 2 * m}`, d, k };
  }
</script>

<div class="ja-pergunta-imagem">
  {#await desenho(pais) then r}
    {#if 'url' in r}
      <img class="ja-pergunta-bandeira" src={r.url} alt="Bandeira de um país" />
    {:else}
      <svg class="ja-silhueta ja-pergunta-contorno" viewBox={r.vb} role="img" aria-label="Contorno de um país"><path d={r.d} transform="scale({r.k} 1)" /></svg>
    {/if}
  {/await}
</div>
