<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { NOMES_REGRAS, candidatos, conflitos, type Dificuldade, type Quebra, type Regra } from '@ja/nucleo-grade/sudoku';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Dialogo from '../../lib/jogo/Dialogo.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { lerPreferencias, salvarPreferencias, vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { grade: number[]; notas: number[]; erros: number }

  const ID = 'sudoku';
  const s = new Sessao<Quebra, Estado>(ID);
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
  const DIGITOS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  let dificuldade = $state<Dificuldade>('medio');
  let selecionada = $state(-1);
  /** Dígito "pressionado" no teclado: destaca os iguais no tabuleiro. */
  let ativo = $state(0);
  let folhaNotas = $state(false);

  const q = $derived(s.quebra);
  const e = $derived(s.estado);
  const erros = $derived(q && e ? conflitos(q.regras, e.grade, q.gaiolas) : new Set<number>());
  const completos = $derived.by(() => {
    const c = new Set<number>();
    if (!e) return c;
    for (const d of DIGITOS) if (e.grade.filter((v) => v === d).length >= 9) c.add(d);
    return c;
  });
  const comoJogar = $derived([
    'Preencha a grade com os dígitos de 1 a 9: cada linha, coluna e caixa 3 × 3 tem todos eles, sem repetir.',
    ...(q?.regras ?? []).map((r) => `${NOMES_REGRAS[r].nome}: ${NOMES_REGRAS[r].descricao}`),
    'Toque numa casa e depois num dígito. O teclado da esquerda escreve o número; o da direita, as notas (anotações pequenas).',
    'O dígito tocado fica destacado no tabuleiro. Dígitos que quebram uma regra ficam sublinhados, e o contador de erros sobe quando um número não é o da solução.',
    'O botão de notas preenche as anotações de todas as casas vazias: só os candidatos possíveis ou de 1 a 9.',
  ]);

  const linha = (i: number) => Math.floor(i / 9);
  const coluna = (i: number) => i % 9;
  const caixa = (i: number) => Math.floor(linha(i) / 3) * 3 + Math.floor(coluna(i) / 3);
  function relacionada(i: number) {
    if (selecionada < 0 || i === selecionada) return false;
    return linha(i) === linha(selecionada) || coluna(i) === coluna(selecionada) || caixa(i) === caixa(selecionada);
  }
  const editavel = $derived(!!q && !!e && selecionada >= 0 && !q.dadas[selecionada] && !s.terminou);

  function escolher(idModo: string) {
    void salvarPreferencias(ID, { dificuldade });
    const m = MODOS.find((x) => x.id === idModo)!;
    const nomeDif = DIFS.find((d) => d.id === dificuldade)!.nome;
    selecionada = -1;
    ativo = 0;
    void s.comecar(`${idModo}-${dificuldade}`, `${m.titulo}, ${nomeDif}`, async () => {
      const quebra = await gerarNoFundo<Quebra>('sudoku', { regras: m.regras, dificuldade, semente: sementeNova(), prazo: 5000 });
      return { quebra, estado: { grade: quebra.dadas.slice(), notas: new Array(81).fill(0), erros: 0 } };
    });
  }

  function escrever(d: number) {
    ativo = d;
    if (!editavel || !q || !e) return;
    const grade = [...e.grade], notas = [...e.notas];
    let erros = e.erros;
    if (grade[selecionada] === d) grade[selecionada] = 0;
    else {
      grade[selecionada] = d;
      notas[selecionada] = 0;
      if (q.solucao[selecionada] !== d) { erros++; vibrar(40); }
      // Tira a nota desse dígito dos vizinhos de linha, coluna e caixa.
      for (let i = 0; i < 81; i++) if (relacionada(i)) notas[i] &= ~(1 << d);
    }
    s.mudar({ grade, notas, erros });
    if (grade.every((v, i) => v === q.solucao[i])) void s.terminar('vitoria');
  }

  function anotar(d: number) {
    ativo = d;
    if (!editavel || !e || e.grade[selecionada]) return;
    const notas = [...e.notas];
    notas[selecionada] ^= 1 << d;
    s.mudar({ ...e, notas });
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
    const cand = soCandidatos ? candidatos(q.regras, e.grade, q.gaiolas) : null;
    const notas = e.grade.map((v, i) => (v ? 0 : cand ? cand[i] : 0x3fe));
    s.mudar({ ...e, notas });
  }

  function tocarCasa(i: number) {
    selecionada = i;
    const v = e?.grade[i];
    if (v) ativo = v;
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

  const opcoes = MODOS.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    descricao: m.regras.length ? m.regras.map((r) => NOMES_REGRAS[r].descricao).join(' ') : 'As regras de sempre.',
  }));

  onMount(async () => {
    dificuldade = (await lerPreferencias(ID, { dificuldade: 'medio' as Dificuldade })).dificuldade;
    await s.carregar();
  });
  onDestroy(() => s.destruir());
