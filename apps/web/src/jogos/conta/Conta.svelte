<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { aplicar, resolverConta, type Op, type Rodada } from '@ja/nucleo-numeros/conta';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { gerarNoFundo } from '../../lib/jogo/gerar.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Ficha { id: number; valor: number }
  interface Estado { fichas: Ficha[]; contas: string[]; proximoId: number; desistiu?: boolean }
  const s = new Sessao<Rodada, Estado>('conta');
  const OPCOES = [
    { id: '1', titulo: 'Um número grande', descricao: 'Mais números pequenos: contas mais longas' },
    { id: '2', titulo: 'Dois números grandes', descricao: 'O equilíbrio clássico' },
    { id: '3', titulo: 'Três números grandes', descricao: 'Números grandes ajudam a chegar perto rápido' },
  ];
  const COMO = [
    'Use os seis números e as quatro operações para chegar exatamente ao alvo.',
    'Toque num número, numa operação e em outro número: o resultado entra no lugar dos dois. Cada número vale uma vez; não precisa usar todos.',
    'Só valem resultados inteiros e positivos. Se travar, a dica mostra só a próxima conta de um caminho que funciona.',
  ];

  let primeira = $state<number | null>(null);
  let op = $state<Op | null>(null);
  let dica = $state<{ titulo: string; texto: string } | null>(null);

  function escolher(id: string) {
    dica = null;
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, async () => {
      const r = await gerarNoFundo<Rodada>('conta', [sementeNova(), Number(id)]);
      return { quebra: r, estado: { fichas: r.numeros.map((valor, id) => ({ id, valor })), contas: [], proximoId: 6 } };
    });
  }

  function tocarFicha(f: Ficha) {
    if (!s.estado || s.terminou) return;
    if (primeira === null || op === null) { primeira = primeira === f.id ? null : f.id; op = null; return; }
    if (primeira === f.id) { primeira = null; op = null; return; }
    const a = s.estado.fichas.find((x) => x.id === primeira)!;
    const r = aplicar(a.valor, op, f.valor);
    if (r === null) { vibrar(80); window.OpenDesign.toast({ texto: op === '÷' ? 'A divisão precisa dar um número inteiro.' : 'O resultado precisa ser positivo.' }); return; }
    const nova = { id: s.estado.proximoId, valor: r };
    const fichas = s.estado.fichas.filter((x) => x.id !== a.id && x.id !== f.id);
    fichas.push(nova);
    s.mudar({ fichas, contas: [...s.estado.contas, `${a.valor} ${op} ${f.valor} = ${r}`], proximoId: s.estado.proximoId + 1 });
    primeira = nova.id;
    dica = null;
    op = null;
    if (r === s.quebra!.alvo) void s.terminar('vitoria');
  }

  /** Mostra só a próxima conta de um caminho que chega ao alvo a partir dos números atuais. */
  function pedirDica() {
    if (!s.quebra || !s.estado) return;
    const alvo = s.quebra.alvo;
    const daqui = resolverConta(s.estado.fichas.map((f) => f.valor), alvo);
    if (daqui.valor === alvo && daqui.passos.length) {
      const p = daqui.passos[0];
      dica = { titulo: s.estado.contas.length ? 'Sua próxima conta' : 'Sua primeira conta', texto: `${p.a} ${p.op} ${p.b} = ${p.r}` };
      return;
    }
    const doInicio = resolverConta(s.quebra.numeros, alvo);
    const p = doInicio.passos[0];
    dica = doInicio.valor === alvo && p
      ? { titulo: 'Daqui não chega ao alvo', texto: `Desfaça as contas. Do começo, a primeira conta é ${p.a} ${p.op} ${p.b} = ${p.r}.` }
      : { titulo: 'Sem caminho exato', texto: `O mais perto possível é ${doInicio.valor}.` };
  }

  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Conta Certa" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Quantos números grandes (25, 50, 75, 100)?">
  {#snippet rodape()}
    {#if !s.terminou}<button class="botao" type="button" onclick={pedirDica}><Icone nome="bulb" /><span>Dica</span></button>{/if}
  {/snippet}
  {#if s.quebra && s.estado}
    <div class="ja-conta">
      <div class="ja-conta-alvo"><span class="ui-pequeno texto-2">Alvo</span><span class="ja-conta-numero">{s.quebra.alvo}</span></div>
      <div class="ja-conta-fichas">
        {#each s.estado.fichas as f (f.id)}
          <button class="botao ja-conta-ficha" type="button" aria-pressed={primeira === f.id} onclick={() => tocarFicha(f)}>{f.valor}</button>
        {/each}
      </div>
      <div class="ja-conta-ops" role="group" aria-label="Operações">
        {#each ['+', '−', '×', '÷'] as o (o)}
          <button class="botao ja-conta-op" type="button" aria-pressed={op === o} disabled={primeira === null || !!s.terminou} onclick={() => (op = o as Op)}>{o}</button>
        {/each}
      </div>
      {#if s.estado.contas.length}
        <ol class="ja-conta-contas">{#each s.estado.contas as c, i (i)}<li>{c}</li>{/each}</ol>
      {/if}
      {#if dica}
        <div class="aviso" role="status"><Icone nome="bulb" /><div><p class="aviso-titulo">{dica.titulo}</p><p>{dica.texto}</p></div></div>
      {/if}
    </div>
  {/if}
</Casca>
