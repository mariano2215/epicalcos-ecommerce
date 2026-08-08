# QA CHECKLIST — EPICALCOS

Pruebas ejecutadas sobre la fase **P0** (8/8/2026).
Entorno: `npm run dev` en `localhost:5173`, navegador a 375×667 y 375×812, y
desktop. Build de producción verificado aparte.

---

## 1. Build y tests automáticos

| Prueba | Resultado |
|---|---|
| `npm test --prefix frontend` | ✅ **55/55** (6 archivos) |
| `npm run build --prefix frontend` | ✅ sin errores ni warnings |
| Paridad de precios frontend ↔ functions (`promoPricing.test.js`) | ✅ intacta |

> El test de paridad es la red de seguridad del checkout: si un precio cambia de
> un solo lado del espejo, el server responde `price_mismatch` y **nadie puede
> comprar**. No romperlo nunca.

---

## 2. Analytics — verificado leyendo el `dataLayer` real

| Prueba | Resultado |
|---|---|
| `view_item_list` al entrar a `/categoria/anime` | ✅ 1 evento, 30 items, `item_list_id: anime` |
| Duplicado por StrictMode en `view_item_list` | ✅ eliminado con guard por slug |
| `select_item` al clickear de la grilla a la ficha | ✅ con `item_list_name: Anime` |
| Cadena `view_item_list → select_item → view_item → add_to_cart` | ✅ en orden, sin repetidos |
| `begin_checkout` al entrar a `/checkout` | ✅ **1 solo** (antes salía duplicado) |
| `add_shipping_info` al montar | ✅ **no dispara** (antes sí) |
| `add_payment_info` al montar | ✅ **no dispara** |
| `add_payment_info` al elegir transferencia | ✅ `payment_type: transferencia` |
| `purchase` con precio pagado | ✅ ver abajo |
| `purchase` duplicado al refrescar la pantalla de gracias | ✅ **0 eventos** |
| `shipping_calculated` al usar la calculadora | ✅ |

### Caso de prueba del `purchase`

10 calcos de 6 cm ($1.600 lista) por transferencia (−10 %), envío a Rosario:

```
value:          18900   ← antes 16000 (lista, sin envío)
shipping:        4500   ← antes 0
items[0].price:  1440   ← antes 1600
payment_method: "transferencia"
transaction_id: "EPI-TEST-123"
```

---

## 3. Precios y envío

| Caso | Esperado | Resultado |
|---|---|---|
| Calculadora, Rosario / Santa Fe | $4.500 · 2 a 3 días · faltan $50.000 | ✅ |
| Calculadora, Córdoba / Córdoba | $8.500 · 5 a 7 días · faltan $75.000 | ✅ |
| Calculadora vs. checkout | mismo número | ✅ coinciden |
| Carrito de 12 calcos + transferencia | subtotal $19.200 − $1.920 + $4.500 = **$21.780** | ✅ |
| Gap de envío gratis en el checkout | "Sumá $32.720" | ✅ |

---

## 4. Mobile

Desborde horizontal medido con `scrollWidth − innerWidth` a 375 px en:
`/` · `/categorias` · `/categoria/anime` · `/producto/anime/1` · `/carrito` ·
`/checkout` · `/mayorista` · `/personalizados` · `/negocio`

**Resultado: 0 px de desborde en las 9 rutas.** ✅

| Prueba | Resultado |
|---|---|
| Barra sticky visible al scrollear la ficha | ✅ |
| Botón de WhatsApp tapando el CTA sticky | ✅ corregido (se eleva en `/producto/*`) |
| Colchón para que la barra no tape el final de la página | ✅ |
| `TrustBadges` legibles sobre el campo de stickers | ✅ corregido (fondo opaco + blur) |
| `IntentSelector` — 3 cards apiladas en mobile, 3 columnas en desktop | ✅ |
| "Packs y servicios" sin huecos tras sacar `personalizados` | ✅ se reacomoda a 3 columnas |

### Targets táctiles

| Elemento | Antes | Ahora |
|---|---|---|
| CTA barra sticky (`+ Carrito` / `Comprar`) | 36–38 px | ✅ 44 px |
| Links del footer | 17 px | ✅ 44 px |
| Botones carrito / menú del header | 40–42 px | ✅ 44 px |
| Anterior / Siguiente en la ficha | 36 px | ✅ 44 px |
| Toggle de `SizeGuide` | 20 px | ✅ 44 px |
| Cuadrado de 4 cm en `SizeGuide` | 32 px | ✅ 44 px de área |
| "Calculá tu envío" | 36 px | ✅ 44 px |

