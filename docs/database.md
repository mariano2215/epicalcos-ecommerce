# DATABASE — EPICALCOS

Persistencia **real** del proyecto, verificada contra el código el 11/8/2026.

---

## 0. Resumen: no hay base de datos

**No existe base de datos relacional, ni ORM, ni migraciones, ni schema.**
No hay Postgres, MySQL, MongoDB ni Supabase en el código de producción.

> Nota: existe `.netlify/db/` en el disco (un Postgres local que crea la CLI de
> Netlify). **No está versionado, no se usa desde el código y no hay ninguna
> conexión a base de datos en todo el repo.** Es un artefacto de la CLI.

La persistencia se reparte en cuatro lugares:

| Dónde | Qué guarda | Tipo | Durabilidad |
|---|---|---|---|
| **Netlify Blobs** | pedidos, carritos abandonados, opt-out | KV (JSON por clave) | persistente |
| **JSON estáticos** | catálogo de productos | archivos en el repo | versionado |
| **Navegador** | carrito, cupón, experimentos, recientes | localStorage / sessionStorage | por dispositivo |
| **Notion** | CRM de pedidos y leads | externo | ver `docs/integrations.md` |

---

## 1. Netlify Blobs

Almacén clave-valor incluido en Netlify Functions. En Netlify las credenciales
se inyectan solas; `abandonedStore.js` además admite configuración manual con
`NETLIFY_BLOBS_SITE_ID` + `NETLIFY_BLOBS_TOKEN` (un PAT), porque hubo un caso en
el que la inyección automática falló y todo el flujo se caía en silencio.

**Tres stores**, sin relaciones entre sí (no hay joins ni claves foráneas):

### 1.1 Store `orders`
`netlify/functions/lib/orderStore.js`

**Clave**: `orderId` (`EPI-{timestamp}-{random}`) — el mismo `external_reference`
que se manda a Mercado Pago.

**Valor** (pedido de Mercado Pago):
```js
{
  orderId: "EPI-1754920000000-a3f9x",
  createdAt: "2026-08-11T13:00:00.000Z",   // ISO
  preferenceId: "…",                        // id de la preferencia de MP
  payer:   { name, email, phone, address },
  shipping:{ method, methodValue, city, province, zipCode, comments, cost },
  items:   [ { id, title, quantity, unit_price, currency_id } ],  // incluye 'shipping'
  itemsTotal: 0,                            // sin el envío
  total: 0,                                 // itemsTotal + envío
  tracking: { fbp, fbc, clientIp, userAgent },   // señales para Meta CAPI

  // se agregan después, desde el webhook:
  notifiedAt: "…",                          // marca de deduplicación de mails
  payment: { id, status, amount }
}
```

**Valor** (pedido por transferencia — mismo store, forma ligeramente distinta):
```js
{
  orderId, createdAt,
  paymentMethod: "transferencia",
  status: "pendiente_transferencia",
  notionPageId: "…",
  payer, shipping, items, itemsTotal, total
}
```
No lleva `preferenceId` ni `tracking` (no pasa por MP ni por el píxel del
checkout).

**Ciclo de vida**
```
create-preference / create-order-transfer   → setJSON(orderId, order)
mercadopago-webhook                         → getOrder(orderId)
                                            → markNotified(orderId, payment)
```

- **Nunca lanza**: si Blobs falla, loguea y sigue. El webhook tiene un fallback
  que reconstruye lo esencial desde la metadata del pago.
- **No hay purga**: los pedidos se guardan indefinidamente.
  `UNKNOWN / REQUIRES CONFIRMATION` — no hay política de retención definida.
- El pedido guardado es lo que alimenta el mail al cliente, el mail interno y el
  Purchase de Meta CAPI.

### 1.2 Store `abandoned-carts`
`netlify/functions/lib/abandonedStore.js`

**Clave**: el **email normalizado** (minúsculas, sin espacios). Una persona = un
carrito: si vuelve y arma otro, se pisa el anterior en vez de acumular dos y
mandarle dos mails.

**Valor**:
```js
{
  email: "cliente@mail.com",       // normalizado
  nombre: "Nombre" | null,
  items: [ { name, quantity, price, image } ],   // máx. 40, solo para el mail
  total: 0,
  units: 0,
  updatedAt: "ISO",
  notifiedAt: "ISO"                // solo si ya se le mandó el recordatorio
}
```

Guarda **lo mínimo** a propósito: nada de direcciones ni teléfonos. Este registro
puede quedar días en Blobs.

**Ciclo de vida**
```
track-cart        → guardarCarrito(email, datos)      (mail válido en el checkout)
create-preference │
create-order-…    → borrarCarrito(email)              ⚠️ en AMBOS caminos
abandoned-cart    → listarCarritos() → marcarNotificado() | purgar()
unsubscribe       → darDeBaja(email) → también borra el carrito
```

