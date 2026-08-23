# Design — Portadas de categoría con fondo gris uniforme

| | |
|---|---|
| **Spec** | `011-portadas-fondo-gris` |
| **Estado** | `DONE` |
| **Fecha** | 23/08/2026 |

> **Este documento define CÓMO se implementa.** El QUÉ está en
> `requirements.md`.

---

## 1. Discovery

### 1.1 Qué hay hoy

| Archivo | Rol |
|---|---|
| `frontend/src/lib/portadas.js` | `portadaDe()` elige el diseño; `rotacionesSinRepetir()` reparte las rotaciones para que no se repitan |
| `frontend/src/components/CategoryCard.jsx` | pinta la card y hace el crossfade al rotar |
| `frontend/src/routes/Home.jsx` | 10 destacadas; rota al volver a entrar en viewport |
| `frontend/src/routes/Categorias.jsx` | grilla completa; semilla nueva por visita |
| `frontend/public/data/catalog.json` | `[{ slug, count, cover }]` — lo escribe `scripts/build-catalog.mjs` |
| `frontend/public/data/duplicados.json` | dibujos repetidos en dos carpetas — `scripts/build-duplicados.mjs` |
| `frontend/src/lib/portadas.test.js` | 9 tests de determinismo y no-repetición |

`portadaDe()` hoy hace `((hash(slug) + rotation) % count) + 1` y devuelve
`/stickers/<slug>/<n>.webp`: **puede caer en cualquier diseño de la carpeta**.

### 1.2 Por qué no alcanza con mirar la extensión del archivo original

`scripts/import-catalogo-completo.mjs` convierte todo a `.webp` y **renumera
1..N** después de deduplicar. El `N.webp` que queda en `public/stickers/` no
guarda de qué extensión venía, y los originales viven en iCloud como archivos
*dataless*: volver a leerlos para saberlo es justamente lo caro del pipeline.

→ La elegibilidad se detecta **por píxeles, sobre el `.webp` ya publicado**, y se
deja escrita en un JSON que se commitea. Netlify no corre estos scripts en el
build (`netlify.toml` solo hace `npm test` + `vite build`), así que el dato
tiene que estar en el repo, igual que `catalog.json` y `duplicados.json`.

### 1.3 Medición sobre el catálogo actual

3.397 diseños escaneados:

- **1.130 tienen fondo liso y claro**, en **54 de 61** categorías.
- De esos, **967 están en el gris del catálogo** (`rgb(248,248,248)` ± 4). El
  resto son blanco puro o gris bastante más oscuro: sobre el recuadro se les ve
  el cuadrado del archivo, así que quedan de **reserva** y no de primera opción
  (§3).
- **50 categorías se resuelven con el gris exacto.** Las otras 4 —`aesthetic`,
  `gamer`, `newells-old-boys`, `racing`— no tienen ninguno en ese tono y van con
  el fondo liso claro que tengan.
- **7 categorías no tienen ninguno de los dos**: `animales` (2 diseños),
  `clubes-rosario` (8), `formula-1` (19), `hockey` (1), `rosa` (5),
  `stranger-things` (4), `the-office` (19). Son 100 % PNG transparente en la
  carpeta fuente.

Para esas 7 el gris lo pone la card (decisión de Mariano). Como el recuadro de
la portada pasa a ser `#F8F8F8` para **todas**, el recorte transparente se apoya
sobre el mismo gris que traen los `.jpg` adentro: el resultado se ve igual.

---

## 2. Arquitectura

```
scripts/build-portadas.mjs                    (nuevo, corre a mano)
   │  magick: borde opaco + uniforme + neutro claro
   ▼
frontend/public/data/portadas.json            (nuevo, se commitea)
   │  { "<slug>": [n, n, …] }
   ▼
Home.jsx / Categorias.jsx                     (fetch en paralelo con catalog.json)
   │  catalog[slug] = { count, cover, portadas }
   ▼
rotacionesSinRepetir() → portadaDe()          (eligen dentro de `portadas`)
   ▼
CategoryCard                                  (recuadro #F8F8F8, sin drop-shadow)
```