**Aceptados por debajo de 44 px, a propósito:**

- **Breadcrumbs** (16 px) — hacerlos de 44 px rompe el rastro visual.
- **Links dentro de una oración** (ej. "Cambios y devoluciones", 15 px) — no se
  pueden agrandar sin romper el renglón.
- **Banner de promo del header** (34 px de alto, 278 px de ancho) — el área de
  toque es toda la barra.

---

## 5. Formulario de checkout

| Campo | `type` | `autocomplete` | `inputmode` |
|---|---|---|---|
| Nombre | text | `name` | — |
| Email | email | `email` | email |
| Teléfono | **tel** | `tel` | tel |
| Dirección | text | `street-address` | — |
| Ciudad | text | `address-level2` | — |
| Provincia | select | `address-level1` | — |
| Código postal | text | `postal-code` | numeric |

✅ Los 7 campos personales tienen `autocomplete`. Antes: **cero en todo el repo**.

Trust box: ✅ se adapta al medio de pago (Mercado Pago / transferencia directa).

---

## 5b. Fase P1 — armador de packs y carrito

Verificado en navegador a 375 px (8/8/2026).

| Prueba | Resultado |
|---|---|
| `/armar-pack` — precios de las 4 tarjetas | ✅ todos derivados de `config/pricing.js` |
| x100 con promo: monto y % coherentes | ✅ $120.001 = **75%** (antes decía 10%) |
| x50 muestra "envío gratis en Rosario" ($72.000 ≥ $50.000) | ✅ |
| x100 promo **no** muestra envío gratis ($39.999 < $50.000) | ✅ correcto, no miente |
| `?n=100` redirige a `/mayorista` | ✅ |
| Armador x10: elegir 3 diseños + "Completar" | ✅ 10/10 |
| Total del armador == total del carrito | ✅ $16.000 en los dos |
| Precio de transferencia con su condición | ✅ "$14.400 · elegís el medio de pago en el checkout" |

### Líneas que llegan al carrito desde un pack x10

```
sticker:anime-1:6cm  x1   basePrice 1600   sku 000001
sticker:anime-2:6cm  x1   basePrice 1600   sku 000002
sticker:anime-3:6cm  x8   basePrice 1600   sku 000003
```

✅ Gramática de id **sin cambios** → el servidor las valida con la regla
`sticker:` de siempre. SKUs de Meta preservados. 10 unidades → el 10 % por
transferencia se activa solo.

| Prueba | Resultado |
|---|---|
| `pack_completed` | ✅ `{pack_size: x10, units: 10, designs: 3, value: 16000}` |
| `pack_builder_start` duplicado por StrictMode | ✅ 1 solo |
| **Mayorista sin romper** | ✅ sigue emitiendo `pack:mayorista100:4cm:{ts}` · basePrice 39999 · qty 1 |
| Checkout tras el pack x10 + transferencia | ✅ $16.000 − $1.600 + $4.500 = **$18.900** |
| Resumen del carrito coherente | ✅ Total $16.000 · "Con transferencia $14.400" aparte |
| Nav a 1024 px con 8 links | ✅ una sola línea (40 px), 0 px de desborde |
| Desborde horizontal a 375 px en 10 rutas | ✅ **0 px** (incluye `/armar-pack` y `?n=20`) |

---

## 6. Pendiente de probar en producción

Estas pruebas **no se pueden hacer en local** porque necesitan las Netlify
Functions y credenciales reales:

- [ ] Compra completa con **Mercado Pago** → confirmar que `/pago-exitoso` recibe
      el `external_reference` y dispara **un solo** `purchase` con el monto real.
- [ ] Compra por **transferencia** → confirmar el `purchase` con
      `payment_method: transferencia` y que el mail + CRM siguen llegando.
- [ ] **GA4 DebugView** y **GTM Preview** con tráfico real.
- [ ] **Meta → Probar eventos**: que el `Purchase` del navegador y el de la CAPI
      se deduplican por `event_id` (uno solo, origen "Navegador y servidor").
- [ ] Pedido con **archivo personalizado** → que el link de Cloudinary llega
      entero al mail y al CRM.
- [ ] Pago rechazado → `/pago-error`.
- [ ] Carrito viejo en `localStorage` de un cliente que no entra hace semanas.

---

## 7. Casos del plan (§58) todavía sin cubrir

Requieren P1 o entorno productivo: cambiar tamaño desde el carrito, quitar cupón,
archivo demasiado grande, formato inválido, conexión lenta, botón "atrás" del
navegador a mitad del checkout.
