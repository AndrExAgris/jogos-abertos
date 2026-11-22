<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { sementeNova } from '@ja/contrato';
  import { DIRS, bloqueio, gerarSetas, reta, tirar, vazio, type Seta, type Setas } from '@ja/nucleo-estado/setas';
  import Casca from '../../lib/jogo/Casca.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import { vibrar } from '../../lib/jogo/partida.ts';

  interface Estado { setas: Setas; erros: number }
  const s = new Sessao<{ n: number; cores?: number[] }, Estado>('setas');
  const OPCOES = [
    { id: '6', titulo: 'Pequeno', descricao: '6 × 8' },
    { id: '8', titulo: 'Médio', descricao: '8 × 11' },
    { id: '10', titulo: 'Grande', descricao: '10 × 14' },
  ];
  const COMO = [
    'Tire todas as setas da grade. Tocada, a seta desliza para a frente, na direção da ponta, e sai da grade.',
    'Ela só sai se a reta da ponta até a borda estiver livre. Tocar numa seta bloqueada conta um erro e mostra quem está no caminho.',
    'Pense na ordem antes de tocar.',
  ];

  /** Seta saindo (animação): caminho completo e quanto já andou. */
  let saindo = $state<{ seta: Seta; pontos: [number, number][]; andou: number }[]>([]);
  let tremendo = $state(-1);
  let culpada = $state(-1);
  let quadro = 0;
  let ativas = new Set<number>();

  function escolher(id: string) {
    const n = Number(id);
    const h = Math.round((n * 4) / 3 + 0.4);
    const cores = Array.from({ length: 15 }, (_, k) => k).sort(() => Math.random() - 0.5);
    void s.comecar(id, OPCOES.find((o) => o.id === id)!.descricao, () => ({ quebra: { n, cores }, estado: { setas: gerarSetas(n, h, n + 2, sementeNova()), erros: 0 } }));
  }

  const centro = (g: Setas, c: number): [number, number] => [(c % g.largura) + 0.5, Math.floor(c / g.largura) + 0.5];
  const cor = (id: number) => { const c = s.quebra?.cores; return c ? c[id % c.length] : id % 15; };

  /** Trecho da polilinha entre os comprimentos a e b (casas). */
  function trecho(p: [number, number][], a: number, b: number): [number, number][] {
    const res: [number, number][] = [];
    let acum = 0;
    for (let k = 0; k < p.length - 1; k++) {
      const [x1, y1] = p[k], [x2, y2] = p[k + 1];
      const l = Math.hypot(x2 - x1, y2 - y1);
      const ini = Math.max(a, acum), fim = Math.min(b, acum + l);
      if (fim > ini) {
        const t0 = (ini - acum) / l, t1 = (fim - acum) / l;
        if (!res.length) res.push([x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0]);
        res.push([x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1]);
      }
      acum += l;
    }
    return res;
  }

  const pts = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');

  /** Ponta da seta (triângulo) no fim da linha, apontando na direção d. */
  function ponta([x, y]: [number, number], d: number): string {
    const [dx, dy] = DIRS[d];
    const px = -dy, py = dx;
    const f = 0.34, l = 0.26;
    return `${x + dx * f * 0.6},${y + dy * f * 0.6} ${x - dx * l + px * l},${y - dy * l + py * l} ${x - dx * l - px * l},${y - dy * l - py * l}`;
  }

  function tocar(seta: Seta) {
    if (!s.estado || s.terminou) return;
    const g = s.estado.setas;
    const b = bloqueio(g, seta.id);
    if (b >= 0) {
      vibrar(80);
      tremendo = seta.id;
      culpada = b;
      setTimeout(() => { tremendo = -1; culpada = -1; }, 600);
      s.mudar({ ...s.estado, erros: s.estado.erros + 1 }, false);
      return;
    }
    // Caminho: corpo + reta até a borda + o comprimento da seta para fora.
    const corpo = seta.corpo.map((c) => centro(g, c));
    const [dx, dy] = DIRS[seta.dir];
    const fim = corpo[corpo.length - 1];
    const fora = reta(g, seta).length + seta.corpo.length + 1;
    const pontos: [number, number][] = [...corpo, [fim[0] + dx * fora, fim[1] + dy * fora]];
    const novo = tirar(g, seta.id);
    s.mudar({ ...s.estado, setas: novo });
    const item = { seta, pontos, andou: 0 };
    saindo.push(item);
    const inicio = performance.now();
    const duracao = 140 + fora * 16;
    const id = seta.id;
    ativas.add(id);
    const passo = (t: number) => {
      const k = Math.min(1, (t - inicio) / duracao);
      const x = saindo.find((v) => v.seta.id === id);
      if (x) x.andou = fora * (k * (0.35 + 0.65 * k));
      if (k < 1) requestAnimationFrame(passo);
      else {
        ativas.delete(id);
        saindo = saindo.filter((v) => v.seta.id !== id);
        if (s.estado && vazio(s.estado.setas) && !saindo.length) void s.terminar('vitoria');
      }
    };
    quadro = requestAnimationFrame(passo);
  }

  function comprimento(p: [number, number][]) {
    let l = 0;
    for (let k = 0; k < p.length - 1; k++) l += Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]);
    return l;
  }

  onMount(() => s.carregar());
  onDestroy(() => { cancelAnimationFrame(quadro); ativas = new Set(); s.destruir(); });
