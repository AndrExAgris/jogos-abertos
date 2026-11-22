// Consulta o Wikidata (CC0) para montar os bancos de conhecimento:
//  - data/conhecimento/filmes.json: filmes famosos com ano, gênero, país, direção, elenco e prêmios
//  - data/conhecimento/perguntas.json: perguntas de múltipla escolha por categoria
// Uso: node tools/dados/wikidata.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const saida = join(raiz, 'data', 'conhecimento');
const AGENTE = { 'User-Agent': 'jogos-abertos-dados/0.1 (projeto de codigo aberto)', Accept: 'application/sparql-results+json' };

async function sparql(consulta, tentativas = 3) {
  for (let t = 1; ; t++) {
    const r = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST', headers: { ...AGENTE, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `query=${encodeURIComponent(consulta)}`,
      signal: AbortSignal.timeout(90000),
    }).catch((e) => ({ ok: false, status: e.name, text: async () => String(e) }));
    if (r.ok) return (await r.json()).results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
    if (t >= tentativas) throw new Error(`SPARQL ${r.status}: ${(await r.text()).slice(0, 300)}`);
    await new Promise((ok) => setTimeout(ok, 5000 * t));
  }
}
/** Consulta que pode falhar: devolve lista vazia e avisa, sem derrubar o resto. */
async function talvez(nome, consulta) {
  const t0 = Date.now();
  const { existsSync, readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
  const pasta = join(raiz, 'tools', 'dados', '.cache');
  const arq = join(pasta, `wd-${nome}.json`);
  if (existsSync(arq)) return JSON.parse(readFileSync(arq, 'utf8'));
  try {
    const r = await sparql(consulta, 2);
    mkdirSync(pasta, { recursive: true });
    writeFileSync(arq, JSON.stringify(r));
    console.log(`  ${nome}: ${r.length} linhas em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    return r;
  } catch (e) {
    console.log(`  ${nome}: falhou (${e.message.slice(0, 80)})`);
    return [];
  }
}
const id = (uri) => uri.replace('http://www.wikidata.org/entity/', '');
const ROTULO = 'SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt". }';
/** Rótulo em português do Brasil, com o de Portugal como reserva; descarta rótulo que é só o código Q. */
const bom = (s) => s && !/^Q\d+$/.test(s) && !/^\d+$/.test(s);
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const CONTINENTES = new Set(['África', 'América do Norte', 'América do Sul', 'Ásia', 'Europa', 'Oceania']);

async function filmes() {
  console.log('Filmes famosos…');
  const lista = await sparql(`SELECT ?f ?links ?br ?pt ?en WHERE {
    ?f wdt:P31 wd:Q11424 ; wikibase:sitelinks ?links . FILTER(?links >= 45)
    OPTIONAL { ?f rdfs:label ?br FILTER(LANG(?br) = "pt-br") }
    OPTIONAL { ?f rdfs:label ?pt FILTER(LANG(?pt) = "pt") }
    OPTIONAL { ?f rdfs:label ?en FILTER(LANG(?en) = "en") }
    FILTER(BOUND(?br) || BOUND(?pt)) }`);
  const porId = new Map();
  for (const l of lista) {
    const k = id(l.f);
    const atual = porId.get(k) ?? { id: k, titulo: '', links: Number(l.links) };
    // O rótulo pt-br às vezes é só o título original em inglês; aí vale o rótulo pt.
    const br = l.br && !(l.pt && l.br === l.en && l.pt !== l.en) ? l.br : '';
    atual.titulo = br || atual.titulo || l.pt;
    porId.set(k, atual);
  }
  const ids = [...porId.keys()];
  console.log(ids.length, 'filmes; buscando detalhes…');
  const det = new Map(ids.map((k) => [k, { ano: 0, generos: new Set(), paises: new Set(), direcao: new Set(), elenco: new Map(), premios: new Set() }]));
  for (let i = 0; i < ids.length; i += 60) {
    const valores = ids.slice(i, i + 60).map((k) => `wd:${k}`).join(' ');
    const linhas = await sparql(`SELECT ?f ?data ?gLabel ?pLabel ?dLabel WHERE { VALUES ?f { ${valores} }
      OPTIONAL { ?f wdt:P577 ?data } OPTIONAL { ?f wdt:P136 ?g } OPTIONAL { ?f wdt:P495 ?p } OPTIONAL { ?f wdt:P57 ?d } ${ROTULO} }`);
    for (const l of linhas) {
      const d = det.get(id(l.f));
      if (l.data) { const a = Number(l.data.slice(0, 4)); if (a && (!d.ano || a < d.ano)) d.ano = a; }
      if (bom(l.gLabel)) d.generos.add(l.gLabel);
      if (bom(l.pLabel)) d.paises.add(l.pLabel);
      if (bom(l.dLabel)) d.direcao.add(l.dLabel);
    }
    const elenco = await sparql(`SELECT ?f ?aLabel ?al WHERE { VALUES ?f { ${valores} } ?f wdt:P161 ?a . ?a wikibase:sitelinks ?al . FILTER(?al >= 25) ${ROTULO} }`);
    for (const l of elenco) if (bom(l.aLabel)) det.get(id(l.f)).elenco.set(l.aLabel, Number(l.al));
    const premios = await sparql(`SELECT ?f ?prLabel WHERE { VALUES ?f { ${valores} } ?f wdt:P166 ?pr . ${ROTULO} }`);
    for (const l of premios) if (bom(l.prLabel) && /oscar|óscar|globo de ouro|palma de ouro|leão de ouro|urso de ouro|bafta/i.test(l.prLabel)) det.get(id(l.f)).premios.add(l.prLabel);
    process.stdout.write('.');
  }
  console.log();
  return ids.map((k) => {
    const f = porId.get(k), d = det.get(k);
    return {
      titulo: f.titulo, ano: d.ano, generos: [...d.generos].slice(0, 3), paises: [...d.paises].slice(0, 2),
      direcao: [...d.direcao].slice(0, 2), elenco: [...d.elenco.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n),
      premios: [...d.premios].slice(0, 3), fama: f.links,
    };
  }).filter((f) => f.ano && f.direcao.length && f.elenco.length && f.generos.length).sort((a, b) => b.fama - a.fama);
}

/** Monta perguntas de múltipla escolha: resposta certa + 3 erradas do mesmo tipo. */
function montar(categoria, linhas, texto, campoResposta, campoChave = null) {
  const respostas = [...new Set(linhas.map((l) => l[campoResposta]))];
  const vistas = new Set();
  const perguntas = [];
  for (const l of linhas) {
    const chave = campoChave ? l[campoChave] : JSON.stringify(l);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    // Só perguntas com uma resposta (sem ambiguidade).
    const certas = new Set(linhas.filter((x) => (campoChave ? x[campoChave] === chave : x === l)).map((x) => x[campoResposta]));
    if (certas.size !== 1) continue;
    const erradas = respostas.filter((r) => !certas.has(r));
    if (erradas.length < 3) continue;
    perguntas.push({ c: categoria, p: texto(l), r: l[campoResposta], pool: erradas });
  }
  return perguntas;
}
function sortearErradas(perguntas) {
  let s = 12345;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  return perguntas.map(({ pool, ...q }) => {
    const e = new Set();
    while (e.size < 3) e.add(pool[Math.floor(rnd() * pool.length)]);
    return { ...q, e: [...e] };
  });
}

async function perguntas(listaFilmes) {
  const P = [];
  console.log('Perguntas: países…');
  const paises = (await talvez('paises', `SELECT ?pLabel ?capLabel ?moedaLabel ?contLabel ?links WHERE { ?p wdt:P31 wd:Q3624078 ; wikibase:sitelinks ?links . FILTER(?links >= 150)
    OPTIONAL { ?p wdt:P36 ?cap } OPTIONAL { ?p wdt:P38 ?moeda } OPTIONAL { ?p wdt:P30 ?cont } ${ROTULO} }`)).filter((l) => bom(l.pLabel));
  P.push(...montar('Mundo', paises.filter((l) => bom(l.capLabel)), (l) => `Qual é a capital deste país: ${l.pLabel}?`, 'capLabel', 'pLabel'));
  P.push(...montar('Mundo', paises.filter((l) => CONTINENTES.has(l.contLabel)), (l) => `Em que continente fica este país: ${l.pLabel}?`, 'contLabel', 'pLabel'));
  P.push(...montar('Sociedade', paises.filter((l) => bom(l.moedaLabel)).map((l) => ({ ...l, moeda: maiuscula(l.moedaLabel) })), (l) => `Qual é a moeda deste país: ${l.pLabel}?`, 'moeda', 'pLabel'));

  console.log('Perguntas: obras e pessoas…');
  const pinturas = (await talvez('pinturas', `SELECT ?oLabel ?aLabel WHERE { ?o wdt:P31 wd:Q3305213 ; wdt:P170 ?a ; wikibase:sitelinks ?l . FILTER(?l >= 35) ${ROTULO} }`)).filter((l) => bom(l.oLabel) && bom(l.aLabel));
  P.push(...montar('Artes e Entretenimento', pinturas, (l) => `Quem pintou "${l.oLabel}"?`, 'aLabel', 'oLabel'));
  const livros = (await talvez('livros', `SELECT ?oLabel ?aLabel WHERE { ?o wdt:P31 wd:Q7725634 ; wdt:P50 ?a ; wikibase:sitelinks ?l . FILTER(?l >= 50) ${ROTULO} }`)).filter((l) => bom(l.oLabel) && bom(l.aLabel));
  P.push(...montar('Artes e Entretenimento', livros, (l) => `Quem escreveu "${l.oLabel}"?`, 'aLabel', 'oLabel'));
  const filmesDir = listaFilmes.slice(0, 250).map((f) => ({ t: f.titulo, d: f.direcao[0], a: String(f.ano) }));
  P.push(...montar('Artes e Entretenimento', filmesDir, (l) => `Quem dirigiu o filme "${l.t}"?`, 'd', 't'));
  P.push(...montar('Artes e Entretenimento', filmesDir, (l) => `Em que ano foi lançado o filme "${l.t}"?`, 'a', 't'));

  console.log('Perguntas: ciência…');
  const elementos = (await talvez('elementos', `SELECT ?eLabel ?simbolo ?numero WHERE { ?e wdt:P31 wd:Q11344 ; wdt:P246 ?simbolo ; wdt:P1086 ?numero . FILTER(?numero <= 92) ${ROTULO} }`)).filter((l) => bom(l.eLabel));
  P.push(...montar('Ciência e Tecnologia', elementos, (l) => `Qual é o símbolo químico do elemento ${l.eLabel.toLowerCase()}?`, 'simbolo', 'eLabel'));
  P.push(...montar('Ciência e Tecnologia', elementos.map((l) => ({ ...l, n2: l.eLabel })), (l) => `Qual elemento químico tem o símbolo ${l.simbolo}?`, 'n2', 'simbolo'));
  const cientistas = (await talvez('cientistas', `SELECT ?pLabel ?campoLabel WHERE { ?p wdt:P106 wd:Q901 ; wdt:P101 ?campo ; wikibase:sitelinks ?l . FILTER(?l >= 120) ${ROTULO} }`)).filter((l) => bom(l.pLabel) && bom(l.campoLabel));
  P.push(...montar('Ciência e Tecnologia', cientistas, (l) => `Em que área ${l.pLabel} ficou conhecido(a)?`, 'campoLabel', 'pLabel'));
  console.log('Perguntas: esporte…');
  // Atletas premiados (conjuntos pequenos: a consulta é rápida). Bola de Ouro, Melhor do Mundo da FIFA,
  // campeões de Fórmula 1, MVP da NBA, Laureus.
  const atletas = (await talvez('atletas', `SELECT ?pLabel ?esporteLabel ?paisLabel WHERE { VALUES ?premio { wd:Q166177 wd:Q233454 wd:Q1968 wd:Q222047 wd:Q1052387 wd:Q2665924 }
    ?p wdt:P166 ?premio ; wdt:P641 ?esporte ; wdt:P27 ?pais ; wikibase:sitelinks ?l . FILTER(?l >= 45) ${ROTULO} }`)).filter((l) => bom(l.pLabel) && bom(l.esporteLabel) && bom(l.paisLabel));
  P.push(...montar('Esporte e Lazer', atletas, (l) => `Qual esporte ${l.pLabel} pratica ou praticou?`, 'esporteLabel', 'pLabel'));
  P.push(...montar('Esporte e Lazer', atletas, (l) => `De que país é ${l.pLabel}?`, 'paisLabel', 'pLabel'));
  const copas = (await talvez('copas', `SELECT ?cLabel ?campeaoLabel WHERE { ?c wdt:P3450 wd:Q19317 ; wdt:P1346 ?campeao . ${ROTULO} }`)).filter((l) => bom(l.cLabel) && bom(l.campeaoLabel));
  P.push(...montar('Esporte e Lazer', copas.map((l) => ({ ...l, campeao: l.campeaoLabel.replace(/^seleção (masculina )?(de futebol )?d[aoe]s? /i, '').replace(/ de futebol$/i, '') })), (l) => `Quem foi campeão da ${l.cLabel}?`, 'campeao', 'cLabel'));
  const olimpiadas = (await talvez('olimpiadas', `SELECT ?oLabel ?cidadeLabel WHERE { ?o wdt:P31 wd:Q159821 ; wdt:P276 ?cidade . ${ROTULO} }`)).filter((l) => bom(l.oLabel) && bom(l.cidadeLabel));
  P.push(...montar('Esporte e Lazer', olimpiadas, (l) => `Em que cidade foram os ${l.oLabel}?`, 'cidadeLabel', 'oLabel'));

  console.log('Perguntas: variedades e Brasil…');
  const patrimonios = (await talvez('patrimonios', `SELECT ?lLabel ?paisLabel WHERE { ?lugar wdt:P1435 wd:Q9259 ; wdt:P17 ?pais ; wikibase:sitelinks ?l . FILTER(?l >= 55) ${ROTULO} }`)).filter((l) => bom(l.lLabel) && bom(l.paisLabel));
  P.push(...montar('Variedades', patrimonios, (l) => `Em que país fica ${l.lLabel}?`, 'paisLabel', 'lLabel'));
  const nobel = (await talvez('nobel', `SELECT ?pLabel ?premioLabel WHERE { ?premio wdt:P279 wd:Q7191 . ?p wdt:P166 ?premio ; wikibase:sitelinks ?l . FILTER(?l >= 100) ${ROTULO} }`)).filter((l) => bom(l.pLabel) && bom(l.premioLabel));
  P.push(...montar('Variedades', nobel.map((l) => ({ ...l, area: l.premioLabel.replace(/^Prémio |^Prêmio /, 'Prêmio ') })), (l) => `${l.pLabel} ganhou qual prêmio?`, 'area', 'pLabel'));
  const estados = (await talvez('estados', `SELECT ?eLabel ?capLabel WHERE { ?e wdt:P31 wd:Q485258 ; wdt:P36 ?cap . ${ROTULO} }`)).filter((l) => bom(l.eLabel) && bom(l.capLabel));
  P.push(...montar('Brasil', estados, (l) => `Qual é a capital deste estado: ${l.eLabel}?`, 'capLabel', 'eLabel'));
  P.push(...montar('Brasil', estados.map((l) => ({ ...l, e2: l.eLabel })), (l) => `${l.capLabel} é a capital de qual estado?`, 'e2', 'capLabel'));
  const cidades = (await talvez('cidades', `SELECT ?cLabel ?eLabel WHERE { ?c wdt:P31 wd:Q3184121 ; wdt:P1082 ?pop ; wdt:P131 ?e . ?e wdt:P31 wd:Q485258 . FILTER(?pop >= 300000) ${ROTULO} }`)).filter((l) => bom(l.cLabel) && bom(l.eLabel));
  P.push(...montar('Brasil', cidades, (l) => `Em que estado fica a cidade de ${l.cLabel}?`, 'eLabel', 'cLabel'));
  const presidentes = (await talvez('presidentes', `SELECT ?pLabel ?inicio WHERE { ?p p:P39 ?st . ?st ps:P39 wd:Q4254005 ; pq:P580 ?inicio . ${ROTULO} }`)).filter((l) => bom(l.pLabel));
  const pres = presidentes.map((l) => ({ p: l.pLabel, ano: l.inicio.slice(0, 4) })).filter((l) => Number(l.ano) >= 1930);
  P.push(...montar('Brasil', pres, (l) => `Quem tomou posse como presidente do Brasil em ${l.ano}?`, 'p', 'ano'));

  const final = sortearErradas(P);
  const porCategoria = {};
  for (const q of final) porCategoria[q.c] = (porCategoria[q.c] ?? 0) + 1;
  console.log('Perguntas por categoria:', porCategoria);
  return final;
}

await mkdir(saida, { recursive: true });
const arqFilmes = join(saida, 'filmes.json');
const { existsSync, readFileSync } = await import('node:fs');
let listaFilmes;
if (existsSync(arqFilmes) && !process.argv.includes('--filmes')) {
  listaFilmes = JSON.parse(readFileSync(arqFilmes, 'utf8'));
  console.log('Reaproveitando', listaFilmes.length, 'filmes (use --filmes para baixar de novo)');
} else {
  listaFilmes = await filmes();
  await writeFile(arqFilmes, JSON.stringify(listaFilmes));
}
console.log(listaFilmes.length, 'filmes completos');
const lista = await perguntas(listaFilmes);
await writeFile(join(saida, 'perguntas.json'), JSON.stringify(lista));
console.log(lista.length, 'perguntas');
