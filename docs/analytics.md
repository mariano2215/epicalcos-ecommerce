# ANALYTICS — EPICALCOS

Estado del tracking después de la fase P0. Moneda siempre **ARS**.
Verificado contra el código el 11/8/2026.

> **Rol en el SDD**: este es el documento de referencia de analytics. Toda spec
> que toque el funnel declara sus eventos en `requirements.md` (sección
> *Analytics necesarios*) y los implementa **solo** a través de
> `frontend/src/lib/analytics.js` — nunca llamando a `gtag`, `fbq` o `dataLayer`
> desde un componente. Ver `CLAUDE.md` regla 13.

---

## 1. Qué está instalado

| Herramienta | Cómo entra | Variable |
|---|---|---|
| GA4 (`G-04CJ1WQRSJ`) | `gtag.js` inline en `index.html` (ID público) | — |
| Google Tag Manager | inyectado desde `main.jsx` si hay ID | `VITE_GTM_ID` |
| Meta Pixel | inyectado desde `main.jsx` si hay ID | `VITE_META_PIXEL_ID` |
| Meta CAPI (server) | webhook de MP → `lib/metaCapi.js` | `META_CAPI_TOKEN`, `META_PIXEL_ID` |
| Microsoft Clarity | inline en `index.html` (ID público) | — |

> ⚠️ Las `VITE_*` tienen que estar cargadas **en Netlify**, no solo en `.env.local`:
> se hornean en el bundle durante el build. GA4 y Clarity no dependen de env vars
> justamente por eso — GA4 estuvo sin instalar hasta el 11/8/2026 porque
> `VITE_GA4_ID` nunca llegó a Netlify, mientras el código empujaba eventos igual.

Todo el tracking pasa por `frontend/src/lib/analytics.js`, y **nunca puede romper la
compra**: `pushDataLayer` y `pixel()` están envueltos en `try/catch` porque
`fbevents.js` tira excepciones sincrónicas dentro del navegador embebido de Instagram.

### Los dos formatos de evento

`gtag.js` **no** entiende los objetos `{ event, ecommerce }` del dataLayer: ese
formato lo lee un contenedor de GTM. Por eso `pushDataLayer()` hace las dos cosas:

1. escribe en `window.dataLayer` (para GTM, si alguna vez se prende), y
2. reenvía a `gtag('event', …)` aplanando `ecommerce`, que es lo que hoy
   realmente llega a GA4.

El reenvío se apaga solo si `VITE_GTM_ID` tiene valor (`usaGtagDirecto()`): con
contenedor presente, mandar por los dos caminos contaría cada compra dos veces.
**Si algún día se prende GTM, hay que sacar el snippet de gtag.js de `index.html`.**

---

## 2. Eventos de ecommerce (GA4)

| Evento | Dónde se dispara | Estado |
|---|---|---|
| `view_item_list` | grilla de categoría, Home (`FeaturedStickers`) y landings | ✅ P0/P2 |
| `select_item` | `components/StickerCard.jsx` al clickear a la ficha | ✅ P0 |
| `view_item` | `routes/Producto.jsx`, `components/FixedProductPage.jsx` | ✅ |
| `add_to_cart` | `context/CartContext.jsx` (todos los `add*`) | ✅ |
| `remove_from_cart` | `context/CartContext.jsx` | ✅ |
| `view_cart` | `routes/Cart.jsx` | ✅ |
| `begin_checkout` | `routes/Checkout.jsx` al montar | ✅ |
| `add_shipping_info` | `routes/Checkout.jsx` al **cambiar** el método | ✅ P0 |
| `add_payment_info` | `routes/Checkout.jsx` al **cambiar** el medio de pago | ✅ P0 |
| `purchase` | `/pago-exitoso` y `/pago-transferencia` | ✅ P0 |

### Eventos propios

`search` · `search_no_results` · `generate_lead` · `whatsapp_click` (con la ruta
de origen) · `shipping_calculated` (zona + costo) · `pack_builder_start` ·
`pack_completed` (unidades + diseños distintos) · `personalizado_inicio` ·
`personalizado_paso` · `personalizado_archivo_cargado` · `personalizado_precio_calculado`

### `item_list_name` en uso

Sirve para saber **desde qué lista** se compra. Valores actuales:

| Lista | Dónde |
|---|---|
| `Los más vendidos` (`home_destacados`) | Home |
| nombre de la categoría (id = slug) | `/categoria/:slug` |
| `Landing calcos-termo` / `-notebook` / `-auto` | landings de uso |

### Estructura de items

```js
{ item_id, item_name, item_category, price, quantity }
```

