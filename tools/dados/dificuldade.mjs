/*
 * Nota de dificuldade (1 a 5) das perguntas do Wikidata, usada pelo Rumo ao
 * Milhão para subir a dificuldade aos poucos. A nota vem do tipo da pergunta
 * e da fama do assunto (países que todo brasileiro conhece, filmes mais
 * famosos, autores com muitas obras no banco etc.).
 *
 * Também limpa respostas quebradas (nós anônimos do Wikidata) e padroniza
 * os nomes dos prêmios Nobel.
 *
 *   node tools/dados/dificuldade.mjs   (reescreve data/conhecimento/perguntas.json)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cache = join(raiz, 'tools', 'dados', '.cache');

/** Países com capital que quase todo mundo sabe. */
const CAPITAL_FACIL = new Set(['França', 'Japão', 'Itália', 'Portugal', 'Espanha', 'Argentina', 'Reino Unido', 'Alemanha', 'Rússia', 'Egito', 'Chile', 'Uruguai', 'México', 'Grécia', 'Cuba', 'Peru', 'Brasil', 'Irlanda', 'República da Irlanda', 'Coreia do Sul', 'China', 'Paraguai', 'Venezuela', 'Colômbia', 'Bolívia', 'Equador']);
/** Países famosos, mas com capital que engana ou é menos lembrada. */
const PAIS_CONHECIDO = new Set(['Estados Unidos', 'Canadá', 'Austrália', 'Índia', 'Turquia', 'Suíça', 'Países Baixos', 'Reino dos Países Baixos', 'Bélgica', 'Suécia', 'Noruega', 'Dinamarca', 'Finlândia', 'Áustria', 'Polônia', 'Ucrânia', 'Israel', 'Arábia Saudita', 'Irã', 'Iraque', 'Marrocos', 'África do Sul', 'Nigéria', 'Angola', 'Moçambique', 'Cabo Verde', 'Nova Zelândia', 'Tailândia', 'Vietnã', 'Filipinas', 'Indonésia', 'Paquistão', 'Hungria', 'Tchéquia', 'Croácia', 'Sérvia', 'Romênia', 'Escócia', 'Jamaica', 'Panamá', 'Costa Rica', 'Haiti', 'Coreia do Norte', 'Afeganistão', 'Síria', 'Líbano', 'Quênia', 'Etiópia', 'Islândia']);
const ELEMENTO_COMUM = new Set(['H', 'O', 'C', 'N', 'Fe', 'Au', 'Ag', 'Na', 'Cl', 'He', 'Ca', 'K', 'Cu', 'Pb', 'Hg', 'Zn', 'Al', 'S', 'U', 'P', 'Mg', 'Ne', 'Si']);
const ESTADO_GRANDE = new Set(['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Rio Grande do Sul', 'Paraná', 'Pernambuco', 'Ceará', 'Amazonas', 'Pará', 'Santa Catarina', 'Goiás', 'Espírito Santo']);

function lerJson(arquivo, padrao) {
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf8')) : padrao;
}

export function contexto() {
  const paises = lerJson(join(cache, 'wd-paises.json'), []);
  const links = new Map(paises.map((l) => [l.pLabel, Number(l.links)]));
  const elementos = lerJson(join(cache, 'wd-elementos.json'), []);
  const numero = new Map();
  for (const l of elementos) { numero.set(l.simbolo, Number(l.numero)); numero.set(l.eLabel, Number(l.numero)); numero.set(l.eLabel.toLowerCase(), Number(l.numero)); }
  const filmes = lerJson(join(raiz, 'data', 'conhecimento', 'filmes.json'), []);
  const rankFilme = new Map(filmes.map((f, i) => [f.titulo, i]));
  return { links, numero, rankFilme };
}

const entre = (texto, inicio, fim) => texto.slice(inicio.length, texto.length - fim.length);
const aspas = (p) => (p.match(/"([^"]+)"/) ?? [])[1] ?? '';
const limitar = (n) => Math.max(1, Math.min(5, n));

/** Remove perguntas com resposta quebrada e padroniza textos. Devolve null se a pergunta deve sair. */
export function limpar(q) {
  const quebrada = (t) => /https?:\/\//.test(t) || !t.trim();
  if (quebrada(q.r) || q.e.some(quebrada)) return null;
  const nobel = (t) => t.replace(/^Prêmio Nobel/, 'Nobel');
  return { ...q, r: nobel(q.r), e: q.e.map(nobel) };
}