`notifiedAt` **no se arrastra** al pisar el registro: si la persona volvió y armó
un carrito nuevo, es un abandono nuevo y puede recibir su recordatorio.

**Retención**: 30 días (`RETENCION_DIAS`), purgado por el cron horario.

> ⚠️ El borrado al comprar es la parte más delicada de todo esto: mailear a
> alguien que ya compró es el error más caro del flujo. Por eso el borrado vive
> en los **dos** caminos de creación de pedido y no en un solo lugar.

### 1.3 Store `abandoned-optout`

**Clave**: email normalizado. **Valor**: `{ at: "ISO" }`.

Baja permanente de los recordatorios. Se consulta antes de guardar un carrito y
otra vez antes de cada envío.

**`consultarBaja()` distingue dos motivos** de "no": baja voluntaria vs. fallo
del store. Confundirlos ya costó caro — antes el `catch` devolvía `true`, así
que un fallo de Blobs se presentaba como baja voluntaria: `track-cart`
respondía `opted_out` a todo el mundo, no se guardaba ningún carrito y no salía
ningún recordatorio, sin un solo error a la vista.

`estaDadoDeBaja()` **falla cerrado** (si no se puede leer, no se manda).

---

## 2. Catálogo de productos — JSON estáticos

El catálogo **no está en una base de datos**: son archivos versionados en
`frontend/public/data/`, servidos por el CDN y pedidos por `fetch` bajo demanda.

### `catalog.json` — índice de categorías
```json
[ { "slug": "argentina", "count": 129, "cover": "/stickers/argentina/1.webp" } ]
```
**99 categorías**, ordenadas alfabéticamente por slug. 7,5 KB.

### `<categoria>.json` — diseños de una categoría
Un archivo por categoría (99 en total):
```json
[ { "id": "argentina-1", "file": "/stickers/argentina/1.webp",
    "sku": "000255", "stock": 50 } ]
```
**6.600 diseños** en total.

- `id` = `{slug}-{n}`. **Es la clave del sistema de precios**: el servidor deriva
  de acá la categoría (quitando el último `-{número}`) para la promo por
  categoría.
- `sku` = SKU estable del catálogo de Meta, **append-only** (no se renumera).
- `stock: 50` es un **valor fijo para el feed de Meta**, no un inventario real.

### Otros archivos de datos
| Archivo | Qué es |
|---|---|
| `skus.json` | registro append-only de SKUs (166 KB) |
| `meta-catalog.csv` | feed de producto para Meta Commerce Manager (2,3 MB) |
| `cutouts.json` | recortes de portada por categoría |
| `aliases.json` | alias del buscador |
| `nuevas-catalogo.json` | lote de diseños nuevos |

### Cómo se regenera
Scripts manuales en `/scripts` (Node, no corren en el build):
```
import-catalogo.mjs   → importa imágenes desde iCloud, las convierte a .webp
build-catalog.mjs     → genera catalog.json y los <categoria>.json
build-meta-feed.mjs   → asigna SKUs estables + stock, genera el CSV de Meta
gen-categories.mjs    → agrega a src/data/categories.js las categorías nuevas
generate-sitemap.mjs  → sitemap.xml  (este SÍ corre en el prebuild)
optimize-images.mjs   → optimización de imágenes
```

**Consecuencia operativa**: agregar productos es un cambio de código + commit +
deploy. No hay panel para cargar productos.

### Metadata de categorías
`frontend/src/data/categories.js` — nombre, emoji y orden de cada categoría, más
`SPECIALS` (personalizados, mayorista, negocio, tatuajes, polaroid), filtrado por
`HIDDEN_SECTIONS`.

---

## 3. Estado en el navegador

### localStorage
| Clave | Qué guarda | Dónde |
|---|---|---|
| `epicalcos.cart.v2` | el carrito completo (array de líneas) | `CartContext` |
| `epicalcos.welcomeCoupon` | cupón del popup, para autocompletar el checkout | `config/pricing.js` |
| `epicalcos.exp.v1` | asignación de variantes A/B + id de visitante | `lib/experiments.js` |
| — | categorías recientes | `lib/recientes.js` |
| — | tamaño elegido para la grilla | `lib/tamanoElegido.js` |
| — | datos de advanced matching de Meta | `lib/advancedMatching.js` |

### sessionStorage
| Clave | Qué guarda | Por qué |
|---|---|---|
| `epicalcos.purchase.v1` | pedido ya preciado (ítems, envío, total, cupón) | sobrevive al redirect a Mercado Pago; se **lee y borra** en `/pago-exitoso` para no duplicar el evento |
| `epicalcos.customSpec` | spec de los personalizados | CTA de WhatsApp en `/pago-exitoso` |

