# CRO AUDIT — EPICALCOS

> Auditoría técnica y de conversión previa a cualquier cambio.
> Fecha: **8 de agosto de 2026**. Rama: `main`. Commit base: `1230eb2`.
> Estado del repo al auditar: limpio, `npm test` → **55/55 verdes**.

---

## 1. Cómo funciona la tienda hoy

### 1.1 Stack real

| Capa | Qué es | Dónde vive |
|---|---|---|
| Frontend | React 18 + Vite 5 + Tailwind 3 + react-router-dom 6 (SPA, `BrowserRouter`) | `frontend/` |
| Lenguaje | JavaScript (JSX). **No hay TypeScript** | — |
| Tests | Vitest (`environment: node`, solo lógica pura) — 6 archivos, 55 tests | `frontend/src/lib/*.test.js` |
| Backend productivo | **Netlify Functions** | `netlify/functions/` |
| Backend legacy | Express + MP SDK — **no deployado, no referenciado por el frontend** | `backend/` |
| Persistencia de pedidos | **Netlify Blobs** (`@netlify/blobs`) — no hay base de datos | `netlify/functions/lib/orderStore.js` |
| CRM | Notion (API directa) + webhook firmado al CRM interno (`epicalcos-app`) | `_notion.js`, `lib/crmWebhook.js` |
| Mails | Resend (aviso interno + confirmación al cliente) | `lib/notify.js` |
| Pagos | Mercado Pago Checkout Pro (`init_point`) + transferencia bancaria manual | `create-preference.js`, `create-order-transfer.js` |
| Imágenes de usuario | Cloudinary (unsigned preset) | `services/uploadService.js` |
| Catálogo | **Estático**: JSON + PNG en `frontend/public/data/` y `public/stickers/` | generado por `scripts/*.mjs` |
| Analytics | GTM + GA4 (dataLayer), Meta Pixel, Meta CAPI (server), Microsoft Clarity | `lib/analytics.js`, `index.html`, `main.jsx` |
| Deploy | Netlify, `base = "frontend"`, `ignore = "exit 1"` (todo push a `main` deploya) | `netlify.toml` |

**No existe**: sistema de usuarios, login, panel admin en este repo, stock real, base de datos, SSR.
El checkout ya es **100 % como invitado** — el punto 29 del plan ya está cumplido.

### 1.2 Rutas (`App.jsx`)

```
/                        Home (eager — LCP)
/categorias              grilla de 99 categorías + buscador global
/categoria/:slug         grilla de diseños de una categoría
/producto/:slug/:num     PDP
/personalizados          configurador (3 pasos: tamaño, corte, archivo)
/mayorista               PackBuilder (min 100, 50% off · promo 100×$39.999 hasta 14/8)
/negocio                 promo 100 calcos de 1 logo en 6cm — $39.999
/tatuajes /polaroid      productos de precio fijo (FixedProductPage)
/carrito  /checkout
/pago-exitoso /pago-transferencia /pago-pendiente /pago-error
/contacto  /politicas/*  /terminos-y-condiciones
```

Todo lo que no es Home va **lazy**. `HIDDEN_SECTIONS` en `config/site.js` es el interruptor único para despublicar una sección (hoy vacío).

### 1.3 Componentes que intervienen en una compra

```
Descubrimiento   Hero(buscador) → Categorias → Category → StickerCard
                 Home → FeaturedStickers / CategoryCard / SPECIALS
PDP              Producto.jsx (galería + panel de compra)
Armado           PackBuilder.jsx (mayorista) · Configurador.jsx (personalizados)
                 NegocioForm.jsx (promo negocio) · FixedProductPage.jsx (tatuajes/polaroid)
Carrito          CartContext (estado + precios derivados) → CartDrawer / Cart.jsx
Checkout         Checkout.jsx + CheckoutForm.jsx + SuggestedStickers (cross-sell)
Pago             paymentService → /api/create-preference | /api/create-order-transfer
Post-pago        PaymentSuccess / PaymentTransfer + webhook MP → mail + Notion + CAPI
```

### 1.4 Motor de precios

`frontend/src/config/pricing.js` **espejado** en `netlify/functions/lib/pricing.js`.
El servidor **recalcula el precio de cada línea a partir del id** y rechaza el pedido con `price_mismatch` si no coincide. Es la garantía anti-manipulación y está bien hecha.

