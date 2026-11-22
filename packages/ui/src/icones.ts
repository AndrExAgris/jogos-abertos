/*
 * Ícones Tabler 3.50.0 (MIT, Paweł Kuna), copiados do Open Design para
 * ../icones. Os atributos de tamanho, espessura e classe são tirados para o
 * ícone seguir `.icone` e `--espessura-icone`, como manda o Open Design.
 */
const brutos = import.meta.glob('../icones/{outline,filled}/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function limpar(svg: string): string {
  // Fica só o conteúdo interno; o <svg> é montado pelo componente.
  const corpo = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return corpo.replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '').trim();
}

export const icones: Record<string, { corpo: string; preenchido: boolean }> = {};
for (const [caminho, svg] of Object.entries(brutos)) {
  const preenchido = caminho.includes('/filled/');
  const nome = caminho.split('/').pop()!.replace('.svg', '') + (preenchido ? ':preenchido' : '');
  icones[nome] = { corpo: limpar(svg), preenchido };
}
