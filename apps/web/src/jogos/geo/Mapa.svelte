<script lang="ts">
  import { PAISES, caminhoSvg } from '@ja/geo/paises';

  interface Props {
    /** Classe de destaque por país (ex.: 'segredo', 'perto-3'). */
    destaques?: Record<string, string>;
    /** Caixa de visão [x, y, largura, altura] em graus (x = longitude, y = −latitude). */
    visao?: [number, number, number, number];
    pontos?: { lat: number; lon: number; classe: string }[];
  }
  let { destaques = {}, visao = [-170, -84, 345, 145], pontos = [] }: Props = $props();
  const caminhos = PAISES.filter((p) => p.temForma).map((p) => ({ id: p.id, d: caminhoSvg(p.id) }));
</script>

<svg class="ja-mapa" viewBox={visao.join(' ')} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa-múndi">
  {#each caminhos as c (c.id)}<path d={c.d} class="ja-mapa-pais {destaques[c.id] ?? ''}" />{/each}
  {#each pontos as p, k (k)}<circle cx={p.lon} cy={-p.lat} r={Math.max(0.8, visao[2] / 120)} class="ja-mapa-ponto {p.classe}" />{/each}
</svg>
