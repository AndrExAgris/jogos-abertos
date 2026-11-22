/*
 * Sinuca 8 bolas, com física simples em 2D: atrito, choques elásticos entre
 * bolas de mesma massa, tabelas e seis caçapas.
 *
 * Regras (simplificadas): quem encaçapar primeiro define o grupo (lisas 1–7 ou
 * listradas 9–15). Encaçapou bola do seu grupo, joga de novo. Branca na
 * caçapa (ou não tocar em bola do seu grupo primeiro) é falta: o outro põe a
 * branca onde quiser. Vence quem encaçapar a 8 depois do seu grupo; a 8 antes
 * da hora, ou junto com a branca, perde.
 */
export const LARGURA = 200;
export const ALTURA = 100;
export const RAIO = 2.6;
export const CACAPA = 5.2;
const ATRITO = 0.985;
const PARADA = 0.02;

export const CACAPAS: [number, number][] = [
  [0, 0], [LARGURA / 2, -1.5], [LARGURA, 0], [0, ALTURA], [LARGURA / 2, ALTURA + 1.5], [LARGURA, ALTURA],
];

export interface Bola { n: number; x: number; y: number; vx: number; vy: number; dentro: boolean }

export interface EstadoSinuca {
  bolas: Bola[];
  vez: 0 | 1;
  /** Grupo de cada jogador: 'lisas', 'listradas' ou null antes de definir. */
  grupos: [Grupo, Grupo];
  bolaNaMao: boolean;
  vencedor: 0 | 1 | null;
  mensagem: string;
}
export type Grupo = 'lisas' | 'listradas' | null;

export function novaSinuca(): EstadoSinuca {
  const bolas: Bola[] = [{ n: 0, x: LARGURA * 0.25, y: ALTURA / 2, vx: 0, vy: 0, dentro: false }];
  // Triângulo com a 8 no meio, uma lisa e uma listrada nos cantos de trás.
  const ordem = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const ox = LARGURA * 0.72, d = RAIO * 2 + 0.05;
  let k = 0;
  for (let linha = 0; linha < 5; linha++) for (let c = 0; c <= linha; c++) {
    bolas.push({ n: ordem[k++], x: ox + linha * d * 0.866, y: ALTURA / 2 + (c - linha / 2) * d, vx: 0, vy: 0, dentro: false });
  }
  return { bolas, vez: 0, grupos: [null, null], bolaNaMao: false, vencedor: null, mensagem: 'Jogador 1 abre a partida.' };
}

export interface Eventos { encacapadas: number[]; primeiroToque: number | null }

/** Avança a física um passo; devolve true se ainda há bola andando. */
export function passo(bolas: Bola[], ev: Eventos): boolean {
  const vivas = bolas.filter((b) => !b.dentro);
  const sub = 4;
  for (let s = 0; s < sub; s++) {
    for (const b of vivas) { b.x += b.vx / sub; b.y += b.vy / sub; }
    // Choques entre bolas.
    for (let i = 0; i < vivas.length; i++) for (let j = i + 1; j < vivas.length; j++) {
      const a = vivas[i], b = vivas[j];
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
      if (dist === 0 || dist >= RAIO * 2) continue;
      const nx = dx / dist, ny = dy / dist;
      const sobra = RAIO * 2 - dist;
      a.x -= (nx * sobra) / 2; a.y -= (ny * sobra) / 2; b.x += (nx * sobra) / 2; b.y += (ny * sobra) / 2;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) continue;
      a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny;
      if (ev.primeiroToque === null && (a.n === 0 || b.n === 0)) ev.primeiroToque = a.n === 0 ? b.n : a.n;
    }
    for (const b of vivas) {
      if (b.dentro) continue;
      // Caçapas.
      if (CACAPAS.some(([cx, cy]) => Math.hypot(b.x - cx, b.y - cy) < CACAPA)) {
        b.dentro = true; b.vx = 0; b.vy = 0;
        ev.encacapadas.push(b.n);
        continue;
      }
      // Tabelas.
      if (b.x < RAIO) { b.x = RAIO; b.vx = Math.abs(b.vx) * 0.85; }
      if (b.x > LARGURA - RAIO) { b.x = LARGURA - RAIO; b.vx = -Math.abs(b.vx) * 0.85; }
      if (b.y < RAIO) { b.y = RAIO; b.vy = Math.abs(b.vy) * 0.85; }
      if (b.y > ALTURA - RAIO) { b.y = ALTURA - RAIO; b.vy = -Math.abs(b.vy) * 0.85; }
    }
  }
  let andando = false;
  for (const b of vivas) {
    b.vx *= ATRITO; b.vy *= ATRITO;
    if (Math.hypot(b.vx, b.vy) < PARADA) { b.vx = 0; b.vy = 0; } else andando = true;
  }
  return andando;
}

