// Monta a base de países em data/paises/ a partir de fontes abertas:
//  - mledoze/countries (ODbL 1.0): códigos, nomes em português, vizinhos, região, área
//  - Wikidata (CC0): capital em português, coordenadas da capital, população
//  - Natural Earth 1:50m (domínio público): formas dos países
// Uso: node tools/dados/paises.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const saida = join(raiz, 'data', 'paises');
const AGENTE = { 'User-Agent': 'jogos-abertos-dados/0.1 (projeto de codigo aberto)' };

async function json(url, opcoes = {}) {
  const r = await fetch(url, { headers: AGENTE, ...opcoes });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function distanciaEdicao(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Ramer–Douglas–Peucker para simplificar os contornos.
function simplificar(pontos, tol) {
  if (pontos.length < 4) return pontos;
  const dist = (p, a, b) => {
    const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
    const dx = x2 - x1, dy = y2 - y1;
    const l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l)) : 0;
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
  };
  const rec = (ini, fim, res) => {
    let max = 0, idx = -1;
    for (let i = ini + 1; i < fim; i++) { const d = dist(pontos[i], pontos[ini], pontos[fim]); if (d > max) { max = d; idx = i; } }
    if (max > tol) { rec(ini, idx, res); res.push(pontos[idx]); rec(idx, fim, res); }
  };
  const res = [pontos[0]];
  rec(0, pontos.length - 1, res);
  res.push(pontos[pontos.length - 1]);
  return res;
}
const areaAnel = (a) => Math.abs(a.reduce((s, [x, y], i) => { const [x2, y2] = a[(i + 1) % a.length]; return s + x * y2 - x2 * y; }, 0) / 2);

console.log('Baixando mledoze/countries…');
const mledoze = await json('https://raw.githubusercontent.com/mledoze/countries/master/countries.json');
console.log('Consultando o Wikidata…');
const consulta = `SELECT ?iso ?capLabel ?coord ?pop WHERE { ?p wdt:P298 ?iso . OPTIONAL { ?p wdt:P36 ?cap . ?cap wdt:P625 ?coord . } OPTIONAL { ?p wdt:P1082 ?pop . } SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". } }`;
const wd = (await json(`https://query.wikidata.org/sparql?query=${encodeURIComponent(consulta)}`, { headers: { ...AGENTE, Accept: 'application/sparql-results+json' } })).results.bindings;
console.log('Baixando Natural Earth 1:50m…');
const ne = await json('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson');

const porIso = new Map();
for (const b of wd) {
  const iso = b.iso.value;
  const l = porIso.get(iso) ?? { capitais: [], pop: 0 };
  if (b.capLabel && b.coord) {
    const m = b.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (m) l.capitais.push({ nome: b.capLabel.value, lon: Number(m[1]), lat: Number(m[2]) });
  }
  if (b.pop) l.pop = Math.max(l.pop, Number(b.pop.value));
  porIso.set(iso, l);
}

const formasPorIso = new Map();
for (const f of ne.features) {
  const p = f.properties;
  const iso = p.ISO_A3 !== '-99' ? p.ISO_A3 : p.ADM0_A3;
  const g = f.geometry;
  const polis = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const aneis = polis.map((poli) => poli[0]);
  const maior = Math.max(...aneis.map(areaAnel));
  // Tolerância proporcional ao tamanho: países pequenos mantêm o contorno reconhecível.
  const xs = aneis.flat().map((q) => q[0]), ys = aneis.flat().map((q) => q[1]);
  const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const tol = Math.max(0.004, Math.min(0.04, diag / 250));
  // Ilhas muito pequenas somem (exceto se o país for só isso); e simplifica.
  const usados = aneis
    .filter((a) => areaAnel(a) >= maior * 0.01 || areaAnel(a) > 0.3)
    .map((a) => simplificar(a, tol).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]))
    .filter((a) => a.length >= 4);
  formasPorIso.set(iso, (formasPorIso.get(iso) ?? []).concat(usados));
}