`item_id` es el id de la línea del carrito (`sticker:anime-1:6cm`). Para Meta, el
`content_id` usa `catalogSku` cuando existe, para machear con el catálogo de
Commerce Manager (ver `config/metaCatalog.js`).

**Nunca** se manda PII (mail, teléfono, nombre, dirección) al `dataLayer`. Las
coincidencias avanzadas del Píxel van hasheadas desde `lib/advancedMatching.js`.

---

## 3. Lo que se corrigió en P0 (y por qué importa)

### 3.1 El `purchase` mandaba el precio de lista

`/pago-exitoso` disparaba `trackPurchase({ total: subtotal, shipping: 0 })`, y
ese `subtotal` sale del `CartContext`, que calcula todo con **`basePrice`** — el
precio de vidriera. Los descuentos se aplican en `pricedItems()`, que vive dentro
del checkout y no sobrevive al redirect a Mercado Pago.

Resultado: con cupón, 3x2 o el 10 % por transferencia, GA4 y el Píxel reportaban
un `value` **inflado** y el envío **nunca** entraba. Mientras tanto la API de
conversiones (server-side) mandaba el monto real. Dos números distintos para la
misma venta, y el ROAS de las campañas calculado sobre el equivocado.

**Solución** (`lib/purchaseTracking.js`): el checkout guarda el pedido ya
preciado en `sessionStorage` justo antes de mandar a pagar; la pantalla de
gracias lo lee y lo borra. `value` = ítems con descuento + envío.

Ejemplo verificado — 10 calcos de 6 cm por transferencia, envío a Rosario:

| | antes | ahora |
|---|---|---|
| `value` | 16.000 | **18.900** |
| `shipping` | 0 | **4.500** |
| `items[].price` | 1.600 | **1.440** |

### 3.2 El canal transferencia era invisible

`/pago-transferencia` limpiaba el carrito y **no disparaba nada**. La CAPI solo
corre desde el webhook de Mercado Pago, que para transferencia nunca llega. O
sea: el medio de pago que tiene el 10 % off — el incentivado — no se medía, y
Meta optimizaba solo contra compradores de MP.

Ahora dispara `purchase`. **Salvedad importante**: ese pedido está
**registrado, no cobrado** — se confirma cuando llega el comprobante por
WhatsApp. Por eso el evento lleva `payment_method: 'transferencia'`.

> **Para leer bien el dato**: en GA4, segmentá por `payment_method`. Los
> `purchase` de transferencia son *pedidos registrados*; la conversión real a
> cobrado hay que cruzarla con el CRM. Si preferís que solo cuenten los cobrados,
> el cambio es sacar el `trackPurchase` de `routes/PaymentTransfer.jsx`.

### 3.3 Eventos que se disparaban solos

`add_shipping_info` corría al montar el checkout, no al elegir. Existía siempre,
con el valor por defecto, y no medía ninguna decisión.

El guard **compara el último valor trackeado**, no un "es el primer render". Un
flag booleano no alcanza: StrictMode monta, desmonta y remonta sobre el mismo
fiber, el `ref` sobrevive a ese ciclo y la segunda corrida se hace pasar por un
cambio real. (Se detectó en vivo: `begin_checkout` salía duplicado y
`add_shipping_info` fantasma con el guard booleano.)

### 3.4 Deduplicación

- **Píxel ↔ CAPI**: los dos mandan `event_id` = `purchase-{orderId}`. Meta se
  queda con uno. El `orderId` sale del `external_reference` de la URL, que es el
  mismo que usa el webhook.
- **Refresh de la pantalla de gracias**: `consumePurchase()` lee y **borra** el
  `sessionStorage`. Verificado: refrescar `/pago-transferencia` da 0 purchases.
- **Reintentos del webhook de MP**: `orderStore.markNotified` + `event_id`.

---

## 4. Funnels

### Ecommerce

```
session → view_item_list → select_item → view_item → add_to_cart
        → view_cart → begin_checkout → add_shipping_info
        → add_payment_info → purchase
```

### Personalizados

```
view_item (/personalizados) → personalizado_inicio → personalizado_paso
        → personalizado_archivo_cargado → add_to_cart → begin_checkout → purchase
```

---

## 5. KPIs

| KPI | Fórmula |
|---|---|
| Conversion rate | `purchase / sessions` |
| Lista → ficha | `select_item / view_item_list` |
| Add-to-cart rate | `add_to_cart / view_item` |
| Carrito → checkout | `begin_checkout / view_cart` |
| Checkout completion | `purchase / begin_checkout` |
| AOV | `revenue / purchases` |
| Mix de pago | `purchase` segmentado por `payment_method` |

---

## 6. Cómo validar antes de dar por buena una campaña

