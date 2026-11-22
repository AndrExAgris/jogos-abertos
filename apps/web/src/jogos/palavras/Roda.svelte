<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { criarAleatorio, sementeNova } from '@ja/contrato';
  import { gerarRoda, palavraExiste, type Roda } from '@ja/nucleo-palavras/roda';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { achadas: string[]; bonus: string[]; letras: string[]; dicas: number }
  const s = new Sessao<Roda, Estado>('roda');
  const OPCOES = [
    { id: '5', titulo: 'Cinco letras', descricao: 'Mais fácil' },
    { id: '6', titulo: 'Seis letras', descricao: 'Médio' },
    { id: '7', titulo: 'Sete letras', descricao: 'Mais palavras escondidas' },
  ];
  const COMO = [
    'Forme as palavras escondidas usando as letras da roda. Cada letra vale uma vez por palavra; as palavras têm de 3 letras até o tamanho da roda.',
    'Toque nas letras em ordem e depois em "Enviar". Palavras que existem mas não estão escondidas contam como bônus.',
    'Embaralhar troca a ordem das letras; Dica mostra uma letra de uma palavra que falta.',
  ];
  let atual = $state<number[]>([]);
  const palavra = $derived(s.estado ? atual.map((i) => s.estado!.letras[i]).join('') : '');

  function enviar() {
    if (!s.estado || !s.quebra || palavra.length < 3) return;
    const e = s.estado;
    if (e.achadas.includes(palavra) || e.bonus.includes(palavra)) { window.OpenDesign.toast({ texto: 'Essa já foi.' }); atual = []; return; }
    if (s.quebra.palavras.includes(palavra)) {
      const n = { ...e, achadas: [...e.achadas, palavra] };
      s.mudar(n, false);
      if (n.achadas.length === s.quebra.palavras.length) void s.terminar('vitoria');
    } else if (palavraExiste(palavra)) {
      s.mudar({ ...e, bonus: [...e.bonus, palavra] }, false);
      window.OpenDesign.toast({ texto: `Bônus: ${palavra.toUpperCase()}` });
    } else vibrar(80);
    atual = [];
  }
  function embaralhar() {
    if (!s.estado) return;
    atual = [];
    s.mudar({ ...s.estado, letras: criarAleatorio(sementeNova()).embaralhar([...s.estado.letras]) }, false);
  }
  function dica() {
    if (!s.estado || !s.quebra) return;
    s.mudar({ ...s.estado, dicas: s.estado.dicas + 1 }, false);
  }
  /** Letras reveladas por dica: a k-ésima dica revela uma letra a mais da primeira palavra que falta. */
  function revelado(p: string, i: number): boolean {
    if (!s.estado || !s.quebra) return false;
    const faltam = s.quebra.palavras.filter((x) => !s.estado!.achadas.includes(x));
    let resto = s.estado.dicas;
    for (const f of faltam) { const n = Math.min(resto, f.length - 1); if (f === p) return i < n; resto -= n; if (resto <= 0) return false; }
    return false;
  }
  const raio = 38;
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Roda de Letras" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => { const r = gerarRoda(Number(id) as 5 | 6 | 7, sementeNova()); return { quebra: r, estado: { achadas: [], bonus: [], letras: r.letras, dicas: 0 } }; })} semDesfazer textoFim={s.estado ? `${s.estado.bonus.length} palavras bônus, ${s.estado.dicas} dicas.` : ''}>
  {#snippet faixa()}{#if s.estado && s.quebra}<span class="ja-placar-item"><span class="ja-numero">{s.estado.achadas.length}</span> / {s.quebra.palavras.length}</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    {@const e = s.estado}
    <div class="ja-roda-palavras">
      {#each s.quebra.palavras as p (p)}
        <div class="ja-roda-palavra" aria-label={e.achadas.includes(p) ? p : `${p.length} letras`}>
          {#each p as l, i (i)}<span class="ja-roda-casa" data-achada={e.achadas.includes(p) || undefined}>{e.achadas.includes(p) || revelado(p, i) ? l : ''}</span>{/each}
        </div>
      {/each}
    </div>
    <div class="ja-roda-atual" aria-live="polite">{palavra.toUpperCase() || ' '}</div>
    <div class="ja-centro">
      <div class="ja-roda">
        {#each e.letras as l, i (i)}
          {@const ang = (2 * Math.PI * i) / e.letras.length - Math.PI / 2}
          <button type="button" class="ja-roda-letra" data-usada={atual.includes(i) || undefined} style="left:calc(50% + {raio * Math.cos(ang)}% - 26px);top:calc(50% + {raio * Math.sin(ang)}% - 26px)" onclick={() => !atual.includes(i) && (atual = [...atual, i])}>{l}</button>
        {/each}
      </div>
    </div>
    <div class="ja-botoes">
      <button class="botao" type="button" onclick={() => (atual = atual.slice(0, -1))} aria-label="Apagar letra"><Icone nome="backspace" /></button>
      <button class="botao" type="button" onclick={embaralhar} aria-label="Embaralhar"><Icone nome="refresh" /></button>
      <button class="botao" type="button" onclick={dica}><Icone nome="bulb" /><span>Dica</span></button>
      <button class="botao botao-primario" type="button" disabled={palavra.length < 3} onclick={enviar}><span>Enviar</span></button>
    </div>
  {/if}
</Casca>
