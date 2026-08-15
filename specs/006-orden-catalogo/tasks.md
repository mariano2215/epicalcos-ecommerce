# Tasks — Orden del catálogo y portadas de categoría

| | |
|---|---|
| **Spec** | `006-orden-catalogo` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETADA` |

---

## ⛔ Antes de tocar una sola línea

- [x] Los tres documentos anteriores están completos — **no**: se escribieron
      después. Ver la nota de `requirements.md`.
- [x] Mariano aprobó el diseño — **no hubo diseño previo que aprobar**.
- [x] **Mariano pidió explícitamente la implementación** — sí: se le preguntó
      spec-primero vs. implementar directo, con la regla 2 a la vista, y eligió
      *"Implementá ahora"*.

> Esta lista es el registro de lo que se hizo, reconstruido del commit `dc1db60`.

---

## Fase 0 — Preparación

- [x] **0.1** Leer `Categorias.jsx`, `CategoryCard.jsx`, `StickerField.jsx`,
      `searchCatalog.js` y `searchCatalog.test.js`
  - *Verificación*: quedó documentado en `design.md` §0, incluido el comentario
    de la portada determinística que había que contradecir
- [x] **0.2** Suite en verde antes de empezar
  - *Verificación*: 214 tests
- [x] **0.3** Rama de trabajo
  - *Verificación*: **no se hizo**. Se trabajó y commiteó sobre `main`, como el
    resto de los cambios de esta sesión (memoria: *siempre commit + push*)

---

## Fase 1 — Los calcos detrás del texto

- [x] **1.1** Medir el contraste real de la bajada sobre el fondo
  - *Archivo*: —
  - *Verificación*: 5,5:1 sobre el halo violeta — arriba del mínimo AA, o sea
    que el color **no** era la causa
- [x] **1.2** Clase `.sticker-field--lateral` con máscara horizontal
  - *Archivo*: `frontend/src/styles/index.css`
  - *Verificación*: los calcos se desvanecen sobre la columna del texto y quedan
    enteros a la derecha
- [x] **1.3** Ocultar el campo abajo de 640 px
  - *Archivo*: `frontend/src/styles/index.css`
  - *Verificación*: en 375 px el encabezado no dibuja ningún calco
- [x] **1.4** Aplicar la clase en el encabezado de `/categorias`
  - *Archivo*: `frontend/src/routes/Categorias.jsx`
  - *Verificación*: `Hero.jsx` y `PromoBanner.jsx` siguen sin la clase

---

## Fase 2 — Orden del listado

- [x] **2.1** `ORDENES`, `ORDEN_POR_DEFECTO`, `esOrdenValido` y el comparador
  - *Archivo*: `frontend/src/lib/searchCatalog.js`
  - *Verificación*: el default es `az`; empate de cantidad desempata alfabético
- [x] **2.2** Parámetro `orden` en `searchCatalog`, aplicado **solo** sin query
  - *Archivo*: `frontend/src/lib/searchCatalog.js`
  - *Verificación*: con query el resultado es idéntico con cualquier `orden`
- [x] **2.3** Leer y validar `?orden=` en la página
  - *Archivo*: `frontend/src/routes/Categorias.jsx`
  - *Verificación*: `?orden=lo-que-sea` cae en alfabético
- [x] **2.4** Selector con dos botones y `aria-pressed`
  - *Archivo*: `frontend/src/routes/Categorias.jsx`
  - *Verificación*: 44 px de alto, grupo con `aria-label`, entra en una fila en
    375 px
- [x] **2.5** Escribir el orden en la URL sin ensuciarla con el default
  - *Archivo*: `frontend/src/routes/Categorias.jsx`
  - *Verificación*: `az` borra el parámetro; `disenos` lo escribe
- [x] **2.6** No mostrar el selector con búsqueda activa
  - *Archivo*: `frontend/src/routes/Categorias.jsx`
  - *Verificación*: con `?q=futbol` no está en el DOM

---

## Fase 3 — Portadas

- [x] **3.1** Mapa de diseños repetidos
  - *Archivo*: `scripts/build-duplicados.mjs` → `frontend/public/data/duplicados.json`
  - *Verificación*: 6.542 archivos leídos, 15 grupos repetidos, 15 entradas
- [x] **3.2** Módulo `portadas.js` con `portadaDe` y `rotacionesSinRepetir`
  - *Archivo*: `frontend/src/lib/portadas.js`
  - *Verificación*: `portadaDe` mantiene exactamente la fórmula que tenía la card
- [x] **3.3** `CategoryCard` usa el módulo y arranca en la rotación pedida
  - *Archivo*: `frontend/src/components/CategoryCard.jsx`
  - *Verificación*: cada card pide **una** imagen, no la base y después la rotada
- [x] **3.4** Reescribir —no borrar— el comentario de la portada determinística
  - *Archivo*: `frontend/src/components/CategoryCard.jsx`
  - *Verificación*: el comentario nuevo dice quién decide la rotación y por qué
- [x] **3.5** Semilla por visita + fetch de duplicados + rotaciones en la grilla
  - *Archivo*: `frontend/src/routes/Categorias.jsx`
  - *Verificación*: dos visitas seguidas dan portadas distintas; tipear en el
    buscador no las mueve

---

## Fase 4 — Analytics

- [x] **4.1** Evento `catalogo_orden`
  - *Archivo*: `frontend/src/lib/analytics.js`
  - *Verificación*: sale por `analytics.js`; la página no llama a `gtag`,
    `fbq` ni `dataLayer` directo
- [x] **4.2** Aislado del render
  - *Verificación*: `pushDataLayer` ya está envuelto en el módulo; un fallo de
    tracking no rompe la navegación
- [x] **4.3** Sin PII
  - *Verificación*: el evento lleva `orden: 'az' | 'disenos'` y nada más
- [x] **4.4** Actualizar `docs/analytics.md`
  - *Verificación*: `catalogo_orden` está en la lista de eventos propios y tiene
    su propia ficha (dónde, parámetros, destino, qué se quiere responder, y por
    qué `disenos` no es "más vendidas"). Hecho el 15/08/2026, después de cerrar
    la spec

---

## Fase 5 — Tests

- [x] **5.1** Tests nuevos según `design.md` §9
  - *Verificación*: 10 en `portadas.test.js`, 5 en `searchCatalog.test.js`
- [x] **5.2** Suite completa en verde
  - *Verificación*: **229 tests, 14 archivos**
- [x] **5.3** Verificación manual
  - *Verificación*: 1280 px y 375 px, con y sin búsqueda; sin errores de consola
    en una pestaña limpia

---

## Fase 6 — Documentación

- [x] **6.1** `docs/business-rules.md` — no aplica: no cambió ninguna regla comercial
- [x] **6.2** `docs/architecture.md` — no aplica: la arquitectura no cambió
- [x] **6.3** `docs/integrations.md` — no aplica: ni integración ni env var nueva
- [x] **6.4** Comentarios del **por qué** con la densidad del repo
  - *Verificación*: por qué la máscara y no la opacidad; por qué la semilla se
    congela; por qué el selector desaparece con búsqueda; por qué el mapa de
    duplicados existe
- [x] **6.5** `docs/database.md`: `duplicados.json` y el script en el pipeline

---

## Fase 7 — Cierre

- [x] **7.1** Validar contra `acceptance.md` punto por punto
- [x] **7.2** Reportar lo que quedó fuera de scope
- [x] **7.3** Commit + push (`dc1db60`) — ⚠️ deploy a producción
- [x] **7.4** Estado de la spec

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| `build-duplicados.mjs` no está enganchado al pipeline del catálogo | `scripts/build-catalog.mjs` | Llamarlo al final de `build-catalog`, o dejarlo manual y documentado (hoy: documentado) |
| 15 archivos duplicados en el catálogo, 8 entre categorías | `frontend/public/stickers/**` | Se detectan, no se borran: borrarlos renumera y rompe los SKUs de Meta |
| Categorías que son la misma cosa dos veces (`disney`/`tv-disney`, `anime`/`tv-anime`, `nba`/`deportes-nba`, `los-simpsons`/`tv-los-simpsons`…) | `frontend/src/data/categories.js` | Unificarlas es una decisión de contenido con impacto en SEO y URLs: spec aparte |
| "Los más vendidos" del Home son 4 categorías hardcodeadas con un sticker al azar | `components/FeaturedStickers.jsx` | Si alguna vez hay dato de ventas, ese componente es el primero que debería usarlo |
| ~~`docs/analytics.md` no documenta `catalogo_orden`~~ | `docs/analytics.md` | ✅ resuelto el 15/08/2026, a pedido de Mariano |
| El texto de las cards de "Destacados" sigue en `text-white/60` | `routes/Categorias.jsx` | No es subtítulo de encabezado; se dejó a propósito para no aplanar la jerarquía |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 15/08/2026 | El selector se etiqueta "Más diseños", no "Más vendidas" | No hay dato de ventas por categoría en el repo; decisión de Mariano |
| 15/08/2026 | El selector desaparece con búsqueda activa en vez de aplicarse a los resultados | Ordenar A-Z los resultados de una búsqueda degrada la búsqueda |
| 15/08/2026 | `CategoryCard` arranca en la rotación pedida en vez de en 0 | Con 94 cards, arrancar en 0 y saltar significaba 94 imágenes descargadas al pedo |
| 15/08/2026 | Se trabajó sobre `main`, sin rama | Es como se venía trabajando en la sesión; cada push deploya |
