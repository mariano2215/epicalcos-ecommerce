# CRO IMPLEMENTATION — EPICALCOS

Qué se implementó, con la hipótesis comercial detrás de cada cambio.
Fase completada: **P0**. Estado de P1–P3 al final.

---

## P0 — Fricción crítica ✅

### 1. La condición del descuento, dicha una sola vez

**Problema.** El 10 % desde 10 calcos **solo corre pagando por transferencia**,
pero el sitio lo contaba distinto en cada pantalla. `/categorias` llegaba a
decir *"10% off automático"* — literalmente falso. El cliente lo descubría
recién al elegir medio de pago en el checkout, que es el peor momento posible.

**Cambio.** `components/DiscountNote.jsx` exporta la frase (`BULK_DISCOUNT_SHORT`,
`BULK_DISCOUNT_LONG`) y la caja con sus tres estados (ya lo tiene / le faltan N /
todavía no). La consumen hero, `/categorias`, grilla de categoría y ficha.

**Hipótesis.** Una promesa que no cambia entre la publicidad y el checkout baja
el abandono en el paso de pago.

### 2. Producción ≠ entrega

**Problema.** Un solo campo para las dos cosas: el interior leía *"producción:
5 a 7 días hábiles"*, cuando esos días ya incluyen el correo (así lo dice la FAQ
y el mail de confirmación). Un plazo de taller inflado, sin motivo.

**Cambio.** `config/site.js` ahora tiene `production` (2 a 3 días hábiles, igual
para todo destino) y `deliveryRosario` / `deliveryInterior` por separado.

### 3. `ShippingInfo` — el envío antes del checkout

**Problema.** No había forma de saber cuánto costaba el envío sin completar todo
el formulario. El carrito decía *"se calcula en el checkout"*.

**Cambio.** Componente con producción, entrega, umbrales de envío gratis y
**calculadora**. Montado en la ficha de producto.

> La calculadora pide **provincia + ciudad**, no código postal, porque es
> exactamente lo que consume `calculateShipping()`: el número que muestra es el
> mismo que se va a cobrar. Un campo de CP quedaría lindo pero no cambiaría el
> resultado — el CP se pide en el checkout y hoy **no** participa del cálculo.

### 4. Ficha de producto

- **`SizeGuide`** — los tres tamaños dibujados a escala real entre sí (4 : 6 : 9)
  más para qué sirve cada uno. Clickear un cuadrado cambia el tamaño elegido.
  Resuelve la objeción "no sé cuál me conviene" sin fotos que no tenemos.
- **`StickyMobileBar`** — el componente ya existía **y no lo usaba nadie**. Ahora
  la ficha mobile mantiene el CTA visible al scrollear. El botón de WhatsApp se
  eleva para no taparlo.
- **`TrustBadges`** + `ShippingInfo` + `DiscountNote` arriba del pliegue.

### 5. Hero mobile con señales de confianza

**Problema.** El badge "resistentes al agua y al sol" y el párrafo de propuesta
están `hidden sm:*`. En un celular el hero era: promo + titular rotante + H1
chico + buscador. **Cero motivos para confiar.**

**Cambio.** `TrustBadges` visible en todos los tamaños (fondo opaco + blur: sobre
el campo de stickers un `bg-white/[0.06]` era ilegible). Números centralizados en
`config/brandStats.js`.

### 6. `IntentSelector` — bifurcación por intención

**Problema.** Home arrancaba directo con catálogo. El que venía a mandar su logo
o a comprar para su negocio tenía que deducir solo que existía una página.

**Cambio.** Tres tarjetas después del hero: *Para mí* → `/categorias`,
*Mis propios diseños* → `/personalizados`, *Para mi negocio* → `/negocio`.
Respeta `HIDDEN_SECTIONS`. Para no duplicar, `personalizados` salió de la grilla
"Packs y servicios" (que se reacomodó sola a 3 columnas).

### 7. Analytics

Ver **`docs/ANALYTICS.md`** para el detalle. Resumen de lo roto que se arregló:

| Qué | Antes | Ahora |
|---|---|---|
| `value` del `purchase` | precio de **lista** | precio **pagado** + envío |
| `shipping` | siempre `0` | el real |
| Canal transferencia | **no medía nada** | `purchase` con `payment_method` |
| `view_item_list` | no existía | grilla de categoría |
| `select_item` | escrito, nunca llamado | click de la grilla a la ficha |
| `add_payment_info` | no existía | al elegir medio de pago |
| `add_shipping_info` | al montar el checkout | al **cambiar** el método |
| `begin_checkout` | duplicado por StrictMode | una sola vez |

### 8. Checkout mobile

- `autocomplete` + `inputMode` + `type` en **todos** los campos. No había **ni
  uno** en todo el repo: en mobile había que tipear nombre, mail, teléfono y
  dirección a mano y con el teclado equivocado.
- Trust box antes del botón de pago, solo con afirmaciones verificables.

### 9. Targets táctiles

Subidos a ≥44 px: CTA de la barra sticky (venían en 36–38 px), links del footer
(17 px), botones del header, navegación anterior/siguiente de la ficha, toggles
de `SizeGuide` y `ShippingInfo`.

Quedan por debajo, a propósito: los **breadcrumbs** y los links **dentro de una
oración** — hacerlos de 44 px rompería el renglón. Documentado en `QA-CHECKLIST.md`.

---

## Lo que NO se hizo, y por qué

| Punto del plan | Decisión |
|---|---|
| Rediseño | No se tocó la identidad. Los tokens ya existían en `tailwind.config.js` + `styles/index.css`; no se creó un design system paralelo. |
| Pack Builder (§10) | **Ya existe** (`PackBuilder.jsx`, 455 líneas, con promo de precio fijo, subida de archivos y cantidades editables). Se extiende en P1, no se reescribe. |
| Checkout como invitado (§29) | **Ya estaba.** No hay sistema de usuarios. |
| Garantía (§23) | No se inventó ninguna. `/politicas/cambios` dice que no hay cambios ni devoluciones salvo desperfecto de fábrica, y el copy dice exactamente eso. |
| `AggregateRating` (§55) | No se agregó: no hay reviews reales que lo sostengan. |
| Calculadora por CP | El CP no participa del cálculo de envío. Se usa provincia + ciudad, que sí. |

---

## Estado de las fases

| Fase | Estado |
|---|---|
| **P0** — fricción crítica | ✅ **completa, verificada en navegador** |
| **P1** — packs, carrito, personalizados | ⬜ pendiente |
| **P2** — landings, performance, SEO, dashboards | ⬜ pendiente |
| **P3** — A/B testing y CRO continuo | ⬜ backlog escrito en `CRO-EXPERIMENTS.md` |

### Próximo (P1), en orden de impacto esperado

1. **Barra de envío gratis en el carrito** — hoy el gap a $50.000/$75.000 solo
   aparece en el checkout, cuando ya es incómodo modificar el pedido.
2. **Packs x10 / x20 / x50** — el salto de 1 calco a 100 no tiene escalones.
   Se arma con `PackBuilder`, que ya soporta `target` y `min`.
3. **Cross-sell en el carrito** — `SuggestedStickers` ya existe y solo está en
   `/checkout`.
4. **`SocialProof` cerca de los CTA** — los testimonios reales solo viven en Home
   y `/negocio`.
