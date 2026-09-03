# Design — CRO: ticket promedio y fricción de descubrimiento

| | |
|---|---|
| **Spec** | `013-cro-aov-y-descubrimiento` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 02/09/2026 |

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, la mitad.** Ver la tabla de abajo. |
| ¿Qué archivos están involucrados? | `CartDrawer.jsx`, `Cart.jsx`, `FreeShippingProgress.jsx`, `SuggestedStickers.jsx`, `Hero.jsx`, `searchCatalog.js`, `SizePicker.jsx`, `SizeGuide.jsx`, `analytics.js`, `CartContext.jsx` |
| ¿Hay tests que lo cubran hoy? | No hay tests de componentes en el repo — **todos** los tests son de funciones puras en `src/lib/*.test.js`. Eso condiciona el diseño: la lógica nueva va a `lib/` para poder testearla. |
| ¿Toca el camino de precios? | **No.** Consume `BULK_THRESHOLD`, `SIZES`, `priceForSize` y `shipping` tal como están. |
| ¿Hay comentarios que expliquen por qué está así? | Sí, y se respetan — ver §1. |

### Qué de lo pedido ya existe

| Pedido del plan | Estado real en el código |
|---|---|
| Barra de envío gratis en el slide cart | `FreeShippingProgress.jsx` existe y está **bien hecha** (contempla los dos umbrales), pero sólo se monta en `Cart.jsx:211`. **El drawer no la tiene.** |
| Gamificación del 10 % por transferencia | **Ya existe** como texto: `CartDrawer.jsx:115-119` y `Cart.jsx:58-66`. Falta que sea visual. |
| Order bump / upsell de impulso | `SuggestedStickers.jsx` ya hace cross-sell en `/carrito` y `/checkout`. **El drawer no tiene nada.** |
| Buscador predictivo | `searchCatalog.js` ya tiene normalización de acentos, alias ("goku" → Dragon Ball), ruteo por intención y ranking. **Le falta la miniatura.** |
| Filtros de tamaño rápidos | **No aplica como filtro** — ver el recuadro de abajo. |

> ### Por qué "filtrar por tamaño" no existe como filtro
> Los 3.397 diseños **no tienen tamaño**: el tamaño se elige al comprar y todos
> los diseños salen en 4, 6 y 9 cm (`SIZES` en `config/pricing.js`). Un manifest
> del catálogo es `{ id, file, sku }` — no hay atributo sobre el que filtrar, y
> filtrar dejaría la grilla igual porque todos los diseños matchean los tres
> tamaños.
>
> Lo que el pedido busca ("ideal para termo", "ideal para notebook") **ya está
> escrito** en `SizeGuide.jsx:13-17` (`USOS`). El problema es de ubicación: ese
> componente está en la ficha de producto y en las landings, **no en la grilla**,
> que es donde se toca "+". La solución honesta es llevar esa información al
> `SizePicker`, no inventar un filtro que no filtra nada.

> ### Por qué el buscador no puede devolver diseños individuales
> Los diseños no tienen nombre ni tags. `Category.jsx:55` los bautiza en runtime
> como `` `${category.name} #${n}` `` — "Anime #12". Buscar "goku" no puede
> matchear un archivo llamado `12.webp`. Por eso `searchCatalog` matchea
> **categorías** (con un diccionario de alias que suple la falta de metadata), y
> la miniatura que se puede mostrar es la **portada de la categoría**, no la del
> diseño exacto. Devolver diseños sueltos exigiría etiquetar 3.397 archivos.

---

## 1. Arquitectura propuesta

Cinco cambios independientes. Ninguno depende de otro; cada uno se puede
revertir solo.

