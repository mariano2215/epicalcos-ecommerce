# Design — Catálogo con nombre, escala y colecciones

## 0. Hallazgos del discovery
- Catálogo en JSON estáticos `public/data/<categoria>.json` + `catalog.json`
  (docs/database.md §2), regenerados por `import-catalogo-completo.mjs`.
- SKUs estables y append-only en `skus.json` (feed de Meta): **no renumerar**.
- `config/landings.js` + `routes/LandingUso.jsx` ya arman `/calcos-termo` y
  `/calcos-notebook`.
- `FeaturedStickers.jsx` arma el nombre como `${categoria} #${n}`.

## 1. Arquitectura propuesta

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** `data/nombres.json` `{ "argentina-1": "Aconcagua 6960" }` aparte del catálogo | campo en cada `<categoria>.json` | el import regenera esos archivos y pisaría los nombres |
| **D-2** `nombreDe(id)` en `data/categories.js` con respaldo al `#n` | cambiar todos los componentes | un solo lugar |
| **D-3** Colecciones como entradas nuevas en `config/landings.js` | rutas nuevas | ya existe la plantilla |
| **D-4** Fotos de escala en `public/images/escala/{tamano}-{objeto}.webp` | Cloudinary | son 6 archivos fijos |

## 2. Componentes afectados
- `data/categories.js`, `StickerCard.jsx`, `routes/Producto.jsx`, `CartContext`
  (nombre de la línea: ⚠️ 30 importadores, solo cambia el texto), feed de Meta
  (`build-meta-feed.mjs`: título).
- `routes/Category.jsx` (buscador), `routes/Categorias.jsx` (umbral de 12).

## 3. Datos
Las líneas guardadas en `localStorage` conservan su `name` viejo: es solo texto.

## 9. Testing
`nombreDe` con y sin nombre; el feed de Meta mantiene los SKUs.

## 10. Dependencias nuevas
Ninguna.
