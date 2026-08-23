# Tasks — Portadas de categoría con fondo gris uniforme

| | |
|---|---|
| **Spec** | `011-portadas-fondo-gris` |
| **Estado** | `DONE` |
| **Fecha** | 23/08/2026 |

---

## 1. Detección

- [x] **T-1** — Exportar `PORTADA_BG = '#F8F8F8'` desde
      `frontend/src/lib/portadas.js`.
- [x] **T-2** — Escribir `scripts/build-portadas.mjs`: recorre
      `frontend/public/stickers/<slug>/*.webp`, mide el anillo de borde con
      `magick` y decide elegibilidad (opaco + uniforme + neutro + claro).
- [x] **T-3** — Correrlo y generar `frontend/public/data/portadas.json`.
      Verificable: el archivo existe, tiene 54 claves y ninguna categoría sin
      elegibles aparece en él.
- [x] **T-3b** — Separar en dos niveles (`gris` / `liso`) y preferir el gris del
      catálogo. Salió de mirar la grilla armada: los fondos blanco puro dejaban
      ver el cuadrado del archivo contra el recuadro.

## 2. Elección

- [x] **T-4** — `portadaDe(slug, count, rotation, cover, portadas)`: con lista,
      elegir dentro de la lista; sin lista, comportamiento actual intacto.
- [x] **T-5** — `rotacionesSinRepetir()`: usar `portadas?.length || count` como
      cantidad de intentos y pasar la lista a `portadaDe`.

## 3. Transporte

- [x] **T-6** — `Categorias.jsx`: pedir `catalog.json` y `portadas.json` en
      paralelo y mezclarlos en el mapa `catalog`.
- [x] **T-7** — `Home.jsx`: lo mismo.
- [x] **T-8** — Pasar `portadas` como prop a `CategoryCard` desde los dos.

## 4. Card

- [x] **T-9** — `CategoryCard`: recuadro con `PORTADA_BG`, sin drop-shadow,
      contador legible sobre el fondo claro.

## 5. Tests

- [x] **T-10** — Tests de `portadaDe` con lista (siempre dentro de la lista, y
      lista de un solo elemento).
- [x] **T-11** — Test de `rotacionesSinRepetir` con `portadas.json` real.
- [x] **T-12** — Test de coherencia: todo índice de `portadas.json` cae dentro
      del `count` de su categoría en `catalog.json`.
- [x] **T-13** — `npm test` desde la raíz, en verde.

## 6. Documentación

- [x] **T-14** — Dejar dicho en `build-catalog.mjs` y en `build-portadas.mjs`
      que el pipeline del catálogo ahora tiene un paso más.
- [x] **T-15** — Recorrer `acceptance.md` punto por punto (`CLAUDE.md` regla 15).
