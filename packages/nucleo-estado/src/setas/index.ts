/*
 * Setas. Cada seta é uma linha que ocupa várias casas (pode fazer curvas) e
 * termina numa ponta. Tocada, ela desliza para a frente, na direção da ponta,
 * e sai da grade, mas só se a reta da ponta até a borda estiver livre.
 * Tire todas as setas.
 * Gerador: põe as setas uma a uma, cada uma com a reta da ponta livre na hora
 * em que entra; tirando na ordem inversa, sempre há solução.
 */
import { criarAleatorio, type Aleatorio } from '@ja/contrato';

export type Direcao = 0 | 1 | 2 | 3; // cima, direita, baixo, esquerda
export const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export interface Seta {
  id: number;
  /** Casas da cauda até a ponta. */
  corpo: number[];
  dir: Direcao;
}

export interface Setas { largura: number; altura: number; setas: Seta[] }

/** Casas da reta à frente da ponta, até a borda. */
export function reta(s: Pick<Setas, 'largura' | 'altura'>, seta: Seta): number[] {
  const [dx, dy] = DIRS[seta.dir];
  const ponta = seta.corpo[seta.corpo.length - 1];
  const res: number[] = [];
  let x = (ponta % s.largura) + dx, y = Math.floor(ponta / s.largura) + dy;
  while (x >= 0 && y >= 0 && x < s.largura && y < s.altura) {
    res.push(y * s.largura + x);
    x += dx; y += dy;
  }
  return res;
}

function ocupadas(s: Setas, menos = -1): Map<number, number> {
  const m = new Map<number, number>();
  for (const seta of s.setas) if (seta.id !== menos) for (const c of seta.corpo) m.set(c, seta.id);
  return m;
}

/** Id da primeira seta que bloqueia a reta da seta `id` (ou -1 se está livre). */
export function bloqueio(s: Setas, id: number): number {
  const seta = s.setas.find((x) => x.id === id);
  if (!seta) return -1;
  const oc = ocupadas(s, id);
  for (const c of reta(s, seta)) { const o = oc.get(c); if (o !== undefined) return o; }
  return -1;
}

export const caminhoLivre = (s: Setas, id: number) => s.setas.some((x) => x.id === id) && bloqueio(s, id) < 0;

export function tirar(s: Setas, id: number): Setas {
  if (!caminhoLivre(s, id)) return s;
  return { ...s, setas: s.setas.filter((x) => x.id !== id) };
}

export const vazio = (s: Setas) => s.setas.length === 0;

function vizinhas(largura: number, altura: number, i: number): number[] {
  const x = i % largura, y = Math.floor(i / largura);
  const v: number[] = [];
  if (y > 0) v.push(i - largura);
  if (x < largura - 1) v.push(i + 1);
  if (y < altura - 1) v.push(i + largura);
  if (x > 0) v.push(i - 1);
  return v;
}

function tentarSeta(s: Setas, a: Aleatorio, ponta: number, comprimentoMax: number, oc: Set<number>): Seta | null {
  for (const dir of a.embaralhar([0, 1, 2, 3] as Direcao[])) {
    const proibidas = new Set(reta(s, { id: 0, corpo: [ponta], dir }));
    if ([...proibidas].some((c) => oc.has(c))) continue;
    // A casa logo atrás da ponta fica oposta à direção, para a ponta "apontar" para fora do corpo.
    const [dx, dy] = DIRS[dir];
    const px = ponta % s.largura, py = Math.floor(ponta / s.largura);
    const tx = px - dx, ty = py - dy;
    if (tx < 0 || ty < 0 || tx >= s.largura || ty >= s.altura) continue;
    const tras = ty * s.largura + tx;
    if (oc.has(tras)) continue;
    const corpo = [ponta, tras];
    const usadas = new Set(corpo);
    const alvo = 2 + a.inteiro(Math.max(1, comprimentoMax - 1));
    let ultima = tras, reto = 0;
    while (corpo.length < alvo) {
      const opcoes = vizinhas(s.largura, s.altura, ultima).filter((c) => !oc.has(c) && !usadas.has(c) && !proibidas.has(c));
      if (!opcoes.length) break;
      // Prefere seguir reto um pouco, para as linhas não ficarem só em zigue-zague.
      const anterior = corpo[corpo.length - 2];
      const emFrente = ultima + (ultima - anterior);
      let prox = opcoes[a.inteiro(opcoes.length)];
      if (opcoes.includes(emFrente) && reto < 3 && a.real() < 0.6) { prox = emFrente; reto++; } else reto = 0;
      corpo.push(prox);
      usadas.add(prox);
      ultima = prox;
    }
    return { id: 0, corpo: corpo.reverse(), dir };
  }
  return null;
}

export function gerarSetas(largura: number, altura: number, comprimentoMax: number, semente: string): Setas {
  const a = criarAleatorio(semente);
  const s: Setas = { largura, altura, setas: [] };
  const oc = new Set<number>();
  let id = 0;
  for (let rodada = 0; rodada < 3; rodada++) {
    for (const ponta of a.embaralhar(Array.from({ length: largura * altura }, (_, k) => k))) {
      if (oc.has(ponta)) continue;
      const seta = tentarSeta(s, a, ponta, comprimentoMax, oc);
      if (!seta) continue;
      seta.id = id++;
      s.setas.push(seta);
      for (const c of seta.corpo) oc.add(c);
    }
  }
  return s;
}
