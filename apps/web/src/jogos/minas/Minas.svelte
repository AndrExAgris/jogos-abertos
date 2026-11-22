<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import {
    ABERTA, BANDEIRA, LIMITES_MINAS, NIVEIS_MINAS, bandeirasRestantes, maximoDeMinas, minas, numero,
    validarConfig, type ConfigMinas, type EstadoMinas, type JogadaMinas, type NivelMinas,
  } from '@ja/nucleo-grade/minas';
  import TelaJogo from '../../lib/jogo/TelaJogo.svelte';
  import Escolha from '../../lib/jogo/Escolha.svelte';
  import Fim from '../../lib/jogo/Fim.svelte';
  import Dialogo from '../../lib/jogo/Dialogo.svelte';
  import { Relogio } from '../../lib/jogo/relogio.svelte.ts';
  import { apagarPartida, lerPartida, lerPreferencias, salvarPartida, salvarPreferencias, vibrar } from '../../lib/jogo/partida.ts';
  import { layout } from '../../lib/layout.svelte.ts';
  import { formatarTempo, registrarPartida } from '../../lib/estatisticas.ts';

  type Variante = NivelMinas | 'personalizado';
  interface Salvo { estado: string; tempo: number; variante: Variante; casa?: number }
  interface Preferencias { personalizado: ConfigMinas }

  const ID = 'minas';
  const COMO_JOGAR = [
    'Toque para marcar bandeira, segure para abrir uma casa.',
    'Os números dizem quantas minas há nas casas vizinhas. Abra todas as casas sem mina para vencer. A primeira casa aberta nunca tem mina, e o tabuleiro sempre se resolve sem chute.',
    'Tocar ou segurar num número que já tem as bandeiras certas em volta abre as vizinhas de uma vez. Use dois dedos, ou os botões + e −, para aproximar o tabuleiro.',
  ];
  const nomes: Record<Variante, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', personalizado: 'Personalizado' };

  let prefs = $state<Preferencias>({ personalizado: { largura: 12, altura: 12, minas: 20 } });
  let fase = $state<'carregando' | 'escolha' | 'jogo'>('carregando');
  let estado = $state<EstadoMinas | null>(null);
  let variante = $state<Variante>('facil');
  const relogio = new Relogio();
  let recorde = $state(false);
  let ajuda = $state(false);
  let folhaPersonalizado = $state(false);
  let avisoPrimeira = $state(false);
  let campos = $state({ largura: 12, altura: 12, minas: 20 });
  const erroCampos = $derived(validarConfig(campos));

  const comecou = $derived(!!estado && estado.tabuleiro.length > 0);
  const acabou = $derived(!!estado && estado.resultado !== 'andamento');

  const opcoes = $derived([
    ...(['facil', 'medio', 'dificil'] as NivelMinas[]).map((n) => {
      const c = configDe(n);
      return { id: n, titulo: nomes[n], descricao: `${c.largura} × ${c.altura}, ${c.minas} minas` };
    }),
    { id: 'personalizado', titulo: 'Personalizado', descricao: `Você escolhe o tamanho e as minas (agora ${prefs.personalizado.largura} × ${prefs.personalizado.altura}, ${prefs.personalizado.minas} minas)` },
  ]);

  /** O Difícil fica em pé (16×30) em celular na vertical. */
  function configDe(v: Variante): ConfigMinas {
    if (v === 'personalizado') return prefs.personalizado;
    const n = NIVEIS_MINAS[v];
    const emPe = !layout.largo && window.innerHeight > window.innerWidth;
    return emPe && n.largura > n.altura ? { largura: n.altura, altura: n.largura, minas: n.minas } : n;
  }

  async function salvar() {
    if (!estado || !comecou || acabou) return;
    await salvarPartida<Salvo>(ID, { estado: minas.serializar($state.snapshot(estado) as EstadoMinas), tempo: relogio.ms, variante, casa });
  }

  function comecar(v: Variante) {
    variante = v;
    estado = minas.novo(configDe(v), sementeNova());
    relogio.zerar();
    recorde = false;
    casa = casaInicial(estado.largura);
    fase = 'jogo';
    void apagarPartida(ID);
  }

  function escolher(id: string) {
    if (id === 'personalizado') {
      campos = { ...prefs.personalizado };
      folhaPersonalizado = true;
      return;
    }
    comecar(id as Variante);
  }

  function voltarParaEscolha() {
    relogio.zerar();
    estado = null;
    fase = 'escolha';
    void apagarPartida(ID);
  }

  async function terminar(e: EstadoMinas) {
    relogio.parar();
    await apagarPartida(ID);
    recorde = await registrarPartida(ID, variante, e.resultado === 'vitoria', relogio.ms, nomeVariante());
    vibrar(e.resultado === 'vitoria' ? [30, 60, 30] : 200);
  }

  function nomeVariante() {
    if (!estado) return nomes[variante];
    return variante === 'personalizado'
      ? `Personalizado (${estado.largura}×${estado.altura}, ${estado.minas} minas)`
      : `${nomes[variante]} (${estado.largura}×${estado.altura}, ${estado.minas} minas)`;
  }

  function jogar(j: JogadaMinas) {
    if (!estado || acabou) return;
    const depois = minas.jogar(estado, j);
    if (depois === estado) return;
    estado = depois;
    if (depois.tabuleiro.length) relogio.iniciar();
    if (depois.resultado !== 'andamento') void terminar(depois);
    else void salvar();
  }

  // --- Toque: tocar marca bandeira, segurar abre ---
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let segurou = false;
  let casaPressionada = -1;

  function coord(i: number) {
    const w = estado!.largura;
    return { x: i % w, y: Math.floor(i / w) };
  }
  function abrir(i: number) {
    jogar({ tipo: 'abrir', ...coord(i) });
  }
  function marcar(i: number) {
    if (!estado) return;
    if (!comecou) {
      avisoPrimeira = true;
      return;
    }
    // Tocar num número aberto abre as vizinhas, quando as bandeiras batem.
    if (estado.casas[i] === ABERTA) abrir(i);
    else jogar({ tipo: 'bandeira', ...coord(i) });
  }
  function aoPressionar(e: PointerEvent, i: number) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pinçando) return;
    segurou = false;
    casaPressionada = i;
    cancelarToque();
    temporizador = setTimeout(() => {
      temporizador = null;
      segurou = true;
      vibrar(20);
      abrir(i);
    }, 380);
  }
  function cancelarToque() {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
  }
  function aoSoltar(i: number) {
    const eraToque = temporizador !== null && casaPressionada === i;
    cancelarToque();
    if (eraToque && !segurou && !pinçando) marcar(i);
    casaPressionada = -1;
  }
  function aoTecla(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(i); return; }
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); marcar(i); return; }
    const w = estado!.largura, h = estado!.altura;
    const { x, y } = coord(i);
    const d: Record<string, [number, number]> = { ArrowLeft: [x - 1, y], ArrowRight: [x + 1, y], ArrowUp: [x, y - 1], ArrowDown: [x, y + 1] };
    const alvo = d[e.key];
    if (!alvo) return;
    e.preventDefault();
    const [nx, ny] = alvo;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h) document.querySelector<HTMLButtonElement>(`[data-casa="${ny * w + nx}"]`)?.focus();
  }

  // --- Zoom: pinça com dois dedos ou botões ---
  const CASA_MIN = 16;
  const CASA_MAX = 64;
  let area = $state<HTMLDivElement>();
  let casa = $state(32);
  let pinçando = false;
  let distanciaInicial = 0;
  let casaInicialPinça = 32;

  function casaInicial(colunas: number): number {
    const largura = (area?.clientWidth ?? window.innerWidth) - 32;
    const cabe = Math.floor((largura - 2 * colunas) / colunas);
    // No celular, nunca menor que 30 px para os números ficarem legíveis; o tabuleiro rola.
    const minimo = layout.largo ? 22 : 30;
    return Math.max(minimo, Math.min(44, cabe));
  }
  function mudarZoom(fator: number) {
    casa = Math.round(Math.max(CASA_MIN, Math.min(CASA_MAX, casa * fator)));
  }
  const distanciaToques = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  // Eventos de toque (e não de ponteiro): continuam chegando mesmo quando o navegador rola a área.
  $effect(() => {
    const el = area;
    if (!el) return;
    const inicio = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinçando = true;
        cancelarToque();
        distanciaInicial = distanciaToques(e.touches);
        casaInicialPinça = casa;
      }
    };
    const mover = (e: TouchEvent) => {
      if (!pinçando || e.touches.length !== 2 || distanciaInicial <= 0) return;
      e.preventDefault();
      casa = Math.round(Math.max(CASA_MIN, Math.min(CASA_MAX, (casaInicialPinça * distanciaToques(e.touches)) / distanciaInicial)));
    };
    const fim = (e: TouchEvent) => {
      if (e.touches.length === 0) setTimeout(() => (pinçando = false), 80);
    };
    el.addEventListener('touchstart', inicio, { passive: true });
    el.addEventListener('touchmove', mover, { passive: false });
    el.addEventListener('touchend', fim, { passive: true });
    el.addEventListener('touchcancel', fim, { passive: true });
    return () => {
      el.removeEventListener('touchstart', inicio);
      el.removeEventListener('touchmove', mover);
      el.removeEventListener('touchend', fim);
      el.removeEventListener('touchcancel', fim);
    };
  });

  function confirmarPersonalizado(e: SubmitEvent) {
    e.preventDefault();
    if (erroCampos) return;
    prefs.personalizado = { ...campos };
    void salvarPreferencias(ID, $state.snapshot(prefs));
    folhaPersonalizado = false;
    comecar('personalizado');
  }

  function rotuloCasa(e: EstadoMinas, i: number): string {
    const { x, y } = coord(i);
    const pos = `linha ${y + 1}, coluna ${x + 1}`;
    const c = e.casas[i];
    if (c === BANDEIRA) return `${pos}, bandeira`;
    if (c !== ABERTA) return acabou && e.tabuleiro[i] ? `${pos}, mina` : `${pos}, fechada`;
    if (e.tabuleiro[i]) return `${pos}, mina que explodiu`;
    const n = numero(e, i);
    return n ? `${pos}, ${n}` : `${pos}, vazia`;
  }

  onMount(async () => {
    prefs = await lerPreferencias<Preferencias>(ID, prefs);
    const s = await lerPartida<Salvo>(ID);
    if (s) {
      try {
        estado = minas.desserializar(s.estado);
        variante = s.variante;
        relogio.zerar(s.tempo);
        casa = s.casa ?? casaInicial(estado.largura);
        fase = 'jogo';
        if (estado.tabuleiro.length && estado.resultado === 'andamento') relogio.iniciar();
        return;
      } catch {
        await apagarPartida(ID);
      }
    }
    fase = 'escolha';
  });

  onDestroy(() => {
    cancelarToque();
    relogio.parar();
    void salvar();
    relogio.destruir();
  });

  $effect(() => {
    // Salva ao ir para segundo plano (o relógio já pausa sozinho).
    const aoEsconder = () => { if (document.visibilityState === 'hidden') void salvar(); };
    document.addEventListener('visibilitychange', aoEsconder);
    return () => document.removeEventListener('visibilitychange', aoEsconder);
  });
