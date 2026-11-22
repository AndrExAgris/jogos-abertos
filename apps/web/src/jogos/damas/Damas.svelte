<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { contarDamas, jogarDamas, lancesDamas, novasDamas, type EstadoDamas } from '@ja/nucleo-tabuleiro/damas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';

  const s = new Sessao<{ modo: string }, EstadoDamas>('damas', { semRelogio: true, semEstatisticas: true });
  const COMO = [
    'Regra brasileira. As peças andam uma casa na diagonal para a frente e capturam pulando a peça do outro, para a frente ou para trás.',
    'Capturar é obrigatório, e vale a lei da maioria: entre as capturas possíveis, faça a que toma mais peças. Numa captura em sequência, a peça continua pulando.',
    'Chegando à última linha, a peça vira dama: anda e captura em qualquer distância na diagonal. Vence quem deixar o outro sem lances.',
  ];
  let selecionada = $state(-1);
  const lances = $derived(s.estado ? lancesDamas(s.estado) : []);
  const origens = $derived(new Set(lances.map((l) => l.de)));
  const destinos = $derived(lances.filter((l) => l.de === selecionada));
  const contagem = $derived(s.estado ? contarDamas(s.estado) : [0, 0]);

  function tocar(i: number) {
    if (!s.estado || s.terminou) return;
    if (origens.has(i)) { selecionada = selecionada === i ? -1 : i; return; }
    const l = destinos.find((d) => d.caminho[d.caminho.length - 1] === i);
    if (!l) return;
    const n = jogarDamas(s.estado, l);
    selecionada = -1;
    s.mudar(n);
    if (n.vencedor) void s.terminar('vitoria');
  }
  const escura = (i: number) => ((i % 8) + Math.floor(i / 8)) % 2 === 1;
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Damas" comoJogar={COMO} opcoes={[{ id: '2', titulo: 'Dois jogadores', descricao: 'Regra brasileira, no mesmo aparelho' }]} aoEscolher={(id) => s.comecar(id, 'Regra brasileira', () => ({ quebra: { modo: id }, estado: novasDamas() }))} tituloFim={s.estado ? `Jogador ${s.estado.vencedor} venceu!` : ''} textoFim="" semRelogio>
  {#if s.estado}
    <Jogadores nomes={['Jogador 1', 'Jogador 2']} vez={s.terminou ? -1 : s.estado.vez - 1} pontos={contagem} />
    {#if lances[0]?.capturadas.length && !s.terminou}<p class="ja-dica">Captura obrigatória ({lances[0].capturadas.length} {lances[0].capturadas.length > 1 ? 'peças' : 'peça'}).</p>{/if}
    <div class="ja-centro">
      <div class="ja-tab ja-tab-grade" style="--ja-colunas:8">
        {#each s.estado.casas as c, i (i)}
          <button
            type="button"
            class="ja-tab-casa"
            data-escura={escura(i) || undefined}
            data-selecionada={selecionada === i || undefined}
            aria-label="Casa {i + 1}{c ? `, ${c >= 3 ? 'dama' : 'peça'} do jogador ${c % 2 === 1 ? 1 : 2}` : ''}"
            onclick={() => tocar(i)}
          >
            {#if c}<span class="ja-disco ja-j{c % 2 === 1 ? 1 : 2}">{#if c >= 3}<Icone nome="crown" />{/if}</span>
            {:else if destinos.some((d) => d.caminho[d.caminho.length - 1] === i)}<span class="ja-alvo-ponto"></span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
