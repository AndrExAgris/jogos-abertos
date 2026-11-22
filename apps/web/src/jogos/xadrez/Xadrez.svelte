<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { corDe, emXeque, jogarXadrez, lancesXadrez, novoXadrez, type EstadoXadrez, type Lance } from '@ja/nucleo-tabuleiro/xadrez';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import Status from '../../lib/jogo/Status.svelte';
  import Dialogo from '../../lib/jogo/Dialogo.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { usarComputador } from '../../lib/jogo/computador.svelte.ts';
  import { nivelDoId, opcoesIA, type NivelIA } from '../../lib/jogo/ia.ts';

  const imagens = import.meta.glob('../../../../../packages/ui/pecas/cburnett/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
  const img = (p: string) => imagens[Object.keys(imagens).find((k) => k.endsWith(`/${p === p.toUpperCase() ? 'w' : 'b'}${p.toUpperCase()}.svg`))!];
  const NOMES: Record<string, string> = { k: 'rei', q: 'dama', r: 'torre', b: 'bispo', n: 'cavalo', p: 'peão' };

  const s = new Sessao<{ modo: string; ia?: NivelIA }, EstadoXadrez>('xadrez', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Dois jogadores no mesmo aparelho; as brancas começam. Toque numa peça e depois na casa de destino; os pontos mostram os lances possíveis.',
    'Valem todas as regras: roque (mova o rei duas casas), en passant, promoção do peão, xeque-mate, afogamento, material insuficiente e 50 lances sem captura nem lance de peão.',
  ];
  let selecionada = $state(-1);
  const OPCOES = [...opcoesIA('Você de brancas contra o computador'), { id: '2', titulo: 'Dois jogadores', descricao: 'No mesmo aparelho' }];
  const ia = $derived(s.quebra?.ia);
  const pc = usarComputador<EstadoXadrez, Lance>({ jogo: 'xadrez', sessao: s, vez: (e) => e.vez === 'p', aplicar: (l) => jogar(l), atraso: 300 });
  function comecar(id: string) {
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id, ia: nivelDoId(id) }, estado: novoXadrez() }));
  }
  let promocao = $state<Lance[] | null>(null);
  let virar = $state(false);
  const lances = $derived(s.estado ? lancesXadrez(s.estado) : []);
  const destinos = $derived(lances.filter((l) => l.de === selecionada));
  const xeque = $derived(s.estado && !s.estado.fim && emXeque(s.estado) ? s.estado.casas.indexOf(s.estado.vez === 'b' ? 'K' : 'k') : -1);
  const ordem = $derived(virar ? Array.from({ length: 64 }, (_, i) => 63 - i) : Array.from({ length: 64 }, (_, i) => i));
  const textoFim = $derived.by(() => {
    const f = s.estado?.fim;
    if (!f) return '';
    if (f.tipo === 'mate') return ia ? (f.vencedor === 'b' ? 'Xeque-mate: você venceu!' : 'Xeque-mate: o computador venceu.') : `Xeque-mate: ${f.vencedor === 'b' ? 'brancas' : 'pretas'} venceram!`;
    return { afogamento: 'Empate por afogamento.', material: 'Empate: material insuficiente.', '50 lances': 'Empate pela regra dos 50 lances.' }[f.tipo];
  });

  function jogar(l: Lance) {
    if (!s.estado) return;
    const n = jogarXadrez(s.estado, l);
    selecionada = -1;
    s.mudar(n);
    if (n.fim) void s.terminar(!n.fim.vencedor ? 'empate' : ia && n.fim.vencedor === 'p' ? 'derrota' : 'vitoria');
  }
  function tocar(i: number) {
    if (!s.estado || s.terminou || (ia && s.estado.vez === 'p')) return;
    if (corDe(s.estado.casas[i]) === s.estado.vez) { selecionada = selecionada === i ? -1 : i; return; }
    const ls = destinos.filter((l) => l.para === i);
    if (!ls.length) { selecionada = -1; return; }
    if (ls.length > 1) { promocao = ls; return; }
    jogar(ls[0]);
  }
  const escura = (i: number) => ((i % 8) + Math.floor(i / 8)) % 2 === 1;
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Xadrez" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} aoDesfazer={pc.desfazer} tituloEscolha="Quem joga?" tituloFim={textoFim} textoFim="" semRelogio>
  {#snippet rodape()}
    <button class="botao botao-terciario" type="button" onclick={() => (virar = !virar)}><span>Girar tabuleiro</span></button>
  {/snippet}
  {#if s.estado}
    <Jogadores nomes={ia ? ['Você (brancas)', 'Computador'] : ['Brancas', 'Pretas']} vez={s.terminou ? -1 : s.estado.vez === 'b' ? 0 : 1} pensando={pc.pensando} />
    <Status texto={xeque >= 0 && !s.terminou ? 'Xeque!' : ''} />
    <div class="ja-centro">
      <div class="ja-tab ja-tab-grade ja-xadrez" style="--ja-colunas:8">
        {#each ordem as i (i)}
          {@const p = s.estado.casas[i]}
          <button
            type="button"
            class="ja-tab-casa"
            data-escura={escura(i) || undefined}
            data-selecionada={selecionada === i || undefined}
            data-ultimo={(s.estado.ultimo?.includes(i) && selecionada !== i) || undefined}
            data-xeque={xeque === i || undefined}
            aria-label="{String.fromCharCode(97 + (i % 8))}{8 - Math.floor(i / 8)}{p ? `, ${NOMES[p.toLowerCase()]} ${corDe(p) === 'b' ? 'branco' : 'preto'}` : ''}"
            onclick={() => tocar(i)}
          >
            {#if p}<img class="ja-peca-img" src={img(p)} alt="" />{/if}
            {#if destinos.some((l) => l.para === i)}<span class="ja-alvo-ponto ja-sobre"></span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>

<Dialogo aberto={!!promocao} titulo="Promover o peão a quê?" aoFechar={() => (promocao = null)}>
  <div class="ja-botoes">
    {#each promocao ?? [] as l (l.promocao)}
      <button class="botao" type="button" onclick={() => { const x = l; promocao = null; jogar(x); }}>
        <img class="ja-peca-mini" src={img(l.promocao!)} alt="" /><span>{NOMES[l.promocao!.toLowerCase()]}</span>
      </button>
    {/each}
  </div>
</Dialogo>