/** Nota de 1 (muito fácil) a 5 (muito difícil). `contagem`: quantas vezes cada resposta aparece no banco. */
export function dificuldade(q, ctx, contagem) {
  const p = q.p;
  const pais = p.includes(': ') ? entre(p.slice(p.indexOf(': ')), ': ', '?') : '';
  const fama = ctx.links.get(pais) ?? 0;
  if (p.startsWith('Qual é a capital deste país')) return CAPITAL_FACIL.has(pais) ? 1 : PAIS_CONHECIDO.has(pais) ? 3 : fama >= 340 ? 4 : 5;
  if (p.startsWith('Em que continente fica este país')) return CAPITAL_FACIL.has(pais) ? 1 : PAIS_CONHECIDO.has(pais) ? 2 : fama >= 330 ? 3 : 4;
  if (p.startsWith('Qual é a moeda deste país')) return CAPITAL_FACIL.has(pais) || PAIS_CONHECIDO.has(pais) ? 3 : fama >= 340 ? 4 : 5;
  if (p.startsWith('Qual é a capital deste estado') || p.endsWith('é a capital de qual estado?')) {
    const estado = p.startsWith('Qual') ? pais : q.r;
    return ESTADO_GRANDE.has(estado) ? 1 : 2;
  }
  if (p.startsWith('Em que estado fica a cidade de')) return 3;
  if (p.startsWith('Quem dirigiu o filme')) { const r = ctx.rankFilme.get(aspas(p)) ?? 999; return r < 40 ? 2 : r < 120 ? 3 : r < 200 ? 4 : 5; }
  if (p.startsWith('Em que ano foi lançado o filme')) { const r = ctx.rankFilme.get(aspas(p)) ?? 999; return r < 60 ? 4 : 5; }
  if (p.startsWith('Quem escreveu') || p.startsWith('Quem pintou')) { const n = contagem.get(q.r) ?? 1; return n >= 5 ? 2 : n >= 3 ? 3 : n >= 2 ? 4 : 5; }
  if (p.startsWith('Qual é o símbolo químico do elemento')) { const s = q.r; return ELEMENTO_COMUM.has(s) ? 2 : (ctx.numero.get(s) ?? 99) <= 30 ? 3 : 4; }
  if (p.startsWith('Qual elemento químico tem o símbolo')) { const s = p.replace('Qual elemento químico tem o símbolo ', '').replace('?', ''); return ELEMENTO_COMUM.has(s) ? 2 : (ctx.numero.get(s) ?? 99) <= 30 ? 3 : 5; }
  if (p.startsWith('Qual esporte')) return q.r === 'futebol' ? 1 : 2;
  if (p.startsWith('De que país é')) return q.r === 'Brasil' || q.r === 'Argentina' ? 2 : 3;
  if (p.startsWith('Quem foi campeão da')) { const ano = Number((p.match(/\d{4}/) ?? ['0'])[0]); return ano >= 1994 ? 2 : ano >= 1958 ? 3 : 4; }
  if (p.endsWith('ganhou qual prêmio?')) return 4;
  if (p.startsWith('Quem tomou posse como presidente do Brasil')) { const ano = Number((p.match(/\d{4}/) ?? ['0'])[0]); return ano >= 1990 ? 2 : ano >= 1960 ? 4 : 5; }
  if (p.startsWith('Em que país fica')) return 3;
  if (p.startsWith('Em que cidade foram os')) return 4;
  if (p.startsWith('Em que área')) return 3;
  return 3;
}

/** Limpa e dá nota a uma lista de perguntas. */
export function anotar(perguntas) {
  const ctx = contexto();
  const limpas = perguntas.map(limpar).filter(Boolean);
  const contagem = new Map();
  for (const q of limpas) contagem.set(q.r, (contagem.get(q.r) ?? 0) + 1);
  return limpas.map((q) => ({ ...q, d: limitar(dificuldade(q, ctx, contagem)) }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arq = join(raiz, 'data', 'conhecimento', 'perguntas.json');
  const lista = anotar(JSON.parse(readFileSync(arq, 'utf8')));
  writeFileSync(arq, JSON.stringify(lista));
  const porNota = {};
  for (const q of lista) porNota[q.d] = (porNota[q.d] ?? 0) + 1;
  console.log(lista.length, 'perguntas; por nota:', porNota);
}
