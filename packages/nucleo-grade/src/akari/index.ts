/*
 * Akari (Light Up). Casas: LIVRE, PAREDE (sem número) ou 0 a 4 (parede numerada).
 * Uma lâmpada ilumina a própria casa e a linha e a coluna até bater numa parede.
 * Vence quando toda casa livre está iluminada, nenhuma lâmpada vê outra e as
 * paredes numeradas têm exatamente esse número de lâmpadas encostadas.
 */
import { criarAleatorio } from '@ja/contrato';

export const LIVRE = -1;
export const PAREDE = 5;

export interface QuebraAkari {
  largura: number;
  altura: number;
  casas: number[];
}

const vizinhos4 = (w: number, h: number, i: number) => {
  const x = i % w, y = Math.floor(i / w);
  const r: number[] = [];
  if (x > 0) r.push(i - 1);
  if (x < w - 1) r.push(i + 1);
  if (y > 0) r.push(i - w);
  if (y < h - 1) r.push(i + w);
  return r;
};

/** Casas que uma lâmpada em `i` ilumina (inclui a própria). */
export function alcance(q: QuebraAkari, i: number): number[] {
  const { largura: w, altura: h, casas } = q;
  const r = [i];
  const x = i % w, y = Math.floor(i / w);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let nx = x + dx, ny = y + dy;
    while (nx >= 0 && ny >= 0 && nx < w && ny < h && casas[ny * w + nx] === LIVRE) {
      r.push(ny * w + nx);
      nx += dx; ny += dy;
    }
  }
  return r;
}

export interface Analise {
  iluminadas: Set<number>;
  /** Lâmpadas que se veem. */
  conflitos: Set<number>;
  /** Paredes numeradas com lâmpadas demais (ou de menos, quando já não cabe mais). */
  paredesErradas: Set<number>;
  resolvido: boolean;
}

export function analisar(q: QuebraAkari, lampadas: Set<number>): Analise {
  const iluminadas = new Set<number>();
  const conflitos = new Set<number>();
  for (const l of lampadas) {
    for (const c of alcance(q, l)) {
      if (c !== l && lampadas.has(c)) { conflitos.add(c); conflitos.add(l); }
      iluminadas.add(c);
    }
  }
  const paredesErradas = new Set<number>();
  let numerosOk = true;
  q.casas.forEach((v, i) => {
    if (v < 0 || v > 4) return;
    const n = vizinhos4(q.largura, q.altura, i).filter((c) => lampadas.has(c)).length;
    if (n !== v) numerosOk = false;
    if (n > v) paredesErradas.add(i);
  });
  const livres = q.casas.filter((v) => v === LIVRE).length;
  return { iluminadas, conflitos, paredesErradas, resolvido: numerosOk && conflitos.size === 0 && iluminadas.size === livres };
}

/** Conta soluções até `limite` (backtracking com segmentos e paredes numeradas). */
export function contarSolucoesAkari(q: QuebraAkari, limite = 2, prazo = Date.now() + 2000): number {
  const { largura: w, altura: h, casas } = q;
  const n = w * h;
  const livres = casas.map((v, i) => (v === LIVRE ? i : -1)).filter((i) => i >= 0);
  const alc = new Map<number, number[]>();
  for (const i of livres) alc.set(i, alcance(q, i));
  const estado = new Int8Array(n); // 0 indefinido, 1 lâmpada, 2 sem lâmpada
  const luz = new Int16Array(n);
  const numeradas = casas.map((v, i) => (v >= 0 && v <= 4 ? i : -1)).filter((i) => i >= 0);
  const viz = new Map<number, number[]>();
  for (const p of numeradas) viz.set(p, vizinhos4(w, h, p).filter((c) => casas[c] === LIVRE));
  let total = 0;

  const ok = (): boolean => {
    for (const p of numeradas) {
      let l = 0, und = 0;
      for (const c of viz.get(p)!) { if (estado[c] === 1) l++; else if (estado[c] === 0 && luz[c] === 0) und++; }
      if (l > casas[p] || l + und < casas[p]) return false;
    }
    // Toda casa apagada precisa ter alguma candidata ainda possível.
    for (const i of livres) {
      if (luz[i] > 0) continue;
      if (!alc.get(i)!.some((c) => estado[c] === 0 && luz[c] === 0)) return false;
    }
    return true;
  };

  const rec = (k: number): boolean => {
    if (Date.now() > prazo) throw new Error('prazo');
    if (k === livres.length) {
      if (livres.every((i) => luz[i] > 0) && ok()) { total++; return total >= limite; }
      return false;
    }
    const i = livres[k];
    if (luz[i] === 0) {
      estado[i] = 1;
      for (const c of alc.get(i)!) luz[c]++;
      if (ok() && rec(k + 1)) return true;
      for (const c of alc.get(i)!) luz[c]--;
    }
    estado[i] = 2;
    if (ok() && rec(k + 1)) { estado[i] = 0; return true; }
    estado[i] = 0;
    return false;
  };
  try { rec(0); } catch { return limite; }
  return total;
}

export function gerarAkari(largura: number, altura: number, semente: string): QuebraAkari & { solucao: number[] } {
  const a = criarAleatorio(semente);
  for (let tentativa = 0; ; tentativa++) {
    const n = largura * altura;
    const casas = new Array<number>(n).fill(LIVRE);
    // Paredes em simetria de rotação, como nos jornais.
    const densidade = 0.18 + a.real() * 0.06;
    for (let i = 0; i < Math.ceil(n / 2); i++) if (a.real() < densidade) { casas[i] = PAREDE; casas[n - 1 - i] = PAREDE; }
    const q: QuebraAkari = { largura, altura, casas };
    // Lâmpadas: cada casa ainda apagada recebe uma, em ordem sorteada.
    const lampadas = new Set<number>();
    const acesa = new Set<number>();
    for (const i of a.embaralhar(casas.map((_, i) => i).filter((i) => casas[i] === LIVRE))) {
      if (acesa.has(i)) continue;
      lampadas.add(i);
      for (const c of alcance(q, i)) acesa.add(c);
    }
    // Todas as paredes recebem número; depois tiramos os que não fazem falta.
    for (let i = 0; i < n; i++) if (casas[i] === PAREDE) casas[i] = vizinhos4(largura, altura, i).filter((c) => lampadas.has(c)).length;
    if (contarSolucoesAkari(q) !== 1) {
      if (tentativa < 40) continue;
    }
    for (const i of a.embaralhar(casas.map((_, i) => i).filter((i) => casas[i] >= 0 && casas[i] <= 4))) {
      const v = casas[i];
      casas[i] = PAREDE;
      if (contarSolucoesAkari(q) !== 1) casas[i] = v;
    }
    return { ...q, solucao: [...lampadas] };
  }
}
