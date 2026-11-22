/**
 * Largura de desktop do Open Design (navegação lateral a partir de 840 px).
 * Celular deitado passa de 840 px de largura mas tem pouca altura: continua no layout de celular.
 */
const consulta = window.matchMedia('(min-width: 840px) and (min-height: 560px)');

export const layout = $state({ largo: consulta.matches });

consulta.addEventListener('change', (e) => {
  layout.largo = e.matches;
});
