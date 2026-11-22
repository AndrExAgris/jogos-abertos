<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import {
    ABERTA, BANDEIRA, LIMITES_MINAS, NIVEIS_MINAS, bandeirasRestantes, maximoDeMinas, minas, numero,
    validarConfig, type ConfigMinas, type EstadoMinas, type JogadaMinas, type NivelMinas,
  } from '@ja/nucleo-grade/minas';
  import Tela from '../../lib/Tela.svelte';
  import { layout } from '../../lib/layout.svelte.ts';
  import { apagar, gravar, ler } from '../../lib/armazenamento.ts';
  import { formatarTempo, registrarPartida } from '../../lib/estatisticas.ts';

  type Variante = NivelMinas | 'personalizado';

  interface Salvo {
    estado: string;
    tempo: number;
    variante: Variante;
  }
  interface Preferencias {
    variante: Variante;
    personalizado: ConfigMinas;
  }

  const ID = 'minas';
  const variantes: { id: Variante; nome: string }[] = [
    { id: 'facil', nome: 'Fácil' },
    { id: 'medio', nome: 'Médio' },
    { id: 'dificil', nome: 'Difícil' },
    { id: 'personalizado', nome: 'Personalizado' },
  ];

  let prefs = $state<Preferencias>({ variante: 'facil', personalizado: { largura: 12, altura: 12, minas: 20 } });
  let estado = $state<EstadoMinas | null>(null);
  let variante = $state<Variante>('facil');
  let modo = $state<'abrir' | 'bandeira'>('abrir');
  let tempo = $state(0);
  let inicioRelogio: number | null = null;
  let agora = $state(Date.now());
  let recorde = $state(false);
  let area = $state<DOMRectReadOnly | undefined>();
  const larguraDisponivel = $derived(area?.width ?? 320);

  let dialogoTrocar: HTMLDialogElement;
  let folhaPersonalizado: HTMLDialogElement;
  let trocaPendente: Variante | null = null;
  let campos = $state({ largura: 12, altura: 12, minas: 20 });
  const erroCampos = $derived(validarConfig(campos));

  const comecou = $derived(!!estado && estado.tabuleiro.length > 0);
  const acabou = $derived(!!estado && estado.resultado !== 'andamento');
  const tempoMostrado = $derived(tempo + (inicioRelogio !== null ? agora - inicioRelogio : 0));

  /** O Difícil fica em pé (16×30) em celular na vertical. */
  function configDe(v: Variante): ConfigMinas {
    if (v === 'personalizado') return prefs.personalizado;
    const n = NIVEIS_MINAS[v];
    const emPe = !layout.largo && window.innerHeight > window.innerWidth;
    return emPe && n.largura > n.altura ? { largura: n.altura, altura: n.largura, minas: n.minas } : n;
  }

  // Relógio: só corre com a partida começada, sem fim e com o app visível.
  function ligarRelogio() {
    if (inicioRelogio === null && comecou && !acabou && document.visibilityState === 'visible') inicioRelogio = Date.now();
  }
  function pararRelogio() {
    if (inicioRelogio !== null) {
      tempo += Date.now() - inicioRelogio;
      inicioRelogio = null;
    }
  }
  const tique = setInterval(() => (agora = Date.now()), 250);
  function aoMudarVisibilidade() {
    if (document.visibilityState === 'visible') ligarRelogio();
    else {
      pararRelogio();
      void salvar();
    }
  }

  async function salvar() {
    if (!estado) return;
    if (!comecou || acabou) {
      await apagar('partidas', ID);
      return;
    }
    const t = tempo + (inicioRelogio !== null ? Date.now() - inicioRelogio : 0);
    await gravar<Salvo>('partidas', ID, { estado: minas.serializar($state.snapshot(estado) as EstadoMinas), tempo: t, variante });
  }

  function novaPartida(v: Variante = variante) {
    pararRelogio();
    variante = v;
    estado = minas.novo(configDe(v), sementeNova());
    tempo = 0;
    recorde = false;
    modo = 'abrir';
    void apagar('partidas', ID);
  }

  async function terminar(e: EstadoMinas) {
    pararRelogio();
    await apagar('partidas', ID);
    recorde = await registrarPartida(ID, variante, e.resultado === 'vitoria', tempo);
    if (e.resultado === 'vitoria') navigator.vibrate?.([30, 60, 30]);
    else navigator.vibrate?.(200);
  }

  function jogar(j: JogadaMinas) {
    if (!estado || acabou) return;
    const antes = estado;
    const depois = minas.jogar(antes, j);
    if (depois === antes) return;
    estado = depois;
    ligarRelogio();
    if (depois.resultado !== 'andamento') void terminar(depois);
    else void salvar();
  }

  // Toque longo marca bandeira; o clique que vem depois dele é ignorado.
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let ignorarClique = false;
  let toqueLongoFeito = false;

  function aoPressionar(e: PointerEvent, i: number) {
    if (e.button !== 0) return;
    toqueLongoFeito = false;
    cancelarToque();
    temporizador = setTimeout(() => {
      temporizador = null;
      toqueLongoFeito = true;
      ignorarClique = true;
      marcar(i);
      navigator.vibrate?.(15);
    }, 400);
  }
  function cancelarToque() {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
  }
  function coord(i: number) {
    const w = estado!.largura;
    return { x: i % w, y: Math.floor(i / w) };
  }
  function marcar(i: number) {
    jogar({ tipo: 'bandeira', ...coord(i) });
  }
  function aoClicar(i: number) {
    if (ignorarClique) {
      ignorarClique = false;
      return;
    }
    if (!estado) return;
    // No modo bandeira, tocar num número aberto continua abrindo as vizinhas.
    if (modo === 'bandeira' && estado.casas[i] !== ABERTA) marcar(i);
    else jogar({ tipo: 'abrir', ...coord(i) });
  }
  function aoMenu(e: MouseEvent, i: number) {
    e.preventDefault();
    if (toqueLongoFeito) return;
    marcar(i);
  }
  function aoTecla(e: KeyboardEvent, i: number) {
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      marcar(i);
      return;
    }
    const w = estado!.largura;
    const h = estado!.altura;
    const { x, y } = coord(i);
    const destinos: Record<string, [number, number]> = {
      ArrowLeft: [x - 1, y], ArrowRight: [x + 1, y], ArrowUp: [x, y - 1], ArrowDown: [x, y + 1],
    };
    const d = destinos[e.key];
    if (!d) return;
    e.preventDefault();
    const [nx, ny] = d;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
    document.querySelector<HTMLButtonElement>(`[data-casa="${ny * w + nx}"]`)?.focus();
  }

  function pedirVariante(v: Variante) {
    if (v === 'personalizado') {
      campos = { ...prefs.personalizado };
      folhaPersonalizado.showModal();
      return;
    }
    if (v === variante && !comecou) return;
    if (comecou && !acabou) {
      trocaPendente = v;
      dialogoTrocar.showModal();
      return;
    }
    escolherVariante(v);
  }
  function escolherVariante(v: Variante) {
    prefs.variante = v;
    void gravar('preferencias', ID, $state.snapshot(prefs));
    novaPartida(v);
  }
  function confirmarTroca() {
    dialogoTrocar.close();
    if (trocaPendente === 'personalizado') {
      prefs.personalizado = { ...campos };
      escolherVariante('personalizado');
    } else if (trocaPendente) {
      escolherVariante(trocaPendente);
    } else {
      novaPartida();
    }
    trocaPendente = null;
  }
  function pedirNovaPartida() {
    if (comecou && !acabou) {
      trocaPendente = null;
      dialogoTrocar.showModal();
    } else {
      novaPartida();
    }
  }
  function comecarPersonalizado(e: SubmitEvent) {
    e.preventDefault();
    if (erroCampos) return;
    folhaPersonalizado.close();
    if (comecou && !acabou) {
      trocaPendente = 'personalizado';
      dialogoTrocar.showModal();
      return;
    }
    prefs.personalizado = { ...campos };
    escolherVariante('personalizado');
  }

  onMount(async () => {
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    const p = await ler<Preferencias>('preferencias', ID);
    if (p) prefs = { ...prefs, ...p };
    const s = await ler<Salvo>('partidas', ID);
    if (s) {
      try {
        estado = minas.desserializar(s.estado);
        tempo = s.tempo;
        variante = s.variante;
        ligarRelogio();
        return;
      } catch {
        await apagar('partidas', ID);
      }
    }
    novaPartida(prefs.variante);
  });

  onDestroy(() => {
    clearInterval(tique);
    cancelarToque();
    document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    pararRelogio();
    void salvar();
  });

  const tamanhoCasa = $derived.by(() => {
    if (!estado) return 32;
    const folga = 2 * estado.largura;
    return Math.max(18, Math.min(44, Math.floor((larguraDisponivel - folga) / estado.largura)));
  });

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
</script>

