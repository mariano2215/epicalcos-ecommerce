# Design — Segundo lote del catálogo

| | |
|---|---|
| **Spec** | `016-catalogo-lote-2` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 04/09/2026 |

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí y no.** `import-catalogo-completo.mjs` tiene toda la maquinaria buena (conversión, pool de concurrencia, deduplicado por contenido) pero es un **reemplazo**: `rmSync(DEST_BASE)` antes de escribir. `topup-catalogo.mjs` sí es append-only (`next = max(existentes) + 1`) pero está cableado a un origen y a un incidente puntual de 2026. Ninguno sirve tal cual. |
| ¿Qué archivos toca? | `scripts/` (importador nuevo + `build-meta-feed.mjs`), `frontend/src/data/categories.js`, `frontend/public/stickers/**`, `frontend/public/data/**`, `frontend/src/data/catalogStats.js`, `frontend/public/data/aliases.json`. |
| ¿Tests hoy? | `catalogStats.test.js` (CATEGORY_COUNT), `portadas.test.js` (coherencia de índices), `searchCatalog.test.js` y `sugerencias.test.js` (leen `catalog.json` y `aliases.json` reales). Todos se ven afectados por el lote. |
| ¿Toca el camino de precios? | **No.** Ni `config/pricing.js` ni su espejo. Los diseños nuevos se cotizan con las mismas reglas por tamaño. |
| ¿El origen está en disco? | **No**: los 3.463 originales son *dataless* en iCloud (0 bloques). Hay que leerlos para materializarlos. |

### Lo que el código ya dejó escrito y manda acá

| De dónde | Qué dice | Cómo se respeta |
|---|---|---|
| `import-catalogo-completo.mjs` | *"Deduplica DENTRO de cada categoría por contenido, no por nombre: md5 exacto + dHash + firma de color"*, con umbrales medidos (dHash ≤ 2 **y** color ≤ 8) | Se **reutilizan esas funciones**, no se reescriben. Ver §2 |
| ídem | *"no se deduplica ENTRE categorías: el mismo diseño puede estar en dos categorías temáticas a propósito"* | Se mantiene. Las 321 repeticiones de nombre entre carpetas del lote nuevo son eso |
| ídem | *"Sólo cuando se invoca directamente… un `import` no tiene por qué disparar un reimport"* | Gracias a esa guarda el importador nuevo **puede importarlo** sin efectos |
| `build-catalog.mjs` | *"Preservar sku/stock ya asignados… un rebuild NO debe borrar ni renumerar SKUs"* | Es lo que hace segura la regeneración después de agregar |
| `build-portadas.mjs` / memoria | *"Si se reemplaza el catálogo y no se corre este script, los índices apuntan a otros dibujos"* | Se corre siempre al final, y el test lo verifica |
| memoria del pipeline | *"iCloud se ahoga con paralelismo alto… con 3 va a ~2,3 archivos/s"* | El materializador usa concurrencia 3 |

---

## 1. `scripts/import-lote.mjs` (nuevo)

Importador **append-only y resumible**. Deliberadamente un archivo aparte y no
un flag de `import-catalogo-completo.mjs`: ese script se llama "completo" porque
BORRA, y meterle un modo "no borres" es la clase de flag que algún día se
ejecuta con el valor por defecto equivocado sobre 6.500 diseños.

```
node scripts/import-lote.mjs [--dry] [--solo <slug>]
```

### Pasos

1. **Inventario** del origen, aplicando `CARPETAS_LOTE2` (§3).
2. **Materialización**: lee los originales de iCloud con concurrencia 3.
3. **Conversión** a webp 600 px q82 en un cache (`.cache/lote2-webp/`), con el
   fallback CMYK `sips → png → cwebp` que ya usa `topup-catalogo.mjs`. El cache
   hace el proceso resumible: una segunda corrida no reconvierte nada.
4. **Huellas** (md5 + dHash + firma de color) de:
   - los candidatos nuevos, y
   - **los `.webp` ya publicados de las categorías destino** ← esto es lo que
     `topup-catalogo.mjs` no hacía y por lo que no alcanzaba.
5. **Descarte** de un candidato si empata con un publicado o con otro candidato
   ya aceptado de la MISMA categoría.
6. **Append**: `next = max(número de los .webp existentes) + 1`.
7. **`categories.js`**: agrega las categorías nuevas al array `CATEGORIES`
   **fusionando**, nunca reemplazando (§4).

### Por qué el orden importa

El deduplicado va **después** de convertir a webp y **sobre el webp**, no sobre
el original: el comentario de `import-catalogo-completo.mjs` lo explica — sin
`-trim`, el mismo dibujo con distinto margen da huellas distintas. Comparar un
JPG de 1000 px del origen contra un webp de 600 px publicado sólo funciona si
los dos pasan por la misma normalización.

---

## 2. Reutilizar el deduplicado, no copiarlo

`import-catalogo-completo.mjs` ya tiene `dHash`, `firmaColor`, `distColor`,
`hamming` y los umbrales, con los números medidos sobre el catálogo real
anotados al lado. **Se les agrega `export` y se importan.** No se copian:
duplicar 60 líneas de lógica calibrada garantiza que dentro de seis meses una
copia esté afinada y la otra no.

Es el cambio más chico que permite que los dos importadores decidan
"¿es el mismo diseño?" con exactamente el mismo criterio.

---

