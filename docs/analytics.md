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

### `item_list_name` — de qué superficie salió el `add_to_cart`

`trackAddToCart(product, quantity, listName)` acepta un tercer parámetro
opcional que viaja como `item_list_name` en el item de GA4. Lo propaga
`addSticker(sticker, size, qty, { listName })`.

| Valor | Superficie | Desde |
|---|---|---|
| *(sin valor)* | grilla, ficha, armador de packs, upsell de `/carrito` y `/checkout` | — |
| `order_bump_drawer` | `components/OrderBump.jsx` — el calco sugerido dentro del carrito lateral | spec 013 |

**Por qué existe**: un calco sumado desde el order bump y uno sumado desde la
grilla producen la MISMA línea (`sticker:{id}:{size}`), así que sin esto no hay
forma de saber si el bump aporta o sólo ocupa lugar en el drawer.

**Cómo se mira**:
```js
window.dataLayer
  .filter(e => e.event === 'add_to_cart')
  .flatMap(e => e.ecommerce.items)
  .filter(i => i.item_list_name === 'order_bump_drawer')
```

### Eventos propios

## La ventana del cupón de bienvenida (spec 017)

Tres eventos de la MISMA ventana de 10 minutos. **Hay que leerlos juntos**: por
separado no dicen nada.

| Evento | Cuándo | Parámetros |
|---|---|---|
| `cupon_emitido` | el popup entrega el código | `cupon`, `ventana_ms` |
| `cupon_vencido` | la ventana llega a cero sin usarlo | `cupon`, `donde`: `popup` · `checkout` |
| `cupon_aplicado_en_promo` | se usa el cupón con una promo N×M corriendo | `cupon`, `promo` |

**Cómo se leen**:

- `cupon_vencido / cupon_emitido` = qué proporción de los leads pierde la
  ventana. Si es alta, 10 minutos es poco.
- `donde: 'checkout'` es el caso **caro**: alguien que estaba comprando y se le
  venció encima. Es el riesgo declarado en `specs/017` §12 — mirarlo primero.
- `cupon_aplicado_en_promo` mide **lo que cuesta** la acumulación que habilitó la
  spec 017 (el cupón corriendo encima del 3x2 / 2x1). Es el número contra el que
  se decide si el `percentCap = 0.20` se sostiene.

⚠️ Ninguno lleva el mail ni ningún dato del lead: el `dataLayer` es público y
cualquier extensión del navegador lo lee (mismo criterio que
`contacto_form_error`).

## El popup de bienvenida (spec 026)

```
popup_view → popup_email_submit → generate_lead → popup_interest_selected /
popup_cta_click → add_to_cart → begin_checkout → purchase
```

| Evento | Cuándo | Parámetros |
|---|---|---|
| `popup_view` | se abre el popup (solo o a mano) | `popup_variant`, `popup_trigger` (`time` · `scroll` · `product_views` · `search` · `category` · `exit_intent` · `manual`), `page_path`, `device_type` (`mobile` · `desktop`), `new_vs_returning` |
| `popup_close` | se cierra sin navegar | `popup_variant`, `popup_step` (`capture` · `success`), `close_method` (`x` · `esc` · `overlay` · `navigation`) |
| `popup_email_submit` | se envía un mail con formato válido (antes de la respuesta) | `popup_variant`, `discount_type` (`percentage`), `page_path`, `device_type` |
| `generate_lead` | el servidor registró el mail: **es la conversión del popup** | `lead_source: 'welcome_popup'` + `popup_variant`, `popup_trigger`, `device_type` |
| `popup_interest_selected` | elige Mate, Termo, Notebook o Celular | `popup_variant`, `interest`, `destination` |
| `popup_cta_click` | "Elegir mis calcos" o "ir a pagar" | `popup_variant`, `destination` (`catalog` · `checkout`) |
| `cupon_emitido` | igual que antes; `ventana_ms` va `null` porque el cupón ya no vence | `cupon`, `ventana_ms` |

