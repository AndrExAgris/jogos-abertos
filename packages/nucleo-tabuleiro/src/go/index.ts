/*
 * Go em 9×9, 13×13 ou 19×19. Pedras sem liberdade saem; suicídio não vale;
 * ko simples (não pode recriar a posição de um lance atrás). Dois passes
 * seguidos terminam a partida; a contagem é por área (pedras + território),
 * com komi de 6,5 para as brancas. As pedras mortas devem ser capturadas antes
 * de passar (nesta versão não há marcação de pedras mortas).
 */
export interface EstadoGo {
  lado: number;
  casas: number[]; // 0 vazia, 1 pretas, 2 brancas
  vez: 1 | 2;
  capturas: [number, number];
  anterior: string | null;
  passes: number;
  fim: boolean;
}

export const KOMI = 6.5;

export const novoGo = (lado: number): EstadoGo => ({ lado, casas: new Array(lado * lado).fill(0), vez: 1, capturas: [0, 0], anterior: null, passes: 0, fim: false });

function vizinhos(lado: number, i: number): number[] {
  const x = i % lado, y = Math.floor(i / lado);
  const r: number[] = [];
  if (x > 0) r.push(i - 1);
  if (x < lado - 1) r.push(i + 1);
  if (y > 0) r.push(i - lado);
  if (y < lado - 1) r.push(i + lado);
  return r;
}

function grupo(lado: number, casas: number[], i: number): { pedras: number[]; liberdades: number } {
  const cor = casas[i];
  const pedras = [i];
  const vistos = new Set([i]);
  const libs = new Set<number>();
  for (let k = 0; k < pedras.length; k++) {
    for (const v of vizinhos(lado, pedras[k])) {
      if (casas[v] === 0) libs.add(v);
      else if (casas[v] === cor && !vistos.has(v)) { vistos.add(v); pedras.push(v); }
    }
  }
  return { pedras, liberdades: libs.size };
}

export function jogarGo(e: EstadoGo, i: number): EstadoGo | null {
  if (e.fim || e.casas[i]) return null;
  const casas = e.casas.slice();
  casas[i] = e.vez;
  const outro = e.vez === 1 ? 2 : 1;
  let capturadas = 0;
  for (const v of vizinhos(e.lado, i)) {
    if (casas[v] === outro) {
      const g = grupo(e.lado, casas, v);
      if (g.liberdades === 0) for (const p of g.pedras) { casas[p] = 0; capturadas++; }
    }
  }
  if (grupo(e.lado, casas, i).liberdades === 0) return null; // suicídio
  const chave = casas.join('');
  if (chave === e.anterior) return null; // ko
  const capturas: [number, number] = [...e.capturas];
  capturas[e.vez - 1] += capturadas;
  return { ...e, casas, vez: outro as 1 | 2, capturas, anterior: e.casas.join(''), passes: 0 };
}

export function passarGo(e: EstadoGo): EstadoGo {
  const passes = e.passes + 1;
  return { ...e, vez: e.vez === 1 ? 2 : 1, passes, fim: passes >= 2, anterior: e.casas.join('') };
}

/** Pontos por área: pedras + territórios cercados só por uma cor. */
export function pontuacaoGo(e: EstadoGo): { pretas: number; brancas: number; territorio: number[] } {
  const territorio = new Array(e.casas.length).fill(0);
  const vistos = new Set<number>();
  let pretas = 0, brancas = KOMI;
  e.casas.forEach((c) => { if (c === 1) pretas++; else if (c === 2) brancas++; });
  for (let i = 0; i < e.casas.length; i++) {
    if (e.casas[i] || vistos.has(i)) continue;
    const area = [i];
    vistos.add(i);
    const bordas = new Set<number>();
    for (let k = 0; k < area.length; k++) for (const v of vizinhos(e.lado, area[k])) {
      if (e.casas[v]) bordas.add(e.casas[v]);
      else if (!vistos.has(v)) { vistos.add(v); area.push(v); }
    }
    if (bordas.size === 1) {
      const dono = [...bordas][0];
      for (const a of area) territorio[a] = dono;
      if (dono === 1) pretas += area.length; else brancas += area.length;
    }
  }
  return { pretas, brancas, territorio };
}
