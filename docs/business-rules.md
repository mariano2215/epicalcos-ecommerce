# BUSINESS RULES — EPICALCOS

Reglas comerciales **tal como están implementadas hoy**, extraídas del código el
11/8/2026. Cada regla indica su archivo. Ninguna está inventada ni inferida.

> ⚠️ Este documento **describe**, no decide. La fuente de verdad es el código:
> `frontend/src/config/pricing.js`, `frontend/src/config/site.js` y su espejo
> `netlify/functions/lib/pricing.js`.

Moneda: **ARS**. Todos los importes son enteros (`round = Math.round`).

---

## 1. Productos y precios base

### Calcos de catálogo
`config/pricing.js → SIZES`

| Tamaño | Precio unitario |
|---|---|
| 4 cm | $1.200 |
| 6 cm | $1.600 |
| 9 cm | $2.000 |

Default: **6 cm** (`DEFAULT_SIZE`).
Catálogo: **99 categorías, 6.600 diseños**.

El **precio de vidriera es el de Mercado Pago** (sin descuento). Los descuentos
por transferencia y cupón se aplican recién en el checkout, porque dependen del
carrito completo.

### Calcos personalizados
`config/personalizados.js`

- Valen **lo mismo que uno de catálogo**, según tamaño. Sin recargo por material.
- **Sin mínimo de compra** (antes eran 10 unidades).
- El cliente elige **tamaño + corte** y sube su archivo.
- Cortes (no afectan el precio): silueta, cuadrado, círculo.

### Productos de precio fijo

| Producto | Precio | Id de línea |
|---|---|---|
| Tatuajes temporales · x hoja | $12.000 | `fixed:tatuajes-hoja` |
| Fotos Polaroid x10 · 5×8 cm | $9.000 | `fixed:polaroid-x10-5x8` |
| Fotos Polaroid x10 · 7×10 cm | $12.000 | `fixed:polaroid-x10-7x10` |
| Fotos Polaroid x10 · 9×13 cm | $15.000 | `fixed:polaroid-x10-9x13` |

### Archivos imprimibles (producto DIGITAL)
`config/pricing.js → IMPRIMIBLES`

| Pack | Precio | Id |
|---|---|---|
| Pack de stickers imprimibles | $5.999 | `digital:pack-stickers` |

Reglas propias, todas verificadas en el servidor:
- **No participa de ningún descuento**: ni cupones, ni el 10 % por
  transferencia, ni el 10 % por volumen, ni promos N×M.
- **No suma para el envío gratis** (`physicalTotal` lo excluye).
- **Cantidad siempre 1**: `addDigital` no acumula y el servidor rechaza
  `quantity ≠ 1`.
- Un pedido **solo** de digitales pasa a método de entrega `digital` — el
  servidor lo decide, no el cliente.
- **+7.000 diseños** (`disenos: 7000`, dato de Mariano del 11/8/2026).
- **Entrega**: por Mercado Pago sale sola al aprobarse el pago; por
  **transferencia** se dispara a un click desde el aviso interno, cuando llega el
  comprobante (spec 002). El archivo **nunca** se entrega antes de confirmar el
  pago.
  ⚠️ Falta cargar `DIGITAL_LINK_PACK_STICKERS`: sin esa variable no se entrega
  por ningún camino.

---

## 2. Descuentos sobre calcos sueltos

Alcance: **solo** líneas `sticker` (catálogo) y, en promos N×M, también `custom`
(personalizados). Packs, negocio y fijos ya traen su precio final.

### Descuento por volumen
`BULK_THRESHOLD = 10` · `BULK_DISCOUNT = 0.10`

Desde **10 calcos totales** (se pueden combinar tamaños), **10 % off** — pero
**solo pagando por transferencia bancaria**. Con Mercado Pago el precio es
siempre el de vidriera.

### Cupones
`config/pricing.js → COUPONS`

| Código | Efecto | Vencimiento | Visible |
|---|---|---|---|
| `EPICA10` | 10 % off | sin vencimiento | **oculto** |

