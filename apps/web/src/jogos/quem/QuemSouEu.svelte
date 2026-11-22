<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { CATEGORIAS_QUEM, baralhoQuem, type CartaQuem } from '@ja/nucleo-trivia/quem';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { lerPreferencias, salvarPreferencias, vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { baralho: CartaQuem[]; pos: number; resultados: { carta: CartaQuem; certo: boolean }[] }
  const s = new Sessao<{ categoria: string; segundos: number }, Estado>('quem', { semRelogio: true, pontuacao: (e) => e.resultados.filter((r) => r.certo).length });
  const OPCOES = [
    ...CATEGORIAS_QUEM.map((c) => ({ id: c.id, titulo: c.nome, descricao: `${c.itens.length} cartas` })),
    { id: 'todas', titulo: 'Tudo misturado', descricao: 'Cartas de todas as categorias' },
  ];
  const COMO = [
    'Escolha a categoria e ponha o celular deitado na testa, com a tela para fora, depois da contagem 3, 2, 1. Os outros dão dicas (ou fazem mímica) e você tenta adivinhar o que aparece.',
    'Acertou: incline a tela para baixo, ou toque na metade direita. Quer pular: incline para cima, ou toque na metade esquerda.',
    'O nome aparece deitado e na posição certa, com a rotação automática da tela ligada ou desligada. No fim do tempo, aparece a lista do que você acertou.',
  ];
  let segundos = $state(60);
  /** 'pronto' (antes de pôr na testa), 'contagem', 'jogando', 'fim'. */
  let etapa = $state<'pronto' | 'contagem' | 'jogando' | 'fim'>('pronto');
  let contagem = $state(3);
  let restante = $state(60);
  let flash = $state<'certo' | 'passou' | null>(null);
  let giro = $state(90);
  let retrato = $state(true);
  let neutro = true;
  let relogio: ReturnType<typeof setInterval> | undefined;
  let trava: WakeLockSentinel | null = null;

  function comecar(id: string) {
    void salvarPreferencias('quem', { segundos });
    etapa = 'pronto';
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { categoria: id, segundos }, estado: { baralho: baralhoQuem(id, sementeNova()), pos: 0, resultados: [] } }));
  }
  async function iniciarContagem() {
    try { trava = await navigator.wakeLock?.request('screen'); } catch { /* sem trava de tela */ }
    etapa = 'contagem';
    contagem = 3;
    vibrar(30);
    const t = setInterval(() => {
      contagem--;
      vibrar(30);
      if (contagem <= 0) {
        clearInterval(t);
        etapa = 'jogando';
        restante = s.quebra?.segundos ?? 60;
        neutro = true;
        relogio = setInterval(() => {
          restante--;
          if (restante <= 5 && restante > 0) vibrar(20);
          if (restante <= 0) terminar();
        }, 1000);
      }
    }, 1000);
  }
  function responder(certo: boolean) {
    const e = s.estado;
    if (!e || etapa !== 'jogando' || flash) return;
    vibrar(certo ? 60 : [20, 40, 20]);
    flash = certo ? 'certo' : 'passou';
    const resultados = [...e.resultados, { carta: e.baralho[e.pos % e.baralho.length], certo }];
    setTimeout(() => {
      flash = null;
      if (!s.estado) return;
      s.mudar({ ...s.estado, pos: s.estado.pos + 1, resultados }, false);
    }, 650);
  }
  function terminar() {
    clearInterval(relogio);
    etapa = 'fim';
    void trava?.release();
    trava = null;
    vibrar([80, 60, 80]);
    void s.terminar('vitoria');
  }
  // Inclinar: tela para baixo = acertou; para cima = passou. Volta ao meio entre uma e outra.
  function aoMover(ev: DeviceMotionEvent) {
    const g = ev.accelerationIncludingGravity;
    if (!g || g.x == null || g.z == null) return;
    // Em pé com rotação travada: gira o cartão para o lado que estiver para cima.
    if (Math.abs(g.x) > 6) giro = g.x > 0 ? 90 : -90;
    if (etapa !== 'jogando') return;
    if (neutro && g.z < -7) { neutro = false; responder(true); }
    else if (neutro && g.z > 7) { neutro = false; responder(false); }
    else if (Math.abs(g.z) < 4) neutro = true;
  }
  function medir() { retrato = window.innerHeight > window.innerWidth; }
  const carta = $derived(s.estado ? s.estado.baralho[s.estado.pos % s.estado.baralho.length] : null);
  const acertos = $derived(s.estado?.resultados.filter((r) => r.certo).length ?? 0);
  onMount(async () => {
    medir();
    segundos = (await lerPreferencias('quem', { segundos: 60 })).segundos;
    await s.carregar();
    if (s.fase === 'jogo' && s.terminou) etapa = 'fim';
  });
  onDestroy(() => { clearInterval(relogio); void trava?.release(); s.destruir(); });
