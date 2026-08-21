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
| `EPICA10` | 10 % off, acumulable | sin vencimiento | **oculto** |
| `EPI50` | 50 % off, **exclusivo** | sin vencimiento (interruptor `activa`) | **oculto** |

- **`hidden: true`** significa que el código **no se nombra en ninguna pantalla**
  del sitio. `EPICA10` se entrega solo a quien deja su mail en el popup de
  bienvenida (se lo muestra el popup y se autocompleta en el checkout). El sitio
  igual lo acepta si alguien lo escribe: "oculto" es no publicitarlo, no un
  secreto criptográfico — viaja en el bundle JS.
- **Acumulable** con el 10 % por transferencia: los porcentajes **se suman**
  (transferencia 10 % + EPICA10 10 % = 20 % off). Salvo los `exclusivo`, abajo.
- ⚠️ **Durante una promo N×M por fecha (la 3x2), un cupón de % NO descuenta
  nada.** La promo se combina con el 10 % por transferencia y con nada más.
- Tope de seguridad: `MAX_STICKER_DISCOUNT = 0.9` (90 %).
- `EMOJI50` (2×1 por mensaje privado) venció el 4/8/2026 y se eliminó del código.

### Cupones exclusivos (spec 009)
`exclusivo: true` — un cupón de % que **no se acumula con nada**, igual que un
bundle: mientras esté aplicado no corren el 10 % por transferencia, el 10 % por
volumen, otro cupón, el 50 % de Argentina ni la agrupación N×M de una promo por
fecha. Su % es el descuento final y **no depende del medio de pago ni de la
cantidad**.

`incluyeCustom: true` — el % alcanza también a los **personalizados sueltos**
(líneas `custom`), que fuera de una promo N×M no participan de ningún cupón. Es
opt-in por cupón, justamente para no cambiarle el precio a `EPICA10`.

`activa: false` — interruptor manual, aparte del vencimiento. Existe para los
cupones **sin fecha**: un 50 % reutilizable que se filtra no se apaga solo.
⚠️ Hay que ponerlo en `false` en **los dos lados** del espejo; apagarlo solo en
el frontend deja al servidor aceptando el precio con descuento.

**`EPI50`** es el primero de este tipo: 50 % off sobre calcos de catálogo y
personalizados sueltos, para mandar por privado. **No** toca packs (mayorista,
`mayorista100`, personalizados), `negocio`, productos de precio fijo ni
digitales: esas líneas ya traen su precio final y no participan de ningún %.
Ver `specs/009-cupon-epi50/`.

### Cupones de bundle (N×M)
`COUPON_BUNDLES` — **hoy vacío**. El motor queda listo: agregar
`{ CODIGO: { buy, pay } }` en el servidor y `bundle: { buy, pay }` en el frontend
alcanza para prender otro.

Un bundle **no es acumulable con nada**: mientras esté aplicado no corren el
10 % por transferencia, ni el 10 % por volumen, ni otro cupón, ni el 50 % de
Argentina, y pisa a la promo 3x2 si estuviera vigente.

---

## 3. Promociones

### 3.1 Promo 3x2 — ✅ VIVA (jue 20/8 23:00 → lun 24/8 23:59 de 2026)
`PROMO_3X2` · `startsAt: 2026-08-20T23:00:00-03:00` · `endsAt: 2026-08-24T23:59:59-03:00`

Cada 3 calcos elegibles (**catálogo + personalizados**, o sea todo lo
minorista), la **más barata gratis**. No entran packs, mayorista, Negocio,
precio fijo ni digitales: ya traen su precio final.

**Ventana con inicio y fin.** Es la segunda promo con `startsAt` (después de
Argentina): arranca 23:00 de un jueves y el deploy es antes, así que
`isPromoActive()` mira las dos puntas y la promo se enciende y se apaga sola.
El banner, el contador y los precios del carrito cambian **sin recargar**.

**Qué se combina y qué no** (decisión de Mariano, 20/8/2026):

| Con la promo corriendo | ¿Se suma? |
|---|---|
| 10 % por transferencia (desde 10 calcos de catálogo) | **sí**, topeado por `percentCap = 0.10` |
| Cupones de % (`EPICA10`) | **no** — durante la promo el cupón no descuenta nada |
| `EPI50` | **no se suma: la reemplaza.** Es `exclusivo`, anula la agrupación N×M y corre su 50 % |

El cliente que llega con un cupón de % ve el aviso de que no se combina, para
no quedarse esperando un descuento que no va a llegar.

Ver `specs/010-reactivar-3x2/`.

