/*
 * Base de países (data/paises, ODbL + Natural Earth) e cálculos para os jogos
 * de geografia: busca por nome, distâncias, direção e caminhos por fronteira.
 */
import { criarAleatorio } from '@ja/contrato';
import listaPaises from '../../../../data/paises/paises.json';
import listaFormas from '../../../../data/paises/formas.json';

export interface Pais {
  id: string;
  iso2: string;
  nome: string;
  capital: string;
  apelidos: string[];
  capitalLatLon: [number, number];
  latlon: [number, number];
  regiao: string;
  subregiao: string;
  area: number;
  populacao: number;
  vizinhos: string[];
  semLitoral: boolean;
  temForma: boolean;
}

export const PAISES = listaPaises as unknown as Pais[];
export const FORMAS = listaFormas as unknown as Record<string, [number, number][][]>;
const PORID = new Map(PAISES.map((p) => [p.id, p]));
export const pais = (id: string) => PORID.get(id)!;

export const REGIOES: Record<string, string> = { Africa: 'África', Americas: 'Américas', Asia: 'Ásia', Europe: 'Europa', Oceania: 'Oceania', Antarctic: 'Antártida' };

export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** País cujo nome (ou apelido) é exatamente o texto, sem acentos nem maiúsculas. */
export function acharPais(texto: string): Pais | undefined {
  const t = normalizar(texto);
  return PAISES.find((p) => normalizar(p.nome) === t || p.apelidos.some((a) => normalizar(a) === t));
}
export function acharCapital(texto: string): Pais | undefined {
  const t = normalizar(texto);
  return PAISES.find((p) => normalizar(p.capital) === t);
}

/** Sugestões para o autocompletar (começo do nome primeiro). */
export function sugerir(texto: string, campo: 'nome' | 'capital' = 'nome', limite = 6): Pais[] {
  const t = normalizar(texto);
  if (!t) return [];
  const nomes = (p: Pais) => (campo === 'nome' ? [p.nome, ...p.apelidos] : [p.capital]).map(normalizar);
  const comeca = PAISES.filter((p) => nomes(p).some((n) => n.startsWith(t)));
  const contem = PAISES.filter((p) => !comeca.includes(p) && nomes(p).some((n) => n.includes(t)));
  return [...comeca, ...contem].slice(0, limite);
}

const RAD = Math.PI / 180;
export function haversine([la1, lo1]: [number, number], [la2, lo2]: [number, number]): number {
  const dLa = (la2 - la1) * RAD, dLo = (lo2 - lo1) * RAD;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * RAD) * Math.cos(la2 * RAD) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Rumo (0 = norte, 90 = leste) de a para b, em graus. */
export function rumo([la1, lo1]: [number, number], [la2, lo2]: [number, number]): number {
  const y = Math.sin((lo2 - lo1) * RAD) * Math.cos(la2 * RAD);
  const x = Math.cos(la1 * RAD) * Math.sin(la2 * RAD) - Math.sin(la1 * RAD) * Math.cos(la2 * RAD) * Math.cos((lo2 - lo1) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

const verticesCache = new Map<string, [number, number][]>();
function vertices(id: string): [number, number][] {
  let v = verticesCache.get(id);
  if (!v) {
    const todos = (FORMAS[id] ?? []).flat().map(([lo, la]) => [la, lo] as [number, number]);
    // Amostra para manter a conta rápida.
    const passo = Math.max(1, Math.floor(todos.length / 220));
    v = todos.filter((_, i) => i % passo === 0);
    if (!v.length) v = [pais(id).latlon];
    verticesCache.set(id, v);
  }
  return v;
}

/** Distância entre as bordas mais próximas, em km (0 se são vizinhos). */
export function distanciaBordas(a: string, b: string): number {
  if (a === b) return 0;
  if (pais(a).vizinhos.includes(b)) return 0;
  let min = Infinity;
  for (const p of vertices(a)) for (const q of vertices(b)) { const d = haversine(p, q); if (d < min) min = d; }
  return Math.round(min);
}

export const distanciaCentros = (a: string, b: string) => Math.round(haversine(pais(a).latlon, pais(b).latlon));
export const distanciaCapitais = (a: string, b: string) => Math.round(haversine(pais(a).capitalLatLon, pais(b).capitalLatLon));
/** Proximidade de 0 a 100% (100% = mesmo lugar; 0% = antípoda). */
export const proximidade = (km: number) => Math.max(0, Math.round(100 - (km / 20000) * 100));

/** Caminho mais curto por fronteiras terrestres (lista de ids, incluindo as pontas), ou null. */
export function caminhoFronteiras(a: string, b: string, permitidos?: Set<string>): string[] | null {
  const anterior = new Map<string, string | null>([[a, null]]);
  const fila = [a];
  for (let i = 0; i < fila.length; i++) {
    const atual = fila[i];
    if (atual === b) {
      const c: string[] = [];
      for (let x: string | null = b; x; x = anterior.get(x) ?? null) c.unshift(x);
      return c;
    }
    for (const v of pais(atual).vizinhos) {
      if (anterior.has(v) || !PORID.has(v)) continue;
      if (permitidos && v !== b && !permitidos.has(v)) continue;
      anterior.set(v, atual);
      fila.push(v);
    }
  }
  return null;
}

export function sortearPais(semente: string, filtro: (p: Pais) => boolean = () => true): Pais {
  const lista = PAISES.filter(filtro);
  return lista[criarAleatorio(semente).inteiro(lista.length)];
}

/** Par de países ligados por terra, com caminho de `min` a `max` países no meio. */
export function sortearViagem(semente: string, min = 2, max = 5): { de: string; para: string; caminho: string[] } {
  const a = criarAleatorio(semente);
  const comVizinho = PAISES.filter((p) => p.vizinhos.length > 0 && p.populacao > 1_000_000);
  for (;;) {
    const de = comVizinho[a.inteiro(comVizinho.length)].id;
    const para = comVizinho[a.inteiro(comVizinho.length)].id;
    const c = caminhoFronteiras(de, para);
    if (c && c.length - 2 >= min && c.length - 2 <= max) return { de, para, caminho: c };
  }
}

/** Projeção equiretangular em SVG: x = longitude, y = −latitude. */
export function caminhoSvg(id: string): string {
  return (FORMAS[id] ?? []).map((anel) => 'M' + anel.map(([lo, la]) => `${lo},${-la}`).join('L') + 'Z').join('');
}

/** Caixa (x, y, largura, altura) que envolve a forma, no mesmo sistema do caminhoSvg. */
export function caixa(id: string): [number, number, number, number] {
  const pts = (FORMAS[id] ?? []).flat();
  if (!pts.length) { const [la, lo] = pais(id).latlon; return [lo - 2, -la - 2, 4, 4]; }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [lo, la] of pts) { x0 = Math.min(x0, lo); x1 = Math.max(x1, lo); y0 = Math.min(y0, -la); y1 = Math.max(y1, -la); }
  // Países que cruzam a linha de data (Rússia, Fiji): usa a parte maior.
  if (x1 - x0 > 300) { x0 = Math.min(...pts.map(([lo]) => (lo < 0 ? lo + 360 : lo))); x1 = Math.max(...pts.map(([lo]) => (lo < 0 ? lo + 360 : lo))); }
  return [x0, y0, x1 - x0, y1 - y0];
}

export const SETAS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
export const seta = (graus: number) => SETAS[Math.round(graus / 45) % 8];
