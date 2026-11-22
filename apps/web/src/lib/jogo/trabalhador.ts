/*
 * Web Worker dos geradores pesados. Cada gerador é importado só quando pedido,
 * então o worker continua leve. `args` é a lista de argumentos da função.
 */
type Gerador = (...args: never[]) => unknown;
const geradores: Record<string, () => Promise<Gerador>> = {
  sudoku: async () => (await import('@ja/nucleo-grade/sudoku')).gerarSudoku as Gerador,
  akari: async () => (await import('@ja/nucleo-grade/akari')).gerarAkari as Gerador,
  tendas: async () => (await import('@ja/nucleo-grade/tendas')).gerarTendas as Gerador,
  pontes: async () => (await import('@ja/nucleo-grade/pontes')).gerarPontes as Gerador,
  rainhas: async () => (await import('@ja/nucleo-grade/rainhas')).gerarRainhas as Gerador,
  mosaico: async () => (await import('@ja/nucleo-grade/mosaico')).gerarMosaico as Gerador,
  ligue: async () => (await import('@ja/nucleo-grade/ligue')).gerarLigue as Gerador,
  conta: async () => (await import('@ja/nucleo-numeros/conta')).gerarConta as Gerador,
  separe: async () => (await import('@ja/nucleo-estado/separe')).gerarSepare as Gerador,
  rush: async () => (await import('@ja/nucleo-estado/rush')).gerarRush as Gerador,
  cruzadaDensa: async () => (await import('@ja/nucleo-palavras/cruzadas')).gerarCruzadaDensa as Gerador,
  nonograma: async () => (await import('@ja/nucleo-grade/nonograma')).gerarNonograma as Gerador,
  charada: async () => (await import('@ja/nucleo-grade/charada')).gerarCharada as Gerador,
  ia: async () => (await import('@ja/nucleo-tabuleiro/ia')).jogarIA as Gerador,
  sumplete: async () => (await import('@ja/nucleo-grade/sumplete')).gerarSumplete as Gerador,
};

self.onmessage = async (e: MessageEvent<{ id: number; nome: string; args: unknown }>) => {
  const { id, nome, args } = e.data;
  try {
    const f = await geradores[nome]();
    const lista = (Array.isArray(args) ? args : [args]) as never[];
    postMessage({ id, ok: true, resultado: f(...lista) });
  } catch (erro) {
    postMessage({ id, ok: false, erro: (erro as Error).message });
  }
};