- **`hidden: true`** significa que el código **no se nombra en ninguna pantalla**
  del sitio. `EPICA10` se entrega solo a quien deja su mail en el popup de
  bienvenida (se lo muestra el popup y se autocompleta en el checkout). El sitio
  igual lo acepta si alguien lo escribe: "oculto" es no publicitarlo, no un
  secreto criptográfico — viaja en el bundle JS.
- **Acumulable** con el 10 % por transferencia: los porcentajes **se suman**
  (transferencia 10 % + EPICA10 10 % = 20 % off).
- Tope de seguridad: `MAX_STICKER_DISCOUNT = 0.9` (90 %).
- `EMOJI50` (2×1 por mensaje privado) venció el 4/8/2026 y se eliminó del código.

### Cupones de bundle (N×M)
`COUPON_BUNDLES` — **hoy vacío**. El motor queda listo: agregar
`{ CODIGO: { buy, pay } }` en el servidor y `bundle: { buy, pay }` en el frontend
alcanza para prender otro.

Un bundle **no es acumulable con nada**: mientras esté aplicado no corren el
10 % por transferencia, ni el 10 % por volumen, ni otro cupón, ni el 50 % de
Argentina, y pisa a la promo 3x2 si estuviera vigente.

---

## 3. Promociones

### 3.1 Promo 3x2 — ⚠️ VENCIDA
`PROMO_3X2` · `endsAt: 2026-07-26T23:59:59-03:00`

**No está viva.** `isPromoActive()` da `false` en las dos puntas.

Sigue en el código a propósito: es el único consumidor del motor N×M y sus
parámetros son los que usan los tests de paridad. Sacarla obliga a tocar el
`CartContext`, 5 pantallas, el espejo del servidor y ~10 tests: es un refactor
del camino de precios, no una limpieza de config.

Cómo funcionaba: cada 3 calcos elegibles (catálogo + personalizados), la **más
barata gratis**. Acumulable con cupón de %, pero con el % topeado en
`percentCap = 0.10` durante la promo.

### 3.2 Promo mayorista — 100 calcos a $39.999
`PROMO_MAYORISTA_100` · `activa: true` · vence **14/8/2026 23:59** (ART)

- Pack de **exactamente 100 calcos** a precio fijo $39.999.
- Los 100 pueden ser 100 diseños **distintos** (catálogo y/o subidos por el
  cliente en el mismo armador).
- **Solo en 4 y 6 cm.** Si el cliente elige 9 cm, el armador vuelve al pack
  mayorista de siempre.
- Línea: `pack:mayorista100:{size}:{ts}` con `quantity = 1` (1 línea = 1 pack).
- **No participa** de cupones, del 10 % por transferencia ni de promos N×M.
- **Trae el envío incluido** (ver §5).
- Interruptor manual `activa`, además del vencimiento por fecha.

Mientras esté activa, los escalones x20 y x50 de `/armar-pack` **se ocultan**
(`ocultarDurantePromo`): con 100 calcos a $39.999, un pack de 50 al precio de
lista sale más y trae menos producto — dejaría la escalera dada vuelta. Se
ocultan, no se borran: al vencer la promo vuelven solos, y `?n=20` / `?n=50`
siguen funcionando.

⚠️ **No confundir con la Promo Negocio.**

### 3.3 Promo Argentina — 50 % off por categoría
`PROMO_ARGENTINA` · `activa: true`
**Del 17/8/2026 00:00 al 19/8/2026 23:59 (ART)**

- Todos los calcos de catálogo de la categoría `argentina` a **mitad de precio**.
- Es la **primera promo con fecha de inicio** además de vencimiento:
  `isArgentinaPromoActive()` mira las dos puntas.
- **Acumula** con el 10 % por transferencia y con el cupón — los porcentajes se
  suman, con tope `MAX_STICKER_DISCOUNT` (90 %). Decisión de Mariano del
  11/8/2026: un calco de Argentina puede terminar 60 % off pagando por
  transferencia con EPICA10.
