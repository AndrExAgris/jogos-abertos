import { criarAleatorio, type Jogo, type Resultado } from '@ja/contrato';
import { gerarMinas, maximoDeMinas } from './gerador.ts';

export { gerarMinas, maximoDeMinas, resolveSemChute } from './gerador.ts';

export interface ConfigMinas {
  largura: number;
  altura: number;
  minas: number;
}

export type NivelMinas = 'facil' | 'medio' | 'dificil';

export const NIVEIS_MINAS: Record<NivelMinas, ConfigMinas & { nome: string }> = {
  facil: { nome: 'Fácil', largura: 9, altura: 9, minas: 10 },
  medio: { nome: 'Médio', largura: 16, altura: 16, minas: 40 },
  dificil: { nome: 'Difícil', largura: 30, altura: 16, minas: 99 },
};

export const LIMITES_MINAS = { minLado: 5, maxLado: 40 } as const;

/** Estado de cada casa vista pelo jogador. */
export const FECHADA = 0;
export const ABERTA = 1;
export const BANDEIRA = 2;

export interface EstadoMinas {
  versao: 1;
  largura: number;
  altura: number;
  minas: number;
  semente: string;
  /** 1 onde há mina. Vazio até a primeira jogada, que gera o tabuleiro. */
  tabuleiro: number[];
  casas: number[];
  /** Casa da mina que explodiu, se houve derrota. */
  explodida: number | null;
  resultado: Resultado;
}

export type JogadaMinas =
  | { tipo: 'abrir'; x: number; y: number; tabuleiro?: number[] }
  | { tipo: 'bandeira'; x: number; y: number };

export function validarConfig(c: ConfigMinas): string | null {
  const { minLado, maxLado } = LIMITES_MINAS;
  if (!Number.isInteger(c.largura) || c.largura < minLado || c.largura > maxLado)
    return `A largura vai de ${minLado} a ${maxLado}.`;
  if (!Number.isInteger(c.altura) || c.altura < minLado || c.altura > maxLado)
    return `A altura vai de ${minLado} a ${maxLado}.`;
  const max = maximoDeMinas(c.largura, c.altura);
  if (!Number.isInteger(c.minas) || c.minas < 1 || c.minas > max)
    return `Nesse tamanho, as minas vão de 1 a ${max}.`;
  return null;
}

/** Casas vizinhas (até 8) de um índice. */
export function vizinhas(e: Pick<EstadoMinas, 'largura' | 'altura'>, i: number): number[] {
  const x = i % e.largura;
  const y = (i / e.largura) | 0;
  const res: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < e.largura && ny >= 0 && ny < e.altura) res.push(ny * e.largura + nx);
    }
  }
  return res;
}

/** Número de minas vizinhas de uma casa (só faz sentido depois de gerado). */
export function numero(e: EstadoMinas, i: number): number {
  let n = 0;
  for (const v of vizinhas(e, i)) n += e.tabuleiro[v];
  return n;
}

export function bandeirasRestantes(e: EstadoMinas): number {
  let b = 0;
  for (const c of e.casas) if (c === BANDEIRA) b++;
  return e.minas - b;
}

/** Gera o tabuleiro da primeira jogada (pode rodar num Web Worker). */
export function gerarTabuleiro(e: EstadoMinas, x: number, y: number): number[] {
  const aleatorio = criarAleatorio(`${e.semente}:${x},${y}`);
  const { minas } = gerarMinas(e.largura, e.altura, e.minas, x, y, aleatorio);
  return Array.from(minas);
}

/** Abre a casa e, se for zero, espalha (em largura, sem recursão). */
function abrirEspalhando(e: EstadoMinas, casas: number[], inicio: number): void {
  const fila = [inicio];
  while (fila.length) {
    const i = fila.pop()!;
    if (casas[i] !== FECHADA) continue;
    casas[i] = ABERTA;
    if (numero(e, i) === 0) {
      for (const v of vizinhas(e, i)) if (casas[v] === FECHADA) fila.push(v);
    }
  }
}

function concluir(e: EstadoMinas, casas: number[]): EstadoMinas {
  const total = e.largura * e.altura;
  let abertas = 0;
  for (let i = 0; i < total; i++) if (casas[i] === ABERTA) abertas++;
  if (abertas === total - e.minas) {
    for (let i = 0; i < total; i++) if (e.tabuleiro[i]) casas[i] = BANDEIRA;
    return { ...e, casas, resultado: 'vitoria' };
  }
  return { ...e, casas };
}

function abrir(e: EstadoMinas, x: number, y: number, pronto?: number[]): EstadoMinas {
  const i = y * e.largura + x;
  if (!e.tabuleiro.length) {
    e = { ...e, tabuleiro: pronto ?? gerarTabuleiro(e, x, y) };
  }
  const casas = e.casas.slice();

  // Tocar num número já aberto com as bandeiras certas abre as vizinhas (acorde).
  const alvos: number[] = [];
  if (casas[i] === ABERTA) {
    const viz = vizinhas(e, i);
    const bandeiras = viz.filter((v) => casas[v] === BANDEIRA).length;
    if (bandeiras !== numero(e, i)) return e;
    for (const v of viz) if (casas[v] === FECHADA) alvos.push(v);
  } else if (casas[i] === FECHADA) {
    alvos.push(i);
  } else {
    return e;
  }
  if (!alvos.length) return e;

  for (const a of alvos) {
    if (e.tabuleiro[a]) {
      casas[a] = ABERTA;
      return { ...e, casas, explodida: a, resultado: 'derrota' };
    }
  }
  for (const a of alvos) abrirEspalhando(e, casas, a);
  return concluir(e, casas);
}

function bandeira(e: EstadoMinas, x: number, y: number): EstadoMinas {
  const i = y * e.largura + x;
  if (e.casas[i] === ABERTA) return e;
  const casas = e.casas.slice();
  casas[i] = casas[i] === BANDEIRA ? FECHADA : BANDEIRA;
  return { ...e, casas };
}

export const minas: Jogo<EstadoMinas, JogadaMinas, ConfigMinas> = {
  id: 'minas',
  nome: 'Minas',

  novo(config, semente) {
    const erro = validarConfig(config);
    if (erro) throw new Error(erro);
    const total = config.largura * config.altura;
    return {
      versao: 1,
      largura: config.largura,
      altura: config.altura,
      minas: config.minas,
      semente,
      tabuleiro: [],
      casas: new Array(total).fill(FECHADA),
      explodida: null,
      resultado: 'andamento',
    };
  },

  jogar(e, j) {
    if (e.resultado !== 'andamento') return e;
    if (j.x < 0 || j.y < 0 || j.x >= e.largura || j.y >= e.altura) return e;
    if (j.tipo === 'abrir') return abrir(e, j.x, j.y, j.tabuleiro);
    // Bandeira antes da primeira jogada não faz sentido: ainda não há minas.
    if (!e.tabuleiro.length) return e;
    return bandeira(e, j.x, j.y);
  },

  resultado(e) {
    return e.resultado;
  },

  serializar(e) {
    return JSON.stringify(e);
  },

  desserializar(texto) {
    const e = JSON.parse(texto) as EstadoMinas;
    if (e.versao !== 1) throw new Error('Partida salva numa versão que este app não conhece.');
    return e;
  },
};