Reglas vigentes:

| Regla | Valor | Condición |
|---|---|---|
| Precio unitario | 4cm $1.200 · 6cm $1.600 · 9cm $2.000 | precio de vidriera = Mercado Pago |
| Volumen | 10 % off desde **10 calcos sueltos** | **solo pagando por transferencia** |
| Cupón `EPICA10` | 10 % — oculto, solo leads del popup | acumulable con transferencia (tope 90 %) |
| Cupón `EMOJI50` | 2x1 — **vencido el 4/8/2026** | no acumulable con nada |
| Promo 3x2 | **vencida el 26/7/2026** | — |
| Promo mayorista | 100 calcos $39.999, solo 4 y 6 cm | **vigente hasta el 14/8/2026 23:59** |
| Mayorista normal | desde 100 calcos, 50 % off | sin tope |
| Negocio | 100 calcos de 1 logo, 6cm, $39.999 | precio fijo |
| Personalizados | precio de catálogo por tamaño, **sin mínimo** | — |

Envío (`config/site.js` ↔ `functions/lib/pricing.js`):
Rosario $4.500 (gratis ≥ $50.000) · próximas $6.500 · resto del país $8.500 (gratis ≥ $75.000) · retiro gratis.

---

## 2. Problemas detectados

### 2.1 CRÍTICOS de medición (P0)

**A. El `purchase` de GA4 y del Pixel manda el valor equivocado.**
`routes/PaymentSuccess.jsx:67` → `trackPurchase({ items, total: subtotal, shipping: 0 })`.
`subtotal` viene de `CartContext.derived` y se calcula con **`basePrice`** (precio de lista), no con el precio realmente pagado — `pricedItems()` solo se usa dentro del checkout y no sobrevive al redirect a Mercado Pago. Los `items` también viajan con `price = basePrice`.
Consecuencia: con cupón, 3x2 o 10 % por transferencia el `value` queda **inflado**, el envío **nunca** se reporta, y el ROAS de Meta/GA4 está mal calculado. El `Purchase` de CAPI (server, webhook) sí manda el monto real → **los dos canales reportan números distintos para la misma compra**.

**B. El canal transferencia es invisible.**
`/pago-transferencia` limpia el carrito y **no dispara ningún evento**. Ni GA4, ni Pixel, ni CAPI (CAPI solo corre en el webhook de MP, que nunca se dispara para transferencia). Es decir: el medio de pago que **tiene el incentivo del 10 %** no se mide en absoluto. Ninguna optimización de campañas ve esas ventas.

