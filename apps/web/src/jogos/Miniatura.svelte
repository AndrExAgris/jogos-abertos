<script lang="ts">
  /*
   * Desenho pequeno de cada jogo para a tela inicial (64 × 64), feito à mão em
   * SVG com as cores do Open Design. Jogo sem desenho cai no ícone.
   */
  import { Icone } from '@ja/ui';
  interface Props { id: string; icone: string }
  let { id, icone }: Props = $props();
  import rainhaBranca from '../../../../packages/ui/pecas/cburnett/wQ.svg?url';
  import rainhaPreta from '../../../../packages/ui/pecas/cburnett/bQ.svg?url';

  const g3 = [0, 1, 2];
  const g4 = [0, 1, 2, 3];
  const g5 = [0, 1, 2, 3, 4];
  const CONHECIDOS = new Set([
    'minas', 'sudoku', 'nonograma', 'charada', 'akari', 'tendas', 'pontes', 'rainhas', 'sumplete', 'ligue', 'luzes',
    'conta', 'memoria', 'sequencia', 'resta-um', 'separe', 'rush', 'setas', 'desembaraco', 'termo', 'roda', 'cruzadas',
    'perguntas', 'milhao', 'filme', 'pais-distancia', 'capital-distancia', 'pais-contorno', 'bandeira-revelada', 'descobre-bandeiras',
    'viagem-fronteiras', 'pais-pistas', 'paciencia', 'spider', 'freecell', 'piramide', 'tripeaks', 'golf', 'quatro', 'damas',
    'xadrez', 'reversi', 'trilha', 'naval', 'general', 'mentiroso', 'vinte-e-um', 'quem', 'go', 'ludo', 'ur', 'sinuca',
  ]);
</script>

