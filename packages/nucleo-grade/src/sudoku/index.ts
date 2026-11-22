/*
 * Sudoku com regras combináveis.
 *
 * Grade de 81 casas (0 = vazia). As regras globais (diagonais, anti-rei,
 * anti-cavalo, não consecutivo) e as gaiolas do killer viram listas de
 * vizinhos e restrições de soma. O solucionador usa candidatos em bits,
 * propagação de singles e ramificação pela casa com menos candidatos.
 */
import { criarAleatorio, type Aleatorio } from '@ja/contrato';

export type Regra = 'diagonais' | 'anti-rei' | 'anti-cavalo' | 'nao-consecutivo' | 'killer';
export type Dificuldade = 'facil' | 'medio' | 'dificil';

export interface Gaiola {
  casas: number[];
  soma: number;
}

export interface Quebra {
  regras: Regra[];
  dadas: number[];
  solucao: number[];
  gaiolas: Gaiola[];
  dificuldade: Dificuldade;
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
}

function modelo(regras: Regra[], gaiolas: Gaiola[] = []): Modelo {
  const gaiolaDe = new Int16Array(81).fill(-1);
  gaiolas.forEach((g, k) => g.casas.forEach((c) => (gaiolaDe[c] = k)));
  // No killer, os dígitos de uma gaiola não se repetem.
  const vizinhos = montarVizinhos(regras);
  for (const g of gaiolas) for (const a of g.casas) for (const b of g.casas) if (a !== b && !vizinhos[a].includes(b)) vizinhos[a].push(b);
  return { vizinhos, naoConsecutivo: regras.includes('nao-consecutivo'), gaiolas, gaiolaDe };
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
    this.cand.fill(TODOS);
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

export function contarSolucoes(regras: Regra[], dadas: number[], gaiolas: Gaiola[] = [], limite = 2): number {
  const s = new Solucionador(modelo(regras, gaiolas));
  if (!s.carregar(dadas)) return 0;
  return s.contar(limite);
}

export function resolver(regras: Regra[], dadas: number[], gaiolas: Gaiola[] = []): number[] | null {
  const s = new Solucionador(modelo(regras, gaiolas));
  if (!s.carregar(dadas)) return null;
  const saida = new Array<number>(81).fill(0);
  return s.contar(1, undefined, saida) ? saida : null;
}

/**
 * Nota de dificuldade por técnicas humanas: só singles (fácil), singles e
 * pares/bloqueios (médio), ou mais que isso (difícil).
 */
export function notaDificuldade(regras: Regra[], dadas: number[], gaiolas: Gaiola[] = []): Dificuldade {
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

export interface PedidoSudoku {
  regras: Regra[];
  dificuldade: Dificuldade;
  semente: string;
  /** Tempo máximo em ms. */
  prazo?: number;
}

/**
 * Gera um Sudoku com solução única. A dificuldade pedida é perseguida
 * tirando dígitos até a nota bater; se não der no prazo, devolve o mais
 * próximo encontrado.
 */
export function gerarSudoku(p: PedidoSudoku): Quebra {
  const a = criarAleatorio(p.semente);
  const fim = Date.now() + (p.prazo ?? 4000);
  const killer = p.regras.includes('killer');
  const globais = p.regras.filter((r) => r !== 'killer');

  for (let tentativa = 0; ; tentativa++) {
    // 1. Solução completa que respeita as regras globais.
    const vazio = new Array<number>(81).fill(0);
    const s = new Solucionador(modelo(globais));
    if (!s.carregar(vazio)) throw new Error('Combinação de regras sem solução.');
    const solucao = new Array<number>(81).fill(0);
    try {
      if (!s.contar(1, a, solucao, Date.now() + 1500)) throw new Error('Combinação de regras sem solução.');
    } catch (e) {
      if ((e as Error).message === 'prazo') throw new Error('Combinação de regras sem solução.', { cause: e });
      throw e;
    }

    const gaiolas = killer ? gerarGaiolas(solucao, a) : [];
    const m = modelo(globais, gaiolas);
    const unica = (dadas: number[]) => {
      const sol = new Solucionador(m);
      if (!sol.carregar(dadas)) return false;
      try {
        return sol.contar(2, undefined, undefined, fim + 2000) === 1;
      } catch {
        return false;
      }
    };

    // 2. Tira dígitos (em pares simétricos) enquanto a solução continuar única.
    const dadas = solucao.slice();
    const alvoMinimo = p.dificuldade === 'facil' ? (killer ? 20 : 36) : p.dificuldade === 'medio' ? (killer ? 8 : 30) : 0;
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
        const passou = p.dificuldade === 'facil' ? notaDificuldade(globais, dadas, gaiolas) !== 'facil'
          : p.dificuldade === 'medio' ? notaDificuldade(globais, dadas, gaiolas) === 'dificil'
          : false;
        if (passou) { dadas[i] = vi; dadas[j] = vj; restam += i === j ? 1 : 2; }
      } else {
        dadas[i] = vi; dadas[j] = vj;
      }
    }
    const nota = notaDificuldade(globais, dadas, gaiolas);
    const aceita = p.dificuldade === 'facil' ? nota === 'facil'
      : p.dificuldade === 'medio' ? nota === 'medio'
      : nota === 'dificil';
    if (aceita || Date.now() > fim || tentativa > 30) {
      return { regras: p.regras, dadas, solucao, gaiolas, dificuldade: nota };
    }
  }
}

/** Casas em conflito com alguma regra (para marcar erro), dada a grade atual. */
export function conflitos(regras: Regra[], grade: number[], gaiolas: Gaiola[] = []): Set<number> {
  const m = modelo(regras.filter((r) => r !== 'killer'), gaiolas);
  const erro = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const d = grade[i];
    if (!d) continue;
    for (const v of m.vizinhos[i]) if (grade[v] === d) { erro.add(i); erro.add(v); }
    if (m.naoConsecutivo) for (const v of ortogonais(i)) if (grade[v] && Math.abs(grade[v] - d) === 1) { erro.add(i); erro.add(v); }
  }
  for (const g of gaiolas) {
    const vals = g.casas.map((c) => grade[c]);
    const soma = vals.reduce((s, v) => s + v, 0);
    if (soma > g.soma || (vals.every((v) => v) && soma !== g.soma)) g.casas.forEach((c) => grade[c] && erro.add(c));
  }
  return erro;
}

export const NOMES_REGRAS: Record<Regra, { nome: string; descricao: string }> = {
  diagonais: { nome: 'Diagonais', descricao: 'As duas diagonais principais também não repetem dígitos.' },
  'anti-rei': { nome: 'Anti-rei', descricao: 'Casas que se tocam, até na diagonal, não têm o mesmo dígito.' },
  'anti-cavalo': { nome: 'Anti-cavalo', descricao: 'Casas a um salto de cavalo do xadrez não têm o mesmo dígito.' },
  'nao-consecutivo': { nome: 'Não consecutivo', descricao: 'Casas lado a lado nunca têm dígitos seguidos (como 4 e 5).' },
  killer: { nome: 'Killer', descricao: 'As gaiolas tracejadas somam o número do canto, sem repetir dígitos.' },
};