El tono gris vive en **un solo lugar**: `PORTADA_BG` exportado por
`frontend/src/lib/portadas.js`. Lo importan el script de detección (para saber
qué buscar) y la card (para pintar el recuadro). Si alguna vez cambia el gris
del catálogo, se cambia ahí y las dos puntas quedan de acuerdo.

---

## 3. Detección (`scripts/build-portadas.mjs`)

Por cada `.webp` de `frontend/public/stickers/<slug>/`:

```
magick <archivo> -resize 64x64! -depth 8 txt:-
```

Un solo proceso por imagen. Del volcado se toma **el anillo de borde** (las
cuatro filas/columnas exteriores, 252 píxeles) y se decide:

| Criterio | Umbral | Por qué |
|---|---|---|
| Opacidad | alfa ≥ 250 en todo el anillo | un solo píxel transparente ya delata el recorte |
| Uniformidad | desvío estándar ≤ 3 por canal | descarta los que tienen dibujo pegado al borde |
| Neutro | `max(r,g,b) − min(r,g,b) ≤ 6` | descarta fondos de color |
| Claro | promedio ≥ 223 | descarta fondos oscuros uniformes |

Los que pasan los cuatro se separan en **dos niveles**:

| Nivel | Condición | Uso |
|---|---|---|
| `gris` | promedio a ± 4 de `PORTADA_BG` | el que se usa |
| `liso` | el resto de los que pasaron | reserva, solo si la categoría no tiene ni un `gris` |

El nivel existe porque en el catálogo también hay fondos lisos **blancos puros**
(255). Contra el recuadro `#F8F8F8` de la card se les nota el cuadrado: sirven
para que una categoría no se quede sin portada, no para elegirlos habiendo gris.

Se resuelve sobre 64×64 y no sobre el original: alcanza para el borde, y con
3.400 imágenes la diferencia es entre ~3 minutos y bastante más.

**Salida**: `frontend/public/data/portadas.json`, un objeto
`{ [slug]: [índices ordenados] }`. Las categorías sin ningún elegible **no
aparecen** en el objeto — así el consumidor no distingue "no hay dato" de "no
hay ninguno", y en los dos casos hace lo mismo: elegir entre todos.

Tamaño: 3,6 KB en crudo, 1,4 KB gzip.

El script es idempotente y no depende de iCloud: lee lo que ya está publicado.
Hay que correrlo **después** de `import-catalogo-completo.mjs` +
`build-catalog.mjs`, junto con `build-duplicados.mjs`.

---

## 4. Elección (`frontend/src/lib/portadas.js`)

```js
export const PORTADA_BG = '#F8F8F8';

export function portadaDe(slug, count, rotation = 0, cover, portadas)
```

- Con `portadas` (lista de índices): el módulo se hace sobre **el largo de la
  lista** y el índice se lee de la lista.
  `lista[(hash + rotation) % lista.length]`.
- Sin `portadas`: exactamente lo de hoy (`((hash + rotation) % count) + 1`).
- Con `portadas` de un solo elemento: devuelve ese, sin rotar.

`rotacionesSinRepetir()` recibe el mismo `counts` de siempre, ahora con
`portadas` adentro de cada entrada. Lo único que cambia es **cuántas opciones
tiene para probar**: antes `count`, ahora `portadas?.length || count`. El resto
del algoritmo (correr la rotación hasta encontrar un dibujo libre, colapsando
duplicados) queda igual.

Se agrega un quinto parámetro en vez de cambiar la firma a un objeto para no
tocar los otros llamadores ni los 9 tests que ya existen (`CLAUDE.md` regla 8).

---

## 5. Transporte (`Home.jsx`, `Categorias.jsx`)