**Propiedades de usuario**: `popup_exposed` (vio el popup alguna vez) y
`popup_converted` (dejó el mail). Se setean con el evento y se re-setean en cada
carga, así también las lleva el `purchase`. **Hay que registrarlas en GA4 como
dimensiones de usuario**, y los parámetros de arriba como dimensiones de evento.

No hay `popup_conversion`: sería el mismo hecho que `generate_lead`, que ya es
el evento de leads de GA4 y dispara el `Lead` de Meta. Contarlo dos veces
duplicaría la conversión y cortaría la serie histórica.

**Cómo se leen**:

- `generate_lead / popup_view` = tasa de captura. `popup_email_submit −
  generate_lead` = envíos que fallaron (red, servidor).
- `popup_view / sesiones que pasan por el Home` = qué parte del tráfico ve el
  popup. Desde el 25/9 solo aparece en el Home: si el tráfico de anuncios entra
  por categorías y fichas, este número es chico y ese es el dato para revisarlo.
- La métrica que manda es **revenue por sesión**: `purchase` segmentado por
  `popup_converted`, no la tasa de captura.
- `new_vs_returning`: la primera semana después del deploy todos cuentan como
  `new` (el registro de la primera visita arranca con el deploy). Leerlo desde
  la segunda semana.
- `cupon_vencido` deja de dispararse desde el popup: el cupón ya no vence.

Sin PII: ni el mail ni nada del lead. `page_path` es la ruta sin query.

## La garantía en el checkout (spec 021)

| Evento | Cuándo | Parámetros |
|---|---|---|
| `garantia_condiciones_ver` | ⛔ **Sin datos desde el 26/9/2026**: el bloque de garantía se sacó del checkout (Mariano). Hasta ahí: se **abre** "Ver condiciones", arriba del botón de pagar | `tipo`: `devolucion` · `mixto` · `falla` |

`tipo` es la garantía que le tocaba a ese carrito (`lib/garantia.js`): catálogo
→ `devolucion`, catálogo + hecho con archivo → `mixto`, solo hecho con archivo
→ `falla`. Un carrito solo digital no muestra garantía, así que nunca lo dispara.

**Cómo se lee**:

- `garantia_condiciones_ver / begin_checkout` = qué proporción de los que llegan
  a pagar tiene la duda *"¿y si no me gusta?"* lo bastante fuerte como para
  abrir las condiciones.
- `purchase` en sesiones **con** y **sin** el evento: si los que la abren compran
  menos, las condiciones asustan más de lo que tranquilizan.
- Por `tipo`: si `falla` casi no se abre, a quien sube su archivo no le preocupa
  la garantía; si se abre mucho, la duda es real y el texto tiene que ser claro.

Sin PII ni valor: solo el tipo.

---

`search` · `search_no_results` · `catalogo_orden` · `generate_lead` ·
`whatsapp_click` (con la ruta de origen) · `instagram_click` ·
`contacto_form_error` · `shipping_calculated` (zona + costo) ·
`pack_builder_start` · `pack_completed` (unidades + diseños distintos) ·
`personalized_*` (abajo) · `polaroid_material`

#### Personalizados (spec 023, desde el 14/9/2026)