- Packs, negocio y fijos quedan afuera: ya traen su precio final.
- **No** corre si hay un cupón de bundle aplicado.
- La categoría se deriva del `id` de la línea (`argentina-72` → `argentina`),
  quitando el **último** tramo `-{número}` — hay categorías con guiones propios
  (`autos-y-motos-127`), así que partir por el primero daría `autos`.

> El precio con descuento se muestra en **toda** la tienda —grilla, ficha,
> carrito y total del checkout— desde la spec `001` (11/8/2026). El carrito lo
> deriva con `precioVidrieraLinea()` sin persistirlo nunca: ver
> `docs/architecture.md` §12.

---

## 4. Packs

### Escalera de packs de catálogo (`/armar-pack`)
`CATALOG_PACKS`

| Cantidad | Etiqueta | Se oculta durante la promo mayorista |
|---|---|---|
| x10 | Para empezar | no |
| x20 | Más variedad (destacado) | **sí** |
| x50 | Para fanáticos | **sí** |

### Pack mayorista
`WHOLESALE_QTY = 100` · `WHOLESALE_DISCOUNT = 0.5`
**Desde** 100 calcos (mínimo, sin tope), **50 % off** en todos los tamaños.
Línea `pack:mayorista:{size}:{ts}`. Trae el envío incluido.

### Pack de personalizados
`PERSONALIZADOS_MIN = 10` · `PERSONALIZADOS_DISCOUNT = 0.10`
Línea `pack:personalizados:{size}:{ts}`, mínimo 10 unidades, 10 % ya incluido.

> **Convivencia intencional** (confirmado por Mariano, 11/8/2026): el
> configurador nuevo emite líneas `custom:` **sin mínimo y sin descuento**, y
> esta rama `pack:personalizados` sigue viva porque **las 10 unidades son el
> umbral para acceder al 10 % off** — el mismo criterio que en calcos sueltos.
> No es código residual: son dos ofertas distintas para el mismo producto.

### Promo Negocio
`NEGOCIO = { qty: 100, size: '6cm', price: 39999, listPrice: 96999 }`

100 calcos de **un solo diseño** (el logo del cliente) en 6 cm, precio fijo
$39.999. `listPrice` es solo el tachado de display. Línea `negocio:{ts}`,
**1 unidad por línea**. No trae envío incluido.

---

## 5. Envíos

`config/site.js → shipping` · espejado en el servidor.

### Zonas
`shippingZone(city, province)` — comparación normalizada (minúsculas, sin
acentos). Las tarifas especiales **solo aplican en Santa Fe**.

| Zona | Criterio | Costo |
|---|---|---|
| `rosario` | Santa Fe + ciudad = Rosario | $4.500 (motomensajería) |
| `nearby` | Santa Fe + Funes, Granadero Baigorria, Villa Gobernador Gálvez | $6.500 |
| `interior` | todo lo demás | $8.500 (Correo Argentino) |

### Envío gratis

| Destino | Umbral |
|---|---|
| Rosario | desde **$50.000** |
| Resto del país (nearby + interior) | desde **$75.000** |

Además, el envío es **$0** cuando:
- el método es `retiro` (retiro en Ov. Lagos y Bv. Seguí, Rosario)
- el método es `digital` (pedido de solo archivos — lo decide el servidor)
- el carrito tiene un pack con envío incluido

### Packs con envío incluido
`FREE_SHIPPING_PACK_TYPES = ['mayorista', 'mayorista100']`

Con **una** de esas líneas, el envío vale 0 sin importar zona ni subtotal.

*Por qué*: la oferta más agresiva del año (100 calcos a $39.999) terminaba
pagando $8.500 de Correo Argentino al interior. El cliente leía el precio grande
y después la letra chica — la forma exacta de perder la venta en el último paso.

⚠️ El servidor **nunca** confía en el flag `envioGratis` del cliente: lo deriva
del `id` de la línea.

