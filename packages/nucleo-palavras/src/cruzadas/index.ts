/*
 * Palavras Cruzadas em layout livre: a primeira palavra fica no meio e cada
 * nova palavra cruza uma letra de outra já posta, sem encostar de lado em
 * nenhuma. Dicas do Wikcionário (CC BY-SA). Respostas sem acento nem cedilha.
 */
import { criarAleatorio } from '@ja/contrato';
import dados from '../../../../data/palavras/dicas-cc-by-sa.json';

const LISTA = dados as [string, string][];

export interface Entrada { palavra: string; dica: string; x: number; y: number; horizontal: boolean; numero: number }
export interface Cruzada { largura: number; altura: number; entradas: Entrada[] }

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