</script>

<TelaJogo titulo="Campo Minado" comoJogar={COMO_JOGAR} bind:ajudaAberta={ajuda} semAjudaNaBarra aoNova={fase === 'jogo' ? voltarParaEscolha : undefined}>
  {#if fase === 'escolha'}
    <Escolha opcoes={opcoes} aoEscolher={escolher} />
  {:else if fase === 'jogo' && estado}
    <div class="ja-minas-tela">
      <div class="ja-minas-faixa">
        <div class="ja-placar-item">
          <Icone nome="flag" />
          <span class="sr-only">Minas restantes:</span>
          <span class="ja-numero">{bandeirasRestantes(estado)}</span>
        </div>
        <div class="ja-placar-item ja-relogio">
          <Icone nome="clock" />
          <span class="sr-only">Tempo:</span>
          <span class="ja-numero">{formatarTempo(relogio.ms)}</span>
        </div>
        <div class="ja-minas-ajuda">
          <button class="botao botao-terciario" type="button" onclick={() => (ajuda = true)}><Icone nome="help-circle" /><span>Como jogar</span></button>
        </div>
      </div>

      {#if acabou}
        <Fim
          tipo={estado.resultado === 'vitoria' ? 'vitoria' : 'derrota'}
          titulo={estado.resultado === 'vitoria' ? (recorde ? 'Novo recorde!' : 'Você venceu!') : 'Uma mina explodiu'}
          texto={estado.resultado === 'vitoria' ? `${nomes[variante]}, tempo ${formatarTempo(relogio.ms)}.` : 'As minas que faltavam estão à mostra.'}
          aoNova={voltarParaEscolha}
        />
      {/if}

      <div
        class="ja-zoom-area"
        bind:this={area}
      >
        <div
          class="ja-minas"
          role="grid"
          aria-label="Tabuleiro do Campo Minado, {estado.largura} por {estado.altura}"
          style="--ja-colunas:{estado.largura};--ja-casa:{casa}px"
          data-fim={acabou ? estado.resultado : undefined}
        >
          {#each estado.casas as c, i (i)}
            {@const aberta = c === ABERTA}
            {@const mina = estado.tabuleiro.length > 0 && estado.tabuleiro[i] === 1}
            {@const n = aberta && !mina ? numero(estado, i) : 0}
            <button
              type="button"
              class="ja-minas-casa"
              data-casa={i}
              data-aberta={aberta || undefined}
              data-explodida={estado.explodida === i || undefined}
              data-erro={(acabou && c === BANDEIRA && !mina) || undefined}
              data-n={n || undefined}
              aria-label={rotuloCasa(estado, i)}
              disabled={acabou}
              oncontextmenu={(e) => e.preventDefault()}
              onpointerdown={(e) => aoPressionar(e, i)}
              onpointerup={() => aoSoltar(i)}
              onpointerleave={cancelarToque}
              onpointercancel={cancelarToque}
              onkeydown={(e) => aoTecla(e, i)}
            >
              {#if c === BANDEIRA}
                <Icone nome={acabou && !mina ? 'x' : 'flag'} />
              {:else if mina && (aberta || acabou)}
                <Icone nome="bomb" />
              {:else if n}
                {n}
              {/if}
            </button>
          {/each}
        </div>
      </div>
      <div class="ja-zoom-botoes">
        <button class="botao botao-icone" type="button" aria-label="Afastar" title="Afastar" onclick={() => mudarZoom(1 / 1.2)}><Icone nome="zoom-out" /></button>
        <button class="botao botao-icone" type="button" aria-label="Aproximar" title="Aproximar" onclick={() => mudarZoom(1.2)}><Icone nome="zoom-in" /></button>
      </div>
    </div>
  {/if}
</TelaJogo>

<Dialogo bind:aberto={avisoPrimeira} titulo="Segure para abrir">
  <p>A primeira jogada é abrir uma casa: segure o dedo sobre qualquer casa. Tocar marca bandeira.</p>
  {#snippet acoes()}
    <button class="botao botao-primario" type="button" onclick={() => (avisoPrimeira = false)}><span>Entendi</span></button>
  {/snippet}
</Dialogo>

<Dialogo bind:aberto={folhaPersonalizado} titulo="Tabuleiro personalizado" folha>
  <form class="ja-form" onsubmit={confirmarPersonalizado}>
    <div class="ja-campos-3">
      <div class="campo">
        <label for="mp-l">Largura</label>
        <input class="entrada numeros-tabulares" id="mp-l" type="number" inputmode="numeric" min={LIMITES_MINAS.minLado} max={LIMITES_MINAS.maxLado} bind:value={campos.largura}>
      </div>
      <div class="campo">
        <label for="mp-a">Altura</label>
        <input class="entrada numeros-tabulares" id="mp-a" type="number" inputmode="numeric" min={LIMITES_MINAS.minLado} max={LIMITES_MINAS.maxLado} bind:value={campos.altura}>
      </div>
      <div class="campo" data-estado={erroCampos ? 'erro' : undefined}>
        <label for="mp-m">Minas</label>
        <input class="entrada numeros-tabulares" id="mp-m" type="number" inputmode="numeric" min="1" max={maximoDeMinas(campos.largura || 0, campos.altura || 0)} bind:value={campos.minas} aria-invalid={!!erroCampos} aria-describedby="mp-erro">
      </div>
    </div>
    {#if erroCampos}
      <span class="mensagem mensagem-erro" id="mp-erro"><Icone nome="alert-triangle" pequeno />{erroCampos}</span>
    {:else}
      <span class="ajuda" id="mp-erro">Lados de {LIMITES_MINAS.minLado} a {LIMITES_MINAS.maxLado}. A primeira casa e as vizinhas ficam sempre livres.</span>
    {/if}
    <div class="grupo-acoes">
      <button class="botao botao-primario" type="submit" disabled={!!erroCampos}><span>Começar partida</span></button>
    </div>
  </form>
</Dialogo>
