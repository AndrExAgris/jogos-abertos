/*
 * Nonograma: pinte as casas pelas pistas de cada linha e coluna (tamanhos dos
 * blocos pintados, em ordem). O gerador sorteia uma imagem e só aceita se ela
 * se resolve linha a linha, sem chute (o que também garante solução única).
 */
import { criarAleatorio } from '@ja/contrato';

export interface QuebraNonograma { largura: number; altura: number; linhas: number[][]; colunas: number[][]; solucao: boolean[] }

export function pistas(celulas: boolean[]): number[] {
  const r: number[] = [];
  let n = 0;
  for (const c of celulas) { if (c) n++; else if (n) { r.push(n); n = 0; } }
  if (n) r.push(n);
  return r;
}

/**
 * Resolve uma linha: estado 1 = pintada, 0 = vazia, -1 = desconhecida.
 * Devolve a linha com tudo o que dá para deduzir, ou null se for impossível.
 */
export function resolverLinha(pista: number[], linha: number[]): number[] | null {
  const n = linha.length, k = pista.length;
  // pode[i][j]: as casas i.. podem receber os blocos j.. (memo).
  const memo = new Map<number, boolean>();
  const podeCheia = new Uint8Array(n), podeVazia = new Uint8Array(n);
  const cabe = (i: number, j: number): boolean => {
    const chave = i * (k + 1) + j;
    const m = memo.get(chave);
    if (m !== undefined) return m;
    let ok = false;
    if (j === k) {
      ok = true;
      for (let x = i; x < n; x++) if (linha[x] === 1) { ok = false; break; }
    } else {
      const t = pista[j];
      // Opção 1: casa i vazia.
      if (i < n && linha[i] !== 1 && cabe(i + 1, j)) ok = true;
      // Opção 2: bloco começa em i.
      if (i + t <= n) {
        let livre = true;
        for (let x = i; x < i + t; x++) if (linha[x] === 0) { livre = false; break; }
        if (livre && (i + t === n || linha[i + t] !== 1)) {
          const prox = i + t === n ? n : i + t + 1;
          if (j + 1 === k ? cabe(prox, k) : prox <= n && cabe(prox, j + 1)) ok = true;
        }
      }
    }
    memo.set(chave, ok);
    return ok;
  };
  if (!cabe(0, 0)) return null;
  // Segunda passada: marca o que cada casa pode ser nas soluções.
  const marcar = (i: number, j: number, visto: Set<number>) => {
    const chave = i * (k + 1) + j;
    if (visto.has(chave) || !cabe(i, j)) return;
    visto.add(chave);
    if (j === k) { for (let x = i; x < n; x++) podeVazia[x] = 1; return; }
    const t = pista[j];
    if (i < n && linha[i] !== 1 && cabe(i + 1, j)) { podeVazia[i] = 1; marcar(i + 1, j, visto); }
    if (i + t <= n) {
      let livre = true;
      for (let x = i; x < i + t; x++) if (linha[x] === 0) { livre = false; break; }
      if (livre && (i + t === n || linha[i + t] !== 1)) {
        const prox = i + t === n ? n : i + t + 1;
        const segue = j + 1 === k ? cabe(prox, k) : prox <= n && cabe(prox, j + 1);
        if (segue) {
          for (let x = i; x < i + t; x++) podeCheia[x] = 1;
          if (i + t < n) podeVazia[i + t] = 1;
          marcar(prox, j + 1, visto);
        }
      }
    }
  };
  marcar(0, 0, new Set());
  return linha.map((v, x) => (podeCheia[x] && podeVazia[x] ? v : podeCheia[x] ? 1 : 0));
}

/** Resolve só com dedução linha a linha. Devolve a grade (com -1 no que ficou em aberto) ou null. */
export function resolverPorLinhas(largura: number, altura: number, linhas: number[][], colunas: number[][]): number[] | null {
  const g = new Array<number>(largura * altura).fill(-1);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let y = 0; y < altura; y++) {
      const antes = g.slice(y * largura, (y + 1) * largura);
      const r = resolverLinha(linhas[y], antes);
      if (!r) return null;
      r.forEach((v, x) => { if (v !== antes[x]) { g[y * largura + x] = v; mudou = true; } });
    }
    for (let x = 0; x < largura; x++) {
      const antes = Array.from({ length: altura }, (_, y) => g[y * largura + x]);
      const r = resolverLinha(colunas[x], antes);
      if (!r) return null;
      r.forEach((v, y) => { if (v !== antes[y]) { g[y * largura + x] = v; mudou = true; } });
    }
  }
  return g;
}

export function gerarNonograma(largura: number, altura: number, semente: string, densidade = 0.58): QuebraNonograma {
  const a = criarAleatorio(semente);
  for (let tent = 0; ; tent++) {
    // Imagem com manchas: casas pintadas puxam as vizinhas, para parecer desenho.
    const sol = new Array<boolean>(largura * altura).fill(false);
    for (let i = 0; i < sol.length; i++) sol[i] = a.inteiro(1000) < densidade * 1000;
    for (let passo = 0; passo < 2; passo++) {
      const c = sol.slice();
      for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
        let v = 0, t = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < largura && ny >= 0 && ny < altura) { t++; if (c[ny * largura + nx]) v++; }
        }
        if (v * 2 > t + 1) sol[y * largura + x] = true;
        else if (v * 2 < t - 1) sol[y * largura + x] = false;
      }
    }
    const linhas = Array.from({ length: altura }, (_, y) => pistas(sol.slice(y * largura, (y + 1) * largura)));
    const colunas = Array.from({ length: largura }, (_, x) => pistas(Array.from({ length: altura }, (_, y) => sol[y * largura + x])));
    if (linhas.some((l) => !l.length) && tent < 50) continue;
    const r = resolverPorLinhas(largura, altura, linhas, colunas);
    if (r && r.every((v) => v !== -1)) return { largura, altura, linhas, colunas, solucao: sol };
  }
}
