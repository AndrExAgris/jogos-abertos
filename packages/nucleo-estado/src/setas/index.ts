/*
 * Setas. Cada seta voa na direção para onde aponta quando tocada, se o caminho
 * até a borda estiver livre. Tire todas as setas da grade.
 * Gerador: põe as setas uma a uma, cada uma com o caminho livre na hora em
 * que entra; tirando na ordem inversa, sempre há solução.
 */
import { criarAleatorio } from '@ja/contrato';

export type Direcao = 0 | 1 | 2 | 3; // cima, direita, baixo, esquerda
export const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export interface Setas { largura: number; altura: number; setas: (Direcao | -1)[] }

export function caminhoLivre(s: Setas, i: number): boolean {
  const d = s.setas[i];
  if (d < 0) return false;
  const [dx, dy] = DIRS[d];
  let x = (i % s.largura) + dx, y = Math.floor(i / s.largura) + dy;
  while (x >= 0 && y >= 0 && x < s.largura && y < s.altura) {
    if (s.setas[y * s.largura + x] >= 0) return false;
    x += dx; y += dy;
  }
  return true;
}

export function tirar(s: Setas, i: number): Setas {
  if (!caminhoLivre(s, i)) return s;
  const setas = s.setas.slice();
  setas[i] = -1;
  return { ...s, setas };
}

export const vazio = (s: Setas) => s.setas.every((d) => d < 0);

export function gerarSetas(largura: number, altura: number, densidade: number, semente: string): Setas {
  const a = criarAleatorio(semente);
  const s: Setas = { largura, altura, setas: new Array(largura * altura).fill(-1) };
  const alvo = Math.round(largura * altura * densidade);
  let postas = 0;
  for (const i of a.embaralhar(Array.from({ length: largura * altura }, (_, k) => k))) {
    if (postas >= alvo) break;
    for (const d of a.embaralhar([0, 1, 2, 3] as Direcao[])) {
      s.setas[i] = d;
      if (caminhoLivre(s, i)) { postas++; break; }
      s.setas[i] = -1;
    }
  }
  return s;
}
