/*
 * Palavras Cruzadas em layout livre: a primeira palavra fica no meio e cada
 * nova palavra cruza uma letra de outra já posta, sem encostar de lado em
 * nenhuma. Dicas do Wikcionário (CC BY-SA) e do banco de perguntas. Respostas sem acento nem cedilha.
 */
import { criarAleatorio } from '@ja/contrato';
import dados from '../../../../data/palavras/dicas-cc-by-sa.json';
import conhecimento from '../../../../data/conhecimento/dicas-conhecimento.json';

/**
 * Palavras comuns (ordem de frequência) com uma dica de conhecimento a cada quatro posições:
 * capitais, planetas, personagens e afins entram já entre as primeiras e aparecem em toda grade.
 */
function misturar(comuns: [string, string][], extras: [string, string][]): [string, string][] {
  const vistas = new Set(extras.map(([p]) => p));
  const base = comuns.filter(([p]) => !vistas.has(p));
  const r: [string, string][] = [];
  let k = 0;
  for (let i = 0; i < base.length; i++) {
    r.push(base[i]);
    if (i % 3 === 2 && k < extras.length) r.push(extras[k++]);
  }
  return r.concat(extras.slice(k));
}
const LISTA = misturar(dados as [string, string][], conhecimento as [string, string][]);

export interface Entrada { palavra: string; dica: string; x: number; y: number; horizontal: boolean; numero: number }
export interface Cruzada { largura: number; altura: number; entradas: Entrada[]; densa?: boolean }

export function gerarCruzada(alvo: number, semente: string, comuns = 6000, maxLado = 13): Cruzada {
  const a = criarAleatorio(semente);
  const pool = a.embaralhar(LISTA.slice(0, comuns).filter(([p]) => p.length >= 3 && p.length <= 9));
  let melhor: Cruzada | null = null;
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const grade = new Map<string, string>();
    const postas: Omit<Entrada, 'numero'>[] = [];
    const usadas = new Set<string>();
    const k = (x: number, y: number) => `${x},${y}`;
    const caixa = () => {
      const xs = [...grade.keys()].map((s) => Number(s.split(',')[0])), ys = [...grade.keys()].map((s) => Number(s.split(',')[1]));
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    };
    const pode = (p: string, x: number, y: number, h: boolean): number => {
      const dx = h ? 1 : 0, dy = h ? 0 : 1;
      if (grade.has(k(x - dx, y - dy)) || grade.has(k(x + dx * p.length, y + dy * p.length))) return -1;
      let cruza = 0;
      for (let i = 0; i < p.length; i++) {
        const cx = x + dx * i, cy = y + dy * i;
        const atual = grade.get(k(cx, cy));
        if (atual) { if (atual !== p[i]) return -1; cruza++; continue; }
        // Sem vizinhos dos lados (em relação à direção da palavra).
        if (grade.has(k(cx + dy, cy + dx)) || grade.has(k(cx - dy, cy - dx))) return -1;
      }
      if (grade.size) {
        const b = caixa();
        const nx0 = Math.min(b.x0, x), ny0 = Math.min(b.y0, y), nx1 = Math.max(b.x1, x + dx * (p.length - 1)), ny1 = Math.max(b.y1, y + dy * (p.length - 1));
        if (nx1 - nx0 + 1 > maxLado || ny1 - ny0 + 1 > maxLado) return -1;
      }
      return cruza;
    };
    const por = (p: string, dica: string, x: number, y: number, h: boolean) => {
      for (let i = 0; i < p.length; i++) grade.set(k(x + (h ? i : 0), y + (h ? 0 : i)), p[i]);
      postas.push({ palavra: p, dica, x, y, horizontal: h });
      usadas.add(p);
    };
    const primeira = pool.find(([p]) => p.length >= 6) ?? pool[0];
    por(primeira[0], primeira[1], 0, 0, true);
    for (let passe = 0; passe < 3 && postas.length < alvo; passe++) {
      for (const [p, dica] of a.embaralhar([...pool])) {
        if (postas.length >= alvo) break;
        if (usadas.has(p)) continue;
        // Procura um cruzamento com alguma letra já posta.
        let feito = false;
        for (const [pos, letra] of a.embaralhar([...grade.entries()])) {
          if (feito) break;
          const [gx, gy] = pos.split(',').map(Number);
          for (let i = 0; i < p.length && !feito; i++) {
            if (p[i] !== letra) continue;
            for (const h of [true, false]) {
              const x = h ? gx - i : gx, y = h ? gy : gy - i;
              if (pode(p, x, y, h) >= 1) { por(p, dica, x, y, h); feito = true; break; }
            }
          }
        }
      }
    }
    const b = caixa();
    // Numeração: pela posição de leitura (linha, depois coluna).
    const inicios = [...new Set(postas.map((e) => `${e.y - b.y0},${e.x - b.x0}`))].sort((u, v) => {
      const [uy, ux] = u.split(',').map(Number), [vy, vx] = v.split(',').map(Number);
      return uy - vy || ux - vx;
    });
    const entradas = postas.map((e) => ({ ...e, x: e.x - b.x0, y: e.y - b.y0, numero: inicios.indexOf(`${e.y - b.y0},${e.x - b.x0}`) + 1 }));
    const c = { largura: b.x1 - b.x0 + 1, altura: b.y1 - b.y0 + 1, entradas };
    if (!melhor || c.entradas.length > melhor.entradas.length) melhor = c;
    if (c.entradas.length >= alvo) break;
  }
  return melhor!;
}

