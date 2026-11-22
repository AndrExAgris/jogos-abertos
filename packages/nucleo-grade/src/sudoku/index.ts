/*
 * Sudoku com regras combináveis.
 *
 * Grade de 81 casas (0 = vazia). As regras globais (diagonais, anti-rei,
 * anti-cavalo, não consecutivo) e as gaiolas do killer viram listas de
 * vizinhos e restrições de soma. O solucionador usa candidatos em bits,
 * propagação de singles e ramificação pela casa com menos candidatos.
 */
import { criarAleatorio, type Aleatorio } from '@ja/contrato';

export type Regra = 'diagonais' | 'anti-rei' | 'anti-cavalo' | 'nao-consecutivo' | 'killer' | 'kropki' | 'xv' | 'par-impar' | 'termometro';
/** Regras que só existem por pistas desenhadas (não mudam a solução). */
export const REGRAS_PISTA: Regra[] = ['killer', 'kropki', 'xv', 'par-impar', 'termometro'];
export type Dificuldade = 'facil' | 'medio' | 'dificil';

export interface Gaiola {
  casas: number[];
  soma: number;
}

/** Ponto entre duas casas vizinhas: Kropki (branco: consecutivos; preto: dobro) ou XV (somam 10 ou 5). */
export interface Ponto {
  a: number;
  b: number;
  tipo: 'branco' | 'preto' | 'x' | 'v';
}

/** Pistas desenhadas na grade. */
export interface Pistas {
  gaiolas?: Gaiola[];
  pontos?: Ponto[];
  /** Termômetros: do bulbo à ponta, sempre crescente. */
  termometros?: number[][];
  /** Casas marcadas: 1 = ímpar (círculo), 2 = par (quadrado). */
  paridade?: [number, 1 | 2][];
}

export interface Quebra extends Pistas {
  regras: Regra[];
  dadas: number[];
  solucao: number[];
  gaiolas: Gaiola[];
  dificuldade: Dificuldade;
}

type Par = { a: number; b: number; tipo: Ponto['tipo'] | 'menor' };

function normalizar(p: Pistas | Gaiola[] | undefined): Pistas {
  if (!p) return {};
  return Array.isArray(p) ? { gaiolas: p } : p;
}

/** Dígitos de b compatíveis com o dígito d em a (para o par). */
function compativeis(tipo: Par['tipo'], d: number, ladoA: boolean): number {
  switch (tipo) {
    case 'branco': return (d > 1 ? bit(d - 1) : 0) | (d < 9 ? bit(d + 1) : 0);
    case 'preto': return (d * 2 <= 9 ? bit(d * 2) : 0) | (d % 2 === 0 ? bit(d / 2) : 0);
    case 'x': return d !== 5 ? bit(10 - d) : 0;
    case 'v': return d < 5 ? bit(5 - d) : 0;
    case 'menor': return ladoA ? TODOS & ~((bit(d + 1)) - 1) : (bit(d) - 1) & TODOS;
  }
}

const TODOS = 0x3fe; // bits 1..9
const bit = (d: number) => 1 << d;
const contar = (m: number) => {
  let n = 0;
  while (m) { m &= m - 1; n++; }
  return n;
};
const menorDigito = (m: number) => 31 - Math.clz32(m & -m);

/** Vizinhos que não podem repetir o dígito (linha, coluna, caixa e regras globais). */
function montarVizinhos(regras: Regra[]): number[][] {
  const viz: Set<number>[] = Array.from({ length: 81 }, () => new Set<number>());
  const liga = (a: number, b: number) => { if (a !== b) { viz[a].add(b); viz[b].add(a); } };
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    for (let k = 0; k < 9; k++) {
      liga(i, r * 9 + k);
      liga(i, k * 9 + c);
      const br = Math.floor(r / 3) * 3 + Math.floor(k / 3), bc = Math.floor(c / 3) * 3 + (k % 3);
      liga(i, br * 9 + bc);
    }
    const saltos: [number, number][] = [];
    if (regras.includes('anti-rei')) saltos.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    if (regras.includes('anti-cavalo')) saltos.push([1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]);
    for (const [dr, dc] of saltos) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) liga(i, nr * 9 + nc);
    }
  }
  if (regras.includes('diagonais')) {
    for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) {
      liga(a * 10, b * 10);
      liga(a * 8 + 8, b * 8 + 8);
    }
  }
  return viz.map((s) => [...s]);
}