| Evento | Cuándo | Parámetros |
|---|---|---|
| `personalized_view` | una vez por visita a `/personalizados` (junto con un `view_item` del producto "personalizados", SKU de Meta `006574`) | — |
| `personalized_upload_start` | abre el selector de archivos o suelta archivos | `origen`: `hero` · `sticky` · `editorial` · `cta_final` |
| `personalized_upload_complete` | cada archivo subido (o aceptado "por WhatsApp" si no hay subida) | `file_type` (extensión) · `file_size_range` (`<1MB` · `1-5MB` · `5-10MB`) |
| `personalized_upload_error` | un archivo no entra o no sube | `reason`: `formato` · `peso` · `lectura` · `red` · `duplicado` · `tope` |
| `personalized_preview` | cambia de vista | `view`: `original` · `calco` · `termo` |
| `personalized_size_selected` | elige tamaño | `size` |
| `personalized_material_selected` *(enmienda 22/9/2026)* | elige material | `material`: `vinilo-blanco` · `dtf-uv` · `vinilo-holografico` |
| `personalized_quantity_selected` | atajo (al toque) o −/+/tipeo (al asentarse, 800 ms) | `quantity` |
| `personalized_configuration_complete` | una vez por tanda: diseño subido + tamaño | `size` · `quantity` · `designs` · `value` · `material` |
| `personalized_add_to_cart` | toca "Agregar al carrito" | `size` · `designs` · `units` · `material` + ecommerce (`value`, `items`) |

Además, cada línea dispara su `add_to_cart` estándar — ahora al tocar "Agregar",
no al subir el archivo como antes. El link a Negocio usa `wholesale_click` con
`origen: 'personalizados'`.

**Reemplazaron** a `personalizado_inicio` → `personalized_view`,
`personalizado_paso` → `personalized_size_selected`,
`personalizado_archivo_cargado` → `personalized_upload_complete` y
`personalizado_precio_calculado` → `personalized_configuration_complete`, que
dejaron de llegar a GA4 el 14/9/2026. Tenían dos defectos: el de archivo mandaba
el **nombre del archivo** y el de precio leía un `material` que ya no existía (y
perdía el tamaño). En **Meta** se conservan los nombres custom viejos
(`PersonalizadoInicio`, `PersonalizadoArchivo`, `PersonalizadoPaso`,
`PersonalizadoPrecio`), ahora sin PII, por si hay audiencias armadas sobre ellos.

⚠️ **Ningún dato del cliente sale a analytics**: ni el nombre ni el link del
archivo ni las instrucciones. El `item_name` de un personalizado en
`add_to_cart` / `begin_checkout` / `purchase` era *"Personalizado · 6 cm ·
Silueta · foto-de-mi-hijo.jpg"*; `nombreParaAnalytics()` (en `lib/analytics.js`,
el único punto de salida) lo corta en *"Personalizado · 6 cm · Silueta"*. La
línea del carrito conserva el nombre completo. Lo verifica
`lib/analyticsPersonalizados.test.js`.

#### Fotos Polaroid (spec 019)

| Evento | Cuándo | Parámetros |
|---|---|---|
| `polaroid_material` | el cliente cambia el material en `/polaroid` | `material`: `comunes` · `imantadas` — `tamano`: `5x8` · `7x10` · `9x13` |

Contesta qué proporción elige imantadas y si cambia por tamaño. `material` es
siempre el id interno y no el texto de la pantalla, para poder cruzarlo con la
regla de `config/pricing.js` que lo produce.

El descuento por volumen **no tiene evento propio**: se lee de la cantidad de
los `add_to_cart` y `purchase` que ya existen. `view_item` y `add_to_cart` de
`/polaroid` reportan el precio de la variante elegida, con el volumen ya
aplicado en el `add_to_cart`.

#### Formulario de contacto (spec 012)

| Evento | Cuándo | Parámetro |
|---|---|---|
| `generate_lead` | la consulta se envió con éxito | `lead_source: 'contacto_form'` |
| `contacto_form_error` | el envío falló | `motivo`: `validacion` · `red` · `servidor` |
| `whatsapp_click` | escape a WhatsApp desde `/contacto` | `whatsapp_context`: `contacto_card` · `contacto_form_error` · `contacto_form_ok` |
| `instagram_click` | click a Instagram | `instagram_context`: `contacto_grilla` · `contacto_cta` |

`contacto_form_error` con `motivo: 'red'` o `'servidor'` es la métrica que hay
que mirar: cada uno es una consulta que casi se pierde. El
`whatsapp_context: 'contacto_form_error'` dice cuántas de esas se rescataron.

