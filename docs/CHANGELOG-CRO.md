# CHANGELOG CRO — EPICALCOS

---

## 2026-08-08 · Fase P3

### A/B testing

- **Nuevo** `lib/experiments.js` — bucketing propio, sin dependencias y sin
  parpadeo (asignación sincrónica, el componente ya renderiza con su variante).
- Kill switch (`active: false`), override de QA por query param, exposición
  única por carga de página, `experiment_view` como evento **y** como
  `user_property` para poder segmentar `purchase`.
- **Regla dura**: los experimentos son solo de presentación. Un A/B de precios
  rompería la validación del servidor (`price_mismatch`).
- Dos experimentos vivos: `ahorro_pack` (% vs $) y `guia_tamano` (colapsada vs
  abierta).
- **Corregido**: el `_vid` se perdía en cada asignación porque `guardarEstado`
  pisaba con un snapshot viejo.
- **Nuevo** `lib/experiments.test.js` — 9 tests (64 en total).

### Personalización

- **Nuevos** `lib/recientes.js` + `RecentCategories` — "Seguí donde estabas".
  Solo slugs en `localStorage`, sin PII. Invisible para el visitante nuevo y
  hasta tener 2 categorías distintas.

### Docs

- **Nuevo** `docs/AUTOMATIZACIONES.md` — las 11 automatizaciones que ya corren y
  la especificación del carrito abandonado (**no implementado**: manda mails en
  nombre del cliente y necesita su OK).
- `CRO-EXPERIMENTS.md` — proceso completo de CRO continuo y criterios de cierre.

### Archivos

**Nuevos**

```
docs/AUTOMATIZACIONES.md
frontend/src/components/RecentCategories.jsx
frontend/src/lib/experiments.js
frontend/src/lib/experiments.test.js
frontend/src/lib/recientes.js
```

**Modificados**

```
frontend/src/components/PackCard.jsx
frontend/src/components/SizeGuide.jsx
frontend/src/lib/analytics.js
frontend/src/routes/Category.jsx
frontend/src/routes/Home.jsx
frontend/src/routes/LandingUso.jsx
frontend/src/routes/Producto.jsx
```

---

## 2026-08-08 · Fase P2

### Landings

- **Nuevas** `/calcos-termo`, `/calcos-notebook`, `/calcos-auto` — casos de uso
  que no existían como página. Cada una con su tamaño recomendado, su FAQ
  propia (`FAQPage` JSON-LD) y diseños reales intercalados del catálogo.
- **Nuevo** `config/landings.js` — todo el copy en un solo lugar.
- **301** para las URLs de anuncio que apuntan a páginas existentes:
  `/calcos-personalizadas` → `/personalizados`, `/calcos-para-negocios` →
  `/negocio`, `/pack-100-calcos` → `/mayorista`. **No** se crearon gemelas:
  habría sido contenido duplicado.
- Las 3 landings entran al sitemap (115 URLs).

### Performance

- **Nuevo** `scripts/optimize-images.mjs` (idempotente).
- Imágenes descargadas en el Home: **820 KB → 103 KB**. El 79 % del peso era el
  campo decorativo del hero: PNG de 500×500 mostrados a 66–132 px.
- `stickers-cutout/` −89 % · `testimonials/` −95 % en disco.
- Clarity: de inline síncrono en `<head>` a diferido a `load` (257 ms). La cola
  se registra igual desde el primer momento, no se pierde sesión.
- `width`/`height` + `decoding="async"` en cutouts, testimonios y `SocialProof`.
  CLS medido: **0**.

### FAQ

- De 13 a **20 preguntas** + pestaña Personalizados. Las 8 nuevas son las que
  pedía el §42 y faltaban.

### Analytics

- `view_item_list` en Home (`Los más vendidos`) y en las landings.
- `item_list_name` consistente en las tres superficies.
- **Nuevo** `docs/DASHBOARD.md` — métricas, dimensiones personalizadas a crear
  en GA4 y cómo leer los ratios.
- CSP: **no se enforzó**. Procedimiento seguro documentado en `ANALYTICS.md` §7.

### Archivos

**Nuevos**

```
docs/DASHBOARD.md
frontend/src/config/landings.js
frontend/src/routes/LandingUso.jsx
scripts/optimize-images.mjs
```