```
CartDrawer  ─┬─ <FreeShippingProgress compacto />   (A) ya existía, se monta acá
             ├─ <BulkProgress compacto />           (B) nuevo, reemplaza 2 líneas de texto
             └─ <OrderBump />                       (C) nuevo
                     │
                     └── lib/sugerencias.js  ◄─── SuggestedStickers (mismo cache de manifests)

Hero ── suggest() ──► ahora devuelve `image`        (D)  lib/searchCatalog.js

SizePicker ─┐
SizeGuide  ─┴─ lib/usosPorTamano.js                 (E) nuevo, fuente única
```

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| `FreeShippingProgress` gana una prop `compacto` | Escribir una segunda barra para el drawer | Dos barras con el mismo mensaje se desincronizan; el comentario del componente explica por qué el copy es así y hay que mantenerlo en un solo lugar |
| Extraer `loadManifest`/`sampleSize` a `lib/sugerencias.js` | Que `OrderBump` tenga su propio cache | Dos caches bajan el mismo JSON dos veces. Además `lib/` es el único lugar del repo donde se puede testear |
| El order bump ofrece **un** calco | Ofrecer 4, como `SuggestedStickers` | El drawer mide 420 px de ancho y ya tiene que dejar visible el botón de checkout a 375 px (RNF-1) |
| El order bump usa el tamaño ya elegido (`useTamanoElegido`) | Un selector de tamaño propio | Un order bump con tres decisiones adentro deja de ser "un click" |
| Miniatura = portada de la **categoría** | Miniatura del diseño exacto | Los diseños no tienen metadata buscable (§0) |
| Usos del tamaño en `lib/usosPorTamano.js` | Dejarlos en `SizeGuide` e importarlos desde ahí | Un componente no es un módulo de datos; `SizePicker` importando de `SizeGuide` invierte la dependencia |

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/components/CartDrawer.jsx` | Monta las dos barras y el order bump; saca las 2 líneas de texto del 10 % | 🟢 |
| `frontend/src/routes/Cart.jsx` | Las ramas `bulkEligible`/`unitsToBulk` del banner superior pasan a `<BulkProgress />` | 🟢 |
| `frontend/src/components/FreeShippingProgress.jsx` | Prop `compacto` (sólo estilos y el párrafo de ayuda) | 🟢 |
| `frontend/src/components/SuggestedStickers.jsx` | Importa `loadManifest`/`sampleSize` de `lib/sugerencias.js` en vez de definirlos | 🟡 — es el upsell del checkout |
| `frontend/src/lib/searchCatalog.js` | `suggest()` agrega `image` a las sugerencias de categoría | 🟢 |
| `frontend/src/components/Hero.jsx` | Renderiza la miniatura en el `<li>` del autocomplete | 🟢 |
| `frontend/src/components/SizePicker.jsx` | Muestra el uso de cada tamaño | 🟢 |
| `frontend/src/components/SizeGuide.jsx` | `USOS` sale a `lib/usosPorTamano.js` | 🟢 |
| `frontend/src/lib/analytics.js` | `trackAddToCart` acepta `listName` opcional | 🟡 — módulo compartido |
| `frontend/src/context/CartContext.jsx` | `addSticker` propaga `opts.listName` | 🟡 — módulo compartido |

### Archivos nuevos
| Archivo | Responsabilidad |
|---|---|
| `frontend/src/components/BulkProgress.jsx` | Medidor de unidades hacia el 10 % por transferencia |
| `frontend/src/components/OrderBump.jsx` | Un calco sugerido, un click, dentro del drawer |
| `frontend/src/lib/sugerencias.js` | Cache de manifests + elección de categorías y diseños (**funciones puras, testeables**) |
| `frontend/src/lib/usosPorTamano.js` | Para qué sirve cada tamaño — fuente única |
| `frontend/src/lib/sugerencias.test.js` | Tests de las funciones puras de arriba |
| `frontend/src/lib/searchCatalog` (test existente) | Se le agregan casos de `image` |

### ⚠️ Módulos compartidos

`CLAUDE.md` regla 9. Verificado con:
```bash
grep -rn "trackAddToCart\|tamanoElegido\|CartDrawer" frontend/src netlify/
```

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **no** (sólo se lee) | todo el sitio |
| `frontend/src/config/site.js` | **no** (sólo se lee) | todo el sitio |
| `frontend/src/context/CartContext.jsx` | **sí, aditivo** | `addSticker` lo llaman `StickerCard`, `FeaturedStickers`, `SuggestedStickers`, `PackBuilder`, `Producto`, `LandingUso`. Se agrega un campo **opcional** a `opts`, que ya existe (`openDrawer`, `silent`): ningún llamador cambia. |
| `netlify/functions/lib/pricing.js` | **no** | — |
| `frontend/src/lib/analytics.js` | **sí, aditivo** | `trackAddToCart` tiene **un solo** llamador real: `CartContext.jsx` (6 sitios). Se agrega un 3.er parámetro con default; los 6 siguen andando sin tocarlos. |

---

## 3. Datos

### Estructuras nuevas o modificadas

```js
// lib/searchCatalog.js — suggest() para categorías, campo nuevo `image`
{ type: 'category', to: '/categoria/anime', label: '🌸 Anime', count: 36,
  image: '/stickers/anime/1.webp' }   // ← nuevo, sale de counts[slug].cover

// lib/usosPorTamano.js
{ '4cm': { tag: 'Chica', corto: 'Celular · llavero', para: [...] }, ... }

