// Monta os bancos de palavras em data/palavras/ a partir de fontes abertas:
//  - pythonprobr/palavras (MPL-2.0): palavras válidas do português do Brasil
//  - Dicionário do teclado do Android, AOSP LatinIME pt_BR (Apache 2.0): frequência de uso
//  - Wikcionário em português, via kaikki.org/wiktextract (CC BY-SA): classe e definições
// Uso: node tools/dados/palavras.mjs [pasta-de-cache]
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGunzip, gunzipSync } from 'node:zlib';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cache = process.argv[2] ?? join(raiz, 'tools', 'dados', '.cache');
const saida = join(raiz, 'data', 'palavras');
const AGENTE = { 'User-Agent': 'jogos-abertos-dados/0.1 (projeto de codigo aberto)' };

async function baixar(url, arquivo) {
  const destino = join(cache, arquivo);
  if (existsSync(destino)) return destino;
  await mkdir(cache, { recursive: true });
  console.log('Baixando', url);
  const r = await fetch(url, { headers: AGENTE });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  let dados = Buffer.from(await r.arrayBuffer());
  if (url.includes('googlesource')) dados = Buffer.from(dados.toString(), 'base64');
  await writeFile(destino, dados);
  return destino;
}

const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const soLetras = (s) => /^[a-zà-üç]+$/i.test(s);

// Palavras que nunca entram como resposta ou dica, mesmo sem marca no Wikcionário.
const BLOQUEADAS = new Set(['porra', 'caralho', 'buceta', 'puta', 'puto', 'merda', 'cacete', 'piroca', 'viado', 'bicha', 'xoxota', 'foder', 'fodas', 'bosta', 'pinto', 'rola', 'cuzao', 'otario', 'babaca', 'vadia', 'macaco', 'crioulo', 'retardado', 'mongol', 'judiar']);
const ETIQUETAS_RUINS = ['vulgar', 'pejorative', 'offensive', 'derogatory', 'slur', 'obscene', 'chulo', 'pejorativo'];

const arqPalavras = await baixar('https://raw.githubusercontent.com/pythonprobr/palavras/master/palavras.txt', 'palavras.txt');
const arqFreq = await baixar('https://android.googlesource.com/platform/packages/inputmethods/LatinIME/+/refs/heads/main/dictionaries/pt_BR_wordlist.combined.gz?format=TEXT', 'pt_BR_wordlist.combined.gz');
const arqWikt = await baixar('https://kaikki.org/ptwiktionary/raw-wiktextract-data.jsonl.gz', 'wikt.jsonl.gz');

// 1. Palavras válidas (minúsculas: nomes próprios ficam de fora).
const validas = new Set();
const formaAcentuada = new Map(); // normalizada -> forma com acento mais comum
for await (const linha of createInterface({ input: createReadStream(arqPalavras) })) {
  const p = linha.trim();
  if (!p || p !== p.toLowerCase() || !soLetras(p)) continue;
  validas.add(p);
}
console.log(validas.size, 'palavras válidas');

// 2. Frequência (quanto maior, mais comum).
const freq = new Map();
const texto = gunzipSync(await (await import('node:fs/promises')).readFile(arqFreq)).toString();
for (const linha of texto.split('\n')) {
  const m = linha.match(/word=([^,]+),f=(\d+),flags=([^,]*)/);
  if (!m || m[3] === 'abbreviation') continue;
  const p = m[1];
  if (p !== p.toLowerCase() || !soLetras(p)) continue;
  freq.set(p, Math.max(freq.get(p) ?? 0, Number(m[2])));
}
console.log(freq.size, 'palavras com frequência');

