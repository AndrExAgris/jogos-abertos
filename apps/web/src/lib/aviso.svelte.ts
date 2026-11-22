/** Avisos curtos (toasts) que somem sozinhos. */
export interface Aviso { id: number; texto: string; tipo: 'info' | 'aviso' | 'erro' | 'sucesso'; icone: string }

export const avisos = $state<Aviso[]>([]);
let proximo = 1;

const ICONES: Record<Aviso['tipo'], string> = { info: 'info-circle', aviso: 'alert-triangle', erro: 'alert-triangle', sucesso: 'check' };

export function avisar(texto: string, tipo: Aviso['tipo'] = 'info', ms = 2800): void {
  // Não repete o mesmo aviso que já está na tela.
  if (avisos.some((a) => a.texto === texto)) return;
  const id = proximo++;
  avisos.push({ id, texto, tipo, icone: ICONES[tipo] });
  if (avisos.length > 3) avisos.shift();
  setTimeout(() => {
    const k = avisos.findIndex((a) => a.id === id);
    if (k >= 0) avisos.splice(k, 1);
  }, ms);
}
