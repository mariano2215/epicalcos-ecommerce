# Design — Polaroid imantadas y descuento por volumen

| | |
|---|---|
| **Spec** | `019-polaroid-imantadas` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 13/09/2026 |

> **Este documento define CÓMO se implementará.**
> Acá sí van rutas de archivo, nombres de función y formas de payload.

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Parcialmente.** El selector de tamaño de `/polaroid` ya existe y ya genera ids de línea por variante (`fixed:polaroid-x10-{size}`). El material es un segundo eje del mismo mecanismo. Lo que **no** existe en ningún producto de precio fijo es un precio que dependa de la **cantidad**. |
| ¿Qué archivos están involucrados? | `frontend/src/config/pricing.js`, `frontend/src/components/FixedProductPage.jsx`, `frontend/src/routes/Polaroid.jsx`, `frontend/src/config/metaCatalog.js`, `frontend/src/context/CartContext.jsx`, `frontend/src/lib/analytics.js`, `netlify/functions/lib/pricing.js`, `docs/business-rules.md`, `docs/analytics.md`. |
| ¿Hay tests que lo cubran hoy? | **No hay ni uno de las Polaroid.** `promoPricing.test.js` toca las líneas `fixed:` solo con `tatuajes-hoja` (líneas 755-763 y 1096-1103), para verificar que **no** reciben descuentos. La paridad de los tres precios de Polaroid no está testeada por nadie. Es un agujero que esta spec cierra. |
| ¿Toca el camino de precios? | **Sí, los dos lados del espejo.** `POLAROID_SIZES` en `config/pricing.js` ↔ `FIXED_PRICES` en `netlify/functions/lib/pricing.js`. |
| ¿Hay comentarios en el código que expliquen por qué está así? | **Sí, tres que mandan sobre este diseño:** |

**Los tres comentarios que condicionan el diseño**

1. `config/pricing.js` → `precioVidrieraLinea()`: *"EL RESULTADO NO SE PERSISTE
   NUNCA. Se deriva en cada render… Guardarlo en `basePrice` al agregar parece
   lo obvio y es una trampa"*. El precedente es la promo de Argentina: un
   carrito guardado con el precio ya descontado adentro mandaba al servidor un
   número que ya no era el vigente y trababa **todo** el checkout con
   `price_mismatch`.
   → **Esta razón sigue vigente y el diseño la respeta**: `basePrice` guarda
   siempre el precio de lista del pack de 10, y el descuento por volumen se
   deriva en cada render desde la cantidad de la línea. Nunca se persiste.

2. `config/pricing.js` → `precioVidrieraLinea()`: *"Decide por el ID de la
   línea, igual que `esPromoArgentina` y que el servidor, así que los dos lados
   miran el mismo dato y el espejo no se desincroniza."*
   → El diseño extiende ese criterio: el material va **en el id** (`-iman`), no
   en un flag aparte. El servidor ya recibe el id y la cantidad, y con eso solo
   puede reconstruir el precio exacto.

3. `netlify/functions/lib/pricing.js` → `lineBase()`: los `fixed` son
   `discountable: false` y `expected = lb.base` sin mirar la cantidad. Pero la
   función **ya recibe `quantity`** y ya la usa para los packs
   (`pack:mayorista` valida el mínimo). No hay que cambiar la firma ni el
   contrato: solo usar un parámetro que ya está ahí.

**Hallazgo extra (fuera de scope, anotado):** `CLAUDE.md` y
`specs/_template/tasks.md` dicen "210 tests" / "100 tests"; la suite real tiene
**470**. No se toca en esta spec (`CLAUDE.md` regla 8).

---

## 1. Arquitectura propuesta

El material es **un segundo eje de variante**, igual que el tamaño ya lo es. El
volumen es **una función de la cantidad de la línea**, calculada igual de los
dos lados del espejo.

```
/polaroid
   │  tamaño (5x8 | 7x10 | 9x13)   ← ya existe
   │  material (comunes | imantadas) ← NUEVO
   │  cantidad de packs (1, 2, 3…)  ← ya existe
   ▼
id de línea:  fixed:polaroid-x10-7x10          (comunes)
              fixed:polaroid-x10-7x10-iman     (imantadas)   ← NUEVO
   ▼
precio por pack = precioPolaroidPack(id, packs)
                = precio de lista del id  −  (packs ≥ 2 ? $2.000 : 0)
   ▼
cliente: FixedProductPage (ficha) → CartContext (carrito, checkout)
servidor: lineBase(id, quantity) → mismo número, o price_mismatch
```