### 3.2 Promo mayorista — 100 calcos a $39.999
`PROMO_MAYORISTA_100` · `activa: true` · vence **14/8/2026 23:59** (ART)

- Pack de **exactamente 100 calcos** a precio fijo $39.999.
- Los 100 pueden ser 100 diseños **distintos** (catálogo y/o subidos por el
  cliente en el mismo armador).
- **Solo en 4 y 6 cm.** Si el cliente elige 9 cm, el armador vuelve al pack
  mayorista de siempre.
- Línea: `pack:mayorista100:{size}:{ts}` con `quantity = 1` (1 línea = 1 pack).
- **No participa** de cupones, del 10 % por transferencia ni de promos N×M.
- **Paga envío como cualquier pedido**: $39.999 no llega a ningún umbral, así
  que suma $4.500 en Rosario y $8.500 al interior (ver §5).
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
Línea `pack:mayorista:{size}:{ts}`. Paga envío por umbral como todo el resto: en
6 y 9 cm el pack ya supera los $75.000 y viaja gratis; en 4 cm son $60.000, así
que es gratis en Rosario y paga al resto del país.

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
**1 unidad por línea**. Paga envío por umbral, como todo.

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

**No hay ninguna otra forma de tener envío gratis.** Ningún pack, promo ni cupón
saltea el umbral, y el servidor no lee ningún flag del cliente.

⚠️ **Un descuento ALEJA del envío gratis.** El umbral se mide sobre el subtotal
ya descontado (`physicalTotal`), así que con `EPI50` (50 % off) hace falta el
**doble** de precio de lista para cruzarlo: $100.000 en Rosario y $150.000 en el
resto del país. Un carrito de $80.000 en 6 cm hoy viaja gratis a todo el país;
con el cupón pasa a $40.000 y paga envío. Es correcto según la regla y está
aceptado en `specs/009-cupon-epi50` §9.1 — **no** se arregla salteando el umbral
(ver el bloque de abajo).

### Ninguna promo regala el envío (12/8/2026)
Existió un `FREE_SHIPPING_PACK_TYPES = ['mayorista', 'mayorista100']` que ponía
el envío en 0 con solo tener una línea de pack en el carrito, sin mirar zona ni
monto. Con eso, **un pedido de la promo de 100 calcos a $39.999 viajó gratis a
Buenos Aires**: $8.500 de Correo Argentino salidos del margen de esa venta.

Se eliminó por completo — la constante, el flag `envioGratis` de la línea y el
copy que lo prometía (card del x100, carrito, checkout, `/politicas/envios`).

El umbral nacional es $75.000 justamente porque abajo de eso el correo se come
la ganancia. Si hace falta una promo con el envío puesto, **no** se hace
reponiendo el atajo: se sube el precio del pack por encima del umbral, o se
declara como regla propia con su spec, pensando antes qué pasa cuando ese pack
viaja a Ushuaia.

Lo cubre `src/lib/envio.test.js` → *"ninguna promo regala el envío: manda el
umbral"*, con el caso de Buenos Aires como test de regresión.

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
0. anulaTodo = el cupón aplicado es un bundle O es `exclusivo`
      es el mismo predicado en los tres puntos de abajo

1. Precio base de la línea, según su id
      packs / negocio / fijos / digitales → precio final, FIN

2. Si hay agrupación N×M vigente (bundle del cupón, o promo 3x2 por fecha):
      keepFraction uniforme sobre las líneas elegibles (sticker + custom)
      un cupón `exclusivo` la anula: no hay agrupación

3. percentRate = min(volumen + cupón, cap)
      volumen = 0 si anulaTodo
      cupón  = 0 si anulaTodo, o si la promo 3x2 está corriendo
               (la promo no se combina con cupones, solo con transferencia)
      cap = 0.10 durante la promo 3x2 SI la promo realmente corre
            (o sea: promoActive && !anulaTodo), si no MAX_STICKER_DISCOUNT (0.90)
      con bundle aplicado, percentRate = 0

4. Por línea, si es de la categoría en promo Argentina:
      rate = min(percentRate + 0.50, 0.90)
      (no corre si anulaTodo)

5. Alcance del % fuera de agrupación: solo `sticker`
      …y también `custom` si el cupón trae `incluyeCustom`

6. precio = round(base × keepFraction × (1 − rate))
```

⚠️ El `cap` sigue a la promo **real**, no a la fecha. Si mirara solo
`promoActive`, un cupón exclusivo que cae dentro de una ventana de 3x2 quedaría
topeado al 10 % — daría 10 % en vez del 50 % prometido, por una promo que ni
siquiera se le está aplicando al pedido.

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