/** Casas ortogonalmente vizinhas (para o não consecutivo). */
function ortogonais(i: number): number[] {
  const r = Math.floor(i / 9), c = i % 9;
  const res: number[] = [];
  if (r > 0) res.push(i - 9);
  if (r < 8) res.push(i + 9);
  if (c > 0) res.push(i - 1);
  if (c < 8) res.push(i + 1);
  return res;
}

interface Modelo {
  vizinhos: number[][];
  naoConsecutivo: boolean;
  gaiolas: Gaiola[];
  gaiolaDe: Int16Array;
  pares: Par[];
  /** Máscara inicial de cada casa (par ou ímpar). */
  inicial: Int32Array;
}

const IMPARES = bit(1) | bit(3) | bit(5) | bit(7) | bit(9);
const PARES = bit(2) | bit(4) | bit(6) | bit(8);

function modelo(regras: Regra[], pistasOuGaiolas: Pistas | Gaiola[] = []): Modelo {
  const pistas = normalizar(pistasOuGaiolas);
  const gaiolas = pistas.gaiolas ?? [];
  const pares: Par[] = [...(pistas.pontos ?? [])];
  for (const t of pistas.termometros ?? []) for (let k = 0; k + 1 < t.length; k++) pares.push({ a: t[k], b: t[k + 1], tipo: 'menor' });
  const inicial = new Int32Array(81).fill(TODOS);
  for (const [c, p] of pistas.paridade ?? []) inicial[c] = p === 1 ? IMPARES : PARES;
  const gaiolaDe = new Int16Array(81).fill(-1);
  gaiolas.forEach((g, k) => g.casas.forEach((c) => (gaiolaDe[c] = k)));
  // No killer, os dígitos de uma gaiola não se repetem.
  const vizinhos = montarVizinhos(regras);
  for (const g of gaiolas) for (const a of g.casas) for (const b of g.casas) if (a !== b && !vizinhos[a].includes(b)) vizinhos[a].push(b);
  return { vizinhos, naoConsecutivo: regras.includes('nao-consecutivo'), gaiolas, gaiolaDe, pares, inicial };
}

/** Somas possíveis de k dígitos distintos dentro de uma máscara. */
function cabeSoma(mascara: number, k: number, soma: number): number {
  // Devolve a máscara dos dígitos que aparecem em alguma combinação válida.
  let res = 0;
  const rec = (d: number, faltam: number, resto: number, usados: number) => {
    if (faltam === 0) { if (resto === 0) res |= usados; return; }
    for (let x = d; x <= 9; x++) {
      if (x > resto) break;
      if (mascara & bit(x)) rec(x + 1, faltam - 1, resto - x, usados | bit(x));
    }
  };
  rec(1, k, soma, 0);
  return res;
}

class Solucionador {
  cand = new Int32Array(81);
  valor = new Int8Array(81);

  constructor(private m: Modelo) {}

  carregar(dadas: number[]): boolean {
    this.cand.set(this.m.inicial);
    this.valor.fill(0);
    for (let i = 0; i < 81; i++) if (dadas[i] && !this.colocar(i, dadas[i])) return false;
    return this.propagar();
  }

  colocar(i: number, d: number): boolean {
    if (!(this.cand[i] & bit(d))) return false;
    this.valor[i] = d;
    this.cand[i] = bit(d);
    for (const v of this.m.vizinhos[i]) {
      if (this.cand[v] & bit(d)) {
        if (this.valor[v]) return false;
        this.cand[v] &= ~bit(d);
        if (!this.cand[v]) return false;
      }
    }
    if (this.m.naoConsecutivo) {
      for (const v of ortogonais(i)) {
        const tira = (d > 1 ? bit(d - 1) : 0) | (d < 9 ? bit(d + 1) : 0);
        if (this.valor[v] && (bit(this.valor[v]) & tira)) return false;
        this.cand[v] &= ~tira;
        if (!this.cand[v]) return false;
      }
    }
    return true;
  }

