/*
 * Ação `use:segurar`: tocar e segurar numa casa (ou clicar com o botão direito
 * no computador) chama `aoSegurar`. O clique que viria depois do toque longo é
 * engolido, para o toque simples continuar avançando o estado normalmente.
 */
import { vibrar } from './partida.ts';

export const TEMPO_SEGURAR = 420;
const FOLGA = 10; // px que o dedo pode andar sem cancelar

export function segurar(no: HTMLElement, aoSegurar: (() => void) | null | undefined) {
  let acao = aoSegurar;
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let disparou = false;
  let x0 = 0, y0 = 0;

  const cancelar = () => {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
  };
  const disparar = () => {
    cancelar();
    disparou = true;
    vibrar(20);
    acao?.();
  };
  const baixo = (e: PointerEvent) => {
    if (!acao || (e.pointerType === 'mouse' && e.button !== 0)) return;
    disparou = false;
    x0 = e.clientX; y0 = e.clientY;
    cancelar();
    temporizador = setTimeout(disparar, TEMPO_SEGURAR);
  };
  const mover = (e: PointerEvent) => {
    if (temporizador && Math.hypot(e.clientX - x0, e.clientY - y0) > FOLGA) cancelar();
  };
  const clique = (e: MouseEvent) => {
    if (!disparou) return;
    disparou = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const menu = (e: MouseEvent) => {
    if (!acao) return;
    e.preventDefault();
    // No Android o menu de contexto chega durante o toque longo: só conta uma vez.
    if (temporizador) disparar();
    else if (!disparou) { acao(); disparou = false; }
  };

  no.addEventListener('pointerdown', baixo);
  no.addEventListener('pointermove', mover);
  no.addEventListener('pointerup', cancelar);
  no.addEventListener('pointercancel', cancelar);
  no.addEventListener('pointerleave', cancelar);
  no.addEventListener('click', clique, true);
  no.addEventListener('contextmenu', menu);
  return {
    update(nova: (() => void) | null | undefined) { acao = nova; },
    destroy() {
      cancelar();
      no.removeEventListener('pointerdown', baixo);
      no.removeEventListener('pointermove', mover);
      no.removeEventListener('pointerup', cancelar);
      no.removeEventListener('pointercancel', cancelar);
      no.removeEventListener('pointerleave', cancelar);
      no.removeEventListener('click', clique, true);
      no.removeEventListener('contextmenu', menu);
    },
  };
}
