<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { lerPreferencias, salvarPreferencias, vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { sequencia: number[]; posicao: number; melhor: number }
  const s = new Sessao<{ modo: string }, Estado>('sequencia', { semRelogio: true, pontuacao: (e) => e.sequencia.length - 1 });
  const OPCOES = [
    { id: 'normal', titulo: 'Normal', descricao: 'A sequência cresce uma cor por vez' },
    { id: 'rapido', titulo: 'Rápido', descricao: 'Fica mais rápida a cada rodada' },
  ];
  const COMO = [
    'Veja a sequência de cores e repita na mesma ordem. A cada rodada certa, ela ganha mais uma cor.',
    'Errou, acabou: o placar é quantas cores você acertou em seguida. Cada cor tem um som e uma forma, para quem distingue mal as cores.',
  ];
  const BOTOES = [
    { cor: 'sucesso', forma: 'circle', nota: 329.6 },
    { cor: 'erro', forma: 'triangle', nota: 392 },
    { cor: 'info', forma: 'square', nota: 493.9 },
    { cor: 'aviso', forma: 'diamond', nota: 587.3 },
  ];
  let acesa = $state(-1);
  let mostrando = $state(false);
  let som = $state(true);
  let audio: AudioContext | null = null;
  let parar = false;

  function tocarSom(k: number, ms: number) {
    if (!som) return;
    try {
      audio ??= new AudioContext();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle';
      o.frequency.value = BOTOES[k].nota;
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + ms / 1000 + 0.05);
    } catch { /* sem áudio */ }
  }
  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function mostrar(seq: number[]) {
    mostrando = true;
    await espera(600);
    const rapido = s.quebra?.modo === 'rapido';
    const ms = rapido ? Math.max(180, 520 - seq.length * 28) : 480;
    for (const k of seq) {
      if (parar) return;
      acesa = k;
      tocarSom(k, ms);
      await espera(ms);
      acesa = -1;
      await espera(ms * 0.35);
    }
    mostrando = false;
  }
  function comecar(id: string) {
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.titulo, () => ({ quebra: { modo: id }, estado: { sequencia: [Math.floor(Math.random() * 4)], posicao: 0, melhor: 0 } }));
  }
  // Toda vez que a sequência cresce (ou a partida começa), mostra de novo.
  let mostrada = '';
  $effect(() => {
    const e = s.estado;
    if (!e || s.terminou || e.posicao !== 0) return;
    const chave = e.sequencia.join('');
    if (chave === mostrada) return;
    mostrada = chave;
    void mostrar(e.sequencia);
  });
  async function apertar(k: number) {
    const e = s.estado;
    if (!e || mostrando || s.terminou) return;
    acesa = k;
    tocarSom(k, 220);
    setTimeout(() => { if (acesa === k) acesa = -1; }, 180);
    if (e.sequencia[e.posicao] !== k) {
      vibrar(150);
      void s.terminar('vitoria');
      return;
    }
    if (e.posicao + 1 < e.sequencia.length) { s.mudar({ ...e, posicao: e.posicao + 1 }, false); return; }
    vibrar(15);
    s.mudar({ sequencia: [...e.sequencia, Math.floor(Math.random() * 4)], posicao: 0, melhor: e.sequencia.length }, false);
  }
  onMount(async () => { som = (await lerPreferencias('sequencia', { som: true })).som; await s.carregar(); });
  onDestroy(() => { parar = true; void audio?.close(); s.destruir(); });
</script>

<Casca sessao={s} titulo="Sequência de Cores" comoJogar={COMO} opcoes={OPCOES} aoEscolher={comecar} semRelogio semDesfazer tituloFim={s.recorde ? 'Novo recorde!' : 'Fim de jogo'} textoFim={s.estado ? `Você acertou ${s.estado.sequencia.length - 1} ${s.estado.sequencia.length - 1 === 1 ? 'cor' : 'cores'} em seguida.` : ''}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><span class="ja-numero">{s.estado.sequencia.length - 1}</span> acertos</span>{/if}{/snippet}
  {#snippet rodape()}
    <button class="botao ja-botao-alternar" type="button" aria-pressed={som} onclick={() => { som = !som; void salvarPreferencias('sequencia', { som }); }}><Icone nome={som ? 'volume' : 'volume-off'} /><span>{som ? 'Som ligado' : 'Sem som'}</span></button>
  {/snippet}
  {#if s.estado}
    <p class="ja-dica" aria-live="polite">{s.terminou ? '' : mostrando ? 'Preste atenção…' : 'Sua vez: repita a sequência'}</p>
    <div class="ja-centro">
      <div class="ja-sequencia" data-mostrando={mostrando || undefined}>
        {#each BOTOES as b, k (k)}
          <button type="button" class="ja-seq-botao" style="--c: var(--{b.cor})" data-acesa={acesa === k || undefined} aria-label="Cor {k + 1}" onpointerdown={() => apertar(k)}>
            <svg viewBox="-10 -10 20 20" aria-hidden="true">
              {#if b.forma === 'circle'}<circle r="5" />{:else if b.forma === 'triangle'}<path d="M0 -6L6 5H-6Z" />{:else if b.forma === 'square'}<rect x="-5" y="-5" width="10" height="10" rx="1" />{:else}<path d="M0 -6.5L6.5 0L0 6.5L-6.5 0Z" />{/if}
            </svg>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Casca>