</script>

<svelte:window onkeydown={aoTecla} />

<Casca sessao={s} titulo="Sudoku" {comoJogar} {opcoes} aoEscolher={escolher} tituloEscolha="Escolha as regras" semDesfazer>
  {#snippet antesDaEscolha()}
    <div class="segmentado ja-segmentado-largo" role="group" aria-label="Dificuldade">
      {#each DIFS as d (d.id)}
        <button type="button" aria-pressed={dificuldade === d.id} onclick={() => (dificuldade = d.id)}>{d.nome}</button>
      {/each}
    </div>
  {/snippet}
  {#snippet faixa()}
    {#if e}<span class="ja-placar-item"><Icone nome="alert-triangle" /><span class="sr-only">Erros:</span><span class="ja-numero">{e.erros}</span></span>{/if}
  {/snippet}
  {#if q && e}
    <div class="ja-centro">
      <div class="ja-sudoku" role="grid" aria-label="Grade do Sudoku">
        {#each e.grade as v, i (i)}
          {@const dada = q.dadas[i] > 0}
          {@const soma = somaNaCasa.get(i)}
          <button
            type="button"
            class="ja-sudoku-casa"
            data-selecionada={selecionada === i || undefined}
            data-relacionada={relacionada(i) || undefined}
            data-mesmo={(v && ativo === v && selecionada !== i) || undefined}
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
          {#each linhasGaiolas as d, k (k)}<path {d} class="ja-sudoku-gaiola" />{/each}
        </svg>
      </div>
    </div>

    <div class="ja-sudoku-controles">
      <div class="ja-sudoku-acoes">
        <button class="botao" type="button" disabled={!s.podeDesfazer || !!s.terminou} onclick={() => s.desfazer()} aria-label="Desfazer" title="Desfazer"><Icone nome="arrow-back-up" /></button>
        <button class="botao" type="button" disabled={!editavel} onclick={apagar} aria-label="Apagar a casa" title="Apagar a casa"><Icone nome="eraser" /></button>
        <button class="botao" type="button" disabled={!s.podeRefazer || !!s.terminou} onclick={() => s.refazer()} aria-label="Refazer" title="Refazer"><Icone nome="arrow-forward-up" /></button>
        <button class="botao" type="button" disabled={!!s.terminou} onclick={() => (folhaNotas = true)} aria-label="Preencher notas" title="Preencher notas"><Icone nome="wand" /></button>
      </div>
      <div class="ja-sudoku-teclados">
        <div class="ja-sudoku-teclado" role="group" aria-label="Números">
          <span class="ja-sudoku-teclado-rotulo">Números</span>
          {#each DIGITOS as d (d)}
            <button class="botao ja-tecla" type="button" aria-pressed={ativo === d} data-completo={completos.has(d) || undefined} onclick={() => escrever(d)}>{d}</button>
          {/each}
        </div>
        <div class="ja-sudoku-teclado ja-sudoku-teclado-notas" role="group" aria-label="Notas">
          <span class="ja-sudoku-teclado-rotulo"><Icone nome="pencil" pequeno />Notas</span>
          {#each DIGITOS as d (d)}
            <button class="botao ja-tecla" type="button" aria-pressed={ativo === d} aria-label="Nota {d}" data-completo={completos.has(d) || undefined} onclick={() => anotar(d)}><span data-pos={d}>{d}</span></button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</Casca>

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
