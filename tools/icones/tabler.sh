#!/bin/sh
# Copia para packages/ui/icones os ícones Tabler listados em packages/ui/icones/lista.txt.
# Uso: tools/icones/tabler.sh /caminho/para/open-design/icones/tabler
set -e
ORIGEM="${1:?informe a pasta icones/tabler do Open Design}"
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
DESTINO="$RAIZ/packages/ui/icones"
while read -r nome; do
  [ -z "$nome" ] && continue
  cp "$ORIGEM/outline/$nome.svg" "$DESTINO/outline/" || echo "falta: $nome"
  [ -f "$ORIGEM/filled/$nome.svg" ] && cp "$ORIGEM/filled/$nome.svg" "$DESTINO/filled/"
done < "$DESTINO/lista.txt"
echo "$(ls "$DESTINO/outline" | wc -l) ícones"
