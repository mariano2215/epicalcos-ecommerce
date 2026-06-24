#!/usr/bin/env bash
#
# import-stickers.sh
# Materializa (desde iCloud) + redimensiona + convierte a webp las imágenes del
# catálogo de EPICALCOS, copiándolas a frontend/public/stickers/<categoria>/<n>.webp
#
# - Lee de la carpeta iCloud (placeholders dataless → leerlas con cwebp las baja).
# - Salida ~600px de ancho, webp q82 (~18 KB/img).
# - Paralelo (-P 8) y resumible: salta los .webp que ya existen.
#
# Uso:
#   scripts/import-stickers.sh             # todas las categorías
#   scripts/import-stickers.sh pride space # solo algunas (para probar)
#
set -uo pipefail

SRC="/Users/marianocalandra/Library/Mobile Documents/com~apple~CloudDocs/Documents/Mariano/EPICALCOS/Stickers PNG para ClaudeCode"
DEST="/Users/marianocalandra/Documents/Mariano/epicalcos-ecommerce/frontend/public/stickers"
QUALITY=82
WIDTH=600
JOBS=8

if ! command -v cwebp >/dev/null 2>&1; then
  echo "ERROR: cwebp no está instalado (brew install webp)." >&2
  exit 1
fi

# Categorías: argumentos, o todas las subcarpetas del origen
if [ "$#" -gt 0 ]; then
  CATS=("$@")
else
  CATS=()
  while IFS= read -r d; do
    CATS+=("$(basename "$d")")
  done < <(find "$SRC" -mindepth 1 -maxdepth 1 -type d | sort)
fi

mkdir -p "$DEST"
total_done=0

for cat in "${CATS[@]}"; do
  in_dir="$SRC/$cat"
  out_dir="$DEST/$cat"
  if [ ! -d "$in_dir" ]; then
    echo "SKIP: no existe categoría '$cat'" >&2
    continue
  fi
  mkdir -p "$out_dir"
  echo "==> $cat"

  # Lista de imágenes de la categoría (jpg/jpeg/png/webp), procesadas en paralelo.
  find "$in_dir" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) -print0 \
    | xargs -0 -P "$JOBS" -I {} bash -c '
        src="$1"; out_dir="$2"; q="$3"; w="$4"
        base="$(basename "$src")"
        stem="${base%.*}"
        out="$out_dir/$stem.webp"
        if [ -s "$out" ]; then exit 0; fi
        cwebp -quiet -q "$q" -resize "$w" 0 "$src" -o "$out" 2>/dev/null
      ' _ {} "$out_dir" "$QUALITY" "$WIDTH"

  n="$(find "$out_dir" -maxdepth 1 -type f -iname '*.webp' | wc -l | tr -d ' ')"
  echo "    $n webp en $cat"
  total_done=$((total_done + n))
done

echo "LISTO. Total webp generados: $total_done"
echo "Destino: $DEST"