// CartContext.addSticker(sticker, size, quantity, opts)
opts = { openDrawer?: boolean, silent?: boolean, listName?: string }  // ← listName nuevo
```

### Persistencia
| Dónde | Qué | Ref. |
|---|---|---|
| `localStorage` | `epicalcos.cart.v2` (sin cambios de forma) y `epicalcos.tamano.v1` (sólo lectura) | `docs/database.md` §3 |
| JSON estáticos | `/data/catalog.json` y `/data/{slug}.json`, ya usados | `docs/database.md` §2 |

### ⚠️ Compatibilidad con datos existentes
- [x] **No** cambia la forma de las líneas del carrito. El order bump llama a
      `addSticker()`, que produce exactamente la misma línea que la grilla.
- [x] **No** cambia la forma del pedido en Blobs.

---

## 4. APIs

Ninguna. No hay endpoints nuevos ni cambios en los existentes: el payload que
viaja a `/api/create-preference` y `/api/create-order-transfer` es idéntico.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Meta (Pixel) | `add_to_cart` del order bump, igual que cualquier otro | no — `pixel()` ya va en `try/catch` |
| GA4 | `item_list_name` nuevo en `add_to_cart` | no — `pushDataLayer` ya va en `try/catch` |
| Mercado Pago / Notion / Resend / Cloudinary / CRM | sin cambios | — |

### Variables de entorno nuevas
Ninguna.

---

## 6. Seguridad

- [x] Ningún secreto en el frontend — no se agrega ninguna env var
- [x] El servidor no confía en nada nuevo: la línea del order bump es
      `sticker:{id}:{size}`, que el servidor ya sabe revalidar
- [x] Sin payloads nuevos
- [x] Sin PII en logs, URLs ni `dataLayer` — `item_list_name` es una constante
- [x] No afecta la CSP: las imágenes son del propio origen (`/stickers/...`)

| Riesgo | Mitigación |
|---|---|
| El order bump agrega una línea con un precio que el servidor rechaza | Imposible por construcción: usa `addSticker()`, el mismo camino de la grilla. `useTamanoElegido` ya valida el tamaño contra `SIZES` (ver el comentario en `lib/tamanoElegido.js:20-25`) |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| `/data/{slug}.json` no baja | `loadManifest` ya devuelve `[]` en el `.catch` | El order bump no se muestra; el drawer funciona igual |
| Una miniatura del autocomplete 404 | `onError` oculta el `<img>` | Queda el emoji y el nombre |
| `localStorage` bloqueado | `useTamanoElegido` cae a `DEFAULT_SIZE` | Agrega en 6 cm |
| Falla el tracking | `pushDataLayer`/`pixel` ya tragan la excepción | Nada: la compra sigue |

---

## 8. Estrategia de migración

**No aplica**: no hay datos ni comportamiento previo que migrar.

- **Rollback**: revertir el commit. No hay estado persistido nuevo ni env var.
- **Feature flag**: no hace falta — cada pieza es un componente montado en un
  solo lugar; sacarlo es borrar una línea.

---

## 9. Testing

### Tests nuevos
| Archivo | Qué verifica |
|---|---|
| `src/lib/sugerencias.test.js` | `sampleSize` no repite y respeta el tope; `categoriasFuente` prioriza las del carrito y rellena; `elegirUno` nunca devuelve algo ya en el carrito y devuelve `null` si no queda nada |
| `src/lib/searchCatalog.test.js` *(existente)* | `suggest()` devuelve `image` cuando el catálogo trae `cover`, y no rompe cuando no lo trae |
| `src/lib/usosPorTamano.test.js` | Hay un uso declarado para **cada** id de `SIZES` (si mañana se agrega un tamaño, el test avisa) |

### ⚠️ Tests de paridad
No aplica: la feature no toca precios, promos, cupones ni envíos. Los tres
tests de paridad deben pasar **sin cambios** — eso es en sí la verificación de
que no se tocó el espejo.

### Verificación manual
- [ ] Drawer a 375 px: el botón "Ir al checkout" queda visible
- [ ] Order bump: un click suma la línea y el drawer **no** se cierra
- [ ] Autocomplete: la miniatura aparece y el 404 cae al emoji

---

## 10. Dependencias nuevas

**Ninguna.** El plan proponía Doofinder o Algolia; se descartan por `CLAUDE.md`
regla 10: el catálogo son 61 JSON estáticos servidos por Netlify, el motor de
búsqueda propio ya resuelve acentos, alias y ruteo por intención, y lo único que
faltaba (la miniatura) es un campo que ya está en `/data/catalog.json`.

---

## 11. Preguntas abiertas del diseño

Ninguna. Las tres decisiones comerciales pendientes están en
`requirements.md` §12 y quedaron fuera de scope.