⚠️ **Ninguno lleva un dato del formulario.** Nombre, mail, teléfono y ciudad son
PII y el `dataLayer` lo lee cualquier extensión del navegador.

#### `catalogo_orden`

| | |
|---|---|
| **Dónde** | `routes/Categorias.jsx`, al tocar un orden distinto al activo |
| **Parámetros** | `orden`: `az` (alfabético, el default) \| `disenos` (por cantidad de diseños) |
| **Destino** | GA4 solamente — no va al Píxel: es navegación, no conversión |
| **Ref.** | spec `006-orden-catalogo` |

No se dispara al cargar la página con `?orden=` en la URL: mide la **decisión**
de cambiar el orden, no el estado en que se abrió el link.

Qué se quiere responder con esto: si al que llega al catálogo le alcanza el
orden alfabético, y cuál de los dos órdenes termina en más clicks a una
categoría.

`disenos` **no** es "más vendidas": ordena por cantidad de diseños de la
categoría. **No hay dato de ventas por categoría en ningún lado del repo** — ni
siquiera "Los más vendidos" del Home, que son cuatro categorías fijas en
`FeaturedStickers.jsx`. Ver la spec 006 §12.

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
personalized_view → personalized_upload_start → personalized_upload_complete
        → personalized_configuration_complete → add_to_cart → begin_checkout → purchase
```

Métrica principal: *purchase rate* de personalizados (sesiones con un `purchase`
que incluye una línea `custom:` / sesiones con `personalized_view`). Hasta el
14/9/2026 el funnel documentado arrancaba en `view_item`, que la página nunca
disparaba.

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

## 8. ✅ RESUELTO — `add_to_cart` reportaba precio de lista

Detectado en la auditoría SDD del 11/8/2026 y **corregido el mismo día** por la
spec [`001`](../specs/001-fix-precio-carrito-promo-categoria/). Era el mismo
problema de §3.1 en el otro extremo del funnel.

**El arreglo**: los `track*` del `CartContext` usan `precioVidrieraLinea()`, y
`view_cart` se corrigió solo al arreglarse el carrito. `basePrice` sigue siendo
el precio de lista y no se persiste nada con descuento. Queda debajo el
diagnóstico original, que explica por qué el defecto existía.

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

**Después del arreglo**: los tres reportan $800.

Consecuencia: durante la promo, GA4 y Meta **sobreestiman** el valor del carrito
en la mitad para esa categoría, mientras el `purchase` reporta bien. Los ratios
`add_to_cart → purchase` por valor quedan distorsionados, y Meta optimiza contra
una señal de valor inflada en la parte alta del funnel.

Esto era **la mitad analítica** de una inconsistencia más grande: el carrito
también *mostraba* el precio de lista al cliente. Se arregló junto, en una sola
spec, como correspondía.

---

## 9. Pendientes

- [x] ~~**Validar el `add_to_cart` en producción**~~ — ✅ **confirmado por
      Mariano el 11/8/2026** en GA4. Cierra el pendiente que dejó la spec 001.
- [ ] **Validar el `purchase` en producción** (ver `QA-CHECKLIST.md` §6). Es lo
      único que bloquea confiar en todo el resto.
- [x] ~~Corregir el `value` de `add_to_cart` / `view_cart` durante promos por
      categoría~~ (§8) — hecho el 11/8/2026, spec `001`.
- [ ] Enforcar la CSP siguiendo el procedimiento de arriba.
- [ ] Crear el feed programado en Meta Commerce Manager (el CSV ya está deployado).
- [ ] `view_item_list` en `SuggestedStickers` (rota cada 7 s; hay que decidir si
      cada rotación es una impresión nueva o no antes de instrumentarlo).
- [ ] Marcar `purchase` de transferencia como cobrado cuando llega el comprobante
      (hoy requiere cruce manual con el CRM).
