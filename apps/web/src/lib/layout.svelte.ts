/** Largura de desktop do Open Design (navegação lateral a partir de 840 px). */
const consulta = window.matchMedia('(min-width: 840px)');

export const layout = $state({ largo: consulta.matches });

consulta.addEventListener('change', (e) => {
  layout.largo = e.matches;
});