**C. Faltan eventos del funnel estándar.**
Existen: `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `purchase`, `search`, `generate_lead`.
**Faltan**: `view_item_list`, `select_item` (está definido en `lib/analytics.js:108` pero **nunca se llama**), `add_payment_info`.
Además `add_shipping_info` se dispara **al montar el checkout** (`Checkout.jsx:145`, efecto con dep `[ship.method]`), no cuando el usuario elige algo → el evento siempre existe y no mide nada.

**D. El PDP mobile no tiene CTA sticky.**
`components/StickyMobileBar.jsx` existe, está terminado… y **no lo importa nadie**. Es código muerto. El punto 47 del plan ya tiene el componente escrito, solo falta cablearlo.

### 2.2 CRÍTICOS de claridad comercial (P0)

**E. El 10 % OFF se comunica con condición en unos lados y sin condición en otros.**

| Lugar | Texto actual | Problema |
|---|---|---|
| `Hero.jsx:112` | "Desde 10 calcos, 10% off" | no dice transferencia |
| `Categorias.jsx:86` | "Desde 10 calcos, 10% off **automático**" | **es falso** — no es automático |
| `Categorias.jsx:145` | "Desde 10 calcos, 10% off" | no dice transferencia |
| `Category.jsx:82` | "Desde 10 calcos, 10% off" | no dice transferencia |
| `Producto.jsx:310` | ✅ dice "pagando por transferencia bancaria" | correcto |
| `Cart.jsx` / `Checkout.jsx` / `FAQ` / `HowToBuy` | ✅ correctos | |

El usuario que entra por catálogo ve "10 % off automático", llega al checkout, elige Mercado Pago y **el descuento no está**. Es exactamente el escenario que el punto 5 del plan pide eliminar.

**F. El costo de envío no se puede conocer antes del checkout.**
No hay calculadora en Home, PDP ni carrito. El carrito dice "Se calcula en el checkout". Además el **código postal se pide pero no se usa**: `calculateShipping()` deriva la zona de `city + province` escritos a mano, así que un typo en "Rosario" cobra tarifa de interior.

**G. Producción y entrega están mezcladas.**
`shipping.productionDaysInterior = '5 a 7 días hábiles'` — pero la FAQ aclara que esos 5–7 días **incluyen el correo**, o sea es *entrega*, no *producción*. El `CheckoutForm.jsx:170` lo muestra bajo la etiqueta "Plazos". El nombre de la variable induce al error. Punto 6 del plan.

**H. El Hero mobile no tiene ninguna señal de confianza.**
`Hero.jsx:64` (badge "Resistentes al agua y al sol") está `hidden sm:inline-flex` y el párrafo de propuesta (`:111`) está `hidden sm:block`. En un teléfono el hero es: card de promo + titular rotante + H1 chico + buscador. **Cero trust badges, cero "+120.000 calcos vendidas"** — que solo aparecen rotando en el `AnnouncementBar`.

### 2.3 Fricción (P1)

- **Checkout sin `autocomplete`**: cero atributos `autoComplete` en todo el repo. Sin `type="tel"` ni `inputMode` en teléfono/CP. En mobile obliga a tipear todo a mano. Impacto directo y barato de arreglar (punto 30).
- **Carrito sin barra de envío gratis**: el gap a $50.000/$75.000 solo aparece en el checkout (`Checkout.jsx:289`), cuando ya no puede modificar el pedido con comodidad.
- **PDP sin guía visual de tamaños**: la objeción "¿qué tamaño elijo?" no está resuelta en ningún lado. Solo hay etiquetas "4 cm / 6 cm / 9 cm".
- **PDP sin prueba social ni garantía**: los testimonios viven solo en Home y `/negocio`.
- **Sin cross-sell en el carrito**: `SuggestedStickers` solo está montado en `/checkout`.
- **Sin `PackCard` / landing de packs x10-x20-x50**: solo existe el pack de 100 (mayorista/negocio). El salto de "1 calco" a "100 calcos" no tiene escalones.
- **Sin trust box en el checkout**: hay copy suelto, no un bloque de confianza cerca del botón de pago.

### 2.4 Técnicos

- **CSP en `Report-Only`** (`netlify.toml`) — pendiente de enforcar.
- **Espejo de precios frágil**: `config/pricing.js` ↔ `functions/lib/pricing.js` se mantienen a mano. Mitigado por `promoPricing.test.js`, que verifica paridad. **No romper este test.**
- **Links a rutas fantasma**: `Checkout.jsx:155` y `PaymentSuccess.jsx:144` apuntan a `/productos`, que solo existe como redirect a `/categorias`.
- **Imágenes sin `width`/`height`** en todo el catálogo → CLS. Sin `srcset`, PNG servidos crudos desde `/public`.
- **Clarity inline y síncrono en el `<head>`** de `index.html` — bloquea el parseo antes del LCP.
- **README desactualizado**: describe `frontend/src/data/products.js` (no existe) y el backend Express como si fuera el productivo.
- **Números de marca sin centralizar**: "+120.000 calcos vendidas" y "+5.000 clientes" existen solo como strings del `AnnouncementBar` (`site.js:176-177`). No son reutilizables (punto 22 pide `brandStats`).

### 2.5 Lo que YA está bien (no tocar)

✅ Precios revalidados server-side con rechazo por `price_mismatch`
✅ Firma HMAC del webhook de MP verificada
✅ CORS restringido por origen · headers de seguridad · `.env` fuera de git
✅ Checkout como invitado, sin campos de más
✅ Meta CAPI con deduplicación por `event_id` = `purchase-{orderId}`
✅ Sitemap generado en `prebuild` · JSON-LD Organization / Product / Breadcrumb / FAQ
✅ **Sin `AggregateRating` inventado** — no hay reviews falsas
✅ Testimonios reales con foto · logos de marcas
✅ Lazy routes · lazy images · `IntersectionObserver` con respeto a `prefers-reduced-motion`
✅ `PackBuilder` ya existe y es sólido — el punto 10 del plan **no se implementa de cero, se extiende**

---

## 3. Riesgos de la intervención

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Tocar precios en un solo lado del espejo → `price_mismatch` y checkout roto para todos | Cambiar SIEMPRE los dos archivos + correr `npm test` |
| R2 | Cambiar la forma del `id` de una línea del carrito → el server no la reconoce | No tocar la gramática de ids (`sticker:`, `pack:`, `custom:`, `fixed:`, `negocio:`) |
| R3 | Carritos viejos en `localStorage` (`epicalcos.cart.v2`) con líneas incompatibles | Ya hay una guarda (`esCustomViejo`); replicarla ante cualquier cambio de forma |
| R4 | Duplicar el `purchase` al arreglar el tracking de transferencia | Un solo disparo por pantalla + `event_id` estable |
| R5 | Romper URLs indexadas al reorganizar Home/PDP | No cambiar rutas; solo contenido |
| R6 | La promo mayorista **vence el 14/8/2026** — cualquier copy hardcodeado queda mintiendo | Usar siempre `isMayoristaPromoActive()` |
| R7 | `npm run build` corre `prebuild` → regenera el sitemap | Verificar diff del sitemap antes de commitear |

---

## 4. Plan de archivos a modificar

### P0 — Fricción crítica

| Bloque | Archivos |
|---|---|
| P0.1 Claridad de descuentos | `routes/Categorias.jsx`, `routes/Category.jsx`, `components/Hero.jsx`, **nuevo** `components/DiscountNote.jsx` |
| P0.2 Producción vs entrega | `config/site.js`, `components/CheckoutForm.jsx`, **nuevo** `components/ShippingInfo.jsx` |
| P0.3 Trust en Home/Hero | `components/Hero.jsx`, **nuevo** `config/brandStats.js`, **nuevo** `components/TrustBadges.jsx` |
| P0.4 PDP | `routes/Producto.jsx`, `components/StickyMobileBar.jsx`, **nuevo** `components/SizeGuide.jsx` |
| P0.5 Analytics | `lib/analytics.js`, `routes/PaymentSuccess.jsx`, `routes/PaymentTransfer.jsx`, `routes/Checkout.jsx`, `routes/Category.jsx`, `components/CheckoutForm.jsx` |
| P0.6 Checkout mobile | `components/CheckoutForm.jsx` (`autocomplete`, `inputMode`, `type`) |

### P1 — Packs y carrito

`components/PackCard.jsx` (nuevo) · `routes/ArmaTuPack.jsx` (nuevo) · `components/PackBuilder.jsx` (extender, **no duplicar**) · `routes/Cart.jsx` · `components/FreeShippingProgress.jsx` (nuevo) · `components/SocialProof.jsx` (nuevo, reusando `Testimonials`)

### P2 — Landings, analytics avanzado, performance, SEO

`routes/landing/*` (nuevas) · `lib/analytics.js` · `index.html` · `docs/ANALYTICS.md`

---

## 5. Decisiones tomadas frente al plan

1. **No se rediseña nada.** Se mantiene la identidad (dark + gradiente fucsia/naranja, `card-glass`, `btn-primary`). Los tokens ya existen en `tailwind.config.js` y `styles/index.css` — no se crea un design system nuevo.
2. **El "Pack Builder" del punto 10 ya existe** (`PackBuilder.jsx`, 455 líneas, con promo de precio fijo, subida de archivos y cantidades editables). Se **extiende** con presets x10/x20/x50/x100, no se reescribe.
3. **El "selector de intención" del punto 8** se resuelve reordenando y reencabezando el bloque "Packs y servicios" que ya está en Home, en vez de agregar una cuarta sección compitiendo por el mismo scroll.
4. **La garantía (punto 23) no se inventa.** `/politicas/cambios` dice que no hay cambios ni devoluciones salvo desperfecto de fábrica. El copy comercial va a decir exactamente eso.
5. **El `purchase` de transferencia** se va a disparar en `/pago-transferencia` con el valor real. Es una venta *registrada, pendiente de comprobante* — se documenta la salvedad en `ANALYTICS.md` para que el dato se lea bien.