/** Letra certa de cada casa ocupada ("x,y" -> letra). */
export function solucaoCruzada(c: Cruzada): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of c.entradas) for (let i = 0; i < e.palavra.length; i++) m.set(`${e.x + (e.horizontal ? i : 0)},${e.y + (e.horizontal ? 0 : i)}`, e.palavra[i]);
  return m;
}

/*
 * Cruzada densa (estilo de jornal): grade quadrada com casas pretas
 * simétricas, palavras se cruzando o tempo todo. O molde é sorteado (sem
 * trechos de 2 letras, tudo ligado) e o preenchimento é uma busca com
 * restrições: escolhe o espaço com menos candidatas, testa palavras
 * frequentes primeiro e volta quando um cruzamento fica sem saída.
 */
interface Espaco { x: number; y: number; horizontal: boolean; tam: number; casas: number[] }

function sortearMolde(n: number, a: ReturnType<typeof criarAleatorio>, pretas: number): boolean[] | null {
  const preta = new Array<boolean>(n * n).fill(false);
  const alvo = Math.round(n * n * pretas);
  let postas = 0;
  for (let t = 0; t < n * n * 6 && postas < alvo; t++) {
    const i = a.inteiro(n * n), j = n * n - 1 - i;
    if (preta[i]) continue;
    preta[i] = preta[j] = true;
    if (!moldeValido(n, preta, false)) { preta[i] = preta[j] = false; continue; }
    postas += i === j ? 1 : 2;
  }
  return moldeValido(n, preta, true) ? preta : null;
}

function trechos(n: number, preta: boolean[]): Espaco[] {
  const res: Espaco[] = [];
  for (const horizontal of [true, false]) {
    for (let l = 0; l < n; l++) {
      let k = 0;
      while (k < n) {
        const idx = (p: number) => (horizontal ? l * n + p : p * n + l);
        if (preta[idx(k)]) { k++; continue; }
        const ini = k;
        while (k < n && !preta[idx(k)]) k++;
        const casas = Array.from({ length: k - ini }, (_, q) => idx(ini + q));
        res.push({ x: horizontal ? ini : l, y: horizontal ? l : ini, horizontal, tam: k - ini, casas });
      }
    }
  }
  return res;
}

function moldeValido(n: number, preta: boolean[], final: boolean): boolean {
  const ts = trechos(n, preta);
  if (ts.some((t) => t.tam === 2 || t.tam > 10)) return false;
  // Toda casa branca está numa palavra (trecho de 3+) e as brancas estão todas ligadas.
  const naPalavra = new Array<number>(n * n).fill(0);
  for (const t of ts) if (t.tam >= 3) for (const c of t.casas) naPalavra[c]++;
  const brancas = preta.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
  if (brancas.some((i) => !naPalavra[i])) return false;
  const visto = new Set<number>([brancas[0]]);
  const fila = [brancas[0]];
  while (fila.length) {
    const c = fila.pop()!;
    const x = c % n, y = Math.floor(c / n);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, v = ny * n + nx;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || preta[v] || visto.has(v)) continue;
      visto.add(v);
      fila.push(v);
    }
  }
  if (visto.size !== brancas.length) return false;
  // No molde final, quase todas as casas são cruzamentos (duas palavras).
  if (final) return brancas.filter((i) => naPalavra[i] === 2).length >= brancas.length * 0.8;
  return true;
}

