/*
 * Roda de Letras: com as letras de uma roda, forme as palavras escondidas.
 * Todas as palavras usam só as letras da roda (cada letra uma vez).
 */
import { criarAleatorio } from '@ja/contrato';
import dados from '../../../../data/palavras/roda.json';

const COMUNS = dados.comuns as string[];
const COMUNS_SET = new Set(COMUNS);

const contagem = (p: string) => { const c: Record<string, number> = {}; for (const l of p) c[l] = (c[l] ?? 0) + 1; return c; };
export function cabe(palavra: string, letras: string): boolean {
  const c = contagem(letras);
  for (const l of palavra) { if (!c[l]) return false; c[l]--; }
  return true;
}

export interface Roda { letras: string[]; palavras: string[] }

export function gerarRoda(tamanho: 5 | 6 | 7, semente: string, maxPalavras = 12): Roda {
  const a = criarAleatorio(semente);
  const bases = COMUNS.slice(0, 12000).filter((p) => p.length === tamanho && new Set(p).size >= tamanho - 1);
  for (;;) {
    const base = bases[a.inteiro(bases.length)];
    const todas = COMUNS.slice(0, 15000).filter((p) => p.length >= 3 && cabe(p, base));
    if (todas.length < 5) continue;
    // Mantém a base e as mais comuns, até o limite, ordenadas por tamanho.
    const escolhidas = [base, ...todas.filter((p) => p !== base)].slice(0, maxPalavras).sort((x, y) => x.length - y.length || x.localeCompare(y));
    return { letras: a.embaralhar([...base]), palavras: escolhidas };
  }
}

/** Palavra que vale bônus (existe, mas não está na lista escondida). */
export const palavraExiste = (p: string) => COMUNS_SET.has(p);
