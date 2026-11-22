# Licenças dos bancos de palavras

Gerados por `tools/dados/palavras.mjs`.

- `termo.json` e `roda.json`: listas derivadas de [pythonprobr/palavras](https://github.com/pythonprobr/palavras)
  (licença [MPL-2.0](https://www.mozilla.org/MPL/2.0/)), ordenadas pela frequência do dicionário do teclado
  do Android ([AOSP LatinIME](https://android.googlesource.com/platform/packages/inputmethods/LatinIME/),
  `pt_BR_wordlist.combined`, © The Android Open Source Project, licença Apache 2.0). Estas listas são
  distribuídas sob a MPL-2.0.
- `dicas-cc-by-sa.json`: definições encurtadas do [Wikcionário](https://pt.wiktionary.org) em português,
  extraídas pelo [Wiktextract](https://github.com/tatuylonen/wiktextract) ([kaikki.org](https://kaikki.org/ptwiktionary/)).
  Texto dos colaboradores do Wikcionário, licença [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/);
  este arquivo, modificado (dicas encurtadas), segue sob a mesma licença.
