<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Icone } from '@ja/ui';
  import { apostaValida, apostar, duvidar, novoMentiroso, totalDados, type EstadoMentiroso } from '@ja/nucleo-dados/mentiroso';
  import Casca from '../../lib/jogo/Casca.svelte';
  import Jogadores from '../../lib/jogo/Jogadores.svelte';
  import { Sessao } from '../../lib/jogo/sessao.svelte.ts';
  import Dado from './Dado.svelte';

  const s = new Sessao<{ jogadores: number }, EstadoMentiroso>('mentiroso', { semRelogio: true, semEstatisticas: true });
  const OPCOES = [2, 3, 4].map((n) => ({ id: String(n), titulo: `${n} jogadores`, descricao: 'Passando o aparelho a cada vez' }));
  const COMO = [
    'Cada jogador tem cinco dados escondidos. Na sua vez, aposte que há pelo menos tantos dados de uma face entre todos os dados da mesa, ou diga "Duvido" da aposta anterior.',
    'Cada aposta tem que subir: mais dados, ou a mesma quantidade com uma face maior. O 1 é coringa e conta para qualquer face.',
    'No "Duvido", todos os dados aparecem: se a aposta estava certa, quem duvidou perde um dado; senão, quem apostou. Sem dados, a pessoa sai. Vence quem sobrar.',
    'Passe o aparelho na vez de cada um; os dados só aparecem quando a pessoa tocar em "Ver meus dados".',
  ];
  let vendo = $state(false);
  let quantidade = $state(1);
  let face = $state(2);
  const sorteio = () => 1 + Math.floor(Math.random() * 6);
  const nomes = $derived(s.estado ? s.estado.dados.map((_, i) => `Jogador ${i + 1}`) : []);

  $effect(() => {
    // Sugere a menor aposta válida.
    const e = s.estado;
    if (!e) return;
    if (e.aposta) { quantidade = e.aposta.quantidade; face = e.aposta.face + 1; if (face > 6) { face = 2; quantidade++; } }
    else { quantidade = 1; face = 2; }
  });

  function fazerAposta() {
    if (!s.estado) return;
    s.mudar(apostar(s.estado, quantidade, face), false);
    vendo = false;
  }
  function fazerDuvido() {
    if (!s.estado) return;
    const n = duvidar(s.estado, sorteio);
    s.mudar(n, false);
    vendo = false;
    if (n.vencedor !== null) void s.terminar('vitoria');
  }
  onMount(() => s.carregar());
  onDestroy(() => s.destruir());
</script>

<Casca sessao={s} titulo="Dado Mentiroso" comoJogar={COMO} opcoes={OPCOES} aoEscolher={(id) => s.comecar(id, `${id} jogadores`, () => ({ quebra: { jogadores: Number(id) }, estado: novoMentiroso(Number(id), sorteio) }))} tituloFim={s.estado?.vencedor != null ? `Jogador ${s.estado.vencedor + 1} venceu!` : ''} textoFim="" semRelogio semDesfazer tituloEscolha="Quantos jogadores?">
  {#if s.estado}
    {@const e = s.estado}
    <Jogadores {nomes} vez={s.terminou ? -1 : e.vez} pontos={e.dados.map((d) => `${d.length} dados`)} />
    {#if e.revelacao}
      {@const r = e.revelacao}
      <div class="aviso" role="status">
        <Icone nome="eye" />
        <div>
          <p class="aviso-titulo">Jogador {r.duvidou + 1} duvidou de {r.aposta.quantidade} × {r.aposta.face}</p>
          <p>Havia {r.total} (contando os 1). Jogador {r.perdeu + 1} perdeu um dado.</p>
        </div>
      </div>
      <div class="ja-revelacao">
        {#each r.dados as d, j (j)}
          <div class="ja-dados-linha ja-dados-mini"><span class="ui-pequeno texto-2">J{j + 1}</span>{#each d as v, k (k)}<Dado valor={v} />{/each}</div>
        {/each}
      </div>
    {/if}
    {#if !s.terminou}
      <p class="ja-dica">{e.aposta ? `Aposta atual: Jogador ${e.aposta.jogador + 1} diz que há pelo menos ${e.aposta.quantidade} dado(s) ${e.aposta.face}.` : 'Ninguém apostou ainda nesta rodada.'} Há {totalDados(e)} dados na mesa.</p>
      {#if !vendo}
        <div class="ja-botoes"><button class="botao botao-primario" type="button" onclick={() => (vendo = true)}><Icone nome="eye" /><span>Jogador {e.vez + 1}: ver meus dados</span></button></div>
      {:else}
        <div class="ja-dados-linha">{#each e.dados[e.vez] as v, k (k)}<Dado valor={v} />{/each}</div>
        <div class="ja-aposta">
          <div class="ja-aposta-campo">
            <span class="ui-pequeno texto-2">Quantidade</span>
            <div class="ja-botoes">
              <button class="botao botao-icone" type="button" aria-label="Menos" onclick={() => (quantidade = Math.max(1, quantidade - 1))}><Icone nome="minus" /></button>
              <span class="ja-numero">{quantidade}</span>
              <button class="botao botao-icone" type="button" aria-label="Mais" onclick={() => (quantidade = Math.min(totalDados(e), quantidade + 1))}><Icone nome="plus" /></button>
            </div>
          </div>
          <div class="ja-aposta-campo">
            <span class="ui-pequeno texto-2">Face</span>
            <div class="segmentado" role="group" aria-label="Face">
              {#each [2, 3, 4, 5, 6] as f (f)}<button type="button" aria-pressed={face === f} onclick={() => (face = f)}>{f}</button>{/each}
            </div>
          </div>
        </div>
        <div class="ja-botoes">
          <button class="botao botao-primario" type="button" disabled={!apostaValida(e, quantidade, face)} onclick={fazerAposta}><span>Apostar {quantidade} × {face}</span></button>
          <button class="botao botao-destrutivo" type="button" disabled={!e.aposta} onclick={fazerDuvido}><span>Duvido!</span></button>
        </div>
      {/if}
    {/if}
  {/if}
</Casca>
