#!/usr/bin/env python3
"""
build-cutouts.py
Genera versiones recortadas (PNG con transparencia) de las portadas de cada
categoría para usarlas como "motion graphics" flotantes en el Hero.

Entrada : frontend/public/data/catalog.json  (cover por categoría)
Salida  : frontend/public/stickers-cutout/<slug>.png   (sticker troquelado, sin fondo)
          frontend/public/data/cutouts.json             (lista de URLs generadas)

Usa rembg (segmentación) para quitar el fondo blanco/cuadrado y dejar solo el
contorno del sticker. Requiere un entorno con rembg instalado, p. ej.:
    python3 -m venv .venv-rembg && .venv-rembg/bin/pip install "rembg[cli]" onnxruntime pillow
    .venv-rembg/bin/python scripts/build-cutouts.py
"""
import json
import os
import sys
from pathlib import Path

from PIL import Image
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "frontend" / "public"
CATALOG = PUBLIC / "data" / "catalog.json"
OUT_DIR = PUBLIC / "stickers-cutout"
MANIFEST = PUBLIC / "data" / "cutouts.json"
MAX_SIDE = 420  # tamaño decorativo; el Hero las muestra chiquitas

def main():
    if not CATALOG.exists():
        sys.exit(f"No existe {CATALOG} — corré antes build-catalog.mjs")
    catalog = json.loads(CATALOG.read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = new_session("u2net")

    urls = []
    for entry in catalog:
        slug = entry["slug"]
        cover_rel = entry["cover"].lstrip("/")  # stickers/<slug>/1.webp
        src = PUBLIC / cover_rel
        if not src.exists():
            print("skip (no cover):", slug)
            continue
        img = Image.open(src).convert("RGBA")
        cut = remove(img, session=session, post_process_mask=True)
        # Recorta el margen transparente para que quede ajustado al sticker
        bbox = cut.getbbox()
        if bbox:
            cut = cut.crop(bbox)
        # Escala a un lado máximo razonable
        cut.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        out = OUT_DIR / f"{slug}.png"
        cut.save(out, optimize=True)
        urls.append(f"/stickers-cutout/{slug}.png")
        print("ok", slug, cut.size)

    MANIFEST.write_text(json.dumps(urls))
    print(f"\ncutouts.json -> {len(urls)} PNG transparentes")

if __name__ == "__main__":
    main()
