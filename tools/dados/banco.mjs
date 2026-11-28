// Junta as partes do banco de perguntas:
//  - perguntas por modelo do Wikidata (vindas de wikidata.mjs, já com tipo `t`)
//  - perguntas escritas à mão em tools/dados/curadas/*.txt
//  - perguntas com imagem (bandeira e contorno dos países mais conhecidos)
// e gera, a partir delas, dicas para as palavras cruzadas (respostas de uma palavra).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const ARQUIVOS = {
  mundo: 'Mundo', artes: 'Artes e Entretenimento', sociedade: 'Sociedade',
  ciencia: 'Ciência e Tecnologia', esporte: 'Esporte e Lazer', variedades: 'Variedades',
};

/** Lê as perguntas escritas à mão. Cada linha: nota|pergunta|certa|errada|errada|errada|dica de cruzada (opcional). */
export function lerCuradas() {
  const pasta = join(raiz, 'tools', 'dados', 'curadas');
  const perguntas = [];
  const dicas = [];
  for (const arq of readdirSync(pasta).filter((a) => a.endsWith('.txt')).sort()) {
    const categoria = ARQUIVOS[arq.replace('.txt', '')];
    if (!categoria) throw new Error(`Arquivo sem categoria: ${arq}`);
    let tema = 'geral';
    readFileSync(join(pasta, arq), 'utf8').split('\n').forEach((linha, n) => {
      linha = linha.trim();
      if (!linha || linha.startsWith('#')) return;
      if (linha.startsWith('@tema ')) { tema = linha.slice(6).trim(); return; }
      const partes = linha.split('|').map((s) => s.trim());
      if (partes.length < 6 || partes.length > 7) throw new Error(`${arq}:${n + 1}: esperava 6 ou 7 campos, veio ${partes.length}`);
      const [nota, p, r, ...resto] = partes;
      const e = resto.slice(0, 3);
      const d = Number(nota);
      if (!(d >= 1 && d <= 5)) throw new Error(`${arq}:${n + 1}: nota inválida`);
      if (new Set([r, ...e]).size !== 4) throw new Error(`${arq}:${n + 1}: opções repetidas`);
      perguntas.push({ c: categoria, p, r, e, d, t: `${arq.replace('.txt', '')}:${tema}` });
      if (resto[3]) dicas.push([r, resto[3]]);
    });
  }
  return { perguntas, dicas };
}

// Países mais reconhecíveis para as perguntas com imagem (códigos ISO 3166 alfa-3) e a nota de cada um.
const BANDEIRAS = {
  BRA: 1, ARG: 1, USA: 1, JPN: 1, CAN: 1, FRA: 2, ITA: 2, DEU: 2, GBR: 2, ESP: 2, PRT: 2, MEX: 2, CHN: 2, KOR: 3, CHE: 2,
  URY: 3, CHL: 3, PRY: 4, COL: 3, PER: 3, BOL: 4, VEN: 4, ISR: 3, TUR: 3, GRC: 3, IND: 3, AUS: 3, ZAF: 4, SWE: 3, NLD: 4,
  RUS: 3, BEL: 4, IRL: 4, JAM: 4, EGY: 4, NGA: 4, CUB: 4, NOR: 4, DNK: 4, FIN: 4, AGO: 4, MOZ: 5, NZL: 5, POL: 4, UKR: 3,
};
const CONTORNOS = {
  BRA: 1, ITA: 1, CHL: 2, ARG: 2, USA: 2, AUS: 2, JPN: 2, IND: 3, MEX: 3, FRA: 3, ESP: 3, PRT: 3, GBR: 3, RUS: 3, CAN: 3,
  CHN: 3, EGY: 4, ZAF: 4, GRC: 4, URY: 4, PER: 4, COL: 4, BOL: 4, PRY: 5, VEN: 4, DEU: 4, NOR: 4, TUR: 4, KOR: 5, MDG: 3,
  SWE: 4, ISL: 4, NZL: 4, CUB: 4, IRL: 5, POL: 5, UKR: 5, SAU: 5, PHL: 5, IDN: 4,
};

