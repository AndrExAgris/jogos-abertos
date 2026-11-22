/*
 * Progresso salvo no aparelho, em IndexedDB:
 *  - partidas: a partida em andamento de cada jogo
 *  - estatisticas: números e recordes de cada jogo
 *  - preferencias: escolhas de cada jogo (nível, modo...)
 * A aparência (tema e cores) fica com o Open Design, no localStorage.
 */
const NOME = 'jogos-abertos';
const VERSAO = 1;
export const LOJAS = ['partidas', 'estatisticas', 'preferencias'] as const;
export type Loja = (typeof LOJAS)[number];

let conexao: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  conexao ??= new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME, VERSAO);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      for (const loja of LOJAS) if (!db.objectStoreNames.contains(loja)) db.createObjectStore(loja);
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
  return conexao;
}

function promessa<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export async function ler<T>(loja: Loja, chave: string): Promise<T | undefined> {
  const db = await abrir();
  return promessa(db.transaction(loja).objectStore(loja).get(chave)) as Promise<T | undefined>;
}

export async function gravar<T>(loja: Loja, chave: string, valor: T): Promise<void> {
  const db = await abrir();
  await promessa(db.transaction(loja, 'readwrite').objectStore(loja).put(valor, chave));
}

export async function apagar(loja: Loja, chave: string): Promise<void> {
  const db = await abrir();
  await promessa(db.transaction(loja, 'readwrite').objectStore(loja).delete(chave));
}

async function tudo(loja: Loja): Promise<Record<string, unknown>> {
  const db = await abrir();
  const os = db.transaction(loja).objectStore(loja);
  const [chaves, valores] = await Promise.all([promessa(os.getAllKeys()), promessa(os.getAll())]);
  const res: Record<string, unknown> = {};
  chaves.forEach((k, i) => (res[String(k)] = valores[i]));
  return res;
}

export interface Copia {
  app: 'jogos-abertos';
  formato: 1;
  versaoApp: string;
  exportadoEm: string;
  dados: Record<Loja, Record<string, unknown>>;
  aparencia: unknown;
}

const CHAVE_APARENCIA = 'jogos-abertos';

export async function exportar(): Promise<Copia> {
  const dados = {} as Copia['dados'];
  for (const loja of LOJAS) dados[loja] = await tudo(loja);
  let aparencia: unknown = null;
  try { aparencia = JSON.parse(localStorage.getItem(CHAVE_APARENCIA) ?? 'null'); } catch { /* sem aparência salva */ }
  return { app: 'jogos-abertos', formato: 1, versaoApp: __VERSAO__, exportadoEm: new Date().toISOString(), dados, aparencia };
}

/** Confere o arquivo antes de importar. Devolve a mensagem de erro, ou null. */
export function validarCopia(c: unknown): string | null {
  if (!c || typeof c !== 'object') return 'O arquivo não é uma cópia do Jogos Abertos.';
  const x = c as Partial<Copia>;
  if (x.app !== 'jogos-abertos') return 'O arquivo não é uma cópia do Jogos Abertos.';
  if (x.formato !== 1) return 'A cópia é de uma versão mais nova do app. Atualize o app e tente de novo.';
  if (!x.dados || typeof x.dados !== 'object') return 'A cópia está incompleta.';
  return null;
}

/** Troca todo o progresso pelo da cópia. */
export async function importar(c: Copia): Promise<void> {
  const db = await abrir();
  const tx = db.transaction([...LOJAS], 'readwrite');
  for (const loja of LOJAS) {
    const os = tx.objectStore(loja);
    os.clear();
    for (const [k, v] of Object.entries(c.dados[loja] ?? {})) os.put(v, k);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (c.aparencia && typeof c.aparencia === 'object') {
    window.OpenDesign.definir(c.aparencia as Record<string, string>);
  }
}

export async function apagarTudo(): Promise<void> {
  const db = await abrir();
  const tx = db.transaction([...LOJAS], 'readwrite');
  for (const loja of LOJAS) tx.objectStore(loja).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
