<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { criarAleatorio, sementeNova } from '@ja/contrato';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Config { pares: number; colunas: number; jogadores: number }
  interface Estado { cartas: number[]; achadas: boolean[]; viradas: number[]; tentativas: number; vez: number; pontos: number[] }
  const s = new Sessao<Config, Estado>('memoria', { pontuacao: (e) => -e.tentativas });
  const FIGURAS = ['star', 'moon', 'sun', 'cloud', 'leaf', 'fish', 'cat', 'dog', 'apple', 'car', 'bell', 'anchor', 'rocket', 'music', 'umbrella', 'flower', 'bike', 'key', 'gift', 'ghost', 'pizza', 'crown', 'diamond', 'feather'];
  const OPCOES = [
    { id: '6', titulo: 'Fácil', descricao: '6 pares' },
    { id: '8', titulo: 'Médio', descricao: '8 pares' },
    { id: '10', titulo: 'Difícil', descricao: '10 pares' },
    { id: '15', titulo: 'Muito difícil', descricao: '15 pares' },
    { id: '2j', titulo: '2 jogadores', descricao: '10 pares, alternando: quem acha um par joga de novo' },
  ];
  const COLUNAS: Record<number, number> = { 6: 3, 8: 4, 10: 4, 15: 5 };
  const COMO = [
    'Ache os pares. Toque em duas cartas para virá-las: se forem iguais, ficam abertas; se não, viram de novo.',
    'A dois, quem acha um par ganha um ponto e joga de novo. Ganha quem achar mais pares.',
  ];
  let travado = false;

  function escolher(id: string) {
    const dois = id === '2j';
    const pares = dois ? 10 : Number(id);
    const a = criarAleatorio(sementeNova());
    const figuras = a.embaralhar([...FIGURAS.keys()]).slice(0, pares);
    const cartas = a.embaralhar([...figuras, ...figuras]);
    const jogadores = dois ? 2 : 1;
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({
      quebra: { pares, colunas: COLUNAS[pares], jogadores },
      estado: { cartas, achadas: cartas.map(() => false), viradas: [], tentativas: 0, vez: 0, pontos: Array(jogadores).fill(0) },
    }));
  }
  function tocar(i: number) {
    const e = s.estado;
    if (!e || !s.quebra || s.terminou || travado || e.achadas[i] || e.viradas.includes(i)) return;
    const viradas = [...e.viradas, i];
    if (viradas.length < 2) { s.mudar({ ...e, viradas }, false); return; }
    const [a, b] = viradas;
    const tentativas = e.tentativas + 1;
    if (e.cartas[a] === e.cartas[b]) {
      const achadas = [...e.achadas];
      achadas[a] = achadas[b] = true;
      const pontos = [...e.pontos];
      pontos[e.vez]++;
      vibrar(20);
      s.mudar({ ...e, achadas, viradas: [], tentativas, pontos }, false);
      if (achadas.every(Boolean)) void s.terminar('vitoria');
      return;
    }
    s.mudar({ ...e, viradas, tentativas }, false);
    travado = true;
    setTimeout(() => {
      travado = false;
      if (!s.estado) return;
      s.mudar({ ...s.estado, viradas: [], vez: (s.estado.vez + 1) % (s.quebra?.jogadores ?? 1) }, false);
    }, 850);
  }
  const textoFim = $derived.by(() => {
    if (!s.estado || !s.quebra) return '';
    if (s.quebra.jogadores === 1) return `${s.estado.tentativas} tentativas.`;
    const [p1, p2] = s.estado.pontos;
    return p1 === p2 ? `Empate: ${p1} a ${p2}.` : `Jogador ${p1 > p2 ? 1 : 2} venceu, ${Math.max(p1, p2)} a ${Math.min(p1, p2)}.`;
  });
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Jogo da Memória" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha a partida" semDesfazer {textoFim}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.tentativas}</span> tentativas</span>{/if}{/snippet}
  {#if s.estado && s.quebra}
    {@const e = s.estado}
    {#if s.quebra.jogadores > 1}<Jogadores nomes={['Jogador 1', 'Jogador 2']} vez={s.terminou ? -1 : e.vez} pontos={e.pontos} />{/if}
    <div class="ja-centro">
      <div class="ja-memoria" style="--c:{s.quebra.colunas};--r:{Math.ceil(e.cartas.length / s.quebra.colunas)}">
        {#each e.cartas as f, i (i)}
          {@const aberta = e.achadas[i] || e.viradas.includes(i)}
          <button type="button" class="ja-memoria-carta" data-aberta={aberta || undefined} data-achada={e.achadas[i] || undefined} aria-label={aberta ? `Carta ${i + 1}: ${FIGURAS[f]}` : `Carta ${i + 1}, virada`} onclick={() => tocar(i)}>
            <span class="ja-memoria-frente ja-paleta-{f % 15}"><Icone nome={FIGURAS[f]} /></span>
            <span class="ja-memoria-verso"></span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