// 3. Wikcionário: lemas (sentidos que não são "forma de"), etiquetas ruins e uma definição curta.
const lemas = new Set();
const formasWikt = new Set(); // todas as palavras e flexões do Wikcionário (para aceitar palpites)
const ruins = new Set();
const dicas = new Map();
const entrada = createReadStream(arqWikt).pipe(createGunzip());
for await (const linha of createInterface({ input: Readable.from(entrada) })) {
  if (!linha.includes('"lang_code": "pt"')) continue;
  const d = JSON.parse(linha);
  const p = d.word;
  if (!p || !soLetras(p) || p !== p.toLowerCase()) continue;
  formasWikt.add(p);
  for (const f of d.forms ?? []) if (f.form && soLetras(f.form) && f.form === f.form.toLowerCase()) formasWikt.add(f.form);
  if (!['noun', 'verb', 'adj', 'adv', 'num'].includes(d.pos)) continue;
  for (const s of d.senses ?? []) {
    const tags = [...(s.tags ?? []), ...(s.raw_tags ?? [])].map((t) => t.toLowerCase());
    if (tags.some((t) => ETIQUETAS_RUINS.some((r) => t.includes(r)))) { ruins.add(p); continue; }
    if (tags.includes('form-of') || s.form_of) continue;
    lemas.add(p);
    const g = s.glosses?.[0];
    if (!g || dicas.has(p)) continue;
    let dica = g.replace(/\([^)]*\)/g, '').split(/[;:]/)[0].replace(/\s+/g, ' ').trim().replace(/\.$/, '');
    const raizPalavra = sem(p).slice(0, Math.max(4, sem(p).length - 2));
    if (dica.length < 3 || dica.length > 70 || sem(dica).includes(raizPalavra)) continue;
    if (/^(relativo|pertencente|que se refere|forma|plural|feminino|masculino|variante|o mesmo que|ver )/i.test(dica)) continue;
    dicas.set(p, dica.charAt(0).toUpperCase() + dica.slice(1));
  }
}
console.log(lemas.size, 'lemas;', dicas.size, 'dicas;', ruins.size, 'marcadas como ofensivas/chulas');

const ok = (p) => validas.has(p) && !ruins.has(p) && !BLOQUEADAS.has(sem(p));
const porFrequencia = [...freq.entries()].filter(([p]) => ok(p)).sort((a, b) => b[1] - a[1]).map(([p]) => p);
for (const p of porFrequencia) { const n = sem(p); if (!formaAcentuada.has(n)) formaAcentuada.set(n, p); }

// Termo: respostas = lemas comuns de 5 letras; palpites = qualquer palavra válida de 5 letras.
const respostas = [];
const vistas = new Set();
for (const p of porFrequencia) {
  const n = sem(p);
  if (n.length !== 5 || !lemas.has(p) || vistas.has(n)) continue;
  vistas.add(n);
  respostas.push(p);
  if (respostas.length >= 2500) break;
}
// Palpites: tudo que alguma das fontes conhece (lista do pythonprobr, teclado do Android e Wikcionário com flexões).
const palpites = [...new Set([...validas, ...freq.keys(), ...formasWikt].map(sem).filter((n) => n.length === 5 && /^[a-z]+$/.test(n)))].sort();

// Roda de Letras: palavras comuns de 3 a 7 letras (sem acento) e as válidas para bônus.
const comuns = [];
const vistasR = new Set();
for (const p of porFrequencia.slice(0, 40000)) {
  const n = sem(p);
  if (n.length < 3 || n.length > 7 || vistasR.has(n) || !/^[a-z]+$/.test(n)) continue;
  vistasR.add(n);
  comuns.push(n);
}

// Cruzadas: palavras com dica, ordenadas por frequência (as comuns primeiro).
const comDica = [];
const vistasC = new Set();
for (const p of porFrequencia) {
  const n = sem(p);
  if (n.length < 3 || n.length > 10 || vistasC.has(n) || !dicas.has(p) || !/^[a-z]+$/.test(n)) continue;
  vistasC.add(n);
  comDica.push([n, dicas.get(p)]);
  if (comDica.length >= 30000) break;
}

await mkdir(saida, { recursive: true });
await writeFile(join(saida, 'termo.json'), JSON.stringify({ respostas, palpites }));
await writeFile(join(saida, 'roda.json'), JSON.stringify({ comuns }));
await writeFile(join(saida, 'dicas-cc-by-sa.json'), JSON.stringify(comDica));
console.log(`Termo: ${respostas.length} respostas, ${palpites.length} palpites. Roda: ${comuns.length} comuns. Cruzadas: ${comDica.length} palavras com dica.`);