/** Perguntas com imagem: a bandeira ou o contorno do país, com três outros países da mesma lista como opções. */
export function perguntasComImagem() {
  const paises = JSON.parse(readFileSync(join(raiz, 'data', 'paises', 'paises.json'), 'utf8'));
  const porId = new Map(paises.map((p) => [p.id, p]));
  let s = 777;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const montar = (lista, tipo, pergunta) => {
    const ids = Object.keys(lista).filter((id) => porId.has(id) && (tipo !== 'contorno' || porId.get(id).temForma));
    return ids.map((id) => {
      // Erradas: de preferência da mesma região, para não ficar óbvio.
      const regiao = porId.get(id).regiao;
      const mesma = ids.filter((x) => x !== id && porId.get(x).regiao === regiao);
      const outras = ids.filter((x) => x !== id && porId.get(x).regiao !== regiao);
      const e = new Set();
      const fonte = [...mesma.sort(() => rnd() - 0.5), ...outras.sort(() => rnd() - 0.5)];
      for (const x of fonte) { if (e.size >= 3) break; e.add(porId.get(x).nome); }
      return { c: 'Mundo', p: pergunta, r: porId.get(id).nome, e: [...e], d: lista[id], t: `imagem:${tipo}`, img: { tipo, pais: id } };
    });
  };
  return [...montar(BANDEIRAS, 'bandeira', 'De que país é esta bandeira?'), ...montar(CONTORNOS, 'contorno', 'Que país tem este contorno?')];
}

/** Resposta como entra na cruzada: sem acento, sem cedilha, só letras. */
export const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const umaPalavra = (s) => !/[\s\-.,()/0-9]/.test(s.trim());

/**
 * Dicas de cruzada tiradas do banco: as escritas à mão (7º campo) e as que saem dos modelos
 * ("Capital do Peru" → LIMA, "Sobrenome do pintor de Guernica" → PICASSO).
 */
export function dicasDoBanco(modelos, curadas) {
  const r = [];
  // Sobrenome simples (sem hífen nem partícula), senão a dica fica estranha.
  const sobrenome = (nome) => { const p = nome.trim().split(/\s+/).pop(); return /-/.test(p) || / (de|del|da|do|dos|van|von|di|du|le|la) /i.test(nome) ? '' : p; };
  for (const [resp, dica] of curadas) if (umaPalavra(resp)) r.push([resp, dica]);
  for (const q of modelos) {
    // Só o que é fácil ou médio: dica de cruzada precisa ser reconhecível.
    if ((q.d ?? 3) > 3) continue;
    const t = q.t ?? '';
    const aspas = (q.p.match(/"([^"]+)"/) ?? [])[1];
    const depoisDoisPontos = q.p.includes(': ') ? q.p.slice(q.p.indexOf(': ') + 2).replace(/\?$/, '') : '';
    if (t === 'capital-pais' && umaPalavra(q.r)) r.push([q.r, `Capital: ${depoisDoisPontos}`]);
    else if (t === 'capital-estado' && umaPalavra(q.r)) r.push([q.r, `Capital do estado: ${depoisDoisPontos}`]);
    else if (t === 'moeda' && umaPalavra(q.r)) r.push([q.r, `Moeda: ${depoisDoisPontos}`]);
    else if (t === 'elemento' && umaPalavra(q.r)) r.push([q.r, `Elemento de símbolo ${q.p.replace(/^.*símbolo /, '').replace('?', '')}`]);
    else if (t === 'pintura' && aspas) r.push([sobrenome(q.r), `Sobrenome do pintor de "${aspas}"`]);
    else if (t === 'livro' && aspas) r.push([sobrenome(q.r), `Sobrenome do autor de "${aspas}"`]);
    else if (t === 'diretor' && aspas) r.push([sobrenome(q.r), `Sobrenome do diretor de "${aspas}"`]);
    else if (t === 'copa' && umaPalavra(q.r)) r.push([q.r, `Campeão da ${q.p.replace('Quem foi campeão da ', '').replace('?', '')}`]);
    else if (t === 'olimpiada' && umaPalavra(q.r)) r.push([q.r, `Sede dos ${q.p.replace('Em que cidade foram os ', '').replace('?', '')}`]);
    else if (t === 'banda-pais') { /* resposta é país: dica fraca, fica de fora */ }
  }
  const vistas = new Set();
  const final = [];
  for (const [resp, dica] of r) {
    const n = normalizar(resp);
    if (!resp || n.length < 3 || n.length > 12 || vistas.has(n)) continue;
    vistas.add(n);
    final.push([n, dica]);
  }
  return final;
}

/** Junta tudo, tira repetidas (mesmo texto de pergunta) e confere as opções. */
export function juntar(modelos, curadas, imagens) {
  const vistas = new Set();
  const r = [];
  for (const q of [...curadas, ...imagens, ...modelos]) {
    const chave = q.img ? `${q.p}#${q.img.pais}` : q.p;
    if (vistas.has(chave)) continue;
    if (new Set([q.r, ...q.e]).size !== 4) continue;
    vistas.add(chave);
    r.push(q);
  }
  return r;
}
