/*
 * Sumplete. Grade n×n de números; cada linha e cada coluna tem uma soma-alvo.
 * Apague números até que a soma dos que restam bata com o alvo de cada linha
 * e de cada coluna. O gerador só aceita grades com uma única solução.
 */
import { criarAleatorio } from '@ja/contrato';

export interface QuebraSumplete {
  n: number;
  numeros: number[];
  alvoLinhas: number[];
  alvoColunas: number[];
  /** 1 = fica, 0 = sai. */
  solucao: number[];
}

/** Marca de cada casa: 0 = nada, 1 = apagado, 2 = confirmado (fica). */
export type MarcaSumplete = 0 | 1 | 2;

/** Conta soluções (até `limite`). */
export function contarSolucoes(n: number, numeros: number[], alvoLinhas: number[], alvoColunas: number[], limite = 2): number {
  // Para cada linha, as máscaras que batem com o alvo dela.
  const opcoes: number[][] = [];
  for (let y = 0; y < n; y++) {
    const ops: number[] = [];
    for (let m = 0; m < 1 << n; m++) {
      let s = 0;
      for (let x = 0; x < n; x++) if (m & (1 << x)) s += numeros[y * n + x];
      if (s === alvoLinhas[y]) ops.push(m);
    }
    if (!ops.length) return 0;
    opcoes.push(ops);
  }
  // Máximo que ainda pode entrar em cada coluna a partir da linha y.
  const resto: number[][] = Array.from({ length: n + 1 }, () => new Array(n).fill(0));
  for (let y = n - 1; y >= 0; y--) for (let x = 0; x < n; x++) resto[y][x] = resto[y + 1][x] + numeros[y * n + x];
  const soma = new Array(n).fill(0);
  let achadas = 0;
  const busca = (y: number): void => {
    if (achadas >= limite) return;
    if (y === n) {
      if (soma.every((s, x) => s === alvoColunas[x])) achadas++;
      return;
    }
    for (const m of opcoes[y]) {
      let ok = true;
      for (let x = 0; x < n; x++) {
        const v = m & (1 << x) ? numeros[y * n + x] : 0;
        const s = soma[x] + v;
        if (s > alvoColunas[x] || s + resto[y + 1][x] < alvoColunas[x]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let x = 0; x < n; x++) if (m & (1 << x)) soma[x] += numeros[y * n + x];
      busca(y + 1);
      for (let x = 0; x < n; x++) if (m & (1 << x)) soma[x] -= numeros[y * n + x];
      if (achadas >= limite) return;
    }
  };
  busca(0);
  return achadas;
}

export function gerarSumplete(n: number, semente: string): QuebraSumplete {
  const r = criarAleatorio(semente);
  for (let tentativa = 0; tentativa < 5000; tentativa++) {
    const numeros = Array.from({ length: n * n }, () => 1 + r.inteiro(9));
    // Entre um terço e metade das casas saem; toda linha e coluna fica com ao menos um número.
    const solucao = numeros.map(() => (r.real() < 0.42 ? 0 : 1));
    let valido = true;
    for (let k = 0; k < n && valido; k++) {
      let linha = 0, coluna = 0;
      for (let t = 0; t < n; t++) { linha += solucao[k * n + t]; coluna += solucao[t * n + k]; }
      if (!linha || !coluna) valido = false;
    }
    if (!valido) continue;
    const alvoLinhas = Array.from({ length: n }, (_, y) => numeros.slice(y * n, y * n + n).reduce((s, v, x) => s + v * solucao[y * n + x], 0));
    const alvoColunas = Array.from({ length: n }, (_, x) => numeros.reduce((s, v, i) => (i % n === x ? s + v * solucao[i] : s), 0));
    if (contarSolucoes(n, numeros, alvoLinhas, alvoColunas) === 1) return { n, numeros, alvoLinhas, alvoColunas, solucao };
  }
  throw new Error('Não deu para gerar uma grade com solução única.');
}

/** Soma do que não foi apagado. */
export function somas(q: QuebraSumplete, marcas: MarcaSumplete[]): { linhas: number[]; colunas: number[] } {
  const { n } = q;
  const linhas = new Array(n).fill(0), colunas = new Array(n).fill(0);
  q.numeros.forEach((v, i) => {
    if (marcas[i] === 1) return;
    linhas[Math.floor(i / n)] += v;
    colunas[i % n] += v;
  });
  return { linhas, colunas };
}

export function resolvido(q: QuebraSumplete, marcas: MarcaSumplete[]): boolean {
  const s = somas(q, marcas);
  return s.linhas.every((v, i) => v === q.alvoLinhas[i]) && s.colunas.every((v, i) => v === q.alvoColunas[i]);
}
