/*
 * Xadrez com as regras completas: roque, en passant, promoção, xeque, xeque-mate,
 * afogamento, material insuficiente e regra dos 50 lances.
 * Casas 0..63, a8 = 0 (linha de cima, lado das pretas) e h1 = 63.
 * Peças: 'P N B R Q K' (brancas) e 'p n b r q k' (pretas); '' é vazia.
 */
export type Cor = 'b' | 'p';

export interface EstadoXadrez {
  casas: string[];
  vez: Cor;
  /** Roques ainda possíveis: K, Q (brancas), k, q (pretas). */
  roques: string;
  /** Casa de en passant (atrás do peão que andou duas), ou -1. */
  enPassant: number;
  meioLances: number;
  fim: null | { tipo: 'mate' | 'afogamento' | 'material' | '50 lances'; vencedor: Cor | null };
  ultimo: [number, number] | null;
}

export interface Lance { de: number; para: number; promocao?: string; roque?: boolean; enPassant?: boolean }

const INICIAL = 'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR';

export function novoXadrez(): EstadoXadrez {
  return { casas: [...INICIAL].map((c) => (c === '.' ? '' : c)), vez: 'b', roques: 'KQkq', enPassant: -1, meioLances: 0, fim: null, ultimo: null };
}

export const corDe = (p: string): Cor | null => (!p ? null : p === p.toUpperCase() ? 'b' : 'p');
const x = (i: number) => i % 8;
const y = (i: number) => Math.floor(i / 8);
const em = (cx: number, cy: number) => (cx >= 0 && cy >= 0 && cx < 8 && cy < 8 ? cy * 8 + cx : -1);

const CAVALO = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const REI = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const TORRE = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISPO = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/** A casa i é atacada por alguma peça da cor `por`? */
export function atacada(casas: string[], i: number, por: Cor): boolean {
  const cx = x(i), cy = y(i);
  const da = (p: string) => corDe(p) === por;
  const tipo = (p: string) => p.toLowerCase();
  // Peões
  const dirPeao = por === 'b' ? 1 : -1;
  for (const dx of [-1, 1]) { const k = em(cx + dx, cy + dirPeao); if (k >= 0 && da(casas[k]) && tipo(casas[k]) === 'p') return true; }
  for (const [dx, dy] of CAVALO) { const k = em(cx + dx, cy + dy); if (k >= 0 && da(casas[k]) && tipo(casas[k]) === 'n') return true; }
  for (const [dx, dy] of REI) { const k = em(cx + dx, cy + dy); if (k >= 0 && da(casas[k]) && tipo(casas[k]) === 'k') return true; }
  for (const [dirs, tipos] of [[TORRE, 'rq'], [BISPO, 'bq']] as const) {
    for (const [dx, dy] of dirs) {
      let k = em(cx + dx, cy + dy), passo = 1;
      while (k >= 0) {
        if (casas[k]) { if (da(casas[k]) && tipos.includes(tipo(casas[k]))) return true; break; }
        passo++;
        k = em(cx + dx * passo, cy + dy * passo);
      }
    }
  }
  return false;
}

export const emXeque = (e: EstadoXadrez, cor: Cor = e.vez) => {
  const rei = e.casas.indexOf(cor === 'b' ? 'K' : 'k');
  return rei >= 0 && atacada(e.casas, rei, cor === 'b' ? 'p' : 'b');
};