<Tela titulo="Minas" voltarPara="/" livre>
  {#snippet acoes()}
    <button class="botao botao-terciario botao-icone" type="button" aria-label="Nova partida" title="Nova partida" onclick={pedirNovaPartida}>
      <Icone nome="refresh" />
    </button>
  {/snippet}

  <div class="ja-jogo">
    <div class="ja-jogo-controles">
      <div class="segmentado ja-segmentado-largo" role="group" aria-label="Nível">
        {#each variantes as v (v.id)}
          <button type="button" aria-pressed={variante === v.id} onclick={() => pedirVariante(v.id)}>{v.nome}</button>
        {/each}
      </div>

      {#if estado}
        <div class="ja-placar">
          <div class="ja-placar-item">
            <Icone nome="flag" />
            <span class="sr-only">Minas restantes:</span>
            <span class="leitura-numero numeros-tabulares" style="--largura:3ch">{bandeirasRestantes(estado)}</span>
          </div>
          <div class="ja-placar-item">
            <Icone nome="clock" />
            <span class="sr-only">Tempo:</span>
            <span class="leitura-numero numeros-tabulares" style="--largura:5ch">{formatarTempo(tempoMostrado)}</span>
          </div>
          <div class="segmentado" role="group" aria-label="O que o toque faz">
            <button type="button" aria-pressed={modo === 'abrir'} onclick={() => (modo = 'abrir')}><Icone nome="shovel" pequeno /><span>Abrir</span></button>
            <button type="button" aria-pressed={modo === 'bandeira'} onclick={() => (modo = 'bandeira')}><Icone nome="flag" pequeno /><span>Bandeira</span></button>
          </div>
        </div>
      {/if}

      {#if estado && acabou}
        {#if estado.resultado === 'vitoria'}
          <div class="aviso" data-tipo="sucesso" role="status">
            <Icone nome="circle-check" />
            <div>
              <p class="aviso-titulo">{recorde ? 'Novo recorde!' : 'Você venceu!'}</p>
              <p>Tempo: {formatarTempo(tempo)}.</p>
            </div>
          </div>
        {:else}
          <div class="aviso" data-tipo="erro" role="status">
            <Icone nome="alert-triangle" />
            <div>
              <p class="aviso-titulo">Uma mina explodiu</p>
              <p>As minas que faltavam estão à mostra. Comece outra partida para tentar de novo.</p>
            </div>
          </div>
        {/if}
        <div class="grupo-acoes">
          <button class="botao botao-primario" type="button" onclick={() => novaPartida()}><Icone nome="refresh" /><span>Nova partida</span></button>
        </div>
      {:else if estado && !comecou}
        <p class="ui texto-2 ja-sem-margem">Toque em qualquer casa para começar. A primeira nunca tem mina, e o tabuleiro todo se resolve sem chute.</p>
      {/if}
    </div>

    <div class="ja-tabuleiro-area" bind:contentRect={area}>
      {#if estado}
        <div
          class="ja-minas"
          role="grid"
          aria-label="Tabuleiro do Minas, {estado.largura} por {estado.altura}"
          style="--ja-colunas:{estado.largura};--ja-casa:{tamanhoCasa}px"
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
              data-erro={acabou && c === BANDEIRA && !mina || undefined}
              data-n={n || undefined}
              aria-label={rotuloCasa(estado, i)}
              disabled={acabou}
              onclick={() => aoClicar(i)}
              oncontextmenu={(e) => aoMenu(e, i)}
              onpointerdown={(e) => aoPressionar(e, i)}
              onpointerup={cancelarToque}
              onpointerleave={cancelarToque}
              onpointercancel={cancelarToque}
              onkeydown={(e) => aoTecla(e, i)}
            >
              {#if c === BANDEIRA}
                <Icone nome={acabou && !mina ? 'x' : 'flag'} />
              {:else if aberta && mina}
                <Icone nome="bomb" />
              {:else if acabou && mina}
                <Icone nome="bomb" />
              {:else if n}
                {n}
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</Tela>

<dialog class="dialogo" bind:this={dialogoTrocar} aria-labelledby="mt-t">
  <h2 id="mt-t">Abandonar a partida atual?</h2>
  <p>A partida em andamento será descartada e não conta nas estatísticas.</p>
  <div class="grupo-acoes">
    <button class="botao botao-terciario" type="button" onclick={() => dialogoTrocar.close()}><span>Continuar jogando</span></button>
    <button class="botao botao-primario" type="button" onclick={confirmarTroca}><span>Começar outra</span></button>
  </div>
</dialog>

<dialog class="folha-inferior" bind:this={folhaPersonalizado} aria-labelledby="mp-t">
  <button class="folha-alca" type="button" aria-label="Fechar" onclick={() => folhaPersonalizado.close()}></button>
  <h2 id="mp-t">Tabuleiro personalizado</h2>
  <form class="ja-form" onsubmit={comecarPersonalizado}>
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
</dialog>
