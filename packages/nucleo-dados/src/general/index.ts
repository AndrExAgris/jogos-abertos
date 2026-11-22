/*
 * General (regra brasileira). Cinco dados, até três lançamentos por vez,
 * guardando os que quiser. Em cada rodada o jogador marca uma das dez jogadas:
 * 1 a 6 (soma dos dados daquela face), Seguida (1-2-3-4-5 ou 2-3-4-5-6) 20,
 * Full (trinca + par) 30, Quadra 40, General (cinco iguais) 50. Feita no
 * primeiro lançamento ("de boca"), Seguida, Full e Quadra valem 5 a mais e o
 * General vale 100.
 */
export const JOGADAS = ['1', '2', '3', '4', '5', '6', 'seguida', 'full', 'quadra', 'general'] as const;
export type Jogada = (typeof JOGADAS)[number];
export const NOMES_JOGADA: Record<Jogada, string> = {
  '1': 'Uns', '2': 'Dois', '3': 'Três', '4': 'Quatros', '5': 'Cincos', '6': 'Seis',
  seguida: 'Seguida', full: 'Full', quadra: 'Quadra', general: 'General',
};

export function pontosJogada(dados: number[], j: Jogada, deBoca: boolean): number {
  const cont = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dados) cont[d]++;
  const vals = cont.slice(1).sort((a, b) => b - a);
  switch (j) {
    case 'seguida': {
      const s = [...dados].sort().join('');
      return s === '12345' || s === '23456' ? (deBoca ? 25 : 20) : 0;
    }
    case 'full': return vals[0] === 3 && vals[1] === 2 ? (deBoca ? 35 : 30) : 0;
    case 'quadra': return vals[0] >= 4 ? (deBoca ? 45 : 40) : 0;
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
}

export const novoGeneral = (jogadores: number): EstadoGeneral => ({
  jogadores, vez: 0, dados: [1, 1, 1, 1, 1], guardados: [false, false, false, false, false], lancamentos: 0,
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
  tabelas[e.vez][j] = pontosJogada(e.dados, j, e.lancamentos === 1);
  const vez = (e.vez + 1) % e.jogadores;
  const fim = tabelas.every((t) => JOGADAS.every((x) => t[x] !== undefined));
  return { ...e, tabelas, vez, lancamentos: 0, guardados: [false, false, false, false, false], fim };
}

export const total = (t: Partial<Record<Jogada, number>>) => Object.values(t).reduce((s, v) => s + (v ?? 0), 0);
