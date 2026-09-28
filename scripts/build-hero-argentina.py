#!/usr/bin/env python3
"""
build-hero-argentina.py — las calcos del juego del hero (spec 028, ampliación D).

Toma los diseños de la categoría Argentina que YA tienen fondo transparente
(no se le saca el fondo a nada: un diseño con fondo blanco queda afuera) y
genera, para cada uno, una versión para el hero:
  · recortada al dibujo: los originales tienen 25-40 % de margen transparente,
    y pegada en el termo la calco se veía chiquita y con un borde invisible
    "agarrable" alrededor;
  · de 320 px de lado mayor (en el hero se ven a 150 px como mucho);
  · WebP con alfa.

Entrada : frontend/public/stickers/argentina/<n>.webp  (el catálogo)
Salida  : frontend/public/images/hero/argentina/<n>.webp
          frontend/src/lib/disenosHero.js              (lista con medidas)

Correrlo de nuevo cuando cambien los diseños de Argentina. Requiere Pillow:
    python3 -m venv .venv-img && .venv-img/bin/pip install pillow
    .venv-img/bin/python scripts/build-hero-argentina.py
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "frontend" / "public"
ENTRADA = PUBLIC / "stickers" / "argentina"
SALIDA = PUBLIC / "images" / "hero" / "argentina"
MODULO = ROOT / "frontend" / "src" / "lib" / "disenosHero.js"
CATALOGO = PUBLIC / "data" / "argentina.json"
LADO = 320
MARGEN = 6  # px de aire alrededor del dibujo, para la sombra


def transparente(im):
    return im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 250


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    en_catalogo = {p["file"] for p in json.loads(CATALOGO.read_text())}
    disenos = []
    for f in sorted(ENTRADA.glob("*.webp"), key=lambda p: int(p.stem)):
        if f"/stickers/argentina/{f.name}" not in en_catalogo:
            continue
        im = Image.open(f)
        if not transparente(im):
            continue
        im = im.convert("RGBA")
        caja = im.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox()
        im = im.crop(caja)
        im.thumbnail((LADO - 2 * MARGEN, LADO - 2 * MARGEN), Image.LANCZOS)
        lienzo = Image.new("RGBA", (im.width + 2 * MARGEN, im.height + 2 * MARGEN), (0, 0, 0, 0))
        lienzo.alpha_composite(im, (MARGEN, MARGEN))
        lienzo.save(SALIDA / f.name, "WEBP", quality=85, method=6, alpha_quality=90)
        disenos.append({"n": int(f.stem), "ancho": lienzo.width, "alto": lienzo.height})

    filas = ",\n".join(f"  {{ n: {d['n']}, ancho: {d['ancho']}, alto: {d['alto']} }}" for d in disenos)
    MODULO.write_text(
        "// ⚠️ GENERADO por scripts/build-hero-argentina.py — no editar a mano.\n"
        "// Los diseños de Argentina con fondo transparente, recortados para el hero\n"
        "// (spec 028, ampliación D). `n` es el número del producto:\n"
        "// /producto/argentina/<n>, y la imagen, /images/hero/argentina/<n>.webp.\n"
        f"export const DISENOS_HERO = [\n{filas}\n];\n"
    )
    peso = sum((SALIDA / f"{d['n']}.webp").stat().st_size for d in disenos)
    print(f"{len(disenos)} diseños · {peso // 1024} kB en total")


if __name__ == "__main__":
    main()
