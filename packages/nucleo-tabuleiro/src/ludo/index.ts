/*
 * Ludo de 2 a 4 jogadores. Cada um tem 4 peões. Tire 6 para sair da base;
 * dê a volta (52 casas) e entre na reta final (5 casas) até a chegada, com o
 * número exato. Cair sobre um peão sozinho do outro, fora das casas seguras,
 * manda ele de volta à base. Tirar 6 dá direito a jogar de novo (até 3 vezes).
 *
 * Posição de um peão: -1 base; 0..50 trilha (relativa à saída da cor);
 * 51..55 reta final; 56 chegada.
 */
export const VOLTA = 52;
export const CHEGADA = 56;
/** Casas seguras (absolutas): saídas e estrelas. */
export const SEGURAS = [0, 8, 13, 21, 26, 34, 39, 47];

export interface EstadoLudo {
  /** Cores em jogo (0 a 3), na ordem de jogada. */
  cores: number[];
  peoes: number[][]; // [cor][peão] posição relativa
  vez: number; // índice em `cores`
  dado: number | null;
  seis: number;
  vencedor: number | null; // cor
}

export const absoluta = (cor: number, rel: number) => (rel < 0 || rel > 50 ? -1 : (cor * 13 + rel) % VOLTA);

export function novoLudo(jogadores: number): EstadoLudo {
  const cores = jogadores === 2 ? [0, 2] : jogadores === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return { cores, peoes: [0, 1, 2, 3].map(() => [-1, -1, -1, -1]), vez: 0, dado: null, seis: 0, vencedor: null };
}

export function destino(e: EstadoLudo, peao: number): number | null {
  const cor = e.cores[e.vez];
  const pos = e.peoes[cor][peao];
  const d = e.dado;
  if (d === null || pos === CHEGADA) return null;
  if (pos < 0) return d === 6 ? 0 : null;
  const novo = pos + d;
  return novo > CHEGADA ? null : novo;
}

export const movimentosLudo = (e: EstadoLudo) => [0, 1, 2, 3].filter((p) => destino(e, p) !== null);

export function rolar(e: EstadoLudo, valor: number): EstadoLudo {
  if (e.dado !== null || e.vencedor !== null) return e;
  const n = { ...e, dado: valor, seis: valor === 6 ? e.seis + 1 : 0 };
  // Três seis seguidos: perde a vez.
  if (n.seis >= 3) return passarVez({ ...n, seis: 0 });
  if (!movimentosLudo(n).length) return passarVez(n);
  return n;
}

function passarVez(e: EstadoLudo): EstadoLudo {
  return { ...e, dado: null, seis: 0, vez: (e.vez + 1) % e.cores.length };
}

export function moverLudo(e: EstadoLudo, peao: number): EstadoLudo {
  const para = destino(e, peao);
  if (para === null) return e;
  const cor = e.cores[e.vez];
  const peoes = e.peoes.map((l) => l.slice());
  peoes[cor][peao] = para;
  const abs = absoluta(cor, para);
  if (abs >= 0 && !SEGURAS.includes(abs)) {
    for (const outra of e.cores) {
      if (outra === cor) continue;
      const ali = peoes[outra].map((p, k) => (absoluta(outra, p) === abs ? k : -1)).filter((k) => k >= 0);
      if (ali.length === 1) peoes[outra][ali[0]] = -1;
    }
  }
  const n = { ...e, peoes };
  if (peoes[cor].every((p) => p === CHEGADA)) return { ...n, vencedor: cor, dado: null };
  return e.dado === 6 ? { ...n, dado: null } : passarVez(n);
}