  /** Singles nus e restrições de soma das gaiolas. */
  propagar(): boolean {
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (let i = 0; i < 81; i++) {
        if (!this.valor[i]) {
          const c = this.cand[i];
          if (!c) return false;
          if (contar(c) === 1) {
            if (!this.colocar(i, menorDigito(c))) return false;
            mudou = true;
          }
        }
      }
      for (const p of this.m.pares) {
        const ca = this.cand[p.a], cb = this.cand[p.b];
        let podeB = 0, podeA = 0;
        for (let d = 1; d <= 9; d++) {
          if (ca & bit(d)) podeB |= compativeis(p.tipo, d, true);
          if (cb & bit(d)) podeA |= compativeis(p.tipo, d, false);
        }
        const na = ca & podeA, nb = cb & podeB;
        if (!na || !nb) return false;
        if (na !== ca) {
          if (this.valor[p.a]) return false;
          this.cand[p.a] = na; mudou = true;
        }
        if (nb !== cb) {
          if (this.valor[p.b]) return false;
          this.cand[p.b] = nb; mudou = true;
        }
      }
      for (const g of this.m.gaiolas) {
        let resto = g.soma;
        let livres = 0;
        let mascara = 0;
        for (const c of g.casas) {
          if (this.valor[c]) resto -= this.valor[c];
          else { livres++; mascara |= this.cand[c]; }
        }
        if (livres === 0) { if (resto !== 0) return false; continue; }
        const pode = cabeSoma(mascara, livres, resto);
        if (!pode) return false;
        for (const c of g.casas) {
          if (!this.valor[c] && (this.cand[c] & ~pode)) {
            this.cand[c] &= pode;
            if (!this.cand[c]) return false;
            mudou = true;
          }
        }
      }
    }
    return true;
  }

  copiar(): [Int32Array, Int8Array] {
    return [this.cand.slice(), this.valor.slice()];
  }

  restaurar([c, v]: [Int32Array, Int8Array]): void {
    this.cand.set(c);
    this.valor.set(v);
  }

  /** Conta soluções até `limite`. Com `aleatorio`, testa os dígitos em ordem sorteada. */
  contar(limite: number, aleatorio?: Aleatorio, saida?: number[], prazo = Infinity): number {
    let total = 0;
    const rec = (): boolean => {
      if (Date.now() > prazo) throw new Error('prazo');
      let melhor = -1, menor = 10;
      for (let i = 0; i < 81; i++) {
        if (!this.valor[i]) {
          const n = contar(this.cand[i]);
          if (n < menor) { menor = n; melhor = i; if (n === 2) break; }
        }
      }
      if (melhor < 0) {
        total++;
        if (saida && total === 1) for (let i = 0; i < 81; i++) saida[i] = this.valor[i];
        return total >= limite;
      }
      const digitos: number[] = [];
      for (let d = 1; d <= 9; d++) if (this.cand[melhor] & bit(d)) digitos.push(d);
      if (aleatorio) aleatorio.embaralhar(digitos);
      for (const d of digitos) {
        const salvo = this.copiar();
        if (this.colocar(melhor, d) && this.propagar() && rec()) return true;
        this.restaurar(salvo);
      }
      return false;
    };
    rec();
    return total;
  }
}

/**
 * Para cada casa, as casas que não podem ter o mesmo dígito que ela: linha,
 * coluna, caixa e as regras extras (diagonais, anti-rei, anti-cavalo, gaiolas
 * do killer, termômetros e pontos do Kropki). Serve para destacar na interface.
 */
