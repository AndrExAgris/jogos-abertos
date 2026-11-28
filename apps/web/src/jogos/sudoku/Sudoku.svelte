<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { NOMES_REGRAS, candidatos, casasProibidas, conflitos, type Dificuldade, type Quebra, type Regra } from '@ja/nucleo-grade/sudoku';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Dialogo from '../../lib/jogo/Dialogo.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { lerPreferencias, salvarPreferencias, vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { grade: number[]; notas: number[]; erros: number }

  const ID = 'sudoku';
  const s = new Sessao<Quebra, Estado>(ID);
  const TODAS: Regra[] = ['diagonais', 'anti-rei', 'anti-cavalo', 'nao-consecutivo', 'killer', 'kropki', 'xv', 'par-impar', 'termometro'];
  const DIFS: { id: Dificuldade; nome: string }[] = [
    { id: 'facil', nome: 'Fácil' }, { id: 'medio', nome: 'Médio' }, { id: 'dificil', nome: 'Difícil' },
  ];
  const DIGITOS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  let dificuldade = $state<Dificuldade>('medio');
  let selecionada = $state(-1);
  /** Dígito escolhido (0 = nenhum): fica destacado no tabuleiro, tanto nos números quanto nas notas, nos dois modos. */
  let ativo = $state(0);
  let folhaNotas = $state(false);
  /** Modo Notas: o teclado escreve anotações em vez do número. */
  let modoNotas = $state(false);
  /** Regra aberta na folha de explicação. */
  let regraAberta = $state<Regra | null>(null);
  /** Regras marcadas na escolha. */
  let marcadas = $state<Regra[]>([]);
  /** Dígito travado (tocar e segurar no teclado): cada casa tocada recebe o número ou a nota, conforme o modo Notas. */
  let travado = $state(0);
  let segurou = false;
  let temporizador: ReturnType<typeof setTimeout> | undefined;

  const q = $derived(s.quebra);
  const e = $derived(s.estado);
  const erros = $derived(q && e ? conflitos(q.regras, e.grade, q) : new Set<number>());
  /** Quantos de cada dígito ainda faltam na grade. */
  const faltam = $derived(DIGITOS.map((d) => (e ? Math.max(0, 9 - e.grade.filter((v) => v === d).length) : 9)));
  const nomeDificuldade = $derived(DIFS.find((d) => s.variante.endsWith(`-${d.id}`))?.nome ?? '');
  const comoJogar = $derived([
    'Preencha a grade com os dígitos de 1 a 9: cada linha, coluna e caixa 3 × 3 tem todos eles, sem repetir.',
    ...(q?.regras ?? []).map((r) => `${NOMES_REGRAS[r].nome}: ${NOMES_REGRAS[r].descricao}`),
    'Toque numa casa e depois num dígito. Com Notas ligado, o dígito vira uma anotação pequena (toque de novo para tirar). O número embaixo de cada dígito diz quantos ainda faltam.',
    'As etiquetas acima da grade são as regras extras da partida: toque numa para ver a explicação com um exemplo.',
    'Toque e segure um dígito do teclado para travá-lo: a partir daí, cada casa tocada recebe esse número (ou, com Notas ligado, ganha e perde essa nota). O dígito continua travado ao ligar ou desligar as notas. Toque de novo no dígito travado para soltar.',
    'Com um dígito travado, toque numa casa e arraste o dedo: todas as casas por onde passar recebem o número (ou a nota). Se a primeira casa já tinha, o arrasto apaga.',
    'Ao escolher uma casa, ficam em cinza todas as casas que não podem ter o mesmo número que ela, pelas regras da partida.',
    'O dígito escolhido fica destacado no tabuleiro, nos números e nas notas. Dígitos que quebram uma regra ficam sublinhados, e o contador de erros sobe quando um número não é o da solução.',
    'O botão de notas preenche as anotações de todas as casas vazias: só os candidatos possíveis ou de 1 a 9.',
  ]);

  const linha = (i: number) => Math.floor(i / 9);
  const coluna = (i: number) => i % 9;
  const caixa = (i: number) => Math.floor(linha(i) / 3) * 3 + Math.floor(coluna(i) / 3);
  /** Casas que não podem repetir o dígito de cada casa (linha, coluna, caixa e regras extras). */
  const proibidas = $derived(q ? casasProibidas(q.regras, q).map((v) => new Set(v)) : []);
  function relacionada(i: number, casa = selecionada) {
    if (casa < 0 || i === casa) return false;
    return proibidas[casa]?.has(i) ?? (linha(i) === linha(casa) || coluna(i) === coluna(casa) || caixa(i) === caixa(casa));
  }
  const editavel = $derived(!!q && !!e && selecionada >= 0 && !q.dadas[selecionada] && !s.terminou);

  function escolher(id: string) {
    const regras: Regra[] = id === 'classico' ? [] : TODAS.filter((r) => marcadas.includes(r));
    void salvarPreferencias(ID, { dificuldade, marcadas: [...marcadas] });
    const nomeDif = DIFS.find((d) => d.id === dificuldade)!.nome;
    const nome = regras.length ? regras.map((r) => NOMES_REGRAS[r].nome).join(' + ') : 'Clássico';
    selecionada = -1;
    ativo = 0;
    travado = 0;
    void s.comecar(`${regras.length ? regras.join('+') : 'classico'}-${dificuldade}`, `${nome}, ${nomeDif}`, async () => {
      const quebra = await gerarNoFundo<Quebra>('sudoku', { regras, dificuldade, semente: sementeNova(), prazo: 5000 });
      return { quebra, estado: { grade: quebra.dadas.slice(), notas: new Array(81).fill(0), erros: 0 } };
    });
  }

  function alternarRegra(r: Regra) {
    marcadas = marcadas.includes(r) ? marcadas.filter((x) => x !== r) : [...marcadas, r];
  }

  /** Escreve (ou apaga) o número. `quer`: true só escreve, false só apaga, undefined alterna. `guardar`: entra no desfazer. */
  function escrever(d: number, casa = selecionada, quer?: boolean, guardar = true) {
    ativo = d;
    if (!q || !e || casa < 0 || q.dadas[casa] || s.terminou) return;
    selecionada = casa;
    const tem = e.grade[casa] === d;
    if (quer === tem) return;
    const grade = [...e.grade], notas = [...e.notas];
    let erros = e.erros;
    if (tem) grade[casa] = 0;
    else {
      grade[casa] = d;
      notas[casa] = 0;
      if (q.solucao[casa] !== d) { erros++; vibrar(40); }
      // Tira a nota desse dígito das casas que não podem repetir o número.
      for (let i = 0; i < 81; i++) if (relacionada(i, casa)) notas[i] &= ~(1 << d);
    }
    s.mudar({ grade, notas, erros }, guardar);
    if (grade.every((v, i) => v === q.solucao[i])) void s.terminar('vitoria');
  }

  function anotar(d: number, casa = selecionada, quer?: boolean, guardar = true) {
    ativo = d;
    if (!q || !e || casa < 0 || q.dadas[casa] || e.grade[casa] || s.terminou) return;
    const tem = !!(e.notas[casa] & (1 << d));
    if (quer === tem) return;
    const notas = [...e.notas];
    notas[casa] ^= 1 << d;
    s.mudar({ ...e, notas }, guardar);
  }

  // Arrastar com um dígito travado: aplica (ou apaga, se a primeira casa já tinha) em todas as casas do caminho.
  let arrasto: { quer: boolean; feitas: Set<number>; guardou: boolean } | null = null;
  let ignorarClique = false;
  function aplicarTravado(i: number) {
    if (!travado || !arrasto || arrasto.feitas.has(i)) return;
    arrasto.feitas.add(i);
    const antes = s.estado;
    if (modoNotas) anotar(travado, i, arrasto.quer, !arrasto.guardou);
    else escrever(travado, i, arrasto.quer, !arrasto.guardou);
    if (s.estado !== antes) arrasto.guardou = true;
    selecionada = i;
  }
  function casaNoPonto(x: number, y: number): number {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-i]');
    return el ? Number(el.dataset.i) : -1;
  }
  function iniciarArrasto(ev: PointerEvent) {
    if (!travado || !e || !q || s.terminou || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    const i = casaNoPonto(ev.clientX, ev.clientY);
    if (i < 0) return;
    const tem = modoNotas ? !!(e.notas[i] & (1 << travado)) : e.grade[i] === travado;
    arrasto = { quer: !tem, feitas: new Set(), guardou: false };
    ignorarClique = true;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    aplicarTravado(i);
  }
  function moverArrasto(ev: PointerEvent) {
    if (!arrasto) return;
    const i = casaNoPonto(ev.clientX, ev.clientY);
    if (i >= 0) aplicarTravado(i);
  }
  function fimArrasto() {
    arrasto = null;
    // O clique que vem depois do toque já foi tratado pelo arrasto.
    setTimeout(() => (ignorarClique = false), 60);
  }

  function apagar() {
    if (!editavel || !e || (!e.grade[selecionada] && !e.notas[selecionada])) return;
    const grade = [...e.grade], notas = [...e.notas];
    grade[selecionada] = 0;
    notas[selecionada] = 0;
    s.mudar({ ...e, grade, notas });
  }

  function preencherNotas(soCandidatos: boolean) {
    folhaNotas = false;
    if (!q || !e || s.terminou) return;
    const cand = soCandidatos ? candidatos(q.regras, e.grade, q) : null;
    const notas = e.grade.map((v, i) => (v ? 0 : cand ? cand[i] : 0x3fe));
    s.mudar({ ...e, notas });
  }

  function tocarCasa(i: number) {
    selecionada = i;
    if (ignorarClique) { ignorarClique = false; return; }
    if (travado) {
      if (modoNotas) anotar(travado, i);
      else escrever(travado, i);
      return;
    }
    const v = e?.grade[i];
    if (v) ativo = v;
  }

  // Teclas: toque curto escreve; tocar e segurar trava o dígito.
  function pressionarTecla(d: number) {
    segurou = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      segurou = true;
      travado = travado === d ? 0 : d;
      ativo = d;
      vibrar(30);
    }, 420);
  }
  function soltarTecla() {
    clearTimeout(temporizador);
  }
  function tocarTecla(d: number) {
    if (segurou) { segurou = false; return; }
    if (travado) {
      travado = travado === d ? 0 : d;
      ativo = d;
      return;
    }
    if (modoNotas) anotar(d);
    else escrever(d);
  }

  function aoTecla(ev: KeyboardEvent) {
    if (s.fase !== 'jogo') return;
    if (/^[1-9]$/.test(ev.key)) { if (ev.shiftKey || ev.altKey) anotar(Number(ev.key)); else escrever(Number(ev.key)); return; }
    if (ev.key === 'Backspace' || ev.key === 'Delete' || ev.key === '0') { apagar(); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z') { s.desfazer(); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'y') { s.refazer(); return; }
    const mov: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (mov[ev.key] !== undefined) {
      ev.preventDefault();
      const n = (selecionada < 0 ? 40 : selecionada) + mov[ev.key];
      if (n >= 0 && n < 81) tocarCasa(n);
    }
  }

  // Bordas das gaiolas do killer: segmentos internos (recuados) entre casas de gaiolas diferentes.
  const linhasGaiolas = $derived.by(() => {
    if (!q?.gaiolas.length) return [];
    const dono = new Array(81).fill(-1);
    q.gaiolas.forEach((g, k) => g.casas.forEach((c) => (dono[c] = k)));
    const L: string[] = [];
    const r = 0.08;
    for (let i = 0; i < 81; i++) {
      const x = coluna(i), y = linha(i), d = dono[i];
      if (y === 0 || dono[i - 9] !== d) L.push(`M${x + r} ${y + r}H${x + 1 - r}`);
      if (y === 8 || dono[i + 9] !== d) L.push(`M${x + r} ${y + 1 - r}H${x + 1 - r}`);
      if (x === 0 || dono[i - 1] !== d) L.push(`M${x + r} ${y + r}V${y + 1 - r}`);
      if (x === 8 || dono[i + 1] !== d) L.push(`M${x + 1 - r} ${y + r}V${y + 1 - r}`);
    }
    return L;
  });
  const somaNaCasa = $derived.by(() => {
    const m = new Map<number, number>();
    for (const g of q?.gaiolas ?? []) m.set(Math.min(...g.casas), g.soma);
    return m;
  });

  const EXEMPLOS: Record<Regra, string> = {
    diagonais: 'No exemplo, o 3 não pode aparecer de novo na mesma diagonal.',
    'anti-rei': 'Nenhuma das oito casas em volta do 5 pode ter outro 5.',
    'anti-cavalo': 'O 5 de baixo proíbe o 5 na casa a um salto de cavalo (duas para cima, uma para o lado).',
    'nao-consecutivo': '4 e 5 lado a lado não pode: são seguidos.',
    killer: 'As três casas da gaiola somam 15 e não repetem dígito (por exemplo, 4, 5 e 6).',
    kropki: 'Em cima, 3 e 4 são seguidos (bolinha branca). Embaixo, 6 é o dobro de 3 (bolinha preta).',
    xv: 'Em cima, 3 + 7 = 10 (X). Embaixo, 1 + 4 = 5 (V).',
    'par-impar': 'O 7 está no círculo (ímpar) e o 4, no quadrado (par).',
    termometro: 'Do bulbo para a ponta, cada dígito é maior que o anterior: 2, 5, 8.',
  };

  const opcoes = [{ id: 'classico', titulo: 'Sudoku clássico', descricao: 'Linha, coluna e caixa sem repetir. Começa direto.' }];

  // Desenho das pistas: pontos, termômetros e marcas de par e ímpar.
  const centroCasa = (c: number): [number, number] => [coluna(c) + 0.5, linha(c) + 0.5];

  onMount(async () => {
    const pref = await lerPreferencias(ID, { dificuldade: 'medio' as Dificuldade, marcadas: [] as Regra[] });
    dificuldade = pref.dificuldade;
    marcadas = (pref.marcadas ?? []).filter((r) => TODAS.includes(r));
    await s.carregar();
  });
  onDestroy(() => { clearTimeout(temporizador); s.destruir(); });
</script>

<svelte:window onkeydown={aoTecla} />

<!-- Desenho de cada regra, pequeno nas etiquetas e grande na explicação (só cores do sistema). -->
{#snippet desenhoRegra(r: Regra, grande: boolean)}
  <svg class="ja-regra-desenho" class:ja-regra-desenho-grande={grande} viewBox="0 0 30 30" aria-hidden="true">
    {#if r === 'diagonais'}
      <rect x="1" y="1" width="28" height="28" rx="2" class="rd-grade" /><path d="M2 2L28 28M28 2L2 28" class="rd-traco" />
      {#if grande}<text x="8" y="10" class="rd-num">3</text><text x="22" y="24" class="rd-num rd-ruim">3</text>{/if}
    {:else if r === 'anti-rei'}
      {#each [0, 1, 2] as y (y)}{#each [0, 1, 2] as x (x)}<rect x={1 + x * 9.4} y={1 + y * 9.4} width="9.4" height="9.4" class={x === 1 && y === 1 ? 'rd-centro' : 'rd-vizinha'} />{/each}{/each}
      <text x="15" y="15.5" class="rd-num">5</text>
    {:else if r === 'anti-cavalo'}
      {#each [0, 1, 2] as y (y)}{#each [0, 1, 2] as x (x)}<rect x={1 + x * 9.4} y={1 + y * 9.4} width="9.4" height="9.4" class="rd-grade" />{/each}{/each}
      <path d="M5.7 24.5V5.7H15" class="rd-seta" /><text x="5.7" y="25" class="rd-num">5</text><text x="15" y="6.2" class="rd-num rd-ruim">5</text>
    {:else if r === 'nao-consecutivo'}
      <rect x="1" y="8" width="14" height="14" class="rd-grade" /><rect x="15" y="8" width="14" height="14" class="rd-grade" />
      <text x="8" y="15.5" class="rd-num">4</text><text x="22" y="15.5" class="rd-num rd-ruim">5</text>
    {:else if r === 'killer'}
      <rect x="1" y="1" width="28" height="28" class="rd-grade" /><path d="M15 1V29M1 15H29" class="rd-fina" /><path d="M3 3H27V13H13V27H3Z" class="rd-gaiola" />
      <text x="4.5" y="7" class="rd-soma">15</text>
    {:else if r === 'kropki'}
      <rect x="1" y="1" width="14" height="14" class="rd-grade" /><rect x="15" y="1" width="14" height="14" class="rd-grade" />
      <rect x="1" y="15" width="14" height="14" class="rd-grade" /><rect x="15" y="15" width="14" height="14" class="rd-grade" />
      <circle cx="15" cy="8" r="2.6" class="rd-branca" /><circle cx="15" cy="22" r="2.6" class="rd-preta" />
      {#if grande}<text x="8" y="8.5" class="rd-num">3</text><text x="22" y="8.5" class="rd-num">4</text><text x="8" y="22.5" class="rd-num">3</text><text x="22" y="22.5" class="rd-num">6</text>{/if}
    {:else if r === 'xv'}
      <rect x="1" y="1" width="14" height="14" class="rd-grade" /><rect x="15" y="1" width="14" height="14" class="rd-grade" />
      <rect x="1" y="15" width="14" height="14" class="rd-grade" /><rect x="15" y="15" width="14" height="14" class="rd-grade" />
      <text x="15" y="8.5" class="rd-letra">X</text><text x="15" y="22.5" class="rd-letra">V</text>
      {#if grande}<text x="7" y="8.5" class="rd-num">3</text><text x="23" y="8.5" class="rd-num">7</text><text x="7" y="22.5" class="rd-num">1</text><text x="23" y="22.5" class="rd-num">4</text>{/if}
    {:else if r === 'par-impar'}
      <rect x="1" y="8" width="14" height="14" class="rd-grade" /><rect x="15" y="8" width="14" height="14" class="rd-grade" />
      <circle cx="8" cy="15" r="5.5" class="rd-paridade" /><rect x="16.5" y="9.5" width="11" height="11" rx="1" class="rd-paridade" />
      {#if grande}<text x="8" y="15.5" class="rd-num">7</text><text x="22" y="15.5" class="rd-num">4</text>{/if}
    {:else if r === 'termometro'}
      <rect x="1" y="1" width="28" height="28" class="rd-grade" /><path d="M10 1V29M20 1V29M1 10H29M1 20H29" class="rd-fina" /><path d="M5 25L5 5L25 5" class="rd-termo" /><circle cx="5" cy="25" r="4.2" class="rd-bulbo" />
      {#if grande}<text x="5" y="25.5" class="rd-num">2</text><text x="5" y="5.5" class="rd-num">5</text><text x="25" y="5.5" class="rd-num">8</text>{/if}
    {/if}
  </svg>
{/snippet}

<Casca sessao={s} titulo="Sudoku" {comoJogar} {opcoes} aoEscolher={escolher} tituloEscolha="Nova partida" semDesfazer>
  {#snippet antesDaEscolha()}
    <div class="segmentado ja-segmentado-largo" role="group" aria-label="Dificuldade">
      {#each DIFS as d (d.id)}
        <button type="button" aria-pressed={dificuldade === d.id} onclick={() => (dificuldade = d.id)}>{d.nome}</button>
      {/each}
    </div>
  {/snippet}
  {#snippet depoisDaEscolha()}
    <h3 class="ja-escolha-subtitulo">Ou combine regras</h3>
    <div class="ja-regras-lista">
      {#each TODAS as r (r)}
        <label class="ja-regra">
          <span class="escolha"><input type="checkbox" checked={marcadas.includes(r)} onchange={() => alternarRegra(r)} /></span>
          <span class="linha-texto"><span class="linha-titulo">{NOMES_REGRAS[r].nome}</span><span class="linha-descricao">{NOMES_REGRAS[r].descricao}</span></span>
        </label>
      {/each}
    </div>
    <button class="botao botao-principal ja-botao-largo" type="button" disabled={!marcadas.length} onclick={() => escolher('combinado')}>
      <Icone nome="player-play" /><span>{marcadas.length ? `Começar com ${marcadas.length} ${marcadas.length === 1 ? 'regra' : 'regras'}` : 'Marque uma ou mais regras'}</span>
    </button>
  {/snippet}
  {#snippet faixa()}
    {#if e}
      <span class="ja-faixa-texto">{nomeDificuldade || 'Sudoku'}</span>
      <span class="ja-sudoku-erros" data-tem={e.erros > 0 || undefined}><span>Erros</span> <span class="ja-numero">{e.erros}</span></span>
    {/if}
  {/snippet}
  {#if q && e}
    {#if q.regras.length}
      <div class="ja-sudoku-regras" role="group" aria-label="Regras extras">
        {#each q.regras as r (r)}
          <button type="button" class="ja-sudoku-regra" onclick={() => (regraAberta = r)} aria-label="Regra {NOMES_REGRAS[r].nome}: ver explicação">
            {@render desenhoRegra(r, false)}<span>{NOMES_REGRAS[r].nome}</span>
          </button>
        {/each}
      </div>
    {/if}
    <div class="ja-centro">
      <div class="ja-sudoku" role="grid" tabindex="-1" aria-label="Grade do Sudoku" data-travado={travado ? '' : undefined}
        onpointerdown={iniciarArrasto} onpointermove={moverArrasto} onpointerup={fimArrasto} onpointercancel={fimArrasto}>
        {#each e.grade as v, i (i)}
          {@const dada = q.dadas[i] > 0}
          {@const soma = somaNaCasa.get(i)}
          <button
            type="button"
            class="ja-sudoku-casa"
            data-selecionada={selecionada === i || undefined}
            data-relacionada={relacionada(i) || undefined}
            data-i={i}
            data-mesmo={(v && ativo === v) || undefined}
            data-dada={dada || undefined}
            data-erro={(!dada && erros.has(i)) || undefined}
            data-soma={soma !== undefined || undefined}
            data-bd={(coluna(i) % 3 === 2 && coluna(i) < 8) || undefined}
            data-bb={(linha(i) % 3 === 2 && linha(i) < 8) || undefined}
            aria-label="Linha {linha(i) + 1}, coluna {coluna(i) + 1}{v ? `, ${v}` : ', vazia'}"
            onclick={() => tocarCasa(i)}
          >
            {#if soma !== undefined}<span class="ja-sudoku-soma">{soma}</span>{/if}
            {#if v}
              <span class="ja-sudoku-valor">{v}</span>
            {:else if e.notas[i]}
              <span class="ja-sudoku-notas">
                {#each DIGITOS as d (d)}<span data-ativa={(ativo === d && e.notas[i] & (1 << d)) || undefined}>{e.notas[i] & (1 << d) ? d : ''}</span>{/each}
              </span>
            {/if}
          </button>
        {/each}
        <svg class="ja-sudoku-sobre" viewBox="0 0 9 9" aria-hidden="true">
          {#if q.regras.includes('diagonais')}
            <path d="M0 0L9 9M9 0L0 9" class="ja-sudoku-diagonal" />
          {/if}
          {#each q.termometros ?? [] as t, k (k)}
            {@const [bx, by] = centroCasa(t[0])}
            <g class="ja-sudoku-termo">
              <circle cx={bx} cy={by} r="0.36" />
              <polyline points={t.map((c) => centroCasa(c).join(',')).join(' ')} />
            </g>
          {/each}
          {#each q.paridade ?? [] as [c, p] (c)}
            {@const [x, y] = centroCasa(c)}
            {#if p === 1}<circle class="ja-sudoku-paridade" cx={x} cy={y} r="0.4" />{:else}<rect class="ja-sudoku-paridade" x={x - 0.38} y={y - 0.38} width="0.76" height="0.76" rx="0.08" />{/if}
          {/each}
          {#each linhasGaiolas as d, k (k)}<path {d} class="ja-sudoku-gaiola" />{/each}
          {#each q.pontos ?? [] as p, k (k)}
            {@const [ax, ay] = centroCasa(p.a)}
            {@const [bx, by] = centroCasa(p.b)}
            {@const x = (ax + bx) / 2}
            {@const y = (ay + by) / 2}
            {#if p.tipo === 'branco' || p.tipo === 'preto'}
              <circle class="ja-sudoku-kropki" data-tipo={p.tipo} cx={x} cy={y} r="0.13" />
            {:else}
              <g class="ja-sudoku-xv"><rect x={x - 0.16} y={y - 0.16} width="0.32" height="0.32" rx="0.06" /><text {x} y={y + 0.01}>{p.tipo.toUpperCase()}</text></g>
            {/if}
          {/each}
        </svg>
      </div>
    </div>

    <div class="ja-sudoku-controles">
      <div class="ja-sudoku-acoes">
        <button class="ja-sudoku-acao" type="button" disabled={!s.podeDesfazer || !!s.terminou} onclick={() => s.desfazer()}><Icone nome="arrow-back-up" /><span>Desfazer</span></button>
        <button class="ja-sudoku-acao" type="button" disabled={!editavel} onclick={apagar}><Icone nome="eraser" /><span>Apagar</span></button>
        <button class="ja-sudoku-acao" type="button" aria-pressed={modoNotas} disabled={!!s.terminou} onclick={() => (modoNotas = !modoNotas)}>
          <span class="ja-sudoku-acao-icone"><Icone nome="pencil" /><span class="ja-sudoku-selo">{modoNotas ? 'Lig' : 'Desl'}</span></span><span>Notas</span>
        </button>
        <button class="ja-sudoku-acao" type="button" disabled={!!s.terminou} onclick={() => (folhaNotas = true)}><Icone nome="wand" /><span>Auto notas</span></button>
        <button class="ja-sudoku-acao" type="button" disabled={!s.podeRefazer || !!s.terminou} onclick={() => s.refazer()}><Icone nome="arrow-forward-up" /><span>Refazer</span></button>
      </div>
      <div class="ja-sudoku-numeros" role="group" aria-label={modoNotas ? 'Notas' : 'Números'} data-notas={modoNotas || undefined}>
        {#each DIGITOS as d, k (d)}
          <button class="ja-sudoku-num" type="button" aria-label={modoNotas ? `Nota ${d}` : `${d}, faltam ${faltam[k]}`}
            aria-pressed={ativo === d} data-travado={travado === d || undefined} data-completo={faltam[k] === 0 || undefined}
            onpointerdown={() => pressionarTecla(d)} onpointerup={soltarTecla} onpointerleave={soltarTecla} oncontextmenu={(ev) => ev.preventDefault()} onclick={() => tocarTecla(d)}>
            <span class="ja-sudoku-num-d" data-pos={d}>{d}</span>
            <span class="ja-sudoku-num-falta">{faltam[k] || ''}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>

<Dialogo aberto={regraAberta !== null} titulo={regraAberta ? NOMES_REGRAS[regraAberta].nome : ''} folha aoFechar={() => (regraAberta = null)}>
  {#if regraAberta}
    <div class="ja-regra-explicacao">
      {@render desenhoRegra(regraAberta, true)}
      <p>{NOMES_REGRAS[regraAberta].descricao}</p>
      <p class="ja-dica">{EXEMPLOS[regraAberta]}</p>
    </div>
  {/if}
</Dialogo>

<Dialogo bind:aberto={folhaNotas} titulo="Preencher notas" folha>
  <p>As notas atuais das casas vazias serão trocadas. Dá para desfazer.</p>
  <div class="lista-config">
    <button class="linha-config" type="button" onclick={() => preencherNotas(true)}>
      <span class="linha-texto"><span class="linha-titulo">Só os candidatos possíveis</span><span class="linha-descricao">Pelos números que já estão na grade</span></span>
      <Icone nome="chevron-right" classe="linha-seta" />
    </button>
    <button class="linha-config" type="button" onclick={() => preencherNotas(false)}>
      <span class="linha-texto"><span class="linha-titulo">De 1 a 9 em todas</span><span class="linha-descricao">Para você ir riscando</span></span>
      <Icone nome="chevron-right" classe="linha-seta" />
    </button>
  </div>
</Dialogo>
