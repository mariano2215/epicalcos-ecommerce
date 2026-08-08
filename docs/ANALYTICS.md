# ANALYTICS — EPICALCOS

Estado del tracking después de la fase P0. Moneda siempre **ARS**.

---

## 1. Qué está instalado

| Herramienta | Cómo entra | Variable |
|---|---|---|
| Google Tag Manager | inyectado desde `main.jsx` si hay ID | `VITE_GTM_ID` |
| GA4 | vía GTM, leyendo `dataLayer` | `VITE_GA4_ID` |
| Meta Pixel | inyectado desde `main.jsx` si hay ID | `VITE_META_PIXEL_ID` |
| Meta CAPI (server) | webhook de MP → `lib/metaCapi.js` | `META_CAPI_TOKEN`, `META_PIXEL_ID` |
| Microsoft Clarity | inline en `index.html` (ID público) | — |

> ⚠️ Las `VITE_*` tienen que estar cargadas **en Netlify**, no solo en `.env.local`:
> se hornean en el bundle durante el build.

Todo el tracking pasa por `frontend/src/lib/analytics.js`, y **nunca puede romper la
compra**: `pushDataLayer` y `pixel()` están envueltos en `try/catch` porque
`fbevents.js` tira excepciones sincrónicas dentro del navegador embebido de Instagram.

---

## 2. Eventos de ecommerce (GA4)

| Evento | Dónde se dispara | Estado |
|---|---|---|
| `view_item_list` | `routes/Category.jsx` al cargar la grilla | ✅ P0 |
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
de origen) · `shipping_calculated` (zona + costo) · `personalizado_inicio` ·
`personalizado_paso` · `personalizado_archivo_cargado` · `personalizado_precio_calculado`

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

## 7. Pendientes

- [ ] Enforcar la CSP (hoy `Content-Security-Policy-Report-Only` en `netlify.toml`).
- [ ] Crear el feed programado en Meta Commerce Manager (el CSV ya está deployado).
- [ ] `view_item_list` en Home (`FeaturedStickers`) y en `SuggestedStickers`.
- [ ] Marcar `purchase` de transferencia como cobrado cuando llega el comprobante
      (hoy requiere cruce manual con el CRM).