export function casasProibidas(regras: Regra[], pistasOuGaiolas: Pistas | Gaiola[] = []): number[][] {
  const m = modelo(regras, pistasOuGaiolas);
  const viz = m.vizinhos.map((v) => new Set(v));
  const liga = (a: number, b: number) => { if (a !== b) { viz[a].add(b); viz[b].add(a); } };
  const pistas = normalizar(pistasOuGaiolas);
  for (const t of pistas.termometros ?? []) for (const a of t) for (const b of t) liga(a, b);
  for (const p of pistas.pontos ?? []) if (p.tipo === 'branco' || p.tipo === 'preto') liga(p.a, p.b);
  return viz.map((v) => [...v]);
}

export function contarSolucoes(regras: Regra[], dadas: number[], gaiolas: Pistas | Gaiola[] = [], limite = 2): number {
  const s = new Solucionador(modelo(regras, gaiolas));
  if (!s.carregar(dadas)) return 0;
  return s.contar(limite);
}

export function resolver(regras: Regra[], dadas: number[], gaiolas: Pistas | Gaiola[] = []): number[] | null {
  const s = new Solucionador(modelo(regras, gaiolas));
  if (!s.carregar(dadas)) return null;
  const saida = new Array<number>(81).fill(0);
  return s.contar(1, undefined, saida) ? saida : null;
}

/**
 * Nota de dificuldade por técnicas humanas: só singles (fácil), singles e
 * pares/bloqueios (médio), ou mais que isso (difícil).
 */
export function notaDificuldade(regras: Regra[], dadas: number[], gaiolas: Pistas | Gaiola[] = []): Dificuldade {
  const m = modelo(regras, gaiolas);
  const unidades: number[][] = [];
  for (let k = 0; k < 9; k++) {
    unidades.push(Array.from({ length: 9 }, (_, j) => k * 9 + j));
    unidades.push(Array.from({ length: 9 }, (_, j) => j * 9 + k));
    const r0 = Math.floor(k / 3) * 3, c0 = (k % 3) * 3;
    unidades.push(Array.from({ length: 9 }, (_, j) => (r0 + Math.floor(j / 3)) * 9 + c0 + (j % 3)));
  }
  if (regras.includes('diagonais')) {
    unidades.push(Array.from({ length: 9 }, (_, j) => j * 10));
    unidades.push(Array.from({ length: 9 }, (_, j) => j * 8 + 8));
  }
  const s = new Solucionador(m);
  if (!s.carregar(dadas)) return 'dificil';
  const singlesOcultos = (): boolean => {
    let fez = false;
    for (const u of unidades) {
      for (let d = 1; d <= 9; d++) {
        let onde = -1, n = 0;
        for (const c of u) if (s.cand[c] & bit(d)) { n++; onde = c; }
        if (n === 1 && !s.valor[onde]) { if (!s.colocar(onde, d) || !s.propagar()) return false; fez = true; }
      }
    }
    return fez;
  };
  const pares = (): boolean => {
    let fez = false;
    for (const u of unidades) {
      const livres = u.filter((c) => !s.valor[c]);
      for (let a = 0; a < livres.length; a++) for (let b = a + 1; b < livres.length; b++) {
        const ca = s.cand[livres[a]];
        if (contar(ca) === 2 && ca === s.cand[livres[b]]) {
          for (const c of livres) if (c !== livres[a] && c !== livres[b] && (s.cand[c] & ca)) { s.cand[c] &= ~ca; fez = true; }
        }
      }
    }
    if (fez && !s.propagar()) return false;
    return fez;
  };
  const resolvido = () => s.valor.every((v) => v > 0);
  let usouPares = false;
  for (let passos = 0; passos < 200 && !resolvido(); passos++) {
    if (singlesOcultos()) continue;
    if (pares()) { usouPares = true; continue; }
    break;
  }
  if (!resolvido()) return 'dificil';
  return usouPares ? 'medio' : 'facil';
}