{#snippet carta(x: number, y: number, r = 0, texto = '', vermelha = false, verso = false)}
  <g transform="translate({x} {y}) rotate({r})">
    <rect x="-8" y="-11" width="16" height="22" rx="2.2" class={verso ? 'm-verso' : 'm-carta'} />
    {#if texto}<text x="-4.5" y="-3" class="m-carta-txt" class:m-vermelho={vermelha}>{texto}</text>{/if}
  </g>
{/snippet}

{#snippet dado(x: number, y: number, v: number, l = 18)}
  {@const P: Record<number, [number, number][]> = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]] }}
  <rect {x} {y} width={l} height={l} rx={l * 0.2} class="m-dado" />
  {#each P[v] as [px, py], k (k)}<circle cx={x + px * l} cy={y + py * l} r={l * 0.08} class="m-preta" />{/each}
{/snippet}

{#if !CONHECIDOS.has(id)}
  <Icone nome={icone} />
{:else}
<svg class="ja-miniatura" viewBox="0 0 64 64" aria-hidden="true">
  {#if id === 'minas'}
    {#each g3 as y (y)}{#each g3 as x (x)}<rect x={6 + x * 18} y={6 + y * 18} width="16" height="16" rx="2.5" class={(x + y) % 3 === 0 ? 'm-casa-aberta' : 'm-casa'} />{/each}{/each}
    <text x="14" y="18.5" class="m-num m-info-t">1</text><text x="50" y="54.5" class="m-num m-sec-t">2</text><text x="32" y="36.5" class="m-num m-info-t">1</text>
    <path d="M47 9v10M47 9l6 3-6 3" class="m-bandeira" />
    <circle cx="14" cy="50" r="4.5" class="m-preta" /><path d="M14 43.5v13M7.5 50h13M9.5 45.5l9 9M18.5 45.5l-9 9" class="m-traco-preto" />
  {:else if id === 'sudoku'}
    <rect x="5" y="5" width="54" height="54" rx="4" class="m-fundo-claro" />
    {#each [1, 2, 4, 5, 7, 8] as k (k)}<path d="M{5 + k * 6} 5V59M5 {5 + k * 6}H59" class="m-grade-fina" />{/each}
    <path d="M23 5V59M41 5V59M5 23H59M5 41H59" class="m-grade-grossa" />
    <text x="14" y="17" class="m-num m-escuro-t">5</text><text x="32" y="17" class="m-num m-pri-escuro">3</text><text x="50" y="35" class="m-num m-escuro-t">7</text><text x="14" y="53" class="m-num m-pri-escuro">9</text><text x="32" y="35" class="m-num m-escuro-t">1</text><text x="50" y="53" class="m-num m-escuro-t">4</text>
  {:else if id === 'nonograma'}
    {#each g4 as y (y)}{#each g4 as x (x)}<rect x={20 + x * 10} y={20 + y * 10} width="9" height="9" rx="1.5" class={[[1, 1, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0], [0, 0, 1, 1]][y][x] ? 'm-cheia' : 'm-casa'} />{/each}{/each}
    <text x="24.5" y="16" class="m-mini">1</text><text x="34.5" y="16" class="m-mini">3</text><text x="44.5" y="16" class="m-mini">3</text><text x="54.5" y="16" class="m-mini">3</text>
    <text x="13" y="27" class="m-mini">2 1</text><text x="13" y="37" class="m-mini">3</text><text x="13" y="47" class="m-mini">3</text><text x="13" y="57" class="m-mini">2</text>
  {:else if id === 'charada'}
    {#each [['m-pri', 4], ['m-sec', 24], ['m-aviso', 44]] as [c, x], k (k)}
      <path d="M{Number(x)} 34L{Number(x) + 8} 24L{Number(x) + 16} 34V52H{Number(x)}Z" class={String(c)} /><rect x={Number(x) + 5} y="42" width="6" height="10" rx="1" class="m-fundo-escuro" />
      <text x={Number(x) + 8} y="18" class="m-mini">{['?', '!', '?'][k]}</text>
    {/each}
  {:else if id === 'akari'}
    {#each g4 as y (y)}{#each g4 as x (x)}<rect x={6 + x * 13} y={6 + y * 13} width="12" height="12" rx="2" class={(x === 1 && y === 2) || (x === 3 && y === 0) ? 'm-preta' : x === 1 || y === 1 ? 'm-luz' : 'm-casa'} />{/each}{/each}
    <text x="12" y="41" class="m-mini m-branca-t">1</text>
    <circle cx="25.5" cy="25.5" r="4.5" class="m-aviso" /><path d="M23.5 31h4" class="m-traco" />
  {:else if id === 'tendas'}
    <rect x="4" y="44" width="56" height="14" rx="3" class="m-grama" />
    <circle cx="20" cy="26" r="11" class="m-suc" /><rect x="18" y="34" width="4" height="12" class="m-tronco" />
    <path d="M36 46L47 24L58 46Z" class="m-pri" /><path d="M47 24L47 46M43 46L47 36L51 46" class="m-traco-fundo" />
  {:else if id === 'pontes'}
    <path d="M14 14H50M14 14V50M50 14V50" class="m-ponte" /><path d="M14 47H50M14 53H50" class="m-ponte" />
    {#each [[14, 14, 3], [50, 14, 2], [14, 50, 3], [50, 50, 3]] as [x, y, n], k (k)}<circle cx={x} cy={y} r="9" class="m-ilha" /><text x={x} y={y + 0.5} class="m-num">{n}</text>{/each}
  {:else if id === 'rainhas'}
    {#each g4 as y (y)}{#each g4 as x (x)}<rect x={6 + x * 13} y={6 + y * 13} width="13" height="13" class="m-reg{[[0, 0, 1, 1], [0, 2, 2, 1], [3, 2, 1, 1], [3, 3, 3, 1]][y][x]}" />{/each}{/each}
    <path d="M10 15l2-6 3 4 2-5 2 5 3-4 2 6z" class="m-preta" transform="translate(13 0)" />
    <path d="M10 15l2-6 3 4 2-5 2 5 3-4 2 6z" class="m-preta" transform="translate(-3 39)" />
  {:else if id === 'sumplete'}
    {#each g3 as y (y)}{#each g3 as x (x)}
      {@const n = [[3, 7, 1], [5, 2, 8], [4, 6, 9]][y][x]}
      <rect x={4 + x * 15} y={4 + y * 15} width="14" height="14" rx="2.5" class="m-casa" />
      <text x={11 + x * 15} y={11.5 + y * 15} class="m-num-p" class:m-riscado={(x + y) % 2 === 1}>{n}</text>
    {/each}{/each}
    {#each [8, 13, 13] as t, k (k)}<text x="55" y={11.5 + k * 15} class="m-num-p m-sec-t">{t}</text>{/each}
    {#each [7, 6, 9] as t, k (k)}<text x={11 + k * 15} y="56" class="m-num-p m-sec-t">{t}</text>{/each}
  {:else if id === 'ligue'}
    {#each g4 as y (y)}{#each g4 as x (x)}<rect x={6 + x * 13} y={6 + y * 13} width="12" height="12" rx="2" class="m-casa" />{/each}{/each}
    <path d="M12 12H51V25H25V51" class="m-caminho m-cor-a" /><path d="M12 25V51" class="m-caminho m-cor-b" /><path d="M38 38H51V51H38" class="m-caminho m-cor-c" />
    {#each [[12, 12, 'a'], [25, 51, 'a'], [12, 25, 'b'], [12, 51, 'b'], [38, 38, 'c'], [38, 51, 'c']] as [x, y, c], k (k)}<circle cx={x} cy={y} r="4.5" class="m-ponto m-cor-{c}" />{/each}
  {:else if id === 'luzes'}
    {#each g3 as y (y)}{#each g3 as x (x)}<rect x={6 + x * 18} y={6 + y * 18} width="16" height="16" rx="3" class={(x === 1 || y === 1) && !(x === 2 && y === 1) ? 'm-acesa' : 'm-casa'} />{/each}{/each}
  {:else if id === 'conta'}
    <rect x="16" y="4" width="32" height="16" rx="4" class="m-sec" /><text x="32" y="12.5" class="m-num m-sobre-t">437</text>
    {#each [[4, 28, '25'], [24, 28, '50'], [44, 28, '7'], [4, 46, '3'], [24, 46, '10'], [44, 46, '1']] as [x, y, t], k (k)}<rect x={Number(x)} y={Number(y)} width="16" height="14" rx="3" class="m-ficha" /><text x={Number(x) + 8} y={Number(y) + 7.5} class="m-num-p">{t}</text>{/each}
  {:else if id === 'memoria'}
    {#each [[6, 6, 'v'], [34, 6, 'a'], [6, 34, 'a'], [34, 34, 'v']] as [x, y, t], k (k)}
      <rect x={Number(x)} y={Number(y)} width="24" height="24" rx="4" class={t === 'v' ? 'm-verso' : 'm-carta'} />
      {#if t === 'a'}<path d="M{Number(x) + 12} {Number(y) + 5}l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" class="m-aviso" />{/if}
    {/each}
  {:else if id === 'sequencia'}
    <path d="M30 30V6A24 24 0 0 0 6 30Z" class="m-suc" /><path d="M34 30V6A24 24 0 0 1 58 30Z" class="m-erro-c" />
    <path d="M30 34V58A24 24 0 0 1 6 34Z" class="m-info" /><path d="M34 34V58A24 24 0 0 0 58 34Z" class="m-aviso m-apagada" />
    <circle cx="32" cy="32" r="7" class="m-fundo-escuro" />
  {:else if id === 'resta-um'}
    {#each [[2, 0], [3, 0], [4, 0], [2, 1], [3, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [2, 5], [3, 5], [4, 5], [2, 6], [3, 6], [4, 6]] as [x, y], k (k)}<circle cx={8 + x * 8} cy={8 + y * 8} r="3.2" class={(x + y * 3) % 5 === 0 ? 'm-buraco' : 'm-pino'} />{/each}
    <circle cx="32" cy="32" r="3.2" class="m-buraco" />
  {:else if id === 'separe'}
    {#each [{ x: 8, cs: ['a', 'b', 'a'] }, { x: 26, cs: ['b', 'c', 'b'] }, { x: 44, cs: ['c', 'a', 'c'] }] as t, k (k)}
      {#each t.cs as c, j (j)}<rect x={t.x + 2} y={22 + j * 11} width="10" height="11" class="m-cor-{c}" />{/each}
      <path d="M{t.x} 10V50a7 7 0 0 0 14 0V10" class="m-tubo" />
    {/each}
  {:else if id === 'rush'}
    <rect x="5" y="5" width="54" height="54" rx="4" class="m-casa" />
    <rect x="9" y="24" width="24" height="10" rx="2.5" class="m-pri" /><rect x="37" y="9" width="10" height="26" rx="2.5" class="m-bloco" /><rect x="9" y="40" width="10" height="16" rx="2.5" class="m-bloco" /><rect x="25" y="44" width="26" height="10" rx="2.5" class="m-bloco" />
    <rect x="59" y="24" width="3" height="10" rx="1" class="m-pri" />
  {:else if id === 'setas'}
    <path d="M10 52V30H30" class="m-seta m-cor-a" /><path d="M30 30l-6-5M30 30l-6 5" class="m-seta m-cor-a" />
    <path d="M40 54V14" class="m-seta m-cor-b" /><path d="M40 14l-5 6M40 14l5 6" class="m-seta m-cor-b" />
    <path d="M54 44H48V20" class="m-seta m-cor-c" /><path d="M48 20l-5 6M48 20l5 6" class="m-seta m-cor-c" />
  {:else if id === 'desembaraco'}
    <path d="M12 14L52 50M52 14L12 50M12 14L52 14M32 6L12 50M32 6L52 50" class="m-aresta" />
    {#each [[12, 14], [52, 14], [12, 50], [52, 50], [32, 6]] as [x, y], k (k)}<circle cx={x} cy={y} r="5" class="m-no" />{/each}
  {:else if id === 'termo'}
    {#each ['t', 'e', 'r', 'm', 'o'] as l, k (k)}<rect x={3 + k * 12} y="10" width="10.5" height="12" rx="2" class={['m-suc', 'm-casa', 'm-aviso', 'm-casa', 'm-suc'][k]} /><text x={8.25 + k * 12} y="16.5" class="m-letra" class:m-escuro-t={k === 0 || k === 2 || k === 4}>{l}</text>{/each}
    {#each ['b', 'r', 'o', 't', 'o'] as l, k (k)}<rect x={3 + k * 12} y="26" width="10.5" height="12" rx="2" class="m-suc" /><text x={8.25 + k * 12} y="32.5" class="m-letra m-escuro-t">{l}</text>{/each}
    {#each g5 as k (k)}<rect x={3 + k * 12} y="42" width="10.5" height="12" rx="2" class="m-casa-vazia" />{/each}
  {:else if id === 'roda'}
    <circle cx="32" cy="32" r="26" class="m-casa" />
    {#each ['R', 'O', 'D', 'A', 'S'] as l, k (k)}
      {@const a = (k / 5) * Math.PI * 2 - Math.PI / 2}
      <circle cx={32 + Math.cos(a) * 16} cy={32 + Math.sin(a) * 16} r="7.5" class={k < 3 ? 'm-pri' : 'm-ficha'} /><text x={32 + Math.cos(a) * 16} y={32.5 + Math.sin(a) * 16} class="m-letra" class:m-sobre-t={k < 3}>{l}</text>
    {/each}
  {:else if id === 'cruzadas'}
    {#each g5 as y (y)}{#each g5 as x (x)}
      {@const preta = [[0, 0, 0, 1, 0], [0, 1, 0, 0, 0], [0, 0, 0, 1, 0], [1, 0, 0, 0, 0], [0, 0, 1, 0, 0]][y][x]}
      <rect x={5 + x * 11} y={5 + y * 11} width="10" height="10" rx="1" class={preta ? 'm-preta' : 'm-fundo-claro'} />
    {/each}{/each}
    {#each ['C', 'A', 'S'] as l, k (k)}<text x={10 + k * 11} y="10.5" class="m-letra-p">{l}</text>{/each}
    {#each ['A', 'R'] as l, k (k)}<text x="10" y={21.5 + k * 11} class="m-letra-p">{l}</text>{/each}
  {:else if id === 'perguntas'}
    <path d="M8 8H56V36H28L18 46V36H8Z" class="m-sec" /><text x="32" y="23" class="m-num m-sobre-t">?</text>
    <rect x="8" y="50" width="22" height="8" rx="2" class="m-ficha" /><rect x="34" y="50" width="22" height="8" rx="2" class="m-suc" />
  {:else if id === 'milhao'}
    {#each g5 as k (k)}<rect x={8 + k * 3} y={50 - k * 10} width={48 - k * 6} height="8" rx="2" class={k === 3 ? 'm-pri' : k < 3 ? 'm-suc m-apagada' : 'm-casa'} />{/each}
    <path d="M26 2h12v5a6 6 0 0 1-12 0z" class="m-aviso" />
  {:else if id === 'filme'}
    <rect x="6" y="24" width="52" height="32" rx="3" class="m-fundo-escuro" />
    <path d="M6 14L56 6L58 16L8 24Z" class="m-pri" /><path d="M16 12.5L20 21M28 10.7L32 19M40 8.8L44 17" class="m-traco-fundo" />
    <path d="M26 32V48L40 40Z" class="m-texto-c" />
  {:else if id === 'pais-distancia'}
    <circle cx="32" cy="32" r="26" class="m-mar" />
    <path d="M18 18c6-4 12-2 14 4s-2 8 2 12 2 10-4 10-12-6-12-12-6-10 0-14z" class="m-quente" /><path d="M40 14c6 0 12 6 10 12s-8 4-10 0-4-12 0-12z" class="m-morno" /><path d="M42 40c4-2 8 2 6 6s-6 4-8 0z" class="m-frio" />
  {:else if id === 'capital-distancia'}
    <circle cx="32" cy="32" r="26" class="m-mar" />
    <path d="M32 12a11 11 0 0 1 11 11c0 8-11 21-11 21S21 31 21 23a11 11 0 0 1 11-11z" class="m-pri" /><circle cx="32" cy="23" r="4" class="m-fundo-escuro" />
    <path d="M14 50l8-4M46 50l-6-4" class="m-traco" />
  {:else if id === 'pais-contorno'}
    <path d="M24 6c8 2 14 0 20 6s6 10 12 14-2 12-6 16-4 10-10 14-10 4-12-2-10-6-14-12 0-14 2-20 2-18 8-16z" class="m-terra" />
  {:else if id === 'bandeira-revelada'}
    <rect x="6" y="12" width="52" height="40" rx="3" class="m-suc" /><path d="M32 18L52 32L32 46L12 32Z" class="m-aviso" /><circle cx="32" cy="32" r="7" class="m-info" />
    {#each [[6, 12], [32, 12], [19, 32], [45, 32]] as [x, y], k (k)}<rect x={x} y={y} width="13" height="20" class="m-tampa" />{/each}
  {:else if id === 'descobre-bandeiras'}
    <rect x="6" y="10" width="52" height="34" rx="3" class="m-fundo-claro" /><rect x="6" y="10" width="17" height="34" class="m-info" /><rect x="41" y="10" width="17" height="34" class="m-erro-c" />
    <rect x="6" y="48" width="25" height="10" rx="2.5" class="m-ficha" /><rect x="33" y="48" width="25" height="10" rx="2.5" class="m-suc" />
  {:else if id === 'viagem-fronteiras'}
    <path d="M6 20l14-8 14 6 10-8 14 6v36l-14 6-10-8-14 6-14-6z" class="m-terra" />
    <path d="M14 44C22 30 30 40 38 28S48 22 52 18" class="m-rota" /><circle cx="14" cy="44" r="4" class="m-pri" /><circle cx="52" cy="18" r="4" class="m-sec" />
  {:else if id === 'pais-pistas'}
    <circle cx="27" cy="27" r="20" class="m-mar" /><path d="M16 20c6-4 12 0 12 6s-6 10-10 8-6-10-2-14z" class="m-terra" />
    <circle cx="27" cy="27" r="20" class="m-lupa" /><path d="M42 42L56 56" class="m-cabo" />
  {:else if id === 'paciencia'}
    {@render carta(14, 22, 0, '', false, true)}{@render carta(14, 30, 0, 'K', false)}
    {@render carta(32, 28, 0, '', false, true)}{@render carta(32, 36, 0, 'Q', true)}
    {@render carta(50, 34, 0, '', false, true)}{@render carta(50, 42, 0, 'J', false)}
  {:else if id === 'spider'}
    {@render carta(20, 30, -8, '9', false)}{@render carta(34, 32, 6, '8', false)}
    <circle cx="44" cy="16" r="5" class="m-preta-fixa" /><path d="M44 16l-9-6M44 16l9-6M44 16l-10 1M44 16l10 1M44 16l-8 8M44 16l8 8M44 3v8" class="m-pernas" />
  {:else if id === 'freecell'}
    {#each g4 as k (k)}<rect x={4 + k * 14.5} y="5" width="12" height="16" rx="2" class="m-celula" />{/each}
    {@render carta(14, 38, 0, '7', true)}{@render carta(32, 42, 0, '5', false)}{@render carta(50, 38, 0, 'A', true)}
  {:else if id === 'piramide'}
    {@render carta(32, 16, 0, '6', true)}{@render carta(23, 30, 0, '', false, true)}{@render carta(41, 30, 0, '7', false)}
    {@render carta(14, 46, 0, 'K', false)}{@render carta(32, 46, 0, '4', true)}{@render carta(50, 46, 0, '9', false)}
  {:else if id === 'tripeaks'}
    <path d="M4 52L16 20L28 52M22 52L32 28L42 52M36 52L48 20L60 52" class="m-montanha" />
    {@render carta(16, 22, 0, '8', true)}{@render carta(48, 22, 0, '9', false)}
  {:else if id === 'golf'}
    <rect x="4" y="44" width="56" height="16" rx="4" class="m-grama" />
    {@render carta(16, 26, -6, '3', true)}{@render carta(32, 24, 0, '4', false)}{@render carta(48, 26, 6, '5', true)}
  {:else if id === 'quatro'}
    <rect x="4" y="8" width="56" height="48" rx="5" class="m-info" />
    {#each g4 as y (y)}{#each g5 as x (x)}
      {@const c = [[0, 0, 0, 0, 0], [0, 0, 2, 0, 0], [0, 1, 2, 2, 0], [1, 2, 1, 1, 2]][y][x]}
      <circle cx={11 + x * 10.5} cy={15 + y * 11} r="4.3" class={c === 1 ? 'm-pri' : c === 2 ? 'm-sec' : 'm-fundo-escuro'} />
    {/each}{/each}
  {:else if id === 'damas'}
    {#each g4 as y (y)}{#each g4 as x (x)}<rect x={4 + x * 14} y={4 + y * 14} width="14" height="14" class={(x + y) % 2 ? 'm-casa-escura' : 'm-casa-clara'} />{/each}{/each}
    <circle cx="25" cy="11" r="5" class="m-preta-fixa" /><circle cx="53" cy="11" r="5" class="m-preta-fixa" /><circle cx="11" cy="53" r="5" class="m-branca-fixa" /><circle cx="39" cy="39" r="5" class="m-branca-fixa" />
  {:else if id === 'xadrez'}
    <!-- Rainha das peças do jogo (Cburnett): metade branca, metade preta. -->
    <defs>
      <clipPath id="m-xadrez-esq"><rect x="0" y="0" width="32" height="64" /></clipPath>
      <clipPath id="m-xadrez-dir"><rect x="32" y="0" width="32" height="64" /></clipPath>
    </defs>
    {#each g4 as y (y)}{#each g4 as x (x)}<rect x={4 + x * 14} y={4 + y * 14} width="14" height="14" class={(x + y) % 2 ? 'm-casa-escura' : 'm-casa-clara'} />{/each}{/each}
    <image href={rainhaBranca} x="6" y="5" width="52" height="52" clip-path="url(#m-xadrez-esq)" />
    <image href={rainhaPreta} x="6" y="5" width="52" height="52" clip-path="url(#m-xadrez-dir)" />
  {:else if id === 'reversi'}
    <rect x="4" y="4" width="56" height="56" rx="4" class="m-feltro" />
    {#each [1, 2, 3] as k (k)}<path d="M{4 + k * 14} 4V60M4 {4 + k * 14}H60" class="m-grade-feltro" />{/each}
    <circle cx="25" cy="25" r="5.5" class="m-branca-fixa" /><circle cx="39" cy="25" r="5.5" class="m-preta-fixa" /><circle cx="25" cy="39" r="5.5" class="m-preta-fixa" /><circle cx="39" cy="39" r="5.5" class="m-branca-fixa" /><circle cx="53" cy="25" r="5.5" class="m-preta-fixa" />
  {:else if id === 'trilha'}
    <rect x="6" y="6" width="52" height="52" class="m-linha" /><rect x="16" y="16" width="32" height="32" class="m-linha" /><rect x="26" y="26" width="12" height="12" class="m-linha" />
    <path d="M32 6V26M32 38V58M6 32H26M38 32H58" class="m-linha" />
    <circle cx="6" cy="6" r="4.5" class="m-pri" /><circle cx="32" cy="6" r="4.5" class="m-pri" /><circle cx="58" cy="6" r="4.5" class="m-pri" /><circle cx="16" cy="48" r="4.5" class="m-sec" /><circle cx="38" cy="32" r="4.5" class="m-sec" />
  {:else if id === 'naval'}
    <rect x="4" y="4" width="56" height="56" rx="4" class="m-mar" />
    {#each [1, 2, 3, 4, 5, 6] as k (k)}<path d="M{4 + k * 8} 4V60M4 {4 + k * 8}H60" class="m-grade-mar" />{/each}
    <rect x="13" y="21" width="30" height="7" rx="3.5" class="m-navio" /><rect x="45" y="37" width="7" height="15" rx="3.5" class="m-navio" />
    <path d="M18 42l6 6M24 42l-6 6" class="m-tiro" /><circle cx="37" cy="45" r="2" class="m-pingo" />
  {:else if id === 'general'}
    {@render dado(6, 8, 6, 22)}{@render dado(34, 6, 6, 22)}{@render dado(20, 34, 5, 22)}
  {:else if id === 'mentiroso'}
    <path d="M14 8h28l6 32H8z" class="m-copo" />
    {@render dado(36, 40, 3, 18)}{@render dado(14, 44, 1, 14)}
  {:else if id === 'vinte-e-um'}
    {@render carta(24, 30, -10, 'A', false)}{@render carta(40, 32, 8, 'K', true)}
    <rect x="18" y="50" width="28" height="10" rx="5" class="m-sec" /><text x="32" y="55.5" class="m-num-p m-sobre-t">21</text>
  {:else if id === 'quem'}
    <circle cx="32" cy="40" r="17" class="m-pele" /><circle cx="26" cy="42" r="2" class="m-preta-fixa" /><circle cx="38" cy="42" r="2" class="m-preta-fixa" /><path d="M27 49c3 3 7 3 10 0" class="m-traco-preto" />
    <rect x="12" y="4" width="40" height="20" rx="4" class="m-celular" /><text x="32" y="14.5" class="m-num-p m-sobre-t">?</text>
  {:else if id === 'go'}
    <rect x="4" y="4" width="56" height="56" rx="3" class="m-madeira" />
    {#each g5 as k (k)}<path d="M{12 + k * 10} 12V52M12 {12 + k * 10}H52" class="m-grade-go" />{/each}
    <circle cx="22" cy="22" r="4.6" class="m-preta-fixa" /><circle cx="32" cy="22" r="4.6" class="m-branca-fixa" /><circle cx="32" cy="32" r="4.6" class="m-preta-fixa" /><circle cx="42" cy="32" r="4.6" class="m-branca-fixa" /><circle cx="22" cy="42" r="4.6" class="m-branca-fixa" />
  {:else if id === 'ludo'}
    <rect x="4" y="4" width="22" height="22" rx="3" class="m-pri" /><rect x="38" y="4" width="22" height="22" rx="3" class="m-sec" /><rect x="4" y="38" width="22" height="22" rx="3" class="m-info" /><rect x="38" y="38" width="22" height="22" rx="3" class="m-aviso" />
    <path d="M32 26L38 32L32 38L26 32Z" class="m-texto-c" />
    {#each [[15, 15], [49, 15], [15, 49], [49, 49]] as [x, y], k (k)}<circle cx={x} cy={y} r="4.5" class="m-fundo-claro" />{/each}
  {:else if id === 'ur'}
    {#each [0, 1, 2] as y (y)}{#each [0, 1, 2, 3, 4, 5, 6, 7] as x (x)}{#if y === 1 || (x !== 4 && x !== 5)}<rect x={2 + x * 7.6} y={21 + y * 7.6} width="7" height="7" rx="1" class="m-casa-ur" />{/if}{/each}{/each}
    {#each [[0, 0], [0, 2], [3, 1], [6, 0], [6, 2]] as [x, y], k (k)}<path d="M{5.5 + x * 7.6} {21.5 + y * 7.6}l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" class="m-pri" />{/each}
    <circle cx="16.3" cy="28.6" r="2.4" class="m-branca-fixa" /><circle cx="47" cy="28.6" r="2.4" class="m-preta-fixa" />
  {:else if id === 'sinuca'}
    <rect x="2" y="8" width="60" height="48" rx="6" class="m-madeira" /><rect x="7" y="13" width="50" height="38" rx="2" class="m-feltro" />
    {#each [[40, 32, 'c1'], [45, 29, 'c3'], [45, 35, 'c2'], [50, 26, 'c5'], [50, 32, 'c8'], [50, 38, 'c6']] as [x, y, c], k (k)}<circle cx={x} cy={y} r="2.8" class="m-bola-{c}" />{/each}
    <circle cx="18" cy="32" r="2.8" class="m-branca-fixa" />
  {/if}
</svg>
{/if}
