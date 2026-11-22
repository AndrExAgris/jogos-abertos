/*
 * Batalha Naval: grade 10 × 10, frota de 5 navios (5, 4, 3, 3 e 2 casas),
 * sem encostar uns nos outros. Quem acerta atira de novo, até errar; acertar
 * todas as casas de um navio afunda. Vence quem afundar a frota do outro.
 */
import { criarAleatorio } from '@ja/contrato';

export const LADO = 10;
export const FROTA = [5, 4, 3, 3, 2];
export const NOMES_NAVIOS: Record<number, string> = { 5: 'Porta-aviões', 4: 'Encouraçado', 3: 'Cruzador', 2: 'Submarino' };

export interface Navio { casas: number[] }
export interface Mar { navios: Navio[]; tiros: number[] }
export type Resultado = 'agua' | 'acerto' | 'afundou';

const vizinhas8 = (i: number) => {
  const x = i % LADO, y = Math.floor(i / LADO), r: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < LADO && ny >= 0 && ny < LADO) r.push(ny * LADO + nx);
  }
  return r;
};

export function posicionar(semente: string): Navio[] {
  const a = criarAleatorio(semente);
  for (;;) {
    const ocupado = new Uint8Array(LADO * LADO);
    const navios: Navio[] = [];
    let ok = true;
    for (const t of FROTA) {
      let posto = false;
      for (let tent = 0; tent < 200 && !posto; tent++) {
        const h = a.inteiro(2) === 0;
        const x = a.inteiro(h ? LADO - t + 1 : LADO), y = a.inteiro(h ? LADO : LADO - t + 1);
        const casas = Array.from({ length: t }, (_, k) => (h ? y * LADO + x + k : (y + k) * LADO + x));
        if (casas.some((c) => vizinhas8(c).some((v) => ocupado[v]))) continue;
        casas.forEach((c) => (ocupado[c] = 1));
        navios.push({ casas });
        posto = true;
      }
      if (!posto) { ok = false; break; }
    }
    if (ok) return navios;
  }
}

/** Casas de um navio de tamanho `t` a partir de `origem` (canto de cima ou da esquerda), ou null se sai da grade. */
export function casasDoNavio(t: number, origem: number, horizontal: boolean): number[] | null {
  const x = origem % LADO, y = Math.floor(origem / LADO);
  if (horizontal ? x + t > LADO : y + t > LADO) return null;
  return Array.from({ length: t }, (_, k) => (horizontal ? origem + k : origem + k * LADO));
}

/** Põe um navio na frota, se couber sem encostar nos outros. */
export function colocar(navios: Navio[], t: number, origem: number, horizontal: boolean): Navio[] | null {
  const casas = casasDoNavio(t, origem, horizontal);
  if (!casas) return null;
  const ocupado = new Set(navios.flatMap((n) => n.casas));
  if (casas.some((c) => vizinhas8(c).some((v) => ocupado.has(v)))) return null;
  return [...navios, { casas }];
}

/** Tamanhos da frota que ainda faltam posicionar, do maior para o menor. */
export function faltam(navios: Navio[]): number[] {
  const resto = [...FROTA];
  for (const n of navios) { const k = resto.indexOf(n.casas.length); if (k >= 0) resto.splice(k, 1); }
  return resto;
}

export const navioEm = (m: Mar, i: number) => m.navios.find((n) => n.casas.includes(i));
export const afundado = (m: Mar, n: Navio) => n.casas.every((c) => m.tiros.includes(c));
export const derrotado = (m: Mar) => m.navios.every((n) => afundado(m, n));

export function atirar(m: Mar, i: number): { mar: Mar; resultado: Resultado } | null {
  if (m.tiros.includes(i)) return null;
  const mar = { ...m, tiros: [...m.tiros, i] };
  const n = navioEm(mar, i);
  return { mar, resultado: !n ? 'agua' : afundado(mar, n) ? 'afundou' : 'acerto' };
}

