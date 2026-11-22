<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { NOMES_REGRAS, conflitos, type Dificuldade, type Quebra, type Regra } from '@ja/nucleo-grade/sudoku';
  import TelaJogo from '../../lib/jogo/TelaJogo.svelte';
  import Escolha from '../../lib/jogo/Escolha.svelte';
  import Fim from '../../lib/jogo/Fim.svelte';
  import Teclado from '../../lib/jogo/Teclado.svelte';
  import { Relogio } from '../../lib/jogo/relogio.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { apagarPartida, lerPartida, lerPreferencias, salvarPartida, salvarPreferencias, vibrar } from '../../lib/jogo/partida.ts';
  import { formatarTempo, registrarPartida } from '../../lib/estatisticas.ts';

  interface Salvo { quebra: Quebra; grade: number[]; notas: number[]; tempo: number; modo: string }

  const ID = 'sudoku';
  const MODOS: { id: string; titulo: string; regras: Regra[] }[] = [
    { id: 'classico', titulo: 'Clássico', regras: [] },
    { id: 'diagonais', titulo: 'Diagonais', regras: ['diagonais'] },
    { id: 'anti-rei', titulo: 'Anti-rei', regras: ['anti-rei'] },
    { id: 'anti-cavalo', titulo: 'Anti-cavalo', regras: ['anti-cavalo'] },
    { id: 'nao-consecutivo', titulo: 'Não consecutivo', regras: ['nao-consecutivo'] },
    { id: 'killer', titulo: 'Killer', regras: ['killer'] },
    { id: 'diagonais-anti-rei', titulo: 'Diagonais + anti-rei', regras: ['diagonais', 'anti-rei'] },
    { id: 'killer-diagonais', titulo: 'Killer + diagonais', regras: ['killer', 'diagonais'] },
    { id: 'anti-cavalo-nao-consecutivo', titulo: 'Anti-cavalo + não consecutivo', regras: ['anti-cavalo', 'nao-consecutivo'] },
  ];
  const DIFS: { id: Dificuldade; nome: string }[] = [
    { id: 'facil', nome: 'Fácil' }, { id: 'medio', nome: 'Médio' }, { id: 'dificil', nome: 'Difícil' },
  ];

  let fase = $state<'carregando' | 'escolha' | 'gerando' | 'jogo'>('carregando');
  let dificuldade = $state<Dificuldade>('medio');
  let modo = $state('classico');
  let quebra = $state<Quebra | null>(null);
  let grade = $state<number[]>([]);
  let notas = $state<number[]>([]);
  let selecionada = $state(-1);
  let modoNotas = $state(false);
  let historico: { grade: number[]; notas: number[] }[] = [];
  let podeDesfazer = $state(false);
  let erroGerar = $state('');
  let venceu = $state(false);
  let recorde = $state(false);
  const relogio = new Relogio();

  const regrasGlobais = $derived(quebra ? quebra.regras.filter((r) => r !== 'killer') : []);
  const erros = $derived(quebra ? conflitos(regrasGlobais, grade, quebra.gaiolas) : new Set<number>());
  const completos = $derived.by(() => {
    const s = new Set<number>();
    for (let d = 1; d <= 9; d++) if (grade.filter((v) => v === d).length >= 9) s.add(d);
    return s;
  });
  const comoJogar = $derived([
    'Preencha a grade com os dígitos de 1 a 9: cada linha, coluna e caixa 3 × 3 tem todos eles, sem repetir.',
    ...(quebra?.regras ?? MODOS.find((m) => m.id === modo)?.regras ?? []).map((r) => `${NOMES_REGRAS[r].nome}: ${NOMES_REGRAS[r].descricao}`),
    'Toque numa casa e depois no dígito. Com as notas ligadas, os dígitos viram anotações pequenas. Dígitos repetidos ficam sublinhados.',
  ]);

  function linha(i: number) { return Math.floor(i / 9); }
  function coluna(i: number) { return i % 9; }
  function caixa(i: number) { return Math.floor(linha(i) / 3) * 3 + Math.floor(coluna(i) / 3); }
  function relacionada(i: number) {
    if (selecionada < 0 || i === selecionada) return false;
    return linha(i) === linha(selecionada) || coluna(i) === coluna(selecionada) || caixa(i) === caixa(selecionada);
  }

  async function comecar(idModo: string) {
    modo = idModo;
    void salvarPreferencias(ID, { dificuldade });
    fase = 'gerando';
    erroGerar = '';
    const regras = MODOS.find((m) => m.id === idModo)!.regras;
    try {
      const q = await gerarNoFundo<Quebra>('sudoku', { regras, dificuldade, semente: sementeNova(), prazo: 5000 });
      quebra = q;
      grade = q.dadas.slice();
      notas = new Array(81).fill(0);
      historico = [];
      podeDesfazer = false;
      selecionada = -1;
      venceu = false;
      recorde = false;
      relogio.zerar();
      relogio.iniciar();
      fase = 'jogo';
      void salvar();
    } catch (e) {
      erroGerar = (e as Error).message;
      fase = 'escolha';
    }
  }

  function salvar() {
    if (!quebra || venceu) return;
    return salvarPartida<Salvo>(ID, { quebra: $state.snapshot(quebra) as Quebra, grade: [...grade], notas: [...notas], tempo: relogio.ms, modo });
  }

  function guardarHistorico() {
    historico.push({ grade: [...grade], notas: [...notas] });
    if (historico.length > 200) historico.shift();
    podeDesfazer = true;
  }

  function digitar(d: number) {
    if (!quebra || venceu || selecionada < 0 || quebra.dadas[selecionada]) return;
    guardarHistorico();
    if (modoNotas) {
      if (grade[selecionada]) return;
      notas[selecionada] ^= 1 << d;
    } else {
      grade[selecionada] = grade[selecionada] === d ? 0 : d;
      if (grade[selecionada]) {
        // Tira a nota desse dígito dos vizinhos de linha, coluna e caixa.
        for (let i = 0; i < 81; i++) if (relacionada(i)) notas[i] &= ~(1 << d);
      }
      verificar();
    }
    void salvar();
  }

  function apagar() {
    if (!quebra || venceu || selecionada < 0 || quebra.dadas[selecionada]) return;
    guardarHistorico();
    grade[selecionada] = 0;
    notas[selecionada] = 0;
    void salvar();
  }

  function desfazer() {
    const h = historico.pop();
    if (!h) return;
    grade = h.grade;
    notas = h.notas;
    podeDesfazer = historico.length > 0;
    void salvar();
  }

  async function verificar() {
    if (!quebra || grade.some((v, i) => v !== quebra!.solucao[i])) return;
    venceu = true;
    relogio.parar();
    vibrar([30, 60, 30]);
    await apagarPartida(ID);
    const nomeModo = MODOS.find((m) => m.id === modo)?.titulo ?? modo;
    const nomeDif = DIFS.find((d) => d.id === dificuldade)?.nome ?? '';
    recorde = await registrarPartida(ID, `${modo}-${dificuldade}`, true, relogio.ms, `${nomeModo}, ${nomeDif}`);
  }

  function aoTecla(e: KeyboardEvent) {
    if (fase !== 'jogo') return;
    if (/^[1-9]$/.test(e.key)) { digitar(Number(e.key)); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { apagar(); return; }
    if (e.key === 'n' || e.key === 'N') { modoNotas = !modoNotas; return; }
    if (e.ctrlKey && e.key === 'z') { desfazer(); return; }
    const mov: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (mov[e.key] !== undefined) {
      e.preventDefault();
      const n = (selecionada < 0 ? 40 : selecionada) + mov[e.key];
      if (n >= 0 && n < 81) selecionada = n;
    }
  }

  function novaPartida() {
    relogio.zerar();
    quebra = null;
    void apagarPartida(ID);
    fase = 'escolha';
  }

  // Bordas das gaiolas do killer: segmentos internos (recuados) entre casas de gaiolas diferentes.
  const linhasGaiolas = $derived.by(() => {
    if (!quebra?.gaiolas.length) return [];
    const dono = new Array(81).fill(-1);
    quebra.gaiolas.forEach((g, k) => g.casas.forEach((c) => (dono[c] = k)));
    const L: string[] = [];
    const r = 0.1;
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
    for (const g of quebra?.gaiolas ?? []) m.set(Math.min(...g.casas), g.soma);
    return m;
  });

  const opcoes = MODOS.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    descricao: m.regras.length ? m.regras.map((r) => NOMES_REGRAS[r].descricao).join(' ') : 'As regras de sempre.',
  }));

  onMount(async () => {
    const p = await lerPreferencias(ID, { dificuldade: 'medio' as Dificuldade });
    dificuldade = p.dificuldade;
    const s = await lerPartida<Salvo>(ID);
    if (s) {
      quebra = s.quebra;
      grade = s.grade;
      notas = s.notas;
      modo = s.modo;
      relogio.zerar(s.tempo);
      relogio.iniciar();
      fase = 'jogo';
      return;
    }
    fase = 'escolha';
  });
  onDestroy(() => {
    relogio.parar();
    void salvar();
    relogio.destruir();
  });