### Plazos
- **Producción**: 2 a 3 días hábiles (igual para todo destino, desde el pago).
- **Entrega Rosario**: 2 a 3 días hábiles.
- **Entrega interior**: 5 a 7 días hábiles (producción + correo).

Producción y entrega se comunican **por separado** a propósito: antes el interior
mostraba "producción: 5 a 7 días", que era un plazo de taller inflado.

---

## 6. Pedidos y pago

- **Sin pedido mínimo**: se puede comprar un solo calco (`minimumCalcos: 1`).
- Medios: **Mercado Pago** y **transferencia bancaria**.
- Id de pedido: `EPI-{timestamp}-{random}` (es el `external_reference` de MP).

### Transferencia bancaria
Datos que se muestran en el checkout y en el mail (`config/site.js →
bankTransfer`):
- CVU `0000003100088847424287`
- Alias `epicalcos.mp`
- Titular MARIANO ALEJANDRO JESUS CALANDRA
- Comprobante por WhatsApp al 3416806675

No hay confirmación automática: el pedido queda `pendiente_transferencia`, los
mails salen de inmediato y el comprobante se registra a mano.

### Estados (mapeo MP → CRM Notion)
`_notion.js → mapEstado()`

| Estado MP | Estado CRM |
|---|---|
| — (al iniciar checkout) | Checkout iniciado |
| `approved` | Pagado |
| `pending`, `in_process`, `authorized` | Pendiente |
| `rejected`, `cancelled`, `refunded`, `charged_back` | Rechazado |
| (lead del popup) | Lead 10% OFF |

---

## 7. Otras reglas

### Configurador de personalizados
`config/personalizados.js → ARCHIVO`
- Formatos: png, jpg, jpeg, pdf, svg, ai
- Peso máximo: **10 MB** por archivo
- Resolución mínima recomendada: **150 DPI**
- Máximo **100 archivos** por pedido (tope anti-abuso, no regla comercial)
- 4 subidas simultáneas a Cloudinary (con 50+ archivos, todas juntas se cuelgan)
- Cantidad por línea: 1 a 1.000

### Secciones despublicables
`HIDDEN_SECTIONS` (hoy **vacío**) — agregar un slug ahí saca la sección del nav,
menú, footer, Home, categorías, buscador, sitemap y feed de Meta, y hace que su
ruta redirija a `/categorias`. El código de la sección queda intacto.

### Popup de bienvenida
Captura el mail → guarda el lead en Notion + CRM interno → manda dos mails
(aviso interno y el cupón al cliente) → devuelve `EPICA10`, que queda en
`localStorage` (`epicalcos.welcomeCoupon`) para autocompletar el checkout.

### A/B testing
`lib/experiments.js` — implementación propia, asignación síncrona (localStorage
+ hash FNV-1a), sin parpadeo.

**Regla dura: los experimentos son SOLO de presentación. Nunca se testea un
precio** — el servidor revalida contra `pricing.js` y un A/B de precios dejaría
a media tienda sin poder comprar. Se puede testear *cómo* se muestra un precio
(monto vs. porcentaje), nunca cuánto vale.

Activos: `ahorro_pack` (% vs $) y `guia_tamano` (colapsada vs abierta).

### Carrito abandonado
**Apagado por defecto.** Requiere `ABANDONED_CART_ENABLED=true`.
- Se registra cuando alguien escribe un mail válido en el checkout.
- Se **borra** al crear un pedido (en los dos caminos de compra).
- Recordatorio: 1 mail por carrito, a las 4 h del abandono (cron horario),
  hasta 72 h; después se purga sin escribir. Retención: 30 días.
- Máximo 25 mails por corrida.
- Opt-out con link firmado (HMAC), permanente.
- `ABANDONED_CART_TEST_EMAIL` = modo prueba: solo escribe a esa dirección.

---

## 8. ⚠️ El espejo de precios — regla de oro

Estas reglas están escritas **dos veces**, a propósito:

