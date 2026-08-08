# CHANGELOG CRO — EPICALCOS

---

## 2026-08-08 · Fase P0

### Home

- **Nuevo** `IntentSelector` después del hero: *Para mí* / *Mis propios diseños* /
  *Para mi negocio*. Respeta `HIDDEN_SECTIONS`.
- `personalizados` sale de la grilla "Packs y servicios" para no duplicar la
  entrada; la grilla se reacomoda sola a 3 columnas.
- **Nuevo** `TrustBadges` en el hero, visible **también en mobile** (el badge y el
  párrafo existentes están ocultos por `hidden sm:*`).
- **Nuevo** `config/brandStats.js`: "+120.000 calcos vendidas" y "+5.000 clientes"
  centralizados (antes solo existían como strings del ticker).

### Descuentos

- **Nuevo** `DiscountNote`: la condición del 10 % ("pagando por transferencia")
  escrita una sola vez y consumida por hero, `/categorias`, grilla de categoría
  y ficha de producto.
- `/categorias` decía **"10% off automático"** — falso, requiere transferencia. Corregido.
- Hero y grilla de categoría decían "10% off" sin la condición. Corregido.

### Envíos

- `config/site.js`: `productionDaysRosario` / `productionDaysInterior` →
  **`production`** + **`deliveryRosario`** / **`deliveryInterior`**. Eran la misma
  cosa y el interior leía "producción: 5 a 7 días hábiles" cuando esos días ya
  incluyen el correo.
- **Nuevo** `ShippingInfo`: producción, entrega, envío gratis y **calculadora**
  (provincia + ciudad, los mismos datos que usa `calculateShipping`).
- Actualizados los 4 consumidores: `CheckoutForm`, `QueSigue`, `Contact`, `Producto`.

### Ficha de producto

- **Nuevo** `SizeGuide`: los 3 tamaños a escala real entre sí + para qué sirve
  cada uno; clickear cambia el tamaño elegido.
- `StickyMobileBar` **cableado** — el componente existía y no lo usaba nadie.
- `TrustBadges` + `ShippingInfo` + `DiscountNote` arriba del pliegue.
- `WhatsAppButton` se eleva en `/producto/*` para no tapar el CTA sticky.

### Checkout

- `autocomplete` + `inputMode` + `type` en los 7 campos personales. **No había
  ninguno en todo el repo.**
- Trust box antes del botón de pago, adaptado al medio de pago elegido.

### Analytics

- **`purchase` mandaba el precio de LISTA.** Se calculaba con el `subtotal` del
  `CartContext` (`basePrice`), así que con cupón, 3x2 o 10 % por transferencia el
  `value` iba inflado y `shipping` era siempre `0`, mientras la CAPI mandaba el
  monto real. **Nuevo** `lib/purchaseTracking.js` pasa el pedido preciado del
  checkout a la pantalla de gracias vía `sessionStorage`.
  Verificado: 16.000 → **18.900** (con `shipping: 4500`, unitario 1.600 → **1.440**).
- **`/pago-transferencia` no disparaba nada.** El canal con el 10 % off era
  invisible para GA4, el Píxel y la CAPI. Ahora dispara `purchase` con
  `payment_method` para poder segmentarlo.
- **Nuevos**: `view_item_list`, `select_item` (existía sin usarse),
  `add_payment_info`, `whatsapp_click`, `shipping_calculated`.
- `add_shipping_info` se disparaba al montar el checkout → ahora al **cambiar**.
- `begin_checkout` y `view_item_list` salían duplicados por el doble efecto de
  StrictMode → guards por valor.
- `consumePurchase()` lee y borra: refrescar la pantalla de gracias no repite el evento.

### Accesibilidad / mobile

- Targets a ≥44 px: CTA de la barra sticky (36–38 px), links del footer (17 px),
  botones del header, anterior/siguiente de la ficha, toggles nuevos.
- Verificado **0 px de desborde horizontal** en 9 rutas a 375 px.

### Docs

`docs/CRO-AUDIT.md` · `docs/ANALYTICS.md` · `docs/CRO-IMPLEMENTATION.md` ·
`docs/QA-CHECKLIST.md` · `docs/CRO-EXPERIMENTS.md` · `docs/CHANGELOG-CRO.md`

### Archivos

**Nuevos**

```
frontend/src/components/DiscountNote.jsx
frontend/src/components/IntentSelector.jsx
frontend/src/components/ShippingInfo.jsx
frontend/src/components/SizeGuide.jsx
frontend/src/components/TrustBadges.jsx
frontend/src/config/brandStats.js
frontend/src/lib/purchaseTracking.js
```

**Modificados**

```
frontend/src/components/CheckoutForm.jsx
frontend/src/components/Footer.jsx
frontend/src/components/Header.jsx
frontend/src/components/Hero.jsx
frontend/src/components/StickerCard.jsx
frontend/src/components/StickyMobileBar.jsx
frontend/src/components/WhatsAppButton.jsx
frontend/src/components/personalizados/QueSigue.jsx
frontend/src/config/site.js
frontend/src/lib/analytics.js
frontend/src/routes/Categorias.jsx
frontend/src/routes/Category.jsx
frontend/src/routes/Checkout.jsx
frontend/src/routes/Contact.jsx
frontend/src/routes/Home.jsx
frontend/src/routes/PaymentSuccess.jsx
frontend/src/routes/PaymentTransfer.jsx
frontend/src/routes/Producto.jsx
```

**Sin tocar (a propósito)**: `netlify/functions/*` — no se cambió ningún precio
ni regla del servidor, así que el espejo `config/pricing.js` ↔
`functions/lib/pricing.js` sigue intacto y `promoPricing.test.js` en verde.