</script>

<svelte:window ondevicemotion={aoMover} onresize={medir} />

<Casca sessao={s} titulo="Quem Sou Eu" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} tituloEscolha="Escolha a categoria" semRelogio semDesfazer
  tituloFim={`${acertos} ${acertos === 1 ? 'acerto' : 'acertos'}`} textoFim={s.recorde ? 'Novo recorde nesta categoria!' : ''}>
  {#snippet antesDaEscolha()}
    <div class="segmentado ja-segmentado-largo" role="group" aria-label="Tempo da rodada">
      {#each [30, 60, 90, 120] as t (t)}<button type="button" aria-pressed={segundos === t} onclick={() => (segundos = t)}>{t < 60 ? `${t} s` : `${t / 60}${t % 60 ? ',5' : ''} min`}</button>{/each}
    </div>
  {/snippet}
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{acertos}</span> acertos</span>{/if}{/snippet}
  {#if s.estado}
    {#if etapa === 'pronto' && !s.terminou}
      <div class="ja-passar">
        <Icone nome="device-mobile-rotated" />
        <p class="ui-subtitulo">{s.nomeVariante}</p>
        <p class="ja-dica">Toque em começar e ponha o celular deitado na testa, com a tela para fora. Você terá 3 segundos.</p>
        <button class="botao botao-primario ja-botao-alto" type="button" onclick={iniciarContagem}><Icone nome="player-play" /><span>Começar</span></button>
      </div>
    {:else if s.terminou}
      <ul class="ja-quem-resultados">
        {#each s.estado.resultados as r, k (k)}
          <li data-certo={r.certo || undefined}><Icone nome={r.certo ? 'check' : 'x'} pequeno /><span>{r.carta.n}</span></li>
        {/each}
      </ul>
    {/if}
  {/if}
</Casca>

{#if s.estado && (etapa === 'contagem' || (etapa === 'jogando' && !s.terminou))}
  <div class="ja-quem-tela" data-flash={flash ?? undefined}>
    <div class="ja-quem-cartao" style={retrato ? `--giro:${giro}deg` : '--giro:0deg'} data-retrato={retrato || undefined}>
      {#if etapa === 'contagem'}
        {#key contagem}<span class="ja-quem-contagem">{contagem}</span>{/key}
      {:else if flash}
        <span class="ja-quem-nome">{flash === 'certo' ? 'Acertou!' : 'Passou'}</span>
      {:else if carta}
        <span class="ja-quem-tempo" data-pouco={restante <= 10 || undefined}>{restante}</span>
        <span class="ja-quem-nome">{carta.n}</span>
        {#if carta.o}<span class="ja-quem-origem">{carta.o}</span>{/if}
      {/if}
      {#if etapa === 'jogando'}
        <button class="ja-quem-lado" data-lado="passou" type="button" aria-label="Passar" onclick={() => responder(false)}></button>
        <button class="ja-quem-lado" data-lado="certo" type="button" aria-label="Acertou" onclick={() => responder(true)}></button>
      {/if}
    </div>
    {#if etapa === 'jogando'}
      <button class="botao botao-terciario ja-quem-sair" type="button" onclick={terminar}><Icone nome="x" /><span>Encerrar</span></button>
    {/if}
  </div>
{/if}
