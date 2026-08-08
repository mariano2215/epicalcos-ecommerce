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

---

## P1 — Packs, carrito y personalizados ✅

### 10. `/armar-pack` — el escalón que faltaba

**Problema.** Se podía comprar 1 calco o 100 (mayorista). Nada en el medio.

**Decisión de diseño — la más importante de esta fase.** Los packs x10/x20/x50
**no son una regla de precio nueva**: son una forma guiada de elegir varios
diseños, y van al carrito como **calcos sueltas** (`emit="stickers"` en
`PackBuilder`). El descuento que muestran es el 10 % por transferencia desde 10
calcos que **ya existía**.

La alternativa —crear un tipo de línea `pack:catalogo`— habría obligado a:
1. tocar el espejo `config/pricing.js` ↔ `functions/lib/pricing.js`, que es el
   riesgo R1 de la auditoría (un lado desincronizado = nadie puede comprar), y
2. **inventar porcentajes de descuento que nadie definió**.

El x100 sí tiene regla propia en el servidor, así que su tarjeta manda a
`/mayorista`. **Cero cambios en `netlify/functions/`.**

**Coherencia de precios.** El armador mostraba $14.400 para un x10 cuando al
carrito iban a llegar $16.000 — el 10 % recién se aplica en el checkout si elige
transferencia. Ahora el total es el de lista (lo que va a ver) y el de
transferencia va al lado con su condición.

**Bug encontrado y corregido.** La tarjeta x100 decía *"Ahorrás $120.001 · 10%
off"*: el monto era correcto y el porcentaje salía de una constante. Ahora el %
**se deriva del ahorro real** (75 %), así no pueden contradecirse nunca.

### 14. Carrito — las 8 preguntas del plan §24

| Pregunta | Antes | Ahora |
|---|---|---|
| ¿Cuánto falta para envío gratis? | solo en el checkout | `FreeShippingProgress` |
| ¿Cuándo llega? | no estaba | `ShippingInfo` |
| ¿Cómo puedo pagar? | una línea al pie | bloque con los dos medios y el 10 % |
| ¿Qué descuento tengo? | *"−$1.600"* sobre un total que no lo restaba | Total (MP) + "Con transferencia" aparte |
| Cross-sell | solo en `/checkout` | `SuggestedStickers` |
| Confianza | no había | `SocialProof` |

> `FreeShippingProgress` nombra **los dos umbrales** ($50.000 Rosario / $75.000
> resto) porque en el carrito todavía no se conoce el destino. Una barra sin
> condición que el checkout después desmiente es el mismo error que
> *"10% off automático"*.

### 13. `SocialProof` — prueba social donde se decide

Los testimonios reales estaban embebidos en `Testimonials.jsx` (bloque del Home).
Ahora viven en `data/testimonials.js` y hay una versión compacta montada en la
**ficha de producto**, el **carrito** y **personalizados**.

### 11. Personalizados

El configurador ya respondía casi todo lo que pide el plan §17. Faltaban dos:

- **El plazo de producción** no estaba en la página (solo la entrega).
- **"¿Y si mi archivo no está perfecto?"** — la objeción más cara de este
  producto. El sitio ya lo respondía… en `/pago-exitoso`, o sea **después de
  pagar**. Ahora está en el bloque "Qué pasa después de comprar", con el mismo
  contenido que la empresa ya cumple (se revisa antes de imprimir, y si no da se
  escribe por WhatsApp). No se inventó ninguna promesa nueva.

### 12. Upload — **no se tocó, a propósito**

`SubidaArchivo.jsx` ya implementa **todo** lo que pide el plan §19: drag & drop,
selector, preview, reemplazo, eliminación, progreso, validación de formato/peso,
compresión automática de fotos pesadas, cola de subidas en paralelo y aviso de
resolución insuficiente. Crear un `FileUpload` nuevo habría sido duplicarlo.

**Lo que queda pendiente del §20 (trazabilidad del archivo):** hoy la relación
**pedido → archivos** es completa y no ambigua (las URLs de Cloudinary viajan en
el resumen al mail y al CRM). Lo que **no** existe es la relación inversa: abrir
Cloudinary y saber de qué pedido es un archivo.

No se resolvió en esta fase por dos razones concretas:
1. El archivo se sube **antes de que el pedido exista** (el `orderId` se genera
   recién en `create-preference`), así que no se puede nombrar con él.
2. El ejemplo del plan (`orders/EP-12345/mariano-calandra/logo.png`) pondría el
   **nombre del cliente en una URL pública**, que contradice el §56 del mismo plan.

La solución correcta —taguear el asset con una referencia no-personal vía
`context`/`tags` de Cloudinary— depende de qué permita el *upload preset*, que no
se puede verificar desde local. Tocar el camino de subida de una tienda en
producción sin poder probarlo no vale el beneficio, que además es de comodidad
del vendedor, no de conversión. Queda anotado en P2.

---

---

## P2 — Landings, performance, SEO y dashboards ✅

### 16. Landings — qué se creó y qué **no**

El plan (§39) proponía seis: `/calcos-personalizadas`, `/calcos-para-negocios`,
`/pack-100-calcos`, `/calcos-argentina`, `/calcos-termo`, `/calcos-notebook`.

**Tres de esas páginas ya existen** (`/personalizados`, `/negocio`,
`/mayorista`) y `/calcos-argentina` ya es una categoría (`/categoria/argentina`).
Crear gemelas habría significado contenido duplicado, canibalización entre URLs
y dos páginas que mantener por cada intención.