function pseudoLances(e: EstadoXadrez): Lance[] {
  const r: Lance[] = [];
  const { casas, vez } = e;
  const inimiga = (k: number) => corDe(casas[k]) && corDe(casas[k]) !== vez;
  for (let i = 0; i < 64; i++) {
    const p = casas[i];
    if (corDe(p) !== vez) continue;
    const t = p.toLowerCase(), cx = x(i), cy = y(i);
    if (t === 'p') {
      const dir = vez === 'b' ? -1 : 1, inicio = vez === 'b' ? 6 : 1, ultima = vez === 'b' ? 0 : 7;
      const add = (para: number, extra: Partial<Lance> = {}) => {
        if (y(para) === ultima) for (const pr of 'qrbn') r.push({ de: i, para, promocao: vez === 'b' ? pr.toUpperCase() : pr, ...extra });
        else r.push({ de: i, para, ...extra });
      };
      const f1 = em(cx, cy + dir);
      if (f1 >= 0 && !casas[f1]) {
        add(f1);
        const f2 = em(cx, cy + 2 * dir);
        if (cy === inicio && !casas[f2]) r.push({ de: i, para: f2 });
      }
      for (const dx of [-1, 1]) {
        const k = em(cx + dx, cy + dir);
        if (k < 0) continue;
        if (inimiga(k)) add(k);
        else if (k === e.enPassant) r.push({ de: i, para: k, enPassant: true });
      }
    } else if (t === 'n' || t === 'k') {
      for (const [dx, dy] of t === 'n' ? CAVALO : REI) {
        const k = em(cx + dx, cy + dy);
        if (k >= 0 && corDe(casas[k]) !== vez) r.push({ de: i, para: k });
      }
      if (t === 'k') {
        const base = vez === 'b' ? 60 : 4, inim: Cor = vez === 'b' ? 'p' : 'b';
        const pode = (letra: string) => e.roques.includes(vez === 'b' ? letra : letra.toLowerCase());
        if (i === base && !atacada(casas, base, inim)) {
          if (pode('K') && !casas[base + 1] && !casas[base + 2] && !atacada(casas, base + 1, inim) && casas[base + 3].toLowerCase() === 'r') r.push({ de: i, para: base + 2, roque: true });
          if (pode('Q') && !casas[base - 1] && !casas[base - 2] && !casas[base - 3] && !atacada(casas, base - 1, inim) && casas[base - 4].toLowerCase() === 'r') r.push({ de: i, para: base - 2, roque: true });
        }
      }
    } else {
      const dirs = t === 'r' ? TORRE : t === 'b' ? BISPO : REI;
      for (const [dx, dy] of dirs) {
        for (let passo = 1; ; passo++) {
          const k = em(cx + dx * passo, cy + dy * passo);
          if (k < 0) break;
          if (casas[k]) { if (inimiga(k)) r.push({ de: i, para: k }); break; }
          r.push({ de: i, para: k });
        }
      }
    }
  }
  return r;
}

function aplicar(e: EstadoXadrez, l: Lance): EstadoXadrez {
  const casas = e.casas.slice();
  const p = casas[l.de];
  const captura = !!casas[l.para] || !!l.enPassant;
  casas[l.para] = l.promocao ?? p;
  casas[l.de] = '';
  if (l.enPassant) casas[l.para + (e.vez === 'b' ? 8 : -8)] = '';
  if (l.roque) {
    if (l.para > l.de) { casas[l.de + 1] = casas[l.de + 3]; casas[l.de + 3] = ''; }
    else { casas[l.de - 1] = casas[l.de - 4]; casas[l.de - 4] = ''; }
  }
  let roques = e.roques;
  const tira = (c: string) => (roques = roques.replace(c, ''));
  if (p === 'K') { tira('K'); tira('Q'); }
  if (p === 'k') { tira('k'); tira('q'); }
  for (const [casa, letra] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']] as const) if (l.de === casa || l.para === casa) tira(letra);
  const peao = p.toLowerCase() === 'p';
  const enPassant = peao && Math.abs(l.para - l.de) === 16 ? (l.de + l.para) / 2 : -1;
  return {
    casas, vez: e.vez === 'b' ? 'p' : 'b', roques, enPassant,
    meioLances: peao || captura ? 0 : e.meioLances + 1, fim: null, ultimo: [l.de, l.para],
  };
}

export function lancesXadrez(e: EstadoXadrez): Lance[] {
  if (e.fim) return [];
  return pseudoLances(e).filter((l) => !emXeque(aplicar(e, l), e.vez));
}

function materialInsuficiente(casas: string[]): boolean {
  const pecas = casas.filter((c) => c && c.toLowerCase() !== 'k').map((c) => c.toLowerCase());
  return pecas.length === 0 || (pecas.length === 1 && (pecas[0] === 'n' || pecas[0] === 'b'));
}

export function jogarXadrez(e: EstadoXadrez, l: Lance): EstadoXadrez {
  const n = aplicar(e, l);
  if (!lancesXadrez(n).length) n.fim = emXeque(n) ? { tipo: 'mate', vencedor: e.vez } : { tipo: 'afogamento', vencedor: null };
  else if (materialInsuficiente(n.casas)) n.fim = { tipo: 'material', vencedor: null };
  else if (n.meioLances >= 100) n.fim = { tipo: '50 lances', vencedor: null };
  return n;
}