let indice: { porTam: Map<number, number[]>; letra: Map<string, Uint32Array>; palavras: string[]; dicas: string[] } | null = null;
function montarIndice(comuns: number) {
  if (indice && indice.palavras.length === Math.min(comuns, LISTA.length)) return indice;
  const lista = LISTA.slice(0, comuns);
  const palavras = lista.map(([p]) => p), dicas = lista.map(([, d]) => d);
  const porTam = new Map<number, number[]>();
  palavras.forEach((p, i) => { if (!porTam.has(p.length)) porTam.set(p.length, []); porTam.get(p.length)!.push(i); });
  const letra = new Map<string, Uint32Array>();
  for (const [tam, ids] of porTam) {
    for (let pos = 0; pos < tam; pos++) {
      for (let k = 0; k < ids.length; k++) {
        const chave = `${tam}:${pos}:${palavras[ids[k]][pos]}`;
        let b = letra.get(chave);
        if (!b) { b = new Uint32Array(Math.ceil(ids.length / 32)); letra.set(chave, b); }
        b[k >> 5] |= 1 << (k & 31);
      }
    }
  }
  indice = { porTam, letra, palavras, dicas };
  return indice;
}

export function gerarCruzadaDensa(n: number, semente: string, prazoMs = 4000, comuns = 15000, pretas = n <= 7 ? 0.2 : 0.2): Cruzada {
  const a = criarAleatorio(semente);
  const ind = montarIndice(comuns);
  const inicio = Date.now();
  while (Date.now() - inicio < prazoMs) {
    const preta = sortearMolde(n, a, pretas);
    if (!preta) continue;
    const espacos = trechos(n, preta).filter((t) => t.tam >= 3);
    const letras = new Array<string>(n * n).fill('');
    const escolha = new Array<number>(espacos.length).fill(-1);
    const usadas = new Set<number>();
    const porCasa = new Map<number, number[]>();
    espacos.forEach((e, k) => e.casas.forEach((c) => { if (!porCasa.has(c)) porCasa.set(c, []); porCasa.get(c)!.push(k); }));
    let nos = 0;
    const limiteNos = 20000;

    const candidatas = (k: number): number[] => {
      const e = espacos[k];
      const ids = ind.porTam.get(e.tam) ?? [];
      let bits: Uint32Array | null = null;
      for (let p = 0; p < e.tam; p++) {
        const l = letras[e.casas[p]];
        if (!l) continue;
        const b = ind.letra.get(`${e.tam}:${p}:${l}`);
        if (!b) return [];
        if (!bits) bits = b.slice();
        else for (let w = 0; w < bits.length; w++) bits[w] &= b[w];
      }
      const res: number[] = [];
      if (!bits) { for (const id of ids) if (!usadas.has(id)) res.push(id); return res; }
      for (let w = 0; w < bits.length; w++) {
        let v = bits[w];
        while (v) {
          const t = v & -v;
          const q = (w << 5) + 31 - Math.clz32(t);
          if (!usadas.has(ids[q])) res.push(ids[q]);
          v ^= t;
        }
      }
      return res;
    };

    const busca = (): boolean => {
      if (++nos > limiteNos || Date.now() - inicio > prazoMs) return false;
      let melhor = -1, melhores: number[] = [];
      for (let k = 0; k < espacos.length; k++) {
        if (escolha[k] >= 0) continue;
        const c = candidatas(k);
        if (!c.length) return false;
        if (melhor < 0 || c.length < melhores.length) { melhor = k; melhores = c; }
      }
      if (melhor < 0) return true;
      const e = espacos[melhor];
      // As mais frequentes primeiro (índices menores), com um pouco de sorteio.
      const ordem = melhores.slice(0, 60).sort((u, v) => u - v + (a.real() - 0.5) * 3000);
      for (const id of ordem) {
        const antes = e.casas.map((c) => letras[c]);
        e.casas.forEach((c, p) => (letras[c] = ind.palavras[id][p]));
        escolha[melhor] = id;
        usadas.add(id);
        // Verificação adiante: os espaços que cruzam ainda têm candidatas?
        let ok = true;
        for (const c of e.casas) for (const k of porCasa.get(c)!) if (escolha[k] < 0 && !candidatas(k).length) { ok = false; break; }
        if (ok && busca()) return true;
        usadas.delete(id);
        escolha[melhor] = -1;
        e.casas.forEach((c, p) => (letras[c] = antes[p]));
        if (nos > limiteNos) return false;
      }
      return false;
    };

    if (!busca()) continue;
    const inicios = [...new Set(espacos.map((e) => e.y * n + e.x))].sort((u, v) => u - v);
    const entradas: Entrada[] = espacos.map((e, k) => ({
      palavra: ind.palavras[escolha[k]], dica: ind.dicas[escolha[k]], x: e.x, y: e.y, horizontal: e.horizontal,
      numero: inicios.indexOf(e.y * n + e.x) + 1,
    }));
    return { largura: n, altura: n, entradas, densa: true };
  }
  throw new Error('Não deu para montar a grade a tempo. Tente de novo.');
}