function gerarGaiolas(solucao: number[], a: Aleatorio): Gaiola[] {
  const dono = new Int16Array(81).fill(-1);
  const gaiolas: number[][] = [];
  const ordem = a.embaralhar(Array.from({ length: 81 }, (_, i) => i));
  for (const ini of ordem) {
    if (dono[ini] >= 0) continue;
    const alvo = 2 + a.inteiro(4);
    const casas = [ini];
    const usados = new Set([solucao[ini]]);
    dono[ini] = gaiolas.length;
    while (casas.length < alvo) {
      const borda = casas.flatMap(ortogonais).filter((c) => dono[c] < 0 && !usados.has(solucao[c]));
      if (!borda.length) break;
      const c = borda[a.inteiro(borda.length)];
      dono[c] = gaiolas.length;
      casas.push(c);
      usados.add(solucao[c]);
    }
    gaiolas.push(casas);
  }
  // Gaiolas de uma casa só se juntam a uma vizinha que não tenha o mesmo dígito.
  for (let k = 0; k < gaiolas.length; k++) {
    if (gaiolas[k].length !== 1) continue;
    const c = gaiolas[k][0];
    const opcoes = ortogonais(c)
      .map((v) => dono[v])
      .filter((g) => g !== k && gaiolas[g].length < 6 && !gaiolas[g].some((x) => solucao[x] === solucao[c]));
    if (!opcoes.length) continue;
    const alvo = opcoes[a.inteiro(opcoes.length)];
    gaiolas[alvo].push(c);
    dono[c] = alvo;
    gaiolas[k] = [];
  }
  return gaiolas.filter((g) => g.length).map((casas) => ({ casas, soma: casas.reduce((s, c) => s + solucao[c], 0) }));
}

/** Pontos Kropki ou XV coerentes com a solução, entre casas vizinhas. */
function gerarPontos(solucao: number[], regras: Regra[], a: Aleatorio): Ponto[] {
  const res: Ponto[] = [];
  for (let i = 0; i < 81; i++) {
    for (const j of [i + 1, i + 9]) {
      if (j >= 81 || (j === i + 1 && i % 9 === 8)) continue;
      const x = solucao[i], y = solucao[j];
      const opcoes: Ponto['tipo'][] = [];
      if (regras.includes('kropki')) {
        if (Math.abs(x - y) === 1) opcoes.push('branco');
        if (x === 2 * y || y === 2 * x) opcoes.push('preto');
      }
      if (regras.includes('xv')) {
        if (x + y === 10) opcoes.push('x');
        if (x + y === 5) opcoes.push('v');
      }
      if (opcoes.length && a.inteiro(100) < 70) res.push({ a: i, b: j, tipo: opcoes[a.inteiro(opcoes.length)] });
    }
  }
  return res;
}

/** Termômetros: caminhos de casas vizinhas (até na diagonal) com dígitos crescentes. */
function gerarTermometros(solucao: number[], a: Aleatorio): number[][] {
  const usado = new Uint8Array(81);
  const res: number[][] = [];
  const viz = (i: number) => {
    const r = Math.floor(i / 9), c = i % 9, v: number[] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < 9 && nc >= 0 && nc < 9) v.push(nr * 9 + nc);
    }
    return v;
  };
  for (let tent = 0; tent < 200 && res.length < 5; tent++) {
    let atual = a.inteiro(81);
    if (usado[atual] || solucao[atual] > 4) continue;
    const t = [atual];
    while (t.length < 7) {
      const prox = viz(atual).filter((v) => !usado[v] && !t.includes(v) && solucao[v] > solucao[atual] && solucao[v] - solucao[atual] <= 3);
      if (!prox.length) break;
      atual = prox[a.inteiro(prox.length)];
      t.push(atual);
    }
    if (t.length >= 3) { t.forEach((c) => (usado[c] = 1)); res.push(t); }
  }
  return res;
}

export interface PedidoSudoku {
  regras: Regra[];
  dificuldade: Dificuldade;
  semente: string;
  /** Tempo máximo em ms. */
  prazo?: number;
}

export const ERRO_IMPOSSIVEL = 'Não foi possível montar um puzzle com essas regras. Tire uma ou mais e tente de novo.';

/**
 * Gera um Sudoku com solução única. A dificuldade pedida é perseguida
 * tirando dígitos até a nota bater; se não der no prazo, devolve o mais
 * próximo encontrado.
 */