// Nomes no português do Brasil (o mledoze usa o de Portugal) e capitais mais conhecidas.
const NOMES_BR = {
  ARM: 'Armênia', AZE: 'Azerbaijão', BLR: 'Bielorrússia', BWA: 'Botsuana', CZE: 'Tchéquia', SVN: 'Eslovênia', EST: 'Estônia',
  NLD: 'Países Baixos', YEM: 'Iêmen', TWN: 'Taiwan', IRN: 'Irã', LVA: 'Letônia', MKD: 'Macedônia do Norte', MDG: 'Madagascar',
  MWI: 'Malaui', MCO: 'Mônaco', PER: 'Peru', POL: 'Polônia', KEN: 'Quênia', ROU: 'Romênia', VCT: 'São Vicente e Granadinas',
  TTO: 'Trinidad e Tobago', VNM: 'Vietnã', ZWE: 'Zimbábue', DJI: 'Djibuti', MMR: 'Mianmar', VAT: 'Vaticano', SWZ: 'Essuatíni',
  COG: 'República do Congo', COD: 'República Democrática do Congo',
};
const CAPITAIS_BR = {
  GNQ: 'Malabo', BEL: 'Bruxelas', KIR: 'Tarawa', FSM: 'Palikir', MDA: 'Chisinau', BTN: 'Timbu', SWZ: 'Mbabane',
  AND: 'Andorra-a-Velha', TJK: 'Duchambé', KWT: 'Cidade do Kuwait', ISL: 'Reykjavik',
};
const APELIDOS = {
  NLD: ['Holanda'], BLR: ['Belarus'], MMR: ['Birmânia'], CZE: ['República Tcheca'], SWZ: ['Suazilândia'], MKD: ['Macedônia'],
  TWN: ['Formosa'], TLS: ['Timor Leste'], USA: ['EUA'], GBR: ['Inglaterra'], ARE: ['Emirados Árabes'], CIV: ['Costa do Marfim'],
  COG: ['Congo-Brazzaville'], COD: ['Congo', 'Congo-Kinshasa'], CPV: ['Cabo Verde'], BIH: ['Bósnia'], VAT: ['Cidade do Vaticano'],
};

const paises = [];
const formas = {};
for (const c of mledoze) {
  if (!c.independent && !['PSE', 'TWN', 'UNK'].includes(c.cca3)) continue;
  const nome = NOMES_BR[c.cca3] ?? c.translations?.por?.common ?? c.name.common;
  const info = porIso.get(c.cca3) ?? { capitais: [], pop: 0 };
  const capEn = sem(c.capital?.[0] ?? '');
  const capital = [...info.capitais].sort((a, b) => distanciaEdicao(sem(a.nome), capEn) - distanciaEdicao(sem(b.nome), capEn))[0];
  const forma = formasPorIso.get(c.cca3) ?? formasPorIso.get(c.cca3 === 'UNK' ? 'KOS' : '') ?? [];
  paises.push({
    id: c.cca3,
    iso2: c.cca2.toLowerCase(),
    nome,
    capital: CAPITAIS_BR[c.cca3] ?? capital?.nome ?? c.capital?.[0] ?? '',
    apelidos: APELIDOS[c.cca3] ?? [],
    capitalLatLon: capital ? [Math.round(capital.lat * 100) / 100, Math.round(capital.lon * 100) / 100] : c.latlng,
    latlon: c.latlng,
    regiao: c.region,
    subregiao: c.subregion,
    area: Math.round(c.area),
    populacao: info.pop,
    vizinhos: c.borders.filter((b) => mledoze.find((x) => x.cca3 === b && (x.independent || ['PSE', 'TWN', 'UNK'].includes(b)))),
    semLitoral: c.landlocked,
    temForma: forma.length > 0,
  });
  if (forma.length) formas[c.cca3] = forma;
}
paises.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

await mkdir(saida, { recursive: true });
await writeFile(join(saida, 'paises.json'), JSON.stringify(paises));
await writeFile(join(saida, 'formas.json'), JSON.stringify(formas));
console.log(`${paises.length} países; ${Object.keys(formas).length} com forma; sem capital: ${paises.filter((p) => !p.capital).map((p) => p.id).join(', ') || 'nenhum'}`);