</script>

<svelte:window onkeydown={aoTecla} />

<TelaJogo titulo="Sudoku" {comoJogar} aoNova={fase === 'jogo' ? novaPartida : undefined}>
  {#if fase === 'escolha'}
    <Escolha titulo="Escolha as regras" {opcoes} aoEscolher={comecar}>
      {#snippet antes()}
        <div class="segmentado ja-segmentado-largo" role="group" aria-label="Dificuldade">
          {#each DIFS as d (d.id)}
            <button type="button" aria-pressed={dificuldade === d.id} onclick={() => (dificuldade = d.id)}>{d.nome}</button>
          {/each}
        </div>
        {#if erroGerar}
          <div class="aviso" data-tipo="erro" role="alert"><Icone nome="alert-triangle" /><div><p class="aviso-titulo">Não deu para gerar</p><p>{erroGerar} Tente outra combinação.</p></div></div>
        {/if}
      {/snippet}
    </Escolha>
  {:else if fase === 'gerando'}
    <p class="ja-dica" aria-busy="true">Gerando um Sudoku com solução única…</p>
  {:else if fase === 'jogo' && quebra}
    <div class="ja-faixa">
      <span class="etiqueta" data-cor="secundaria">{MODOS.find((m) => m.id === modo)?.titulo}</span>
      <span class="ja-placar-item"><Icone nome="clock" /><span class="ja-numero">{formatarTempo(relogio.ms)}</span></span>
    </div>
    {#if venceu}
      <Fim tipo="vitoria" titulo={recorde ? 'Novo recorde!' : 'Sudoku resolvido!'} texto={`Tempo: ${formatarTempo(relogio.ms)}.`} aoNova={novaPartida} />
    {/if}
    <div class="ja-centro">
      <div class="ja-sudoku" role="grid" aria-label="Grade do Sudoku">
        {#each grade as v, i (i)}
          {@const dada = quebra.dadas[i] > 0}
          <button
            type="button"
            class="ja-sudoku-casa"
            data-selecionada={selecionada === i || undefined}
            data-relacionada={relacionada(i) || undefined}
            data-mesmo={(v && selecionada >= 0 && grade[selecionada] === v && selecionada !== i) || undefined}
            data-dada={dada || undefined}
            data-erro={(!dada && erros.has(i)) || undefined}
            data-bd={(coluna(i) % 3 === 2 && coluna(i) < 8) || undefined}
            data-bb={(linha(i) % 3 === 2 && linha(i) < 8) || undefined}
            aria-label="Linha {linha(i) + 1}, coluna {coluna(i) + 1}{v ? `, ${v}` : ', vazia'}"
            onclick={() => (selecionada = i)}
          >
            {#if somaNaCasa.has(i)}<span class="ja-sudoku-soma">{somaNaCasa.get(i)}</span>{/if}
            {#if v}
              <span class="ja-sudoku-valor">{v}</span>
            {:else if notas[i]}
              <span class="ja-sudoku-notas">
                {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as d (d)}<span>{notas[i] & (1 << d) ? d : ''}</span>{/each}
              </span>
            {/if}
          </button>
        {/each}
        <svg class="ja-sudoku-sobre" viewBox="0 0 9 9" aria-hidden="true">
          {#if quebra.regras.includes('diagonais')}
            <path d="M0 0L9 9M9 0L0 9" class="ja-sudoku-diagonal" />
          {/if}
          {#each linhasGaiolas as d, k (k)}<path {d} class="ja-sudoku-gaiola" />{/each}
        </svg>
      </div>
    </div>
    <Teclado digitos={[1, 2, 3, 4, 5, 6, 7, 8, 9]} {completos} bind:notas={modoNotas} aoDigito={digitar} aoApagar={apagar} aoDesfazer={desfazer} {podeDesfazer} />
  {/if}
</TelaJogo>