## 3. El mapa `CARPETAS_LOTE2`

Vive en el script nuevo, con la misma forma que `CARPETAS`:
`carpeta → { slug, name, emoji }`. Las carpetas que caen en una categoría que ya
existe llevan sólo el slug; el `name`/`emoji` de esas ya está en `categories.js`
y no se toca.

⚠️ **Dos carpetas pueden apuntar al mismo slug** (`CARA-SONRIENTE` y
`SMILEY-FACE` → `caras-sonrientes`; `TAYLOR-SWIFT` y `ERAS-TOUR` →
`taylor-swift`). El importador las procesa como una sola cola por slug, para que
el deduplicado las vea juntas — si no, el mismo diseño entraría dos veces.

### Categorías nuevas

| slug | name | emoji |
|---|---|---|
| `arte` | Arte | 🖼️ |
| `aura` | Aura | 🔮 |
| `bad-bunny` | Bad Bunny | 🐰 |
| `lord-of-the-rings` | El Señor de los Anillos | 💍 |
| `moda` | Moda | 👗 |
| `pixar` | Pixar | 💡 |
| `rey-leon` | El Rey León | 🦁 |
| `shrek` | Shrek | 🧅 |
| `tarot` | Tarot | 🃏 |
| `verano` | Verano | 🌴 |
| `weed` | Weed | 🍃 |

El slug es la URL pública y la clave de los SKUs: una vez elegido no se cambia.
Se usa el inglés donde la marca es inglesa (`lord-of-the-rings`), igual que
`breaking-bad` y `stranger-things`, y el nombre de vidriera va en español, que
es como se busca acá.

---

## 4. `categories.js`: fusionar, no reemplazar

`escribirCategories()` de `import-catalogo-completo.mjs` reescribe el array
entero desde su `CARPETAS`. Si el importador nuevo hiciera lo mismo desde el
suyo, **borraría las 61 categorías del primer lote**.

El importador nuevo por lo tanto:
1. lee el array actual entre sus marcas,
2. le agrega las categorías nuevas que falten,
3. lo reescribe ordenado alfabéticamente por nombre.

⚠️ **La trampa que queda abierta**: `import-catalogo-completo.mjs` sigue
reescribiendo desde SU mapa, que no conoce estas 11. Correrlo de nuevo las
borraría de `categories.js` (y borraría sus `.webp`, que es peor). Se le agrega
una advertencia arriba de `CARPETAS` diciendo exactamente eso.

---

## 5. `weed` fuera del feed de Meta

`build-meta-feed.mjs` hoy no tiene forma de excluir nada: recorre `catalog.json`
y le asigna SKU a todo. Se le agrega una constante:

```js
/** Categorías que NO van al catálogo de Meta (política de comercio). */
const SIN_FEED = new Set(['weed']);
```

Las categorías de `SIN_FEED`:
- **no consumen SKU** del registro append-only, y
- **no salen en `meta-catalog.csv`**.

Sus diseños quedan sin `sku` en `data/weed.json`. Eso ya está contemplado en el
front: `contentId()` de `analytics.js` cae al id interno cuando no hay
`catalogSku`. El Píxel manda un id que Meta no conoce — que es exactamente lo
correcto para un producto que no está en el catálogo.

---

## 6. Alias de búsqueda

Sin alias, una categoría nueva sólo se encuentra escribiendo su nombre exacto.
Se agregan a `frontend/public/data/aliases.json`, incluyendo los términos con
los que se busca de verdad: "señor de los anillos", "lotr", "frodo", "gandalf";
"porro", "maria", "cannabis"; "conejo malo", "un verano sin ti"; "cartas",
"astrologia"; "simba", "timon", "hakuna matata"; "toy story", "up", "coco"…

---

## 7. Manejo de errores

- Original que no baja: se cuenta y se reporta al final; no se escribe un webp vacío.
- `cwebp` que falla: fallback `sips`; si también falla, se descarta y se reporta.
- El cache de webp hace que un corte a la mitad no cueste el trabajo hecho.
- `--dry` reporta el plan completo sin escribir nada.

---

## 8. Migración y orden de ejecución

```bash
node scripts/import-lote.mjs --dry     # revisar el plan
node scripts/import-lote.mjs
node scripts/build-catalog.mjs
node scripts/build-duplicados.mjs
node scripts/build-portadas.mjs        # ~6 min con el catálogo duplicado
node scripts/build-meta-feed.mjs
npm test
```

No hay migración de datos: los carritos guardados referencian
`sticker:<slug>:<n>:<size>` y ningún `<slug>:<n>` existente cambia de dibujo.

---

## 9. Tests nuevos

| Archivo | Qué verifica |
|---|---|
| `lib/catalogoLote2.test.js` | Las 11 categorías nuevas existen en `CATEGORIES`, en `catalog.json` y tienen `.webp`; sus slugs son únicos y en minúscula-guiones; cada una tiene alias que la encuentran vía `searchCatalog` |
| ídem | `weed` **no** aparece en `meta-catalog.csv` ni tiene SKU asignado |
| ídem | Ninguna categoría del feed perdió su SKU (el registro sigue siendo append-only) |

Los tests existentes que ya cubren esto y tienen que seguir en verde:
`catalogStats.test.js` (CATEGORY_COUNT), `portadas.test.js` (coherencia de
índices — el que caza el error más caro), `searchCatalog.test.js`.
