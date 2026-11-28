/*
 * Tendas. Cada árvore tem uma tenda encostada (na horizontal ou vertical),
 * uma por árvore; tendas não se tocam, nem na diagonal; os números da borda
 * dizem quantas tendas há em cada linha e coluna.
 */
import { criarAleatorio } from '@ja/contrato';

export interface QuebraTendas {
  largura: number;
  altura: number;
  arvores: number[];
  linhas: number[];
  colunas: number[];
}

const viz4 = (w: number, h: number, i: number) => {
  const x = i % w, y = Math.floor(i / w);
  const r: number[] = [];
  if (x > 0) r.push(i - 1);
  if (x < w - 1) r.push(i + 1);
  if (y > 0) r.push(i - w);
  if (y < h - 1) r.push(i + w);
  return r;
};
const viz8 = (w: number, h: number, i: number) => {
  const x = i % w, y = Math.floor(i / w);
  const r: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h) r.push(ny * w + nx);
  }
  return r;
};

/** Emparelhamento árvore–tenda (algoritmo de caminhos aumentantes). */
function emparelha(q: QuebraTendas, tendas: number[]): boolean {
  if (tendas.length !== q.arvores.length) return false;
  const arv = new Set(q.arvores);
  const par = new Map<number, number>(); // árvore -> tenda
  const tenta = (t: number, vistos: Set<number>): boolean => {
    for (const a of viz4(q.largura, q.altura, t)) {
      if (!arv.has(a) || vistos.has(a)) continue;
      vistos.add(a);
      const atual = par.get(a);
      if (atual === undefined || tenta(atual, vistos)) { par.set(a, t); return true; }
    }
    return false;
  };
  return tendas.every((t) => tenta(t, new Set()));
}

export interface AnaliseTendas {
  /** Tendas encostadas em outra tenda. */
  coladas: Set<number>;
  /** Tendas sem nenhuma árvore ao lado (em cima, embaixo ou dos lados). */
  semArvore: Set<number>;
  /** Contagens certas e nada encostado, mas não dá para ligar cada árvore à sua própria tenda. */
  semPar: boolean;
  linhasErradas: Set<number>;
  colunasErradas: Set<number>;
  resolvido: boolean;
}

export function analisarTendas(q: QuebraTendas, tendas: Set<number>): AnaliseTendas {
  const { largura: w, altura: h } = q;
  const coladas = new Set<number>();
  for (const t of tendas) for (const v of viz8(w, h, t)) if (tendas.has(v)) coladas.add(t);
  const porLinha = new Array(h).fill(0), porColuna = new Array(w).fill(0);
  for (const t of tendas) { porLinha[Math.floor(t / w)]++; porColuna[t % w]++; }
  const linhasErradas = new Set<number>(), colunasErradas = new Set<number>();
  porLinha.forEach((n, y) => n > q.linhas[y] && linhasErradas.add(y));
  porColuna.forEach((n, x) => n > q.colunas[x] && colunasErradas.add(x));
  const contagemOk = porLinha.every((n, y) => n === q.linhas[y]) && porColuna.every((n, x) => n === q.colunas[x]);
  const arv = new Set(q.arvores);
  const semArvore = new Set<number>();
  for (const t of tendas) if (!viz4(w, h, t).some((v) => arv.has(v))) semArvore.add(t);
  const quase = contagemOk && coladas.size === 0 && semArvore.size === 0;
  const resolvido = quase && emparelha(q, [...tendas]);
  return { coladas, semArvore, semPar: quase && !resolvido, linhasErradas, colunasErradas, resolvido };
}

export function contarSolucoesTendas(q: QuebraTendas, limite = 2, prazo = Date.now() + 1500): number {
  const { largura: w, altura: h } = q;
  const arv = new Set(q.arvores);
  const candidatas = new Set<number>();
  for (const a of q.arvores) for (const v of viz4(w, h, a)) if (!arv.has(v)) candidatas.add(v);
  const lista = [...candidatas].sort((a, b) => a - b);
  const porLinha = new Array(h).fill(0), porColuna = new Array(w).fill(0);
  const restaLinha = new Array(h).fill(0), restaColuna = new Array(w).fill(0);
  for (const c of lista) { restaLinha[Math.floor(c / w)]++; restaColuna[c % w]++; }
  const escolhidas = new Set<number>();
  let total = 0;
  const rec = (k: number): boolean => {
    if (Date.now() > prazo) throw new Error('prazo');
    if (k === lista.length) {
      if (porLinha.every((n, y) => n === q.linhas[y]) && porColuna.every((n, x) => n === q.colunas[x]) && emparelha(q, [...escolhidas])) {
        total++;
        return total >= limite;
      }
      return false;
    }
    const c = lista[k], y = Math.floor(c / w), x = c % w;
    restaLinha[y]--; restaColuna[x]--;
    // Com tenda.
    if (porLinha[y] < q.linhas[y] && porColuna[x] < q.colunas[x] && !viz8(w, h, c).some((v) => escolhidas.has(v))) {
      escolhidas.add(c); porLinha[y]++; porColuna[x]++;
      if (rec(k + 1)) return true;
      escolhidas.delete(c); porLinha[y]--; porColuna[x]--;
    }
    // Sem tenda, se ainda dá para completar a linha e a coluna.
    if (porLinha[y] + restaLinha[y] >= q.linhas[y] && porColuna[x] + restaColuna[x] >= q.colunas[x]) {
      if (rec(k + 1)) return true;
    }
    restaLinha[y]++; restaColuna[x]++;
    return false;
  };
  try { rec(0); } catch { return limite; }
  return total;
}

export function gerarTendas(largura: number, altura: number, semente: string): QuebraTendas & { solucao: number[] } {
  const a = criarAleatorio(semente);
  const w = largura, h = altura;
  let melhor: (QuebraTendas & { solucao: number[] }) | null = null;
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const alvo = Math.round((w * h) / 5);
    const tendas = new Set<number>();
    const arvores = new Set<number>();
    for (const c of a.embaralhar(Array.from({ length: w * h }, (_, i) => i))) {
      if (tendas.size >= alvo) break;
      if (tendas.has(c) || arvores.has(c) || viz8(w, h, c).some((v) => tendas.has(v))) continue;
      const livres = viz4(w, h, c).filter((v) => !tendas.has(v) && !arvores.has(v));
      if (!livres.length) continue;
      tendas.add(c);
      arvores.add(livres[a.inteiro(livres.length)]);
    }
    const linhas = new Array(h).fill(0), colunas = new Array(w).fill(0);
    for (const t of tendas) { linhas[Math.floor(t / w)]++; colunas[t % w]++; }
    const q = { largura: w, altura: h, arvores: [...arvores].sort((x, y) => x - y), linhas, colunas, solucao: [...tendas] };
    melhor = q;
    if (contarSolucoesTendas(q) === 1) return q;
  }
  return melhor!;
}
