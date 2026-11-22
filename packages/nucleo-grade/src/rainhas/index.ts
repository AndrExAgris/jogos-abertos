/*
 * Rainhas. Grade n×n dividida em n regiões. Ponha uma coroa em cada linha,
 * coluna e região; duas coroas nunca se tocam, nem na diagonal.
 */
import { criarAleatorio } from '@ja/contrato';

export interface QuebraRainhas {
  n: number;
  /** Região de cada casa (0..n-1). */
  regioes: number[];
}

export interface AnaliseRainhas {
  conflitos: Set<number>;
  resolvido: boolean;
}

export function analisarRainhas(q: QuebraRainhas, coroas: Set<number>): AnaliseRainhas {
  const { n, regioes } = q;
  const conflitos = new Set<number>();
  const lista = [...coroas];
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
    const a = lista[i], b = lista[j];
    const ax = a % n, ay = Math.floor(a / n), bx = b % n, by = Math.floor(b / n);
    if (ax === bx || ay === by || regioes[a] === regioes[b] || (Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1)) {
      conflitos.add(a); conflitos.add(b);
    }
  }
  return { conflitos, resolvido: coroas.size === n && conflitos.size === 0 };
}

export function contarSolucoesRainhas(q: QuebraRainhas, limite = 2): number {
  return solucoesRainhas(q, limite).length;
}

/** Até `limite` soluções, cada uma como lista de casas (uma por linha). */
export function solucoesRainhas(q: QuebraRainhas, limite = 2): number[][] {
  const { n, regioes } = q;
  const achadas: number[][] = [];
  const atual: number[] = [];
  const colUsada = new Array(n).fill(false), regUsada = new Array(n).fill(false);
  let anterior = -10;
  const rec = (y: number): boolean => {
    if (y === n) { achadas.push([...atual]); return achadas.length >= limite; }
    for (let x = 0; x < n; x++) {
      const r = regioes[y * n + x];
      if (colUsada[x] || regUsada[r] || Math.abs(x - anterior) <= 1) continue;
      const salvo = anterior;
      colUsada[x] = regUsada[r] = true; anterior = x; atual.push(y * n + x);
      if (rec(y + 1)) return true;
      colUsada[x] = regUsada[r] = false; anterior = salvo; atual.pop();
    }
    return false;
  };
  rec(0);
  return achadas;
}

export function gerarRainhas(n: number, semente: string): QuebraRainhas & { solucao: number[] } {
  const a = criarAleatorio(semente);
  for (;;) {
    // Uma coroa por linha e coluna, sem se tocarem.
    const cols: number[] = [];
    const montar = (y: number): boolean => {
      if (y === n) return true;
      for (const x of a.embaralhar(Array.from({ length: n }, (_, i) => i))) {
        if (cols.includes(x) || (y > 0 && Math.abs(cols[y - 1] - x) <= 1)) continue;
        cols.push(x);
        if (montar(y + 1)) return true;
        cols.pop();
      }
      return false;
    };
    if (!montar(0)) continue;
    const solucao = cols.map((x, y) => y * n + x);
    // Regiões crescem a partir das coroas, sorteando a borda.
    const regioes = new Array<number>(n * n).fill(-1);
    solucao.forEach((c, r) => (regioes[c] = r));
    const vizinhas = (i: number) => {
      const x = i % n, y = Math.floor(i / n);
      const r: number[] = [];
      if (x > 0) r.push(i - 1);
      if (x < n - 1) r.push(i + 1);
      if (y > 0) r.push(i - n);
      if (y < n - 1) r.push(i + n);
      return r;
    };
    let livres = n * n - n;
    while (livres > 0) {
      const r = a.inteiro(n);
      const borda: number[] = [];
      regioes.forEach((v, i) => { if (v === r) for (const c of vizinhas(i)) if (regioes[c] < 0) borda.push(c); });
      if (!borda.length) continue;
      regioes[borda[a.inteiro(borda.length)]] = r;
      livres--;
    }
    // Enquanto houver outra solução, muda de região uma casa onde ela difere.
    const coroa = new Set(solucao);
    const conexa = (r: number) => {
      const casas = regioes.map((v, i) => (v === r ? i : -1)).filter((i) => i >= 0);
      const vistos = new Set([casas[0]]);
      const fila = [casas[0]];
      while (fila.length) for (const c of vizinhas(fila.pop()!)) if (regioes[c] === r && !vistos.has(c)) { vistos.add(c); fila.push(c); }
      return vistos.size === casas.length;
    };
    for (let passo = 0; passo < 400; passo++) {
      const sols = solucoesRainhas({ n, regioes }, 2);
      if (sols.length === 1) return { n, regioes, solucao };
      const outra = sols.find((s) => s.some((c) => !coroa.has(c)))!;
      const alvos = a.embaralhar(outra.filter((c) => !coroa.has(c)));
      let mudou = false;
      for (const c of alvos) {
        const antiga = regioes[c];
        for (const v of a.embaralhar(vizinhas(c))) {
          if (regioes[v] === antiga) continue;
          regioes[c] = regioes[v];
          if (conexa(antiga)) { mudou = true; break; }
          regioes[c] = antiga;
        }
        if (mudou) break;
      }
      if (!mudou) break;
    }
  }
}