export type NivelIA = 'facil' | 'medio' | 'dificil';

/**
 * Tiro do computador no mar do adversário (só usa o que um jogador saberia:
 * onde atirou, onde acertou e o que afundou). Fácil: ao acaso, com caça
 * simples depois de acertar. Médio: caça e segue a linha do navio. Difícil:
 * mapa de probabilidade com os navios que restam.
 */
export function tiroIA(m: Mar, nivel: NivelIA, rnd: () => number = Math.random): number {
  const livres = Array.from({ length: LADO * LADO }, (_, i) => i).filter((i) => !m.tiros.includes(i));
  const afundadas = new Set(m.navios.filter((n) => afundado(m, n)).flatMap((n) => n.casas));
  const acertos = m.tiros.filter((t) => navioEm(m, t) && !afundadas.has(t));
  // Casas vizinhas de navio afundado nunca têm navio (eles não se encostam).
  const proibidas = new Set([...afundadas].flatMap(vizinhas8));
  const candidatas = livres.filter((i) => !proibidas.has(i));
  const sorteia = (l: number[]) => l[Math.floor(rnd() * l.length)];
  const orto = (i: number) => {
    const x = i % LADO, y = Math.floor(i / LADO), r: number[] = [];
    if (x > 0) r.push(i - 1);
    if (x < LADO - 1) r.push(i + 1);
    if (y > 0) r.push(i - LADO);
    if (y < LADO - 1) r.push(i + LADO);
    return r;
  };
  if (nivel === 'facil') {
    if (acertos.length && rnd() < 0.6) {
      const viz = acertos.flatMap(orto).filter((i) => candidatas.includes(i));
      if (viz.length) return sorteia(viz);
    }
    return sorteia(candidatas.length ? candidatas : livres);
  }
  if (acertos.length) {
    // Segue a linha quando há dois acertos alinhados.
    if (acertos.length >= 2) {
      const xs = new Set(acertos.map((i) => i % LADO)), ys = new Set(acertos.map((i) => Math.floor(i / LADO)));
      const linha = ys.size === 1 ? 'h' : xs.size === 1 ? 'v' : null;
      if (linha) {
        const ord = acertos.slice().sort((p, q) => p - q);
        const passo = linha === 'h' ? 1 : LADO;
        const pontas = [ord[0] - passo, ord[ord.length - 1] + passo].filter((i) => i >= 0 && i < LADO * LADO && (linha === 'v' || Math.floor(i / LADO) === Math.floor(ord[0] / LADO)) && candidatas.includes(i));
        if (pontas.length) return sorteia(pontas);
      }
    }
    const viz = [...new Set(acertos.flatMap(orto))].filter((i) => candidatas.includes(i));
    if (viz.length) return sorteia(viz);
  }
  if (nivel === 'medio') {
    // Xadrez: os navios têm pelo menos 2 casas.
    const pares = candidatas.filter((i) => ((i % LADO) + Math.floor(i / LADO)) % 2 === 0);
    return sorteia(pares.length ? pares : candidatas.length ? candidatas : livres);
  }
  // Difícil: conta quantas posições dos navios restantes passam por cada casa.
  const restantes = m.navios.filter((n) => !afundado(m, n)).map((n) => n.casas.length);
  const pode = new Set(candidatas);
  const peso = new Map<number, number>();
  for (const t of restantes) {
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
      for (const h of [true, false]) {
        if (h ? x + t > LADO : y + t > LADO) continue;
        const casas = Array.from({ length: t }, (_, k) => (h ? y * LADO + x + k : (y + k) * LADO + x));
        if (!casas.every((c) => pode.has(c))) continue;
        for (const c of casas) peso.set(c, (peso.get(c) ?? 0) + 1);
      }
    }
  }
  let melhor = -1, max = -1;
  for (const [c, p] of peso) { const v = p + rnd() * 0.5; if (v > max) { max = v; melhor = c; } }
  return melhor >= 0 ? melhor : sorteia(livres);
}