export function tacada(e: EstadoSinuca, angulo: number, forca: number): EstadoSinuca {
  const bolas = e.bolas.map((b) => ({ ...b }));
  const branca = bolas[0];
  branca.vx = Math.cos(angulo) * forca;
  branca.vy = Math.sin(angulo) * forca;
  return { ...e, bolas, bolaNaMao: false };
}

const grupoDe = (n: number): Grupo => (n >= 1 && n <= 7 ? 'lisas' : n >= 9 ? 'listradas' : null);

/** Aplica as regras depois que todas as bolas pararam. */
export function arbitrar(e: EstadoSinuca, ev: Eventos): EstadoSinuca {
  const n = { ...e, bolas: e.bolas.map((b) => ({ ...b })), grupos: [...e.grupos] as [Grupo, Grupo] };
  const eu = e.vez, outro = (1 - e.vez) as 0 | 1;
  const meu = () => n.grupos[eu];
  const restamDoGrupo = (g: Grupo) => n.bolas.filter((b) => !b.dentro && grupoDe(b.n) === g).length;
  const branca = ev.encacapadas.includes(0);
  const oito = ev.encacapadas.includes(8);
  const nome = (j: number) => `Jogador ${j + 1}`;

  if (oito) {
    const podia = meu() !== null && restamDoGrupo(meu()) === 0;
    const ganhou = podia && !branca;
    n.vencedor = ganhou ? eu : outro;
    n.mensagem = ganhou ? `${nome(eu)} encaçapou a 8 e venceu!` : `A 8 caiu antes da hora: ${nome(outro)} venceu.`;
    return n;
  }
  // Define grupos na primeira bola encaçapada.
  const lisas = ev.encacapadas.filter((b) => grupoDe(b) === 'lisas').length;
  const listradas = ev.encacapadas.filter((b) => grupoDe(b) === 'listradas').length;
  if (meu() === null && (lisas || listradas) && !branca) {
    const g: Grupo = lisas >= listradas ? 'lisas' : 'listradas';
    n.grupos[eu] = g;
    n.grupos[outro] = g === 'lisas' ? 'listradas' : 'lisas';
  }
  const falta = branca || ev.primeiroToque === null || (meu() !== null && grupoDe(ev.primeiroToque) !== meu() && !(restamDoGrupo(meu()) === 0 && ev.primeiroToque === 8));
  if (branca) {
    const b = n.bolas[0];
    b.dentro = false; b.x = LARGURA * 0.25; b.y = ALTURA / 2; b.vx = 0; b.vy = 0;
  }
  if (falta) {
    n.vez = outro;
    n.bolaNaMao = true;
    n.mensagem = branca ? `Falta: a branca caiu. ${nome(outro)} põe a branca onde quiser.` : `Falta. ${nome(outro)} põe a branca onde quiser.`;
    return n;
  }
  const acertou = meu() !== null && ev.encacapadas.some((b) => grupoDe(b) === meu());
  if (acertou) { n.mensagem = `${nome(eu)} encaçapou e joga de novo.`; return n; }
  n.vez = outro;
  n.mensagem = `Vez do ${nome(outro)}.`;
  return n;
}

/** A branca pode ficar aqui (dentro da mesa e sem encostar em outra bola)? */
export function podePorBranca(e: EstadoSinuca, x: number, y: number): boolean {
  if (x < RAIO || y < RAIO || x > LARGURA - RAIO || y > ALTURA - RAIO) return false;
  return e.bolas.every((b) => b.n === 0 || b.dentro || Math.hypot(b.x - x, b.y - y) >= RAIO * 2);
}
