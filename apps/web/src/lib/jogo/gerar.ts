/** Roda um gerador pesado no Web Worker, sem travar a tela. */
let worker: Worker | null = null;
let proximo = 1;
const pendentes = new Map<number, { ok: (v: unknown) => void; falha: (e: Error) => void }>();

function obter(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./trabalhador.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; resultado?: unknown; erro?: string }>) => {
      const p = pendentes.get(e.data.id);
      if (!p) return;
      pendentes.delete(e.data.id);
      if (e.data.ok) p.ok(e.data.resultado);
      else p.falha(new Error(e.data.erro));
    };
  }
  return worker;
}

export function gerarNoFundo<T>(nome: string, args: unknown): Promise<T> {
  const id = proximo++;
  return new Promise<T>((ok, falha) => {
    pendentes.set(id, { ok: ok as (v: unknown) => void, falha });
    obter().postMessage({ id, nome, args });
  });
}