export function gerarSudoku(p: PedidoSudoku): Quebra {
  const a = criarAleatorio(p.semente);
  const fim = Date.now() + (p.prazo ?? 4000);
  const killer = p.regras.includes('killer');
  const comPistas = p.regras.some((r) => REGRAS_PISTA.includes(r));
  const globais = p.regras.filter((r) => !REGRAS_PISTA.includes(r));

  for (let tentativa = 0; ; tentativa++) {
    // 1. Solução completa que respeita as regras globais.
    const vazio = new Array<number>(81).fill(0);
    const s = new Solucionador(modelo(globais));
    if (!s.carregar(vazio)) throw new Error(ERRO_IMPOSSIVEL);
    const solucao = new Array<number>(81).fill(0);
    try {
      if (!s.contar(1, a, solucao, Date.now() + 2500)) throw new Error(ERRO_IMPOSSIVEL);
    } catch (e) {
      if ((e as Error).message === 'prazo') throw new Error(ERRO_IMPOSSIVEL, { cause: e });
      throw e;
    }

    // 2. Pistas desenhadas, coerentes com a solução.
    const pistas: Pistas = {
      gaiolas: killer ? gerarGaiolas(solucao, a) : [],
      pontos: p.regras.includes('kropki') || p.regras.includes('xv') ? gerarPontos(solucao, p.regras, a) : [],
      termometros: p.regras.includes('termometro') ? gerarTermometros(solucao, a) : [],
      paridade: p.regras.includes('par-impar')
        ? a.embaralhar(Array.from({ length: 81 }, (_, i) => i)).slice(0, 14).map((c) => [c, solucao[c] % 2 ? 1 : 2] as [number, 1 | 2])
        : [],
    };
    const m = modelo(p.regras, pistas);
    const unica = (dadas: number[]) => {
      const sol = new Solucionador(m);
      if (!sol.carregar(dadas)) return false;
      try {
        return sol.contar(2, undefined, undefined, fim + 2000) === 1;
      } catch {
        return false;
      }
    };
    const nota = (dadas: number[]) => notaDificuldade(p.regras, dadas, pistas);

    // 3. Tira dígitos (em pares simétricos) enquanto a solução continuar única.
    const dadas = solucao.slice();
    const alvoMinimo = p.dificuldade === 'facil' ? (comPistas ? 20 : 36) : p.dificuldade === 'medio' ? (comPistas ? 8 : 30) : 0;
    const ordem = a.embaralhar(Array.from({ length: 41 }, (_, i) => i));
    let restam = 81;
    for (const i of ordem) {
      if (Date.now() > fim) break;
      if (restam <= alvoMinimo) break;
      const j = 80 - i;
      const vi = dadas[i], vj = dadas[j];
      dadas[i] = 0; dadas[j] = 0;
      if (unica(dadas)) {
        restam -= i === j ? 1 : 2;
        const passou = p.dificuldade === 'facil' ? nota(dadas) !== 'facil'
          : p.dificuldade === 'medio' ? nota(dadas) === 'dificil'
          : false;
        if (passou) { dadas[i] = vi; dadas[j] = vj; restam += i === j ? 1 : 2; }
      } else {
        dadas[i] = vi; dadas[j] = vj;
      }
    }
    if (!unica(dadas)) {
      // Raro: o prazo estourou no meio. Volta ao resolvido.
      if (Date.now() > fim + 4000) throw new Error(ERRO_IMPOSSIVEL);
      continue;
    }
    const n = nota(dadas);
    const aceita = p.dificuldade === 'facil' ? n === 'facil'
      : p.dificuldade === 'medio' ? n === 'medio'
      : n === 'dificil';
    if (aceita || Date.now() > fim || tentativa > 30) {
      return { regras: p.regras, dadas, solucao, dificuldade: n, ...pistas, gaiolas: pistas.gaiolas ?? [] };
    }
  }
}

