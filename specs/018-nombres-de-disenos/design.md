# Design — Nombres para los 6.757 diseños

| | |
|---|---|
| **Spec** | `018-nombres-de-disenos` |
| **Estado** | `DRAFT` |
| **Requirements** | [`requirements.md`](requirements.md) |

---

## 0. Hallazgos del discovery

### H-1 — El manifest YA soporta metadata por diseño

[`Producto.jsx:82`](../../frontend/src/routes/Producto.jsx) lee un campo
opcional que hoy nadie llena:

```js
description: raw.description || null,
```

El comentario del archivo lo dice: *"lee campos opcionales `images` y
`description` por si en el futuro se suman más fotos y texto por diseño"*. El
lugar donde poner el nombre ya estaba previsto.

### H-2 — El nombre se arma en 5 lugares con la misma plantilla

```
Producto.jsx:81, 95     `${category.name} #${n}`
Category.jsx:55, 84     `${category.name} #${...}`
FeaturedStickers.jsx:53 `${categoryName(slug)} #${...}`
```

Cinco copias de la misma línea. **Se centraliza en un helper** antes de tocar
nada: si el fallback queda escrito cinco veces, un diseño sin nombre se va a ver
distinto en cada pantalla.

### H-3 — `build-catalog.mjs` ya sabe preservar campos

Relee el manifest anterior y conserva `sku`/`stock` para no romper el catálogo
de Meta. **`name` entra por la misma puerta** — una línea más en el mismo
bloque, no un mecanismo nuevo.

### H-4 — El buscador global devuelve CATEGORÍAS, no diseños

[`searchCatalog.js:70`](../../frontend/src/lib/searchCatalog.js) puntúa nombre +
slug + alias de categoría. Que "Goku" lleve al diseño es **fase 2** (§8).

### H-5 — El buscador DENTRO de la categoría ya filtra por nombre

[`Category.jsx:59`](../../frontend/src/routes/Category.jsx):

```js
return mapped.filter((s) => s.name.toLowerCase().includes(term) || s.id.includes(term));
```

Hoy `s.name` es `"Anime #4"`, así que filtrar sirve para buscar por número.
**Con nombres reales esto empieza a funcionar sin tocar una línea.**

### H-6 — El feed arma título y descripción a mano

[`build-meta-feed.mjs:142`](../../scripts/build-meta-feed.mjs):

```js
title: `${name} · Calco #${num}`,
description: `Calco premium de ${name}. Vinilo resistente...`,   // idéntica en las 6.680 filas
```

---

## 1. Calibración: nombres reales sobre diseños reales

Muestra mirada durante el discovery. **No es una simulación**: son siete
archivos del catálogo y el nombre que les pondría el criterio de RF-2.

| Archivo | Qué se ve | Nombre propuesto | Regla |
|---|---|---|---|
| `frases/25` | tipografía retro multicolor | **Positive energy** | texto = nombre |
| `frases/60` | tipografía amarilla con sombra | **Choose happy** | texto = nombre |
| `frases/1` | monigote con dos "peace" en alto | **Monigote dos peace** | ⚠️ NO es una frase |
| `anime/4` | Majin Buu con el pulgar arriba | **Majin Buu pulgar arriba** | personaje |
| `anime/50` | Mudkip con botella + "DRINK MORE WATER!" | **Mudkip drink more water** | personaje + texto |
| `pixar/1` | Sulley y Boo en trazo de crayón | **Sulley y Boo en crayón** | personaje + estilo |
| `aura/1` | silueta de brazos abiertos en capas de color | **Aura arcoíris figura abierta** | descriptivo |

**Lo que enseña la muestra**: `frases/1` no es una frase. Las carpetas **no son
homogéneas**, así que el prompt no puede asumir el tipo por la categoría — tiene
que mirar. Es la razón de ser del piloto.

---

## 2. Arquitectura

```
scripts/nombrar-disenos.mjs
   │  lee /data/<slug>.json (los que no tengan `name`)
   │  arma lotes de 15 imágenes
   ▼
Claude API (fetch, sin SDK)
   │  system prompt = las reglas de RF-2/RF-3
   ▼