La clave del diseño: **una sola función, escrita dos veces, que recibe
exactamente los dos datos que el servidor ya tiene** (id y cantidad). Ningún
tercer dato viaja en el payload, así que no hay nada que el cliente pueda
mentir.

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| El material va en el **id de la línea** (`-iman`) | Un campo `meta.imantada` en la línea | El servidor deriva el precio **solo** del id (`lineBase` parte el id y nada más). Un flag en `meta` sería un dato del cliente que decide un precio: exactamente lo que `CLAUDE.md` regla 14 prohíbe. |
| El volumen se cuenta **por línea** (`quantity ≥ 2`) | Sumar todas las Polaroid del carrito, como el 10 % por volumen de calcos (`stickerUnits`) | Sumar el carrito existe y funciona, pero tiene un costo alto acá: el precio de una línea pasaría a depender de **otras** líneas, y la ficha de producto —que muestra el precio antes de que exista el carrito— ya no podría mostrar el número correcto. Con el conteo por línea, ficha = carrito = checkout es una igualdad trivial de sostener (`acceptance.md` PAR-7). **Costo asumido**: quien agrega dos veces 10 fotos con archivos adjuntos genera dos líneas y no cobra el descuento (ver mitigación abajo). Queda marcado como pregunta abierta en `requirements.md` §12. |
| El descuento se **deriva** en cada render | Guardarlo en `basePrice` al agregar | Es literalmente la trampa documentada en `precioVidrieraLinea()`. Un carrito guardado con el número adentro rompe el checkout entero cuando cambie el precio. |
| Precio de lista por id + resta fija de $2.000 | Seis ids nuevos con precio de 20 (`polaroid-x20-…`) | Con ids fijos por escalón, 30 fotos (3 packs) volverían a precio pleno, y Mariano pidió que el descuento corra **de 20 en adelante** (RF-4). Una tabla de ids por escalón obligaría a inventar un id por cada cantidad posible. |
| Un solo helper compartido por ficha, carrito y checkout | Repetir la cuenta en cada pantalla | Tres copias de una regla de precio son tres oportunidades de desincronizar el espejo. |

**Mitigación del costo asumido (dos líneas de 10)**