Los dos hacen hoy `fetch('/data/catalog.json')` y arman
`{ [slug]: { count, cover } }`. Pasan a pedir **los dos JSON en paralelo** y a
mezclarlos en ese mismo mapa:

```js
Promise.all([
  fetch('/data/catalog.json').then((r) => (r.ok ? r.json() : [])),
  fetch('/data/portadas.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
])
```

Dos motivos para mezclarlo en el mapa existente y no llevarlo en un estado
aparte:

1. **No hay parpadeo.** Las cards ya no se pintan hasta que llega
   `catalog.json`; si `portadas` llegara después en otro estado, la primera
   pintada sería con el diseño viejo y saltaría al bueno.
2. `counts` es la estructura que ya viaja a `searchCatalog`, a
   `rotacionesSinRepetir` y a la card. Un campo más ahí no obliga a cambiar
   ninguna firma.

Si `portadas.json` no está, el `.catch()` devuelve `{}` y la grilla se comporta
como hoy (RF-8).

`Hero.jsx` y `PackBuilder.jsx` también leen `catalog.json` pero **no pintan
portadas de categoría** — no se tocan (regla 8).

---

## 6. Card (`frontend/src/components/CategoryCard.jsx`)

| Antes | Ahora | Por qué |
|---|---|---|
| `bg-white/[0.03]` en el recuadro | `style={{ background: PORTADA_BG }}` | el `.jpg` trae ese mismo gris adentro: el borde del cuadrado desaparece y el calco queda flotando sobre gris |
| `drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]` | sin drop-shadow | sobre gris, la sombra de una imagen **opaca** dibuja el contorno del cuadrado y delata el recorte del archivo |
| `badge badge-soft` en el contador | `badge` + `bg-black/55` | `badge-soft` es blanco sobre blanco translúcido: sobre el gris no se leía (RF-7) |

Se mantienen: el `aspect-square` con `width`/`height` de 320 (CLS), el `p-4`, el
`object-contain`, el crossfade con precarga y el `onError` que cae a `cover`.

El `group-hover:scale-110` sigue: sobre el recuadro gris, el `.jpg` agranda su
propio fondo gris (invisible) y el dibujo crece. El efecto queda igual o mejor.

---

## 7. Datos

Ningún cambio de forma en `catalog.json`, `duplicados.json` ni `localStorage`.
El archivo nuevo es aditivo.

---

## 8. Tests

En `frontend/src/lib/portadas.test.js`:

- `portadaDe` con lista devuelve **siempre** un archivo de la lista, para
  cualquier rotación.
- `portadaDe` con lista de un elemento devuelve ese, rote lo que rote.
- `portadaDe` sin lista se comporta como antes (los tests actuales lo cubren).
- `rotacionesSinRepetir` respeta la lista para todas las categorías que la
  tengan, sobre `portadas.json` real y varias semillas.
- Coherencia del dato: todo índice de `portadas.json` está dentro del `count` de
  esa categoría en `catalog.json`. Es la red que avisa si se reemplaza el
  catálogo y no se vuelve a correr el script.

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Se reemplaza el catálogo y no se corre `build-portadas.mjs` | el test de coherencia falla y **corta el deploy** (`npm test` está en el build) |
| El umbral deja pasar un fondo que no es gris | los 4 criterios se validaron a ojo sobre las 61 portadas resultantes antes de implementar |
| Una categoría queda con pocas portadas y repite más seguido | aceptado: la uniformidad se pidió explícitamente por encima de la variedad |
| Un `.jpg` con fondo 255 o 239 deja ver el cuadrado contra el `#F8F8F8` | esos quedan en el nivel `liso`: solo salen en las 4 categorías que no tienen ninguno en el gris exacto |

---

## 10. Migración

No hay. Es un cambio de presentación: no hay datos que migrar ni carritos que
contemplar. El deploy es un push a `main`.
