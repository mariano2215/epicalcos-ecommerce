# Design — Calcos en la primera pantalla

| | |
|---|---|
| **Spec** | `038-home-producto-primero` |
| **Requirements** | [`requirements.md`](requirements.md) |

---

## 0. Hallazgos del discovery

- `components/FeaturedStickers.jsx` elige **un diseño al azar** de cada
  categoría de `CATEGORIAS_2X1` (config/pricing.js) en cada carga. El
  `item_list_name` de GA4 es "Los más vendidos" y no se cambia (serie histórica).
- `routes/Home.jsx` arranca con `CyberBanner` → `HeroSelector` →
  `BuscadorSeccion` → `RecentCategories` → `FeaturedStickers`.
- El popup (`components/WelcomePopup.jsx`, `config/popup.js`,
  `components/popup/usePopupDisparo.js`, `lib/popupReglas.js`) ya tiene las
  piezas: umbrales por dispositivo, `intencion.productosVistos: 2`, `salida` y
  un A/B apagado (`popup_disparo`) con variantes en `POPUP_VARIANTES`.
- `lib/experiments.js`: framework propio de A/B (`getVariant`, `useExperiment`,
  `variants[0]` = control, kill switch con `active`).
- Los pedidos pagados viven en el store `orders` de Netlify Blobs
  (`netlify/functions/lib/orderStore.js`, ver docs/database.md §1.1), con sus
  líneas e ids de diseño.

## 1. Arquitectura propuesta

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** Ranking como JSON estático `public/data/mas-vendidos.json` generado por `scripts/build-mas-vendidos.mjs` | (a) función que lo calcula en cada visita · (b) GA4 Data API | (a) suma latencia y lecturas de Blobs al Home; (b) agrega credenciales de Google al build. El JSON se cachea como el resto del catálogo |
| **D-2** El script se corre a mano o desde una Scheduled Function semanal que hace commit vía API | cron externo | depende de P-2; la versión manual es la del feed de Meta (`build-meta-feed.mjs`) |
| **D-3** La fila del Home reutiliza `StickerCard` con `openDrawer:false` | componente nuevo | mismo "+", misma devolución, mismo tracking |
| **D-4** A/B `home_producto` con variantes `['selector', 'calcos_arriba']` | publicar directo | la caída coincide con 5 cambios; sin control no se aprende nada |
| **D-5** A/B `popup_momento` reemplaza a `popup_disparo` (apagado) con variantes `['actual', 'fichas_40s']` | cambiar el valor directo | el popup trae los leads: hay que medir cuánto se pierde |

## 2. Componentes afectados

### Archivos que se modifican
- `frontend/src/routes/Home.jsx` — rama por variante.
- `frontend/src/components/HeroSelector.jsx` — modo compacto (dos chips).
- `frontend/src/components/FeaturedStickers.jsx` — lee el ranking; respaldo curado.
- `frontend/src/routes/Category.jsx` — orden por ranking; chips plegables arriba.
- `frontend/src/config/popup.js` — variante `fichas_40s` en `POPUP_VARIANTES`.
- `frontend/src/lib/experiments.js` — `home_producto`, `popup_momento`.
- `frontend/src/components/WhatsAppButton.jsx` — offset en el Home.

### Archivos nuevos
- `frontend/src/components/FilaMasVendidos.jsx`
- `frontend/src/config/masVendidos.js` — lista curada de respaldo (P-1).
- `scripts/build-mas-vendidos.mjs`
- `frontend/public/data/mas-vendidos.json`
- `frontend/src/lib/masVendidos.js` + test.

### ⚠️ Módulos compartidos
- `lib/experiments.js` — lo importan 3 archivos; solo se agregan entradas.
- `config/popup.js` — 7 importadores; solo se agrega una variante.
- `StickerCard.jsx` — lo usan FeaturedStickers, LandingUso y Category: no se
  modifica.
- `lib/analytics.js` — no se modifica; se usa `trackViewItemList` existente.

## 3. Datos

```json
// public/data/mas-vendidos.json
{ "generado": "2026-11-23T10:00:00-03:00", "ventanaDias": 30,
  "items": [ { "id": "argentina-1", "categoria": "argentina", "unidades": 41 } ] }
```
No toca `localStorage` ni la forma de las líneas del carrito.

## 4. APIs
Ninguna nueva. El script lee Blobs con las credenciales que ya usan las
funciones (`NETLIFY_BLOBS_*`), desde la máquina de Mariano o una Scheduled
Function; nunca desde el bundle.

## 5. Integraciones
GA4: `item_list_name: 'Home primera pantalla'` para la fila nueva.

## 6. Seguridad
El JSON publicado tiene solo ids de diseño y unidades: ningún dato de pedido,
cliente ni monto.

## 7. Manejo de errores
JSON ausente o roto → lista curada. Nunca al azar, nunca sección vacía.

## 8. Migración
A/B con kill switch. Si gana, se deja la variante como única y se borra el
control en una tarea aparte.

## 9. Testing
- `masVendidos.test.js`: orden, umbral de 3 unidades, diseños borrados, respaldo.
- Paridad de precios: no se toca nada de pricing; `npm test` igual tiene que
  quedar en verde.
- Manual: 375 × 812 en las dos variantes (forzadas con el parámetro del
  framework), LCP con Chrome headless con GPU.

## 10. Dependencias nuevas
Ninguna.