La ficha muestra el aviso de RF-9 pegado al stepper de cantidad (*"20 fotos o
más: $200 menos por foto"*) y el precio del botón se actualiza al subir la
cantidad. El camino natural — subir el contador a 2 y subir las 20 fotos en la
misma línea, que el uploader ya permite (`perUnit: 10` × cantidad) — es el que
cobra el descuento. El caso perdido es el de quien vuelve en otra sesión a
comprar 10 más, que hoy tampoco tendría descuento porque hoy no existe.

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/config/pricing.js` | `POLAROID_SIZES` gana el precio imantado; constantes nuevas (`POLAROID_IMAN_RECARGO_PACK`, `POLAROID_VOLUMEN_MIN_PACKS`, `POLAROID_VOLUMEN_OFF_PACK`); funciones `polaroidProductId()`, `precioPolaroidPack()` y `descuentoPolaroidVolumen()`; `precioVidrieraLinea()` pasa a contemplar las líneas de Polaroid | 🔴 |
| `netlify/functions/lib/pricing.js` | `FIXED_PRICES` suma los tres ids imantados; el bloque `fixed` de `lineBase()` resta el descuento por volumen cuando el id es de Polaroid y `quantity ≥ 2` | 🔴 |
| `frontend/src/components/FixedProductPage.jsx` | Prop **nueva y opcional** `variants` (selector de material) y prop opcional `volumen` (aviso + cálculo del precio por cantidad). Sin `variants`, el componente se comporta **exactamente** como hoy | 🟡 |
| `frontend/src/routes/Polaroid.jsx` | Pasa `variants` y `volumen`; textos de la ficha (bullets, specs, subtítulo) | 🟢 |
| `frontend/src/config/metaCatalog.js` | `FIXED_SKU` suma los tres ids imantados, apuntando al **mismo** SKU de Polaroid | 🟢 |
| `frontend/src/lib/analytics.js` | `trackPolaroidMaterial()` | 🟢 |
| `frontend/src/lib/promoPricing.test.js` | Tests de paridad de Polaroid (los seis precios base + el volumen) | 🟢 |
| `docs/business-rules.md` | Tabla de productos de precio fijo + regla nueva de volumen | 🟢 |
| `docs/analytics.md` | Evento `polaroid_material` | 🟢 |

### Archivos nuevos

Ninguno. Toda la lógica nueva de precio vive en los dos lados del espejo que ya
existen; poner una regla de precio de Polaroid en un archivo aparte sería un
tercer lugar donde mirar cuando algo no cuadre.

### ⚠️ Módulos compartidos

`CLAUDE.md` regla 9.

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **sí** | 44 archivos: 17 componentes, 12 rutas, `config/site.js`, `config/personalizados.js`, `context/CartContext.jsx`, `lib/analytics.js`, `lib/promo.js`, `lib/cuponVentana.js`, `lib/tamanoElegido.js`, `data/categories.js`, `scripts/build-meta-feed.mjs` y 8 tests. **Todo lo nuevo son exports nuevos**; el único export existente que cambia de comportamiento es `precioVidrieraLinea()`, y solo para ids que empiezan con `polaroid-x10` — para cualquier otra línea devuelve exactamente lo mismo que hoy. |
| `frontend/src/config/site.js` | **no** | — |
| `frontend/src/context/CartContext.jsx` | **no se modifica** | 35 archivos. Ya llama a `precioVidrieraLinea(i)` con la línea entera —que incluye `quantity`— en `derived.items`, y `pricedItems` deja intactas las líneas no `discountable`. El precio nuevo fluye solo. **Si al implementar hiciera falta tocarlo, se para y se avisa**: es el módulo de mayor radio del repo. |
| `netlify/functions/lib/pricing.js` | **sí** | `netlify/functions/create-preference.js`, `netlify/functions/create-order-transfer.js` y 15 archivos del frontend que importan sus constantes de envío/precio. Se toca `FIXED_PRICES` (solo agrega claves) y el bloque `fixed` de `lineBase()` (solo cambia para ids de Polaroid). |
| `frontend/src/lib/analytics.js` | **sí** | 30 archivos. Solo se **agrega** una función; ninguna existente cambia de firma. |
| `frontend/src/components/FixedProductPage.jsx` | **sí** | `frontend/src/routes/Polaroid.jsx` y **`frontend/src/routes/Tatuajes.jsx`**. ⚠️ Las props nuevas son opcionales justamente por esto: `/tatuajes` no pasa `variants` ni `volumen` y tiene que renderizar y cobrar **idéntico** a hoy. Es un criterio de aceptación explícito (AC-12). |

Comandos usados para verificar:
```bash
grep -rln "config/pricing" frontend/src scripts
grep -rln "lib/pricing" netlify frontend/src
grep -rln "CartContext" frontend/src
grep -rln "FixedProductPage" frontend/src
grep -rln "metaCatalog" frontend/src scripts
```

---

## 3. Datos

### Estructuras nuevas o modificadas

```js
// frontend/src/config/pricing.js

/**
 * Fotos Polaroid: pack de 10 fotos, en 3 tamaños × 2 materiales.
 * `price` es el pack común; `priceIman` el mismo pack imantado ($600 por foto
 * = $6.000 por pack, igual en los tres tamaños).
 * ⚠️ Los dos precios están espejados en netlify/functions/lib/pricing.js.
 */
export const POLAROID_SIZES = [
  { id: '5x8',  label: '5 × 8 cm',  tag: 'Mini',                        price: 9000,  priceIman: 15000 },
  { id: '7x10', label: '7 × 10 cm', tag: 'Medianas',                    price: 12000, priceIman: 18000 },
  { id: '9x13', label: '9 × 13 cm', tag: 'Grandes · Polaroid original', price: 15000, priceIman: 21000 }
];

export const POLAROID_FOTOS_POR_PACK = 10;
export const POLAROID_IMAN_POR_FOTO = 600;          // display; el precio real sale de priceIman
export const POLAROID_VOLUMEN_MIN_PACKS = 2;        // 20 fotos
export const POLAROID_VOLUMEN_OFF_POR_FOTO = 200;
export const POLAROID_VOLUMEN_OFF_PACK = 2000;      // 200 × 10, escrito explícito para el espejo

/** `polaroid-x10-7x10` | `polaroid-x10-7x10-iman` — el id que va al carrito y al servidor. */
export function polaroidProductId(sizeId, imantada) { … }

/** ¿Esta línea es de Polaroid? Se decide por el id, igual que esPromoArgentina(). */
export function esPolaroid(lineId) { … }

/** Descuento por pack (0 o POLAROID_VOLUMEN_OFF_PACK) según la cantidad de packs. */
export function descuentoPolaroidVolumen(packs) { … }

/** Precio FINAL por pack: lista del tamaño+material menos el volumen. */
export function precioPolaroidPack(sizeId, imantada, packs) { … }
```

```js
// netlify/functions/lib/pricing.js — ESPEJO

const FIXED_PRICES = {
  'tatuajes-hoja': 12000,
  // Fotos Polaroid x10 por tamaño y material — espejo de POLAROID_SIZES del frontend.
  'polaroid-x10-5x8': 9000,
  'polaroid-x10-7x10': 12000,
  'polaroid-x10-9x13': 15000,
  'polaroid-x10-5x8-iman': 15000,
  'polaroid-x10-7x10-iman': 18000,
  'polaroid-x10-9x13-iman': 21000
};

// Desde 2 packs (20 fotos) el precio POR PACK baja $2.000 ($200 por foto).
// Corre en comunes e imantadas por igual, y escala: 3 packs pagan 3 × el
// precio con descuento. Espejo de descuentoPolaroidVolumen() del frontend.
const POLAROID_VOLUMEN_MIN_PACKS = 2;
const POLAROID_VOLUMEN_OFF_PACK = 2000;

// dentro de lineBase(), rama `fixed`:
if (kind === 'fixed') {
  const price = FIXED_PRICES[parts[1]];
  if (!price) return { error: `producto desconocido "${id}"` };
  const off =
    parts[1].startsWith('polaroid-x10') && quantity >= POLAROID_VOLUMEN_MIN_PACKS
      ? POLAROID_VOLUMEN_OFF_PACK
      : 0;
  return { base: price - off, kind, discountable: false };
}
```

**Forma de la línea del carrito** — no cambia. Sigue siendo:

```js
{
  id: 'fixed:polaroid-x10-7x10-iman',        // o con `:{ts}` si trae archivos
  type: 'fixed',
  name: 'Fotos Polaroid · x10 · 7 × 10 cm · Imantadas',
  basePrice: 18000,                          // precio de LISTA del pack, sin volumen
  quantity: 2,
  catalogSku: '006578',
  meta: { archivos: [...] }                  // igual que hoy
}
```

`basePrice` guarda el precio de lista y **nunca** el precio con volumen: el
descuento lo deriva `precioVidrieraLinea()` en cada render, desde `quantity`.

### Persistencia

| Dónde | Qué | Ref. |
|---|---|---|
| Netlify Blobs (`orders`) | El pedido guarda el nombre y el precio ya resueltos por el servidor. Sin cambios de forma. | `docs/database.md` §1 |
| `localStorage` (`epicalcos.cart.v2`) | Líneas de Polaroid con los ids nuevos. Misma forma que las de hoy. | `docs/database.md` §3 |
| JSON estáticos del catálogo | No se tocan. | `docs/database.md` §2 |

### ⚠️ Compatibilidad con datos existentes

- [x] **No cambia la forma de las líneas del carrito**: el material va dentro
      del id, que es un string como cualquier otro. Una línea
      `fixed:polaroid-x10-7x10` guardada antes del cambio sigue resolviendo a un
      id válido de `FIXED_PRICES`, con el mismo precio de lista. **No hace falta
      un `esCustomViejo()` para esto.**
- [x] Una línea vieja de 2 packs o más pasa a costar $2.000 menos por pack. El
      precio **baja**, los dos lados calculan lo mismo y no hay
      `price_mismatch`. No hay caso en el que un carrito guardado suba de precio.
- [x] Los pedidos ya guardados en Blobs no cambian de forma y se siguen leyendo
      igual desde el webhook.

---

## 4. APIs

### Endpoints afectados

| Endpoint | Method | Cambio |
|---|---|---|
| `/api/create-preference` | POST | Ninguno en el contrato. Acepta los ids nuevos porque `lineBase()` los conoce. |
| `/api/create-order-transfer` | POST | Ídem. |
| `/api/capture-lead` | POST | No afectado |
| `/api/track-cart` | POST | No afectado |
| `/api/mercadopago-webhook` | POST | No afectado |
| `/api/unsubscribe` | GET/POST | No afectado |

### Endpoints nuevos

Ninguno.

### Contratos

```js
// Request a /api/create-preference — 20 fotos de 7×10 imantadas
{
  items: [
    {
      id: 'fixed:polaroid-x10-7x10-iman',
      title: 'Fotos Polaroid · x10 · 7 × 10 cm · Imantadas',
      quantity: 2,
      unit_price: 16000            // 18.000 − 2.000 de volumen
    }
  ],
  shipping: { … },
  paymentMethod: 'mercadopago'
}

// El servidor recalcula: FIXED_PRICES['polaroid-x10-7x10-iman'] = 18000,
// quantity 2 ≥ 2 → 18000 − 2000 = 16000. Coincide → itemsTotal 32.000.

// Response error si no coincide (idéntico a hoy)
{ ok: false, error: 'price_mismatch',
  detail: 'el precio de "…" no coincide con el vigente — recargá la página' }
```

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago | Recibe el título con el material. Nada estructural. | no |
| Notion (CRM) | El nombre de la línea dice si es imantada — es el dato que Mariano necesita para producir. | no |
| Resend (mails) | Ídem: el nombre viaja en el detalle del pedido. | no |
| Cloudinary | Sin cambios: mismo preset, mismo cupo de 10 archivos por pack. | no |
| Meta (Pixel / CAPI) | Los tres ids imantados mapean al **mismo** SKU `006578` de Polaroid. El feed no cambia: `build-meta-feed.mjs` sigue publicando un solo producto con `POLAROID.price` de referencia. | no |
| CRM interno | Sin cambios de forma. | no |

**Por qué las imantadas no son un producto nuevo en el catálogo de Meta**: el
feed tiene un SKU por *línea especial* (`linea:polaroid`), y el registro de SKUs
es **append-only** (`frontend/public/data/skus.json`). Partir Polaroid en dos
productos partiría también el historial de aprendizaje de las campañas, que hoy
corre sobre ese SKU. Si más adelante conviene separarlas, es una decisión de
pauta con su propia spec.

### Variables de entorno nuevas

Ninguna.

---

## 6. Seguridad

`CLAUDE.md` regla 14.

- [x] Ningún secreto en el frontend — no hay variables nuevas
- [x] El servidor no confía en ningún valor del cliente: el precio se deriva del
      `id` y de la `quantity`, los dos datos que ya validaba
- [x] Payloads con tope de tamaño y texto — sin cambios (`MAX_LINES` 130,
      `MAX_QTY_PER_LINE` 1000, `MAX_TITLE_LENGTH` 150)
- [x] Inputs validados en el servidor: un id que no esté en `FIXED_PRICES`
      sigue devolviendo `producto desconocido`
- [x] Sin PII en logs, URLs ni `dataLayer`
- [x] Sin endpoints nuevos ni webhooks nuevos
- [x] No afecta la CSP

**Riesgos identificados y cómo se mitigan**

| Riesgo | Mitigación |
|---|---|
| El cliente manda `quantity: 2` con el precio de 1 pack para pagar de más/de menos | El servidor recalcula desde `(id, quantity)` y rechaza con `price_mismatch`. No hay camino en el que el cliente elija el precio. |
| El id imantado se agrega en un solo lado del espejo | Test de paridad que recorre `POLAROID_SIZES` y compara contra `FIXED_PRICES` clave por clave (§9). En rojo, Netlify no publica. |
| El descuento por volumen queda escrito con distinto criterio en cada lado (ej. `> 2` vs `>= 2`) | El test de paridad prueba el escalón exacto: 1 pack sin descuento, 2 con, 3 con. |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Falla de red al pagar | Igual que hoy | El mensaje de error del checkout, sin cambios |
| Timeout de un servicio externo | Igual que hoy: ninguna integración bloquea la venta | Nada |
| Precio desactualizado (`price_mismatch`) | El servidor rechaza el pedido entero y loguea el id, el recibido y el esperado (sin PII) | *"el precio de … no coincide con el vigente — recargá la página"* |
| Payload inválido (id de Polaroid inexistente) | `item_invalid` con `producto desconocido "…"` | Mensaje de error del checkout |
| Falla el tracking de `polaroid_material` | `try/catch` como todo el módulo: se traga el error | Nada — la compra sigue |

---

## 8. Estrategia de migración

- **Datos existentes**: no hay nada que migrar. Los tres ids comunes siguen
  existiendo con el mismo precio.
- **Carritos guardados**: siguen válidos sin conversión. Los de 2 packs o más
  bajan de precio (ver §3).
- **Pedidos ya en Blobs**: sin cambios de forma.
- **Compatibilidad hacia atrás**: total. Un cliente con la página vieja abierta
  en otra pestaña manda un id común con `quantity: 2` y `unit_price` viejo →
  ahí sí hay `price_mismatch`, con el mensaje que ya le dice *"recargá la
  página"*. Es la misma ventana que tiene hoy cualquier cambio de precio, y se
  cierra sola con un F5.
- **Rollback**: revertir el commit. No hay datos nuevos que limpiar ni env vars
  que borrar. Las líneas imantadas que hubieran quedado en el `localStorage` de
  alguien pasarían a ser ids desconocidos y su checkout se rechazaría — por eso
  el rollback, si hace falta, es mejor hacerlo dejando los ids en
  `FIXED_PRICES` y sacando solo el selector de la ficha.
- **Feature flag**: no se agrega uno. `CLAUDE.md` regla 10 y el precedente de la
  "salida de emergencia" de `netlify.toml` (*"un interruptor cómodo termina
  quedando apagado"*). Sacar el selector es un cambio de una prop.

---

## 9. Testing

### Tests nuevos

| Archivo | Qué verifica |
|---|---|
| `frontend/src/lib/promoPricing.test.js` | **P-1** Paridad: cada entrada de `POLAROID_SIZES` (común e imantada) existe en `FIXED_PRICES` con el mismo número, y `FIXED_PRICES` no tiene ids de Polaroid que el frontend no conozca (paridad en los **dos** sentidos). |
| `frontend/src/lib/promoPricing.test.js` | **P-2** Recargo: `priceIman − price === 6000` en los tres tamaños ($600 × 10 fotos). |
| `frontend/src/lib/promoPricing.test.js` | **P-3** Volumen, escalón exacto: 1 pack sin descuento; 2 packs a −$2.000 por pack; 3 packs también. Los seis ids. |
| `frontend/src/lib/promoPricing.test.js` | **P-4** El ejemplo de Mariano: 2 packs de `polaroid-x10-7x10-iman` dan **$32.000** de total, calculado por el frontend **y** por `validateAndPriceOrder` del servidor. |
| `frontend/src/lib/promoPricing.test.js` | **P-5** Las Polaroid **siguen fuera** de todo descuento: cupón de %, 10 % por transferencia, 10 % por volumen de calcos y promos N×M no las tocan (el test T-7 que hoy existe para `tatuajes-hoja`, extendido a un id de Polaroid). |
| `frontend/src/lib/promoPricing.test.js` | **P-6** `precioVidrieraLinea()` sobre una línea de Polaroid devuelve el precio con volumen, y sobre las líneas que no son Polaroid devuelve exactamente `basePrice` (no-regresión de los 3 tests que ya lo cubren). |
| `frontend/src/lib/promoPricing.test.js` | **P-7** `tatuajes-hoja` con `quantity: 5` **no** recibe ningún descuento por volumen. |
| `frontend/src/lib/promoPricing.test.js` | **P-8** Cada id de Polaroid de `FIXED_PRICES` tiene entrada en `FIXED_SKU` (`metaCatalog.js`), o sus eventos matchean con el producto equivocado en Meta. |

### ⚠️ Tests de paridad

- [x] `frontend/src/lib/promoPricing.test.js` — paridad de precios y promos
- [ ] `frontend/src/lib/envio.test.js` — no aplica, no se tocan umbrales
- [ ] `frontend/src/lib/precioPersonalizados.test.js` — no aplica

**Baseline al escribir esta spec**: 470 tests pasan. (3 archivos de tests del
servidor — `canarioBlobs`, `pedidoTransferencia`, `webhookMercadoPago` — no
levantan en el contenedor de esta sesión porque el paquete `mercadopago`
instalado por `npm ci` no resuelve `./mercadoPagoConfig`. Es un artefacto del
entorno, no del repo: ninguno toca precios.)

### Verificación manual

- [ ] Recorrido completo en 375 px: elegir imantadas, subir a 2 packs, ver
      $32.000 en la ficha, en el carrito y en el checkout, y pagar.
- [ ] Navegación por teclado del selector de material (tab + enter, foco
      visible).
- [ ] `/tatuajes` renderiza y cobra idéntico a antes del cambio.
- [ ] El nombre con "Imantadas" llega al mail y al CRM.

---

## 10. Dependencias nuevas

Ninguna.

---

## 11. Preguntas abiertas del diseño

- [ ] `REQUIERE CONFIRMACIÓN` — Conteo del volumen **por línea** vs. por carrito
      (§1). Es la única decisión del diseño que cambia el resultado para el
      cliente; está explicada con su costo y su mitigación.
- [ ] `REQUIERE CONFIRMACIÓN` — Texto exacto del selector: *"Comunes"* /
      *"Imantadas"* vs. *"Papel"* / *"Con imán"*. Sale de `guia-escritura-humana`
      al implementar; no bloquea nada.