| Frontend | Servidor |
|---|---|
| `frontend/src/config/pricing.js` | `netlify/functions/lib/pricing.js` |
| `frontend/src/config/site.js` (envíos) | `netlify/functions/lib/pricing.js` |
| `frontend/src/config/personalizados.js` | rama `custom` de `lib/pricing.js` |

El cliente calcula lo que muestra; el servidor **revalida y rechaza**.

**Si cambiás una y no la otra, todo checkout que toque esa regla se rechaza con
`price_mismatch`.**

Qué está espejado y hay que cambiar en ambos lados:
- `SIZES` / `SIZE_PRICES`
- `COUPONS` / `COUPON_BUNDLES` / `COUPON_ENDS_MS`
- `PROMO_3X2` (`endsAt`, `buy`, `pay`, `percentCap`)
- `PROMO_MAYORISTA_100` (`activa`, `endsAt`, `price`, `qty`, `sizes`)
- `PROMO_ARGENTINA` (`activa`, `categoria`, `discount`, `startsAt`, `endsAt`)
- `FREE_SHIPPING_PACK_TYPES`
- `NEGOCIO.price`, `FIXED_PRICES`, `DIGITAL_PRICES`
- umbrales y costos de envío, ciudades `nearby`
- `BULK_THRESHOLD`, `BULK_DISCOUNT`, `MAX_STICKER_DISCOUNT`
- `PERSONALIZADOS_MIN`, `PERSONALIZADOS_DISCOUNT`
- `WHOLESALE_QTY`, `WHOLESALE_DISCOUNT`

Verificación:
```bash
npm test --prefix frontend
```
`promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js`
comparan ambos lados. **Un cambio de precio sin test verde no se deploya.**

---

## 9. Orden de aplicación de descuentos

Tal como lo hacen `CartContext.pricedItems()` y `validateAndPriceOrder()`:

```
1. Precio base de la línea, según su id
      packs / negocio / fijos / digitales → precio final, FIN

2. Si hay agrupación N×M vigente (bundle del cupón, o promo 3x2 por fecha):
      keepFraction uniforme sobre las líneas elegibles (sticker + custom)

3. percentRate = min(volumen + cupón, cap)
      cap = 0.10 durante la promo 3x2, si no MAX_STICKER_DISCOUNT (0.90)
      con bundle aplicado, percentRate = 0

4. Por línea, si es de la categoría en promo Argentina:
      rate = min(percentRate + 0.50, 0.90)
      (no corre si hay bundle)

5. precio = round(base × keepFraction × (1 − rate))
```

El N×M se aplica como **fracción uniforme** (`keepFraction`) y no como línea
negativa, porque Mercado Pago no admite ítems con precio ≤ 0. Así el precio por
unidad queda positivo y verificable idéntico en el servidor.

---

## 10. Preguntas abiertas

### Resueltas (Mariano, 11/8/2026)

1. ✅ **Promo mayorista (vence 14/8/2026)** — **se deja vencer.** No se extiende.
   Al pasar la fecha, los escalones x20 y x50 de `/armar-pack` vuelven solos y el
   pack mayorista retoma la regla de siempre (desde 100, 50 % off).
2. ✅ **`pack:personalizados` (mínimo 10, 10 % off)** — **sigue vivo y es
   intencional.** Las 10 unidades son el umbral para acceder al 10 % off, igual
   que en calcos sueltos. No es residual: convive a propósito con el
   configurador nuevo, que permite comprar desde 1 unidad **sin** descuento.

### Abiertas

`UNKNOWN / REQUIRES CONFIRMATION`

3. **Falta cargar `DIGITAL_LINK_PACK_STICKERS`** (y `DIGITAL_DELIVERY_SECRET`).
   El código de entrega ya está; sin esas variables no se entrega nada.
4. **Costos reales** de producción y envío: no están en el repo, así que no se
   puede validar margen de ninguna promo desde acá.
5. **`stock: 50`** en los JSON del catálogo es un valor fijo para el feed de
   Meta. ¿Se controla stock real en algún lado?