/data/nombres.json          ← registro append-only, la fuente de verdad
   │
   ├─► build-catalog.mjs    → mete `name` en /data/<slug>.json
   └─► build-meta-feed.mjs  → title + description del feed
```

### Por qué un registro aparte y no escribir el manifest directo

`/data/nombres.json` es `{ "anime-4": "Majin Buu pulgar arriba", ... }`.

**Mismo criterio que `skus.json`**: los manifests son **generados** y
`build-catalog` los pisa entero cada vez que se corre. Un nombre escrito
directo ahí se perdería en el próximo lote de catálogo — que es exactamente lo
que casi pasa con los SKUs y por lo que existe el bloque de preservación.

Con el registro aparte:
- nombrar y construir son pasos independientes;
- se puede corregir un nombre a mano sin volver a llamar a la API;
- rehacer el catálogo no pierde nada.

### Idempotencia

El script salta los ids que ya están en `nombres.json` salvo `--rehacer`. Correr
el pipeline dos veces no gasta tokens ni cambia nombres revisados.

---

## 3. Componentes afectados

### Archivos nuevos

| Archivo | Para qué |
|---|---|
| `scripts/nombrar-disenos.mjs` | El nombrado. `--categoria`, `--dry`, `--rehacer`, `--limite` |
| `frontend/public/data/nombres.json` | Registro `id → nombre` |
| `frontend/src/lib/nombreDiseno.js` | El helper de H-2: nombre real o `Categoría #N` |
| `frontend/src/lib/nombreDiseno.test.js` | Sus tests |

### Archivos que se modifican

| Archivo | Qué cambia |
|---|---|
| `scripts/build-catalog.mjs` | Mete `name` desde `nombres.json` (junto al bloque que ya preserva `sku`) |
| `scripts/build-meta-feed.mjs` | `title` = el nombre; `description` deja de ser idéntica |
| `frontend/src/routes/Producto.jsx` | Usa el helper (2 lugares) + `<h1>` y SEO |
| `frontend/src/routes/Category.jsx` | Usa el helper (2 lugares) |
| `frontend/src/components/FeaturedStickers.jsx` | Usa el helper |
| `frontend/src/lib/seo.js` | `title`, meta description y JSON-LD con el nombre |
| `scripts/generate-sitemap.mjs` | Verificar que no dependa del nombre (no debería) |

### ⚠️ Módulos compartidos

**No se toca ninguno de los cinco de la regla 9.** Esta spec no pasa cerca del
camino de precios: `config/pricing.js`, `CartContext`, el `pricing.js` del
servidor y `config/site.js` quedan intactos. `analytics.js` tampoco cambia — los
eventos ya mandan `item_name`, que va a empezar a llegar con contenido real solo.

---

## 4. Datos

### `nombres.json`

```json
{
  "_meta": { "version": 1, "modelo": "claude-haiku-4-5", "actualizado": "2026-09-07" },
  "nombres": { "anime-4": "Majin Buu pulgar arriba", "frases/60": "Choose happy" }
}
```

### El manifest, después

```json
{"id":"anime-4","file":"/stickers/anime/4.webp","sku":"000004","stock":50,"name":"Majin Buu pulgar arriba"}
```

### ⚠️ Compatibilidad

`name` es **opcional**. Un manifest sin él se renderiza como hoy — es lo que
permite nombrar por partes. El helper de H-2 es el único lugar que decide el
fallback.

**Los carritos guardados no se tocan**: `epicalcos.cart.v2` guarda el `name` al
momento de agregar. Un carrito viejo va a decir "Anime #4" hasta que se saque y
se vuelva a agregar. **Es correcto**: cambiarle el nombre a una línea guardada
sería reescribir lo que la persona ya eligió, y el precio (que es lo que importa)
no depende del nombre.

---

## 5. La llamada a la API

- **Sin SDK** (regla 10): `fetch` contra `https://api.anthropic.com/v1/messages`.
- **La key va en el entorno**, nunca en el repo: `ANTHROPIC_API_KEY`. **No es una
  `VITE_*`** — esto corre en la máquina de Mariano, no en el navegador (regla 14).