**Solución**: para esas, la URL bonita del anuncio es un **301** (`netlify.toml`
+ `public/_redirects`). El anuncio usa `/calcos-para-negocios`, el cliente cae en
`/negocio`, que además ya está indexada. Cero duplicados.

**Landings nuevas de verdad** — `/calcos-termo`, `/calcos-notebook`,
`/calcos-auto`. Estas sí son contenido que no existía: *"calcos para termo"* no
es una categoría de diseño (cualquier diseño sirve), es un **caso de uso**, y el
catálogo tiene 99 categorías temáticas y **ninguna de uso**.

Cada una responde la objeción propia de ese uso:

| Landing | Tamaño que recomienda | Objeción que responde |
|---|---|---|
| `/calcos-termo` | 6 cm | ¿se despega al lavar el termo? |
| `/calcos-notebook` | 6 cm | ¿deja pegamento al sacarlo? ¿cuántos entran? |
| `/calcos-auto` | 9 cm | ¿aguanta el lavadero? ¿vidrio o chapa? |

Los diseños son **reales**: se bajan los manifests de las categorías
configuradas y se intercalan. La landing reutiliza `TrustBadges`, `SizeGuide`,
`ShippingInfo`, `DiscountNote`, `SocialProof` y `StickerCard` — lo único propio
es el copy, en `config/landings.js`. Cada una emite su `FAQPage` JSON-LD y
manda `view_item_list` con su propio `item_list_name`, así se puede comparar
conversión por landing.

### 20. Performance — se midió antes de tocar

**Medición inicial en el navegador**: de los 820 KB de imágenes del Home,
**649 KB eran `stickers-cutout/nuevas/*.png`** — el campo decorativo del hero.
PNG de 500×500 (algunos 1080×1080) mostrados a 66–132 px, y en el camino del
LCP. **El 79 % del peso de la página era decoración.** Los testimonios eran
peor: tres PNG de hasta 1,1 MB para cards de ~350 px.

| | antes | después |
|---|---|---|
| Imágenes del Home (descargadas) | 820 KB | **103 KB** |
| `stickers-cutout/` en disco | 12,4 MB | 1,37 MB (−89 %) |
| `testimonials/` en disco | 2,4 MB | 123 KB (−95 %) |
| CLS | — | **0** |
| Clarity | inline síncrono en `<head>` | difierido a `load` (257 ms) |

`scripts/optimize-images.mjs` hace la conversión y reapunta los manifests. Es
**idempotente**: se puede volver a correr cuando sumes imágenes.

Los WebP del catálogo (17–27 KB cada uno) **no se tocaron**: ya estaban bien. El
problema nunca fueron las fotos de producto.

> **Pendiente que dejo a tu criterio**: los PNG originales siguen en el repo
> (~15 MB). Ya no se sirven, pero se deployan igual. No los borré porque son
> archivos tuyos y borrar 97 archivos no es una decisión que me corresponda.

### 19. FAQ

De 13 a **20 preguntas**, con una pestaña nueva de Personalizados. Las 8 que
sumé son exactamente las que el plan §42 pedía y no estaban: cómo funciona
*exactamente* el 10 % OFF, qué tamaño conviene, repetir diseños, termo, cómo
mando el diseño, qué pasa si el archivo está mal, qué formatos. Todas entran al
`FAQPage` JSON-LD.

### 17-18. Analytics y Meta

- `view_item_list` en Home (`Los más vendidos`) y en las landings — el funnel
  arrancaba recién en la grilla de categoría.
- `item_list_name` consistente en las tres superficies, para saber **desde qué
  lista** se compra.
- **Meta Pixel + CAPI no se tocaron**: la auditoría los encontró correctos, con
  deduplicación por `event_id`. Duplicar la implementación habría sido el error
  que el §38 advierte.

### 22. Dashboards

`docs/DASHBOARD.md`: qué mirar, las dimensiones personalizadas a crear en GA4, y
—lo importante— **cómo leer los ratios sin engañarse**. Incluye la rutina de
revisión semanal.

### CSP — **no se enforzó, a propósito**

Sigue en `Report-Only`. El riesgo concreto: `script-src` lista los dominios
conocidos, pero **GTM puede cargar scripts de terceros según las etiquetas
configuradas en tu panel**, y eso no se ve desde el código. Flipear el header a
ciegas puede matar el tracking o el checkout sin aviso.

`ANALYTICS.md` §7 tiene el procedimiento de 5 pasos para enforzarla con
seguridad (recorrer el flujo completo con la consola abierta, incluido el
navegador embebido de Instagram, antes de tocar el header).

---

## Estado de las fases

| Fase | Estado |
|---|---|
| **P0** — fricción crítica | ✅ **completa, verificada en navegador** |
| **P1** — packs, carrito, personalizados | ✅ **completa, verificada en navegador** |
| **P2** — landings, performance, SEO, dashboards | ✅ **completa, verificada en navegador** |
| **P3** — A/B testing y CRO continuo | ⬜ backlog escrito en `CRO-EXPERIMENTS.md` |

### Lo que bloquea a P3

**P3 no se puede empezar de verdad hasta validar el `purchase` en producción**
(`QA-CHECKLIST.md` §6). Correr un A/B test sobre un KPI que no se verificó es
peor que no testear: se toman decisiones con números equivocados.

Una vez validado, el backlog de `CRO-EXPERIMENTS.md` está priorizado y listo.
