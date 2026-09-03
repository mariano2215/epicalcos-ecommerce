# Tasks — CRO: ticket promedio y fricción de descubrimiento

| | |
|---|---|
| **Spec** | `013-cro-aov-y-descubrimiento` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETADA` |

---

## ⛔ Antes de tocar una sola línea

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] **Mariano pidió explícitamente la implementación**
      → *"Implementa los cambios que están acá. La fase 1 y 2."* (02/09/2026)

---

## Fase 0 — Preparación

- [x] **0.1** Leer `CartDrawer`, `Cart`, `FreeShippingProgress`, `SuggestedStickers`,
      `Hero`, `searchCatalog`, `SizePicker`, `SizeGuide`, `CartContext`, `analytics`
  - *Verificación*: hallazgos volcados en `design.md` §0
- [x] **0.2** Suite en verde antes de empezar
  - *Verificación*: **341 tests pasan** (el README decía 210, está desactualizado)
- [ ] **0.3** ~~Rama de trabajo~~ — se trabaja sobre `main`, como el resto del
      historial reciente del repo

---

## Fase 1 — AOV en el carrito lateral

- [x] **1.1** `FreeShippingProgress` acepta `compacto`
  - *Archivo*: `frontend/src/components/FreeShippingProgress.jsx`
  - *Verificación*: en `/carrito` se ve igual que antes; en el drawer ocupa menos alto
- [x] **1.2** Componente nuevo `BulkProgress` (medidor N de 10 hacia el 10 %)
  - *Archivo*: `frontend/src/components/BulkProgress.jsx`
  - *Verificación*: con 7 calcos muestra barra al 70 % y "te faltan 3"; con 10, el estado logrado
- [x] **1.3** El drawer monta las dos barras y saca las 2 líneas de texto del 10 %
  - *Archivo*: `frontend/src/components/CartDrawer.jsx`
  - *Verificación*: el mensaje del 10 % aparece **una** sola vez, con barra
- [x] **1.4** `/carrito` usa `BulkProgress` en el banner superior
  - *Archivo*: `frontend/src/routes/Cart.jsx`
  - *Verificación*: la rama de promo 3x2 queda intacta

---

## Fase 2 — Order bump

- [x] **2.1** `lib/sugerencias.js` con las funciones puras + cache de manifests
  - *Archivo*: `frontend/src/lib/sugerencias.js`
  - *Verificación*: `sampleSize`, `categoriasFuente`, `elegirUno`, `mapearManifest` exportadas y sin React adentro
- [x] **2.2** `SuggestedStickers` importa de `lib/sugerencias.js`
  - *Archivo*: `frontend/src/components/SuggestedStickers.jsx`
  - *Verificación*: el upsell del checkout sigue rotando y agregando igual
- [x] **2.3** `trackAddToCart` acepta `listName` y `addSticker` lo propaga
  - *Archivos*: `frontend/src/lib/analytics.js`, `frontend/src/context/CartContext.jsx`
  - *Verificación*: los 6 llamadores existentes no cambian
- [x] **2.4** Componente `OrderBump` montado en el drawer
  - *Archivo*: `frontend/src/components/OrderBump.jsx`
  - *Verificación*: un click agrega, el drawer no se cierra, y la card se renueva

---

## Fase 3 — ~~Espejo de precios~~

**Salteada**: la feature no toca precios, promos, cupones ni envíos
(`design.md` §9). La verificación de que no se tocó es que los tres tests de
paridad pasan **sin haberlos modificado**.

---

## Fase 4 — Descubrimiento

- [x] **4.1** `suggest()` devuelve `image`
  - *Archivo*: `frontend/src/lib/searchCatalog.js`
  - *Verificación*: `suggest('anime', …).image === '/stickers/anime/1.webp'`
- [x] **4.2** El autocomplete del Hero pinta la miniatura, con caída al emoji
  - *Archivo*: `frontend/src/components/Hero.jsx`
  - *Verificación*: un `src` roto no deja un ícono de imagen rota
- [x] **4.3** `lib/usosPorTamano.js` como fuente única
  - *Archivo*: `frontend/src/lib/usosPorTamano.js`
- [x] **4.4** `SizeGuide` consume la fuente única (deja de declarar `USOS`)
  - *Archivo*: `frontend/src/components/SizeGuide.jsx`
- [x] **4.5** `SizePicker` muestra el uso corto de cada tamaño
  - *Archivo*: `frontend/src/components/SizePicker.jsx`
  - *Verificación*: a 375 px los tres botones entran sin scroll horizontal

---

## Fase 5 — Analytics

- [x] **5.1** `item_list_name` en el `add_to_cart` del order bump
  - *Verificación*: sale por `lib/analytics.js`; ningún componente toca `gtag`/`fbq`
- [x] **5.2** Envuelto en `try/catch` — ya lo estaba (`pushDataLayer`, `pixel`)
- [x] **5.3** Sin PII: `item_list_name` es la constante `'order_bump_drawer'`
- [x] **5.4** `docs/analytics.md` actualizado

---

## Fase 6 — Tests

- [x] **6.1** `src/lib/sugerencias.test.js`
- [x] **6.2** `src/lib/usosPorTamano.test.js`
- [x] **6.3** Casos de `image` en `src/lib/searchCatalog.test.js`
- [x] **6.4** Suite completa en verde
- [x] **6.5** Verificación manual a 375 px en el navegador

---

## Fase 7 — Cierre

- [x] **7.1** Validar contra `acceptance.md` punto por punto
- [x] **7.2** Reportar lo que quedó fuera de scope
- [x] **7.3** Commit + push (⚠️ push a `main` = deploy a producción)
- [x] **7.4** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

Lo que apareció y **no se tocó**:

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| El experimento CRO-007 `ahorro_pack` sigue `active: true` pero mide una card de `/armar-pack`, que está despublicada desde el 26/8 → **no recibe tráfico y nunca va a concluir** | `frontend/src/lib/experiments.js` | Pasarlo a `active: false` mientras la sección esté oculta |
| `specs/README.md` y `CLAUDE.md` dicen "210 tests"; hoy son 341 | `CLAUDE.md`, `specs/_template/tasks.md` | Actualizar el número, o mejor, dejar de escribirlo a mano |
| `Category.jsx:154` busca "por número de diseño" — el único texto buscable que tiene un diseño es su número | `frontend/src/routes/Category.jsx` | Si algún día se quiere buscar diseños por contenido, hay que etiquetar los 3.397 archivos |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 02/09/2026 | El order bump se recarga con un botón "otro" en vez de rotar solo cada 7 s | En un drawer de 420 px, una card que se cambia sola debajo del pulgar es un click perdido. `SuggestedStickers` rota porque tiene 4 cards y más aire. |
| 02/09/2026 | `BulkProgress` no se muestra con carrito 100 % digital | Mismo criterio que ya tenía el drawer para los nudges de calcos (`digitalOnly`) |