### Forma de una línea del carrito
No hay schema declarado; esta es la forma real que arma el `CartContext`:
```js
{
  id: "sticker:argentina-72:6cm",   // ★ el servidor reprecia desde acá
  type: "sticker" | "pack" | "custom" | "negocio" | "fixed" | "digital",
  name: "Argentina #72 · 6 cm",
  category, categoryLabel, image,
  catalogSku: "000326",             // SKU de Meta
  size: "6cm",
  basePrice: 1600,                  // precio de LISTA
  quantity: 1,
  envioGratis: true,                // solo packs; el servidor NO lo cree
  meta: { … }                       // adjuntos (ej. fotos de Polaroid)
}
```

**Migración de carritos guardados**: `esCustomViejo()` descarta al hidratar las
líneas del configurador viejo (`custom:{material}:{tamano}:{corte}:{ts}`, 5
tramos). Sin eso, una línea sobreviviente en el localStorage de alguien haría
que el servidor rechazara **todo** su checkout. Es el precedente a seguir ante
cualquier cambio de forma de las líneas.

---

## 4. Entidades y relaciones

No hay claves foráneas ni integridad referencial. Las relaciones son por
convención:

```
 Pedido (Blobs: orders)
   │  clave: orderId = external_reference de MP
   ├── payer          (embebido, no hay tabla de clientes)
   ├── shipping       (embebido)
   ├── items[]        (embebido)
   │      └── id → parseado por lib/pricing.js para reprecio
   │      └── catalogSku → SKU del feed de Meta
   ├── notionPageId ──────→ página del CRM Notion
   ├── preferenceId ──────→ preferencia de Mercado Pago
   └── payment.id ────────→ pago de Mercado Pago

 Carrito abandonado (Blobs: abandoned-carts)
   └── clave: email  ←→  Opt-out (Blobs: abandoned-optout), misma clave

 Diseño (JSON estático)
   └── id "{slug}-{n}"  →  categoría (regex)  →  promo por categoría
   └── sku              →  producto en el catálogo de Meta
```

**No hay entidad "cliente"**: los datos del comprador se copian embebidos en cada
pedido. La unificación por email ocurre fuera de este repo (Notion y el CRM
interno).

---

## 5. Consistencia y fallos

Todas las escrituras a Blobs **capturan sus propios errores y nunca lanzan**: el
checkout tiene que seguir funcionando aunque falle la persistencia.

Consecuencias de diseño:

| Si falla | Qué pasa |
|---|---|
| `saveOrder` | El webhook reconstruye lo esencial desde `payment.metadata`. Se pierden los comentarios largos y los links de Cloudinary. |
| `crearLeadEnCRM` (Notion) | El checkout sigue. El webhook crea la fila desde los datos del pago (`fallback`). |
| `notifyCrm` (CRM interno) | No-op silencioso. Timeout de 3 s para no bloquear el checkout. |
| `borrarCarrito` | Riesgo de mandarle un recordatorio a alguien que ya compró. |
| Blobs completo | El pedido igual se crea en MP y el cliente puede pagar. |

**Deduplicación**
- Mails: `notifiedAt` en el pedido (MP reintenta el webhook varias veces).
  Solo se marca si el mail interno salió — si Resend falló, el reintento vuelve
  a intentarlo en vez de perder el pedido para siempre.
- Meta CAPI: `event_id = purchase-{orderId}`, el mismo que dispara el píxel.
- CRM interno: `X-EPICALCOS-Idempotency-Key`.
- Recordatorio de carrito: `notifiedAt` (1 mail por carrito).

**No hay transacciones.** Cada escritura es independiente; un fallo parcial deja
el sistema en estado mixto (ej. pedido en Blobs pero no en Notion). El diseño lo
acepta a propósito: ninguna integración puede bloquear una venta.

---

## 6. Preguntas abiertas

`UNKNOWN / REQUIRES CONFIRMATION`

1. **Retención de `orders`**: no hay purga. ¿Cuánto tiempo hay que conservar los
   pedidos? (Los datos incluyen PII: nombre, email, teléfono, dirección.)
2. **Backup de Blobs**: no hay ninguno en el repo. ¿Existe fuera?
3. **Volumen actual**: cuántos pedidos hay guardados hoy — no se puede saber
   desde el repo.
4. **`.netlify/db/`**: confirmar que es solo un artefacto de la CLI y que no hay
   planes de Netlify DB.
5. **Derecho de supresión (datos personales)**: no hay mecanismo para borrar los
   datos de un cliente de `orders` a pedido.