</script>

<Casca sessao={s} titulo="Setas" comoJogar={COMO} opcoes={OPCOES} aoEscolher={escolher} tituloEscolha="Escolha o tamanho" textoFim={s.estado ? `${s.estado.erros} ${s.estado.erros === 1 ? 'erro' : 'erros'}.` : undefined}>
  {#snippet faixa()}{#if s.estado}<span class="ja-placar-item"><Icone nome="alert-triangle" /><span class="sr-only">Erros:</span><span class="ja-numero">{s.estado.erros}</span></span>{/if}{/snippet}
  {#if s.estado}
    {@const g = s.estado.setas}
    <div class="ja-centro">
      <svg class="ja-setas" viewBox="0 0 {g.largura} {g.altura}" style="--ja-colunas:{g.largura};--ja-linhas:{g.altura}" role="group" aria-label="Setas para tirar">
        <defs>
          <pattern id="ja-setas-pontos" width="1" height="1" patternUnits="userSpaceOnUse"><circle cx="0.5" cy="0.5" r="0.05" class="ja-setas-ponto" /></pattern>
        </defs>
        <rect width={g.largura} height={g.altura} fill="url(#ja-setas-pontos)" />
        {#each g.setas as seta (seta.id)}
          {@const p = seta.corpo.map((c) => centro(g, c))}
          <g
            class="ja-seta-linha ja-paleta-{cor(seta.id)}"
            data-treme={tremendo === seta.id || undefined}
            data-culpada={culpada === seta.id || undefined}
            role="button"
            tabindex="-1"
            aria-label="Seta de {seta.corpo.length} casas apontando para {['cima', 'a direita', 'baixo', 'a esquerda'][seta.dir]}"
            onclick={() => tocar(seta)}
            onkeydown={(e) => e.key === 'Enter' && tocar(seta)}
          >
            <polyline class="ja-seta-toque" points={pts(p)} />
            <polyline class="ja-seta-corpo" points={pts(p)} />
            <polygon class="ja-seta-ponta" points={ponta(p[p.length - 1], seta.dir)} />
          </g>
        {/each}
        {#each saindo as sa (sa.seta.id)}
          {@const L = comprimento(sa.seta.corpo.map((c) => centro(g, c)))}
          {@const t = trecho(sa.pontos, sa.andou, sa.andou + L + 0.0001)}
          {#if t.length > 1}
            <g class="ja-seta-linha ja-seta-saindo ja-paleta-{cor(sa.seta.id)}" aria-hidden="true">
              <polyline class="ja-seta-corpo" points={pts(t)} />
              <polygon class="ja-seta-ponta" points={ponta(t[t.length - 1], sa.seta.dir)} />
            </g>
          {/if}
        {/each}
      </svg>
    </div>
  {/if}
</Casca>
