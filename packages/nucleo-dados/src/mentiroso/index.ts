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