**Modificados**

```
frontend/index.html
frontend/public/_redirects
frontend/src/App.jsx
frontend/src/components/FAQ.jsx
frontend/src/components/FeaturedStickers.jsx
frontend/src/components/SocialProof.jsx
frontend/src/components/StickerField.jsx
frontend/src/components/Testimonials.jsx
frontend/src/data/testimonials.js
netlify.toml
scripts/generate-sitemap.mjs
```

**Sin tocar**: `netlify/functions/*` y la implementación de Meta Pixel/CAPI
(la auditoría la encontró correcta; duplicarla es el error que advierte el §38).

---

## 2026-08-08 · Fase P1

### Armá tu pack

- **Nueva ruta** `/armar-pack` con tarjetas x10 / x20 / x50 / x100 (`PackCard`).
- `PackBuilder` acepta `emit="stickers"`: emite una línea `sticker:` **por
  diseño** en vez de una línea `pack:`. Los packs de catálogo no son una regla
  de precio nueva — usan el 10 % por transferencia que ya existía. **Cero
  cambios en `netlify/functions/`**, cero riesgo de `price_mismatch`.
- El x100 redirige a `/mayorista`, que sí tiene regla propia en el servidor.
- **Corregido**: el armador prometía $14.400 en un x10 y al carrito llegaban
  $16.000. Ahora muestra el total de lista y el de transferencia con su condición.
- **Corregido**: `PackCard` del x100 decía "Ahorrás $120.001 · **10%** off". El
  porcentaje salía de una constante; ahora se deriva del ahorro real (75 %).
- Nav: `Packs` en vez de `Armá tu pack` — con 8 links la etiqueta larga partía
  el nav en dos líneas a 1024 px. `whitespace-nowrap` en los links del header.
- `/armar-pack` agregado al sitemap (solo la portada; `?n=` canonicaliza igual).

### Carrito

- **Nuevo** `FreeShippingProgress`: cuánto falta para el envío gratis, nombrando
  **los dos umbrales** porque acá todavía no se conoce el destino.
- Medios de pago y el 10 % por transferencia **antes** de entrar al checkout.
- `ShippingInfo` (producción + entrega) y `SuggestedStickers` (cross-sell, ya
  existía y solo estaba en `/checkout`).
- **Corregido**: el resumen mostraba "−$1.600" arriba de un Total que no lo
  restaba. Ahora el Total es el de Mercado Pago y "Con transferencia" va aparte.
- Link "Seguir comprando".

### Prueba social

- **Nuevo** `data/testimonials.js` — los testimonios reales salen de
  `Testimonials.jsx` para poder reusarse.
- **Nuevo** `SocialProof` (versión compacta) en ficha de producto, carrito y
  personalizados.

### Personalizados

- `QueSigue` suma el **plazo de producción** (solo estaba la entrega) y responde
  **"¿Y si mi archivo no está perfecto?"** — el sitio ya lo respondía, pero en
  `/pago-exitoso`, después de pagar.
- `SocialProof` en el configurador.
- **`SubidaArchivo` no se tocó**: ya cumple todo el §19 del plan.

### Analytics

- **Nuevos** `pack_builder_start` y `pack_completed` (con unidades y diseños
  distintos), ambos idempotentes contra el doble efecto de StrictMode.

### Archivos

**Nuevos**

```
frontend/src/components/FreeShippingProgress.jsx
frontend/src/components/PackCard.jsx
frontend/src/components/SocialProof.jsx
frontend/src/data/testimonials.js
frontend/src/routes/ArmaTuPack.jsx
```

**Modificados**

```
frontend/src/App.jsx
frontend/src/components/Header.jsx
frontend/src/components/PackBuilder.jsx
frontend/src/components/Testimonials.jsx
frontend/src/components/personalizados/Configurador.jsx
frontend/src/components/personalizados/QueSigue.jsx
frontend/src/config/site.js
frontend/src/context/CartContext.jsx
frontend/src/lib/analytics.js
frontend/src/routes/Cart.jsx
frontend/src/routes/Producto.jsx
scripts/generate-sitemap.mjs
```

**Sin tocar**: `netlify/functions/*`. El espejo de precios sigue intacto y
`promoPricing.test.js` en verde.

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