/** Casas em conflito com alguma regra (para marcar erro), dada a grade atual. */
export function conflitos(regras: Regra[], grade: number[], pistasOuGaiolas: Pistas | Gaiola[] = []): Set<number> {
  const pistas = normalizar(pistasOuGaiolas);
  const m = modelo(regras, pistas);
  const erro = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const d = grade[i];
    if (!d) continue;
    if (!(m.inicial[i] & bit(d))) erro.add(i);
    for (const v of m.vizinhos[i]) if (grade[v] === d) { erro.add(i); erro.add(v); }
    if (m.naoConsecutivo) for (const v of ortogonais(i)) if (grade[v] && Math.abs(grade[v] - d) === 1) { erro.add(i); erro.add(v); }
  }
  for (const p of m.pares) {
    const x = grade[p.a], y = grade[p.b];
    if (x && y && !(compativeis(p.tipo, x, true) & bit(y))) { erro.add(p.a); erro.add(p.b); }
  }
  for (const g of m.gaiolas) {
    const vals = g.casas.map((c) => grade[c]);
    const soma = vals.reduce((s, v) => s + v, 0);
    if (soma > g.soma || (vals.every((v) => v) && soma !== g.soma)) g.casas.forEach((c) => grade[c] && erro.add(c));
  }
  return erro;
}

/** Candidatos (bits 1..9) de cada casa vazia, só pelo que já está na grade. */
export function candidatos(regras: Regra[], grade: number[], pistasOuGaiolas: Pistas | Gaiola[] = []): number[] {
  const pistas = normalizar(pistasOuGaiolas);
  const m = modelo(regras, pistas);
  const res = new Array<number>(81).fill(0);
  const gaiolaDe = new Map<number, Gaiola>();
  for (const g of m.gaiolas) for (const c of g.casas) gaiolaDe.set(c, g);
  for (let i = 0; i < 81; i++) {
    if (grade[i]) continue;
    let mask = m.inicial[i];
    for (const v of m.vizinhos[i]) if (grade[v]) mask &= ~bit(grade[v]);
    if (m.naoConsecutivo) for (const v of ortogonais(i)) if (grade[v]) mask &= ~(bit(grade[v] - 1) | bit(grade[v] + 1));
    for (const p of m.pares) {
      if (p.a === i && grade[p.b]) { let ok = 0; for (let d = 1; d <= 9; d++) if (compativeis(p.tipo, d, true) & bit(grade[p.b])) ok |= bit(d); mask &= ok; }
      if (p.b === i && grade[p.a]) mask &= compativeis(p.tipo, grade[p.a], true);
    }
    const g = gaiolaDe.get(i);
    if (g) {
      let soma = 0, vazias = 0;
      for (const c of g.casas) { if (grade[c]) { soma += grade[c]; mask &= ~bit(grade[c]); } else vazias++; }
      for (let d = 1; d <= 9; d++) if (soma + d > g.soma || (vazias === 1 && soma + d !== g.soma)) mask &= ~bit(d);
    }
    res[i] = mask & TODOS;
  }
  return res;
}

export const NOMES_REGRAS: Record<Regra, { nome: string; descricao: string }> = {
  diagonais: { nome: 'Diagonais', descricao: 'As duas diagonais principais também não repetem dígitos.' },
  'anti-rei': { nome: 'Anti-rei', descricao: 'Casas que se tocam, até na diagonal, não têm o mesmo dígito.' },
  'anti-cavalo': { nome: 'Anti-cavalo', descricao: 'Casas a um salto de cavalo do xadrez não têm o mesmo dígito.' },
  'nao-consecutivo': { nome: 'Não consecutivo', descricao: 'Casas lado a lado nunca têm dígitos seguidos (como 4 e 5).' },
  killer: { nome: 'Killer', descricao: 'As gaiolas tracejadas somam o número do canto, sem repetir dígitos.' },
  kropki: { nome: 'Kropki', descricao: 'Bolinha branca: as duas casas têm dígitos seguidos. Bolinha preta: um é o dobro do outro.' },
  xv: { nome: 'XV', descricao: 'X entre duas casas: elas somam 10. V: somam 5.' },
  'par-impar': { nome: 'Par e ímpar', descricao: 'Casa com círculo tem dígito ímpar; com quadrado, par.' },
  termometro: { nome: 'Termômetro', descricao: 'Os dígitos sobem do bulbo (bola) até a ponta do termômetro.' },
};
