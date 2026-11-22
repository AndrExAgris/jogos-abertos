/**
 * Gerador pseudoaleatório com semente em texto (cyrb128 + sfc32).
 * Rápido, determinístico e igual em qualquer aparelho.
 */
export interface Aleatorio {
  /** Número em [0, 1). */
  real(): number;
  /** Inteiro em [0, limite). */
  inteiro(limite: number): number;
  /** Inteiro de 31 bits sem sinal. */
  bits31(): number;
  embaralhar<T>(lista: T[]): T[];
}

function cyrb128(texto: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < texto.length; i++) {
    const k = texto.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function criarAleatorio(semente: string): Aleatorio {
  let [a, b, c, d] = cyrb128(semente);
  const proximo = (): number => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let i = 0; i < 12; i++) proximo();
  const real = () => proximo() / 4294967296;
  const inteiro = (limite: number) => Math.floor(real() * limite);
  return {
    real,
    inteiro,
    bits31: () => proximo() >>> 1,
    embaralhar<T>(lista: T[]): T[] {
      for (let i = lista.length - 1; i > 0; i--) {
        const j = inteiro(i + 1);
        [lista[i], lista[j]] = [lista[j], lista[i]];
      }
      return lista;
    },
  };
}

/** Semente nova, para partidas comuns. */
export function sementeNova(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Semente do desafio do dia (mesma para todos no mesmo dia). */
export function sementeDoDia(jogo: string, data = new Date()): string {
  const dia = data.toISOString().slice(0, 10);
  return `${jogo}:${dia}`;
}