1. **GA4 DebugView** + **GTM Preview**.
2. Comprar de punta a punta y revisar en el `dataLayer`:
   - `purchase` **una sola vez** (refrescar la pantalla de gracias: no debe repetir);
   - `value` = lo que realmente pagó (con descuento **y** con envío);
   - `currency: 'ARS'`;
   - `transaction_id` presente y **igual** al `external_reference`;
   - `items` no vacío.
3. **Meta → Administrador de eventos → Probar eventos**: confirmar que el
   `Purchase` del navegador y el de la CAPI se deduplican (uno solo, "Procesado
   con éxito", origen "Navegador y servidor").

Atajo para inspeccionar en consola:

```js
window.dataLayer.filter(e => e.event === 'purchase')
```

---

## 7. Cómo enforcar la CSP (sin romper el sitio)

Hoy `netlify.toml` tiene `Content-Security-Policy-Report-Only`: **no bloquea
nada**, solo reporta. Y como no hay endpoint de reporte, las violaciones aparecen
únicamente en la consola de cada visitante — o sea, son invisibles.

**No se enforzó en P2 a propósito.** El riesgo concreto: `script-src` lista los
dominios que se conocen (GTM, GA4, Meta, Clarity), pero **GTM puede cargar
scripts de terceros según las etiquetas que tengas configuradas en el panel**, y
eso no se puede ver desde el código. Flipear el header a ciegas puede matar el
tracking —o el checkout— sin aviso.

Procedimiento seguro, en este orden:

1. Abrir el sitio en producción con la consola abierta y recorrer **el flujo
   completo**: home → categoría → ficha → carrito → checkout → pago. Anotar cada
   `[Report Only]` que aparezca.
2. Repetir entrando **desde un anuncio de Instagram** (el navegador embebido
   carga cosas distintas) y **desde Google**.
3. Agregar a `script-src` / `connect-src` únicamente los dominios que hayan
   aparecido. Si alguno no se reconoce, averiguar de qué etiqueta de GTM sale
   **antes** de agregarlo.
4. Recién ahí renombrar el header a `Content-Security-Policy`.
5. Después de deployar, verificar que el `purchase` sigue llegando a GA4 y a
   Meta. Si algo se rompe, volver a `-Report-Only` es un commit de una línea.

---

## 8. Riesgo abierto: `add_to_cart` reporta precio de lista

Detectado en la auditoría SDD del 11/8/2026. **Es el mismo problema de §3.1, pero
en el otro extremo del funnel** — y ahí todavía no está resuelto.

`CartContext.addSticker()` guarda `basePrice = priceForSize(size)`, el precio de
**lista**, y `trackAddToCart` recibe `price: line.basePrice`. Los descuentos que
dependen del carrito (cupón, 10 % por transferencia) se resuelven recién en
`pricedItems()`, así que es correcto que no estén acá.

**Pero el 50 % de la promo Argentina no depende del carrito**: depende solo del
diseño. La grilla y la ficha ya lo muestran (`precioVidriera()`), y el checkout
lo cobra — el `basePrice` de la línea es el único lugar que se quedó con el
precio de lista.

Durante la ventana del **17 al 19/8/2026**, para un calco de la categoría
`argentina` de 6 cm:

| | valor reportado | valor real |
|---|---|---|
| `add_to_cart` → `value` | 1.600 | **800** |
| `view_cart` → `value` | 1.600 | **800** |
| `purchase` → `value` | ✅ correcto (`purchaseTracking.js`) | |

Consecuencia: durante la promo, GA4 y Meta **sobreestiman** el valor del carrito
en la mitad para esa categoría, mientras el `purchase` reporta bien. Los ratios
`add_to_cart → purchase` por valor quedan distorsionados, y Meta optimiza contra
una señal de valor inflada en la parte alta del funnel.

Esto es **la mitad analítica** de una inconsistencia más grande: el carrito
también *muestra* el precio de lista al cliente. Ver `docs/architecture.md`
§12.1 — se arregla junto, en una sola spec.

---

## 9. Pendientes

- [ ] **Validar el `purchase` en producción** (ver `QA-CHECKLIST.md` §6). Es lo
      único que bloquea confiar en todo el resto.
- [ ] **Corregir el `value` de `add_to_cart` / `view_cart` durante promos por
      categoría** (§8). Ideal: antes del 17/8/2026.
- [ ] Enforcar la CSP siguiendo el procedimiento de arriba.
- [ ] Crear el feed programado en Meta Commerce Manager (el CSV ya está deployado).
- [ ] `view_item_list` en `SuggestedStickers` (rota cada 7 s; hay que decidir si
      cada rotación es una impresión nueva o no antes de instrumentarlo).
- [ ] Marcar `purchase` de transferencia como cobrado cuando llega el comprobante
      (hoy requiere cruce manual con el CRM).
