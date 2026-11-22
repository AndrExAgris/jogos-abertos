import { bench, describe } from 'vitest';
import { criarAleatorio } from '@ja/contrato';
import { NIVEIS_MINAS, gerarMinas } from './index.ts';

let s = 0;
describe('geração do Minas', () => {
  for (const [nivel, c] of Object.entries(NIVEIS_MINAS)) {
    bench(`${nivel} (${c.largura}×${c.altura}, ${c.minas} minas)`, () => {
      gerarMinas(c.largura, c.altura, c.minas, c.largura >> 1, c.altura >> 1, criarAleatorio(`b${s++}`));
    }, { time: 2000 });
  }
  bench('denso (16×16, 80 minas)', () => {
    gerarMinas(16, 16, 80, 8, 8, criarAleatorio(`d${s++}`));
  }, { time: 2000 });
});
