/*
 * Dado Mentiroso. Cada jogador tem cinco dados escondidos. Na vez, aposta que
 * há pelo menos N dados de uma face entre TODOS os dados da mesa, sempre
 * subindo (mais dados, ou a mesma quantidade com face maior), ou diz "duvido"
 * da aposta anterior. O 1 é coringa e conta para qualquer face (não se aposta
 * no 1). Se a aposta estava certa, quem duvidou perde um dado; senão, perde
 * quem apostou. Sem dados, sai do jogo; vence o último que sobrar.
 */
export interface Aposta { quantidade: number; face: number; jogador: number }

export interface EstadoMentiroso {
  dados: number[][];
  vez: number;
  aposta: Aposta | null;
  /** Resultado do último "duvido", mostrado a todos. */
  revelacao: null | { aposta: Aposta; duvidou: number; total: number; perdeu: number; dados: number[][] };
  vencedor: number | null;
}

export function novoMentiroso(jogadores: number, sorteio: () => number): EstadoMentiroso {
  return { dados: Array.from({ length: jogadores }, () => Array.from({ length: 5 }, sorteio)), vez: 0, aposta: null, revelacao: null, vencedor: null };
}

const proximoVivo = (e: EstadoMentiroso, de: number) => {
  for (let k = 1; k <= e.dados.length; k++) { const j = (de + k) % e.dados.length; if (e.dados[j].length) return j; }
  return de;
};

export const totalDados = (e: EstadoMentiroso) => e.dados.reduce((s, d) => s + d.length, 0);

export function apostaValida(e: EstadoMentiroso, quantidade: number, face: number): boolean {
  if (face < 2 || face > 6 || quantidade < 1 || quantidade > totalDados(e)) return false;
  if (!e.aposta) return true;
  return quantidade > e.aposta.quantidade || (quantidade === e.aposta.quantidade && face > e.aposta.face);
}

export function apostar(e: EstadoMentiroso, quantidade: number, face: number): EstadoMentiroso {
  if (!apostaValida(e, quantidade, face) || e.vencedor !== null) return e;
  return { ...e, aposta: { quantidade, face, jogador: e.vez }, vez: proximoVivo(e, e.vez), revelacao: null };
}

export function contar(dados: number[][], face: number) {
  return dados.flat().filter((d) => d === face || d === 1).length;
}

/** "Duvido": revela, tira um dado de quem errou e sorteia de novo os dados de todos. */
export function duvidar(e: EstadoMentiroso, sorteio: () => number): EstadoMentiroso {
  if (!e.aposta || e.vencedor !== null) return e;
  const total = contar(e.dados, e.aposta.face);
  const perdeu = total >= e.aposta.quantidade ? e.vez : e.aposta.jogador;
  const revelacao = { aposta: e.aposta, duvidou: e.vez, total, perdeu, dados: e.dados.map((d) => d.slice()) };
  const tamanhos = e.dados.map((d, j) => d.length - (j === perdeu ? 1 : 0));
  const dados = tamanhos.map((n) => Array.from({ length: n }, sorteio));
  const vivos = dados.map((d, j) => (d.length ? j : -1)).filter((j) => j >= 0);
  const n: EstadoMentiroso = { dados, vez: perdeu, aposta: null, revelacao, vencedor: vivos.length === 1 ? vivos[0] : null };
  if (!dados[perdeu].length) n.vez = proximoVivo(n, perdeu);
  return n;
}

export type NivelIA = 'facil' | 'medio' | 'dificil';
export type JogadaMentiroso = { tipo: 'duvidar' } | { tipo: 'apostar'; quantidade: number; face: number };

/** P(X >= k) com X ~ Binomial(n, p). */
function pelomenos(k: number, n: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let soma = 0;
  let comb = 1;
  for (let i = 0; i <= n; i++) {
    if (i > 0) comb = (comb * (n - i + 1)) / i;
    if (i >= k) soma += comb * p ** i * (1 - p) ** (n - i);
  }
  return soma;
}

/** Chance de a aposta (quantidade de face) ser verdadeira, vista por quem tem os dados `meus`. */
export function chanceAposta(meus: number[], desconhecidos: number, quantidade: number, face: number): number {
  const tenho = meus.filter((d) => d === face || d === 1).length;
  return pelomenos(quantidade - tenho, desconhecidos, 1 / 3);
}

/**
 * Jogada do computador. Fácil: arrisca e duvida quase ao acaso; médio: usa a
 * chance pelos próprios dados; difícil: idem, com limites mais finos e um
 * pouco de blefe.
 */
export function jogadaIA(e: EstadoMentiroso, nivel: NivelIA, rnd: () => number = Math.random): JogadaMentiroso {
  const meus = e.dados[e.vez];
  const desconhecidos = totalDados(e) - meus.length;
  const total = totalDados(e);
  const limiteDuvida = { facil: 0.12, medio: 0.32, dificil: 0.42 }[nivel];
  if (e.aposta) {
    const p = chanceAposta(meus, desconhecidos, e.aposta.quantidade, e.aposta.face);
    if (nivel === 'facil' ? p < limiteDuvida || rnd() < 0.12 : p < limiteDuvida) return { tipo: 'duvidar' };
  }
  // Candidatas: as menores apostas válidas de cada face (e uma acima).
  const opcoes: { quantidade: number; face: number; p: number; peso: number }[] = [];
  for (let face = 2; face <= 6; face++) {
    let q = 1;
    while (!apostaValida(e, q, face) && q <= total) q++;
    for (const qq of [q, q + 1]) {
      if (qq > total || !apostaValida(e, qq, face)) continue;
      const p = chanceAposta(meus, desconhecidos, qq, face);
      const tenho = meus.filter((d) => d === face || d === 1).length;
      opcoes.push({ quantidade: qq, face, p, peso: p + tenho * 0.03 - (qq - q) * 0.08 });
    }
  }
  if (!opcoes.length) return { tipo: 'duvidar' };
  if (nivel === 'facil') {
    const boas = opcoes.filter((o) => o.p >= 0.25);
    const lista = boas.length ? boas : opcoes;
    const o = lista[Math.floor(rnd() * lista.length)];
    return { tipo: 'apostar', quantidade: o.quantidade, face: o.face };
  }
  const ruido = nivel === 'medio' ? 0.12 : 0.05;
  opcoes.sort((a, b) => b.peso + (rnd() - 0.5) * ruido - (a.peso + (rnd() - 0.5) * ruido));
  const melhor = opcoes[0];
  // Sem aposta razoável: duvida (se dá) em vez de subir no escuro.
  if (e.aposta && melhor.p < (nivel === 'dificil' ? 0.3 : 0.22)) return { tipo: 'duvidar' };
  return { tipo: 'apostar', quantidade: melhor.quantidade, face: melhor.face };
}
