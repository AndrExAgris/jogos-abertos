# Licença dos bancos de conhecimento

`filmes.json` e parte de `perguntas.json` foram montados por `tools/dados/wikidata.mjs` a partir de consultas ao
[Wikidata](https://www.wikidata.org), cujos dados estão em domínio público (CC0). Essas perguntas são modelos
preenchidos com fatos (capitais, moedas, línguas oficiais, filmes e elenco, obras, bandas e álbuns, elementos
químicos, atletas premiados, Copas do Mundo, Patrimônios da UNESCO, laureados do Nobel, estados e cidades do Brasil).

As perguntas escritas à mão ficam em `tools/dados/curadas/*.txt` e são do próprio projeto (GPL-3.0-or-later, como o
código). As perguntas com imagem só apontam para um país: a bandeira vem do flag-icons (MIT) e o contorno do
Natural Earth (domínio público), já creditados em `CREDITS.md`.

`dicas-conhecimento.json` (dicas de palavras cruzadas) é gerado de `perguntas.json` por `tools/dados/banco.mjs`,
sob as mesmas condições.
