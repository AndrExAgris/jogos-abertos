/*
 * General (regra brasileira). Cinco dados, até três lançamentos por vez,
 * guardando os que quiser. Em cada rodada o jogador marca uma das dez jogadas:
 * 1 a 6 (soma dos dados daquela face), Seguida (1-2-3-4-5 ou 2-3-4-5-6) 20,
 * Full (trinca + par) 30, Quadra 40, General (cinco iguais) 50. Feita no
 * primeiro lançamento ("de boca"), Seguida, Full e Quadra valem 5 a mais e o
 * General vale 100.
 *
 * Há duas tabelas: a clássica (Seguida 20, Full 30, Quadra 40) e a "seguida
 * maior", comum em muitas mesas e parecida com o Yahtzee (Full 30, Quadra 35,
 * Seguida 40). O General vale 50 nas duas.
 */
export type RegraGeneral = 'seguida40' | 'classica';
export const VALORES_REGRA: Record<RegraGeneral, { seguida: number; full: number; quadra: number }> = {
  seguida40: { seguida: 40, full: 30, quadra: 35 },
  classica: { seguida: 20, full: 30, quadra: 40 },
};
/** Ordem de exibição: as jogadas de valor fixo do menor para o maior. */
export function ordemJogadas(regra: RegraGeneral = 'classica'): Jogada[] {
  const v = VALORES_REGRA[regra];
  const fixas = (['seguida', 'full', 'quadra'] as const).slice().sort((a, b) => v[a] - v[b]);
  return ['1', '2', '3', '4', '5', '6', ...fixas, 'general'];
}
export const JOGADAS = ['1', '2', '3', '4', '5', '6', 'seguida', 'full', 'quadra', 'general'] as const;
export type Jogada = (typeof JOGADAS)[number];
export const NOMES_JOGADA: Record<Jogada, string> = {
  '1': 'Uns', '2': 'Dois', '3': 'Três', '4': 'Quatros', '5': 'Cincos', '6': 'Seis',
  seguida: 'Seguida', full: 'Full', quadra: 'Quadra', general: 'General',
};

export function pontosJogada(dados: number[], j: Jogada, deBoca: boolean, regra: RegraGeneral = 'classica'): number {
  const v = VALORES_REGRA[regra];
  const boca = deBoca ? 5 : 0;
  const cont = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dados) cont[d]++;
  const vals = cont.slice(1).sort((a, b) => b - a);
  switch (j) {
    case 'seguida': {
      const s = [...dados].sort().join('');
      return s === '12345' || s === '23456' ? v.seguida + boca : 0;
    }
    case 'full': return vals[0] === 3 && vals[1] === 2 ? v.full + boca : 0;
    case 'quadra': return vals[0] >= 4 ? v.quadra + boca : 0;
    case 'general': return vals[0] === 5 ? (deBoca ? 100 : 50) : 0;
    default: { const f = Number(j); return cont[f] * f; }
  }
}

export interface EstadoGeneral {
  jogadores: number;
  vez: number;
  dados: number[];
  guardados: boolean[];
  lancamentos: number;
  tabelas: Partial<Record<Jogada, number>>[];
  fim: boolean;
  regra?: RegraGeneral;
}

export const novoGeneral = (jogadores: number, regra: RegraGeneral = 'classica'): EstadoGeneral => ({
  jogadores, regra, vez: 0, dados: [1, 1, 1, 1, 1], guardados: [false, false, false, false, false], lancamentos: 0,
  tabelas: Array.from({ length: jogadores }, () => ({})), fim: false,
});

/** Lança os dados não guardados com os valores sorteados (1 a 6). */
export function lancar(e: EstadoGeneral, sorteio: () => number): EstadoGeneral {
  if (e.lancamentos >= 3 || e.fim) return e;
  const dados = e.dados.map((d, i) => (e.lancamentos > 0 && e.guardados[i] ? d : sorteio()));
  return { ...e, dados, lancamentos: e.lancamentos + 1 };
}

export function guardar(e: EstadoGeneral, i: number): EstadoGeneral {
  if (e.lancamentos === 0 || e.lancamentos >= 3) return e;
  const guardados = e.guardados.slice();
  guardados[i] = !guardados[i];
  return { ...e, guardados };
}

