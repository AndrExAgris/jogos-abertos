/*
 * Rotas por hash (#/...): funcionam offline, no nginx e dentro do APK sem
 * configuração extra. Cada troca de tela vira uma entrada no histórico com a
 * profundidade em `history.state.ja`, então o Voltar do Android e do navegador
 * voltam uma tela, e o botão voltar do app sabe se há tela anterior.
 */
function lerHash(): string {
  const h = location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}

function profundidade(): number {
  const s = history.state as { ja?: number } | null;
  return typeof s?.ja === 'number' ? s.ja : 0;
}

export const rota = $state({ caminho: lerHash() });

if (typeof history.state?.ja !== 'number') history.replaceState({ ...history.state, ja: 0 }, '');

function sincronizar(): void {
  rota.caminho = lerHash();
}
window.addEventListener('popstate', sincronizar);
window.addEventListener('hashchange', sincronizar);

export function ir(caminho: string, substituir = false): void {
  if (caminho === rota.caminho) return;
  if (substituir) history.replaceState({ ja: profundidade() }, '', `#${caminho}`);
  else history.pushState({ ja: profundidade() + 1 }, '', `#${caminho}`);
  rota.caminho = caminho;
}

/** Volta uma tela; se o app abriu direto nesta tela, vai para `padrao`. */
export function voltar(padrao = '/'): void {
  if (profundidade() > 0) history.back();
  else ir(padrao, true);
}
