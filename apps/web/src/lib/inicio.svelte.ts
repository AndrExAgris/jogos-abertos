/** Estado da tela inicial que sobrevive à ida e volta de um jogo: grupos abertos e rolagem. */
const CHAVE = 'ja-inicio-abertos';

function lerAbertos(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const inicio = $state({
  abertos: lerAbertos(),
  rolagem: 0,
  salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(inicio.abertos));
    } catch {
      /* sem armazenamento local */
    }
  },
});