export function marcar(e: EstadoGeneral, j: Jogada): EstadoGeneral {
  if (e.lancamentos === 0 || e.tabelas[e.vez][j] !== undefined) return e;
  const tabelas = e.tabelas.map((t) => ({ ...t }));
  tabelas[e.vez][j] = pontosJogada(e.dados, j, e.lancamentos === 1, e.regra);
  const vez = (e.vez + 1) % e.jogadores;
  const fim = tabelas.every((t) => JOGADAS.every((x) => t[x] !== undefined));
  return { ...e, tabelas, vez, lancamentos: 0, guardados: [false, false, false, false, false], fim };
}

export const total = (t: Partial<Record<Jogada, number>>) => Object.values(t).reduce((s, v) => s + (v ?? 0), 0);

export type NivelIA = 'facil' | 'medio' | 'dificil';
export type JogadaGeneral = { tipo: 'lancar'; guardados: boolean[] } | { tipo: 'marcar'; jogada: Jogada };

/** Quanto vale, em média, deixar a jogada aberta para depois (para não gastar General à toa). */
function reserva(j: Jogada, regra: RegraGeneral): number {
  const v = VALORES_REGRA[regra];
  const tabela: Record<Jogada, number> = { '1': 2, '2': 5, '3': 8, '4': 11, '5': 14, '6': 17, seguida: v.seguida * 0.42, full: v.full * 0.45, quadra: v.quadra * 0.32, general: 12 };
  return tabela[j];
}

function melhorMarca(dados: number[], abertas: Jogada[], deBoca: boolean, regra: RegraGeneral): { jogada: Jogada; valor: number } {
  let melhor = { jogada: abertas[0], valor: -Infinity };
  for (const j of abertas) {
    const valor = pontosJogada(dados, j, deBoca, regra) - reserva(j, regra);
    if (valor > melhor.valor) melhor = { jogada: j, valor };
  }
  return melhor;
}

/**
 * Jogada do computador no General. Fácil: guarda a face que mais aparece e
 * marca o que der mais pontos na hora. Médio e difícil: testam por simulação
 * quais dados guardar e quando parar, pesando o valor de deixar jogadas abertas.
 */
export function jogadaGeneralIA(e: EstadoGeneral, nivel: NivelIA, rnd: () => number = Math.random): JogadaGeneral {
  const regra = e.regra ?? 'classica';
  const nenhum = [false, false, false, false, false];
  if (e.lancamentos === 0) return { tipo: 'lancar', guardados: nenhum };
  const abertas = JOGADAS.filter((j) => e.tabelas[e.vez][j] === undefined);
  const agora = melhorMarca(e.dados, abertas, e.lancamentos === 1, regra);
  if (nivel === 'facil') {
    const maisPontos = abertas.reduce((a, j) => (pontosJogada(e.dados, j, e.lancamentos === 1, regra) > pontosJogada(e.dados, a, e.lancamentos === 1, regra) ? j : a), abertas[0]);
    if (e.lancamentos >= 3 || pontosJogada(e.dados, maisPontos, e.lancamentos === 1, regra) >= 20) return { tipo: 'marcar', jogada: maisPontos };
    const cont = [0, 0, 0, 0, 0, 0, 0];
    e.dados.forEach((d) => cont[d]++);
    const face = cont.indexOf(Math.max(...cont));
    return { tipo: 'lancar', guardados: e.dados.map((d) => d === face) };
  }
  if (e.lancamentos >= 3) return { tipo: 'marcar', jogada: agora.jogada };
  const sims = nivel === 'dificil' ? 160 : 50;
  let melhor = { valor: agora.valor, guardados: null as boolean[] | null };
  for (let m = 0; m < 31; m++) {
    const guardados = e.dados.map((_, i) => !!(m & (1 << i)));
    let soma = 0;
    for (let k = 0; k < sims; k++) {
      const dados = e.dados.map((d, i) => (guardados[i] ? d : 1 + Math.floor(rnd() * 6)));
      soma += melhorMarca(dados, abertas, false, regra).valor;
    }
    // Com dois lançamentos sobrando, a média subestima: dá um bônus pequeno.
    const media = soma / sims + (e.lancamentos === 1 ? (nivel === 'dificil' ? 2.5 : 1.5) : 0);
    if (media > melhor.valor) melhor = { valor: media, guardados };
  }
  if (!melhor.guardados) return { tipo: 'marcar', jogada: agora.jogada };
  return { tipo: 'lancar', guardados: melhor.guardados };
}