- Lotes de 15 imágenes en base64, respuesta en JSON.
- Reintento con backoff ante 429/500. Si un lote falla dos veces se saltea y se
  anota: **un lote perdido deja diseños sin nombre, que es el estado de hoy**, no
  una regresión.
- Modelo por defecto **Haiku 4.5**; `--modelo` para subir a Sonnet si el piloto
  no da la calidad.

### Costo medido

Sobre 400 imágenes reales del catálogo: ~497 tokens por imagen.

| | Requests | Input | Costo |
|---|---|---|---|
| Piloto (`frases` + `anime`, ~200) | ~14 | ~0,10 M | **~$0,15** |
| Catálogo completo (6.757) | ~451 | ~3,5 M | **~$4 (Haiku)** · ~$13 (Sonnet) |

---

## 6. Seguridad

- La key **solo** en el entorno de la máquina de Mariano. No entra al bundle, no
  se commitea, no va a Netlify (esto no corre en el build).
- Las imágenes que se mandan a la API son **públicas** (están servidas en
  `epicalcos.com/stickers/`): no hay dato privado en juego.
- Sin PII.

---

## 7. Manejo de errores

| Situación | Qué hace |
|---|---|
| Falta `ANTHROPIC_API_KEY` | Corta con un mensaje que dice cómo setearla. No escribe nada |
| Un lote falla dos veces | Se saltea, se anota, sigue. Esos diseños quedan sin nombre |
| El modelo devuelve algo que no es JSON | Se descarta el lote. **No se guarda basura en el registro** |
| Un nombre pasa los 60 caracteres | Se recorta en la última palabra entera |
| Un nombre trae "calco"/"sticker" | Se limpia (RF-3) |
| `nombres.json` no existe | Se crea vacío |

---

## 8. Fase 2 — el buscador global (FUERA de scope)

Se diseña acá para que la decisión quede tomada, **no se implementa en esta spec**.

Que "Goku" desde el Home lleve al diseño necesita un índice de 6.757 nombres.
Horneado en el bundle serían ~60 KB gzip sobre 93 KB: **inaceptable** para un
Home que es eager por LCP (regla 12).

**La forma correcta**: `/data/nombres-index.json` cargado con `fetch` la primera
vez que alguien **escribe** en el buscador. Cero peso en el bundle, y para
cuando terminó de tipear tres letras ya está.

Sale en su propia spec, con su propia medición.

---

## 9. Testing

| Test | Qué cubre |
|---|---|
| `nombreDiseno.test.js` | El fallback: con nombre, sin nombre, nombre vacío, nombre con espacios |
| `catalogNombres.test.js` | Todo nombre de `nombres.json` apunta a un id que existe; largo ≤ 60; no contiene "calco"/"sticker"; no repite la categoría |
| Ampliar `catalogoLote2.test.js` | `build-catalog` **preserva** `name` igual que preserva `sku` |
| Feed | El `title` del CSV es el nombre cuando hay, y el de hoy cuando no |

**No hay test de paridad de precios**: esta spec no toca ese camino.

---

## 10. Dependencias nuevas

**Ninguna.** `fetch` es nativo en el Node del proyecto.

---

## 11. Preguntas abiertas

### P-1 — ¿Qué pasa con los nombres repetidos dentro de una categoría?

Con 118 diseños de anime va a haber varios "Goku". El id sigue siendo único y la
URL no depende del nombre (RN-2), así que **no rompe nada** — pero la grilla va a
mostrar tres cards que dicen lo mismo.

**Recomendación**: dejarlo pasar en el piloto y mirarlo con datos reales. Si
molesta, la salida barata es mostrar el `#N` chiquito al lado solo cuando el
nombre está repetido. No hace falta decidirlo ahora.

### P-2 — ¿El nombre reemplaza al `#N` o convive?

Recomendación: **lo reemplaza** en la card (el ancho a 375 px no da para los
dos) y **conviven** en la ficha, donde el `#N` sirve para pedir por WhatsApp
("quiero el anime #4"). Se implementa así salvo que Mariano diga otra cosa.
