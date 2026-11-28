/*
 * Perguntas por Categoria: escolha a categoria e responda. Cada acerto vale
 * 1 ponto; com 3 erros o jogo acaba.
 * Perguntas montadas a partir do Wikidata (CC0).
 */
import { criarAleatorio, type Aleatorio } from '@ja/contrato';
import dados from '../../../../data/conhecimento/perguntas.json';

/**
 * `d`: dificuldade de 1 (muito fácil) a 5 (muito difícil). `t`: tipo (modelo do Wikidata ou tema das
 * perguntas escritas à mão), usado para variar o sorteio. `img`: bandeira ou contorno de um país (código alfa-3).
 */
export interface Pergunta { c: string; p: string; r: string; e: string[]; d?: number; t?: string; img?: { tipo: 'bandeira' | 'contorno'; pais: string } }
const TODAS = dados as Pergunta[];

export const CATEGORIAS = ['Mundo', 'Artes e Entretenimento', 'Sociedade', 'Ciência e Tecnologia', 'Esporte e Lazer', 'Variedades'] as const;

/** Identifica a pergunta (as de imagem têm o mesmo texto, então entra o país). */
export const chave = (q: Pergunta) => (q.img ? `${q.p}#${q.img.pais}` : q.p);

export const quantasNaCategoria = (c: string) => TODAS.filter((q) => q.c === c).length;

/**
 * Sorteia primeiro o tipo de pergunta, com peso pela raiz quadrada de quantas há de cada tipo,
 * e depois uma pergunta do tipo. Assim os modelos com centenas de perguntas (capitais, filmes)
 * não tomam conta e os temas escritos à mão aparecem bastante.
 */
function sortearVariado(livres: Pergunta[], a: Aleatorio): Pergunta | null {
  if (!livres.length) return null;
  const porTipo = new Map<string, Pergunta[]>();
  for (const q of livres) {
    const t = q.t ?? 'outro';
    if (!porTipo.has(t)) porTipo.set(t, []);
    porTipo.get(t)!.push(q);
  }
  const tipos = [...porTipo.entries()];
  const pesos = tipos.map(([, l]) => Math.sqrt(l.length));
  let x = a.real() * pesos.reduce((s, p) => s + p, 0);
  let k = 0;
  while (k < tipos.length - 1 && x >= pesos[k]) { x -= pesos[k]; k++; }
  const lista = tipos[k][1];
  return lista[a.inteiro(lista.length)];
}

const comOpcoes = (q: Pergunta, a: Aleatorio) => ({ ...q, opcoes: a.embaralhar([q.r, ...q.e]) });

/**
 * Sorteia uma pergunta da categoria que ainda não saiu; devolve com as opções embaralhadas.
 * Variedades mistura as suas perguntas com as fáceis (nota 1 e 2) das outras categorias.
 */
export function sortearPergunta(categoria: string, usadas: string[], a: Aleatorio): (Pergunta & { opcoes: string[] }) | null {
  const vistas = new Set(usadas);
  const livre = (q: Pergunta) => !vistas.has(chave(q));
  let q: Pergunta | null;
  if (categoria === 'Variedades') {
    const proprias = TODAS.filter((x) => x.c === categoria && livre(x));
    const populares = TODAS.filter((x) => x.c !== categoria && (x.d ?? 3) <= 2 && livre(x));
    const deFora = populares.length && (!proprias.length || a.real() < 0.5);
    q = sortearVariado(deFora ? populares : proprias, a);
  } else {
    q = sortearVariado(TODAS.filter((x) => x.c === categoria && livre(x)), a);
  }
  return q ? comOpcoes(q, a) : null;
}

/** Sorteia uma pergunta da dificuldade pedida (ou da mais próxima que ainda tiver perguntas livres). */
export function sortearNivel(dificuldade: number, usadas: string[], a: Aleatorio): (Pergunta & { opcoes: string[] }) | null {
  const vistas = new Set(usadas);
  for (const desvio of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
    const d = dificuldade + desvio;
    const q = sortearVariado(TODAS.filter((x) => (x.d ?? 3) === d && !vistas.has(chave(x))), a);
    if (q) return comOpcoes(q, a);
  }
  return null;
}


export const aleatorioDaRodada = (semente: string, rodada: number) => criarAleatorio(`${semente}:${rodada}`);
