# Design — Cupón EPIMAYOR (pack mayorista de 100 a $47.500)

| | |
|---|---|
| **Spec** | `008-cupon-epimayor` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 18/08/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, a medias.** La promo mayorista de 100 × $39.999 (`PROMO_MAYORISTA_100` / `MAYORISTA100_*`) hace exactamente esto — 100 calcos a precio fijo, solo 4 y 6 cm — pero se activa **por fecha**, no por cupón. Venció el 14/8/2026 y hoy está muerta. |
| ¿Qué tipos de cupón existen? | Dos: **% sobre calcos sueltos** (`COUPONS.EPICA10.discount`) y **N×M / bundle** (`COUPONS[x].bundle` ↔ `COUPON_BUNDLES`, hoy vacío). **Ninguno toca líneas de pack.** |
| ¿Por qué ningún cupón toca los packs? | `lineBase()` devuelve `discountable: false` para `pack`/`negocio`/`fixed`/`digital`, con el comentario *"ya traen su precio final"*. `pricedItems()` del `CartContext` hace lo mismo del lado del cliente. Es una decisión deliberada, no un olvido. |
| ¿Hay tests que lo cubran hoy? | Sí: `promoPricing.test.js` (57 tests) cubre cupones, bundles y la promo mayorista; `envio.test.js` cubre que ningún pack regale el envío. Suite completa: **229 tests en verde** (el `CLAUDE.md` dice 210 — está desactualizado, ver Hallazgos). |
| ¿Toca el camino de precios? | **Sí, los dos lados del espejo.** |
| ¿Hay comentarios que expliquen por qué está así? | Sí, tres que importan: (a) el bloque *"NO HAY PACKS CON EL ENVÍO INCLUIDO"*, que documenta el pack de $39.999 que viajó gratis a Buenos Aires; (b) el comentario de `precioVidrieraLinea` sobre el precio que "subía al doble" en el carrito; (c) el de `PROMO_3X2`, que explica por qué una entrada vencida no se borra. **Ninguno se contradice con esta feature** — ver §1. |

### Lo que el discovery cambió del pedido original

`$47.500 / 100 = 475` **exacto**. Eso permite implementar el cupón **sin
inventar un tipo de línea nuevo**: alcanza con reescribir el precio unitario de
la línea de pack que ya existe. Si el número no hubiera sido divisible, habría
hecho falta una línea nueva (`pack:mayoristaEpi:…`) y con ella una migración de
carritos guardados. **Si Mariano cambia $47.500 por un número que no divide por
100, este diseño deja de valer.**

---

## 1. Arquitectura propuesta

Un **tercer tipo de cupón**: el *cupón de pack*. No descuenta un porcentaje ni
regala unidades — **fija el precio de una línea de pack** que cumpla una forma
exacta (tipo de pack + cantidad + tamaño).

```
Cliente arma 100 calcos en /mayorista
        ↓
  línea `pack:mayorista:4cm:{ts}`  ·  quantity = 100  ·  basePrice = 600
        ↓  (carrito: $60.000 — sin cambios)
Checkout: escribe EPIMAYOR
        ↓
  CartContext.pricedItems() → primera línea que califica: price = 475
        ↓  (checkout: $47.500 + envío, con $60.000 tachado)
  POST /api/create-preference | /api/create-order-transfer  { couponCode: 'EPIMAYOR' }
        ↓
  validateAndPriceOrder() recalcula: 47500 / 100 = 475 → coincide → OK
```

**La línea del carrito no cambia de forma.** Solo cambia su `price` en el
checkout, igual que hoy cambia el de un calco suelto cuando se aplica `EPICA10`.

### Por qué el precio unitario y no una línea nueva

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Reescribir `unit_price` a 475 sobre la línea `pack:mayorista:…` existente | Emitir una línea nueva `pack:mayoristaEpi:{size}:{ts}` con `quantity: 1` y `basePrice: 47500`, como hace `mayorista100` | La línea nueva la tendría que emitir el **armador**, y el cupón se escribe en el **checkout** — el armador no sabe todavía que hay cupón. Reescribir el precio unitario no requiere que el armador sepa nada, no cambia la forma de las líneas y por lo tanto **no rompe ningún carrito guardado**. |
| Cantidad **exactamente** 100 | Aceptar ≥ 100 | El precio es *por 100 calcos*. Con ≥ 100, un pack de 300 costaría $47.500 y regalaría 200 calcos. |
| Se aplica a **la primera** línea que califica, en el orden del payload | La más cara, o todas | "Un pack por pedido" (decisión de Mariano). *La primera en orden de array* es la única regla que el cliente y el servidor pueden evaluar de forma idéntica sin ordenar nada: el servidor itera el mismo array que mandó el cliente. |
| El cupón **no** aplica ningún % a los calcos sueltos del mismo carrito | Que anule todos los % como hace el bundle | El cupón de pack toca **una sola línea**, y esa línea no participa de ningún %. No hay riesgo de descuento compuesto, así que no hay razón para apagar el 10 % por transferencia de los calcos sueltos que viajen en la misma caja. |
| Precio del pack **sin envío** | Con el envío puesto | El bloque *"NO HAY PACKS CON EL ENVÍO INCLUIDO"* de `config/pricing.js` es explícito y documenta un error ya cometido. Ver `requirements.md` §9.1. |

### Lo que este diseño NO contradice

- **El comentario de "packs sin envío incluido"**: se respeta. El pack a $47.500
  paga envío en las tres zonas. Se agrega un test que lo fija.
- **El comentario de `precioVidrieraLinea`** ("el precio no puede subir al doble
  en el carrito"): acá el precio del carrito **baja** en el checkout, que es el
  comportamiento que ya tiene `EPICA10` y el que el checkout sabe mostrar con el
  precio de lista tachado. No se persiste nada derivado del cupón en `basePrice`.
- **`discountable: false` para packs**: no se toca. El cupón de pack **no pasa por
  el camino de los porcentajes**; es un override de precio anterior a todo eso.

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/config/pricing.js` | Entrada `EPIMAYOR` en `COUPONS` con la forma `pack`; helpers `couponPack()`, `precioUnitarioPackCupon()`, `esLineaPackCupon()` | 🔴 |
| `netlify/functions/lib/pricing.js` | `COUPON_PACKS`, matcher espejado, override en `validateAndPriceOrder()`, `couponApplied` | 🔴 |
| `frontend/src/context/CartContext.jsx` | Pre-pass del cupón de pack en `pricedItems()` | 🔴 |
| `frontend/src/routes/Checkout.jsx` | Motivo cuando el carrito no califica (RF-12) | 🟡 |
| `frontend/src/lib/promoPricing.test.js` | Tests de paridad nuevos | 🟢 |
| `frontend/src/lib/envio.test.js` | Test: el pack con cupón **no** cruza el umbral | 🟢 |
| `docs/business-rules.md` | §2 (tipo de cupón nuevo) y §9 (orden de descuentos) | 🟢 |

### Archivos nuevos
Ninguno.

### ⚠️ Módulos compartidos (`CLAUDE.md` regla 9)

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **sí** | 33 archivos. De la API que se toca (`COUPONS`/`findCoupon`/`couponBundle`) solo dependen **dos**: `CartContext.jsx` y `routes/Checkout.jsx`. `WelcomePopup.jsx` usa la constante del cupón de bienvenida, no el mapa. |
| `frontend/src/config/site.js` | no | — |
| `frontend/src/context/CartContext.jsx` | **sí** (`pricedItems`) | `Checkout.jsx` es el único que llama a `pricedItems`; el resto consume `derived` (subtotales del carrito), que **no cambia** |
| `netlify/functions/lib/pricing.js` | **sí** | `create-preference.js`, `create-order-transfer.js`, y los tests |
| `frontend/src/lib/analytics.js` | no | — |

Comandos usados:
```bash
grep -rn "COUPONS\|findCoupon\|couponBundle" frontend/src
grep -rn "pricedItems" frontend/src
grep -rn "lib/pricing.js" netlify/
```

**Nota sobre `derived`**: el cupón se aplica **solo** en `pricedItems()`, no en
`derived`. Eso deja el carrito (`/carrito`, drawer, barra de envío gratis)
mostrando $60.000 hasta el checkout. Es la misma asimetría que ya tiene
`EPICA10` y está documentada en el comentario largo de `derived`.

---

## 3. Datos

### Estructuras nuevas o modificadas

```js
// frontend/src/config/pricing.js
export const COUPONS = {
  EPICA10: { discount: 0.10, label: 'Bienvenida 10% OFF', hidden: true },

  // Tercer tipo de cupón: NO es de % ni de N×M — fija el precio de UNA línea de
  // pack que cumpla la forma exacta de `pack`. Se manda por privado a un
  // mayorista; el sitio no lo nombra en ninguna pantalla.
  EPIMAYOR: {
    hidden: true,
    label: 'Mayorista 100 × $47.500',
    pack: { packType: 'mayorista', qty: 100, sizes: ['4cm', '6cm'], price: 47500 }
  }
};

/** El pack del cupón, si es de ese tipo y sigue vigente. Null si no. */
export function couponPack(code, now = Date.now()) {
  return findCoupon(code, now)?.pack || null;
}

/**
 * Precio POR UNIDAD del pack del cupón: 47.500 / 100 = 475, EXACTO.
 * Que dé entero no es casualidad ni es opcional — es lo que permite reescribir
 * el precio de la línea sin cambiarle la cantidad ni la forma. Si algún día el
 * precio no divide por `qty`, el redondeo del cliente y el del servidor pueden
 * separarse por $1 y TODO checkout con el cupón se rechaza con price_mismatch.
 */
export function precioUnitarioPackCupon(pack) {
  return round(pack.price / pack.qty);
}

/**
 * ¿Esta línea es el pack que el cupón abarata? Se decide por el ID y la
 * CANTIDAD, que es lo único que el servidor también tiene. Mirar el `meta` de
 * la línea sería mirar algo que el servidor no recibe.
 */
export function esLineaPackCupon(id, quantity, pack) {
  if (!pack) return false;
  const parts = String(id || '').split(':');
  return (
    parts[0] === 'pack' &&
    parts[1] === pack.packType &&
    pack.sizes.includes(parts[2]) &&
    Number(quantity) === pack.qty
  );
}
```

```js
// netlify/functions/lib/pricing.js — ESPEJO
// ⚠️ Espejo de los cupones con `pack` en frontend/src/config/pricing.js.
export const COUPON_PACKS = {
  EPIMAYOR: { packType: 'mayorista', qty: 100, sizes: ['4cm', '6cm'], price: 47500 }
};
export function esLineaPackCupon(id, quantity, pack) { /* idéntica a la del frontend */ }
```

### Dónde se engancha en `pricedItems()` (cliente)

Pre-pass **antes** de las dos ramas que ya existen. Las dos dejan las líneas de
pack intactas, así que el precio reescrito sobrevive sin tocar esa lógica:

```js
// 1 pack por pedido: solo la PRIMERA línea que califica, en orden de array —
// el mismo orden que va a recorrer el servidor.
const pack = couponPack(couponCode);
let base = derived.items;
if (pack) {
  const unit = precioUnitarioPackCupon(pack);
  let usado = false;
  base = derived.items.map((i) => {
    if (usado || !esLineaPackCupon(i.id, i.quantity, pack)) return i;
    usado = true;
    return { ...i, price: unit };
  });
}
// …a partir de acá, las dos ramas existentes operan sobre `base` en vez de
// `derived.items`.
```

### Dónde se engancha en `validateAndPriceOrder()` (servidor)

Dentro del loop de precios, **como primera decisión de la línea**, antes de
`if (!lb.discountable)`:

```js
const packCoupon = COUPON_PACKS[normalizedCoupon] || null;
let packUsado = false;
// …
if (packCoupon && !packUsado && esLineaPackCupon(item.id, item.quantity, packCoupon)) {
  packUsado = true;
  expected = round(packCoupon.price / packCoupon.qty);
} else if (!lb.discountable) { /* … lógica actual, sin cambios … */ }
```

Y `couponApplied` pasa a contemplarlo:
```js
const couponApplied = bundle || couponDiscount > 0 || packCoupon ? normalizedCoupon : null;
```

⚠️ `lineBase()` **sigue corriendo igual** sobre la línea: valida el tamaño y el
mínimo de 100 del pack mayorista antes de que el override toque nada. El cupón
cambia el precio, **no** saltea las validaciones de forma.

### Persistencia
| Dónde | Qué | Ref. |
|---|---|---|
| Netlify Blobs (`orders`) | El pedido ya guarda el cupón aplicado; **no cambia de forma** | `docs/database.md` §1 |
| `localStorage` (`epicalcos.cart.v2`) | **Sin cambios**: el cupón no se persiste y la forma de las líneas es la misma | `docs/database.md` §3 |
| JSON del catálogo | No se toca | — |

### ⚠️ Compatibilidad con datos existentes
- [x] **No** cambia la forma de las líneas del carrito → los carritos guardados
      siguen funcionando sin migración. Un pack de 100 armado ayer califica hoy.
- [x] **No** cambia la forma del pedido guardado en Blobs → el webhook sigue
      leyendo los pedidos viejos.

---

## 4. APIs

### Endpoints afectados
| Endpoint | Method | Cambio |
|---|---|---|
| `/api/create-preference` | POST | Ninguno en el contrato. `couponCode` ya viaja y ya se clipea a 30 chars |
| `/api/create-order-transfer` | POST | Ídem |
| `/api/mercadopago-webhook` | POST | Ninguno |
| Resto | — | Sin cambios |

### Endpoints nuevos
Ninguno.

### Contratos
```js
// Request — sin cambios de forma
{
  items: [
    { id: 'pack:mayorista:4cm:1755500000000',
      title: 'Pack Mayorista x100 · 4 cm',
      quantity: 100,
      unit_price: 475 }        // ← 475 en vez de 600, por el cupón
  ],
  couponCode: 'EPIMAYOR',
  payer: { … }, shipping: { … }
}

// Response OK — itemsTotal 47500, couponApplied 'EPIMAYOR'
// Response error — { error: 'price_mismatch', detail: 'el precio de "…" no coincide
//                    con el vigente — recargá la página' }
```

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago | Ninguno. El ítem viaja con `unit_price: 475`, positivo y entero — MP no admite ≤ 0 y acá no hay riesgo | no |
| Notion / CRM | El pedido llega con `couponApplied: 'EPIMAYOR'` por el campo que ya existe | no |
| Resend | Sin cambios | no |
| Cloudinary | Sin cambios (los archivos propios del pack se suben igual) | no |
| Meta (Pixel / CAPI) | El `purchase` reporta $47.500 + envío, que es lo pagado | no |

### Variables de entorno nuevas
Ninguna.

---

## 6. Seguridad

- [x] Ningún secreto en el frontend. El código `EPIMAYOR` **viaja en el bundle
      JS**, igual que `EPICA10`: "oculto" significa no publicitado, no secreto.
      Quien lea el bundle lo encuentra. **Es una decisión asumida del repo**, y es
      la razón de la pregunta abierta sobre el vencimiento (`requirements.md` §12).
- [x] El servidor no confía en ningún valor del cliente: el precio se deriva del
      `id` + `quantity` de la línea y del código del cupón.
- [x] Payloads con tope (130 líneas, 1.000 u/línea, cupón clipeado a 30 chars) — sin cambios.
- [x] Sin PII nueva en logs, URLs ni `dataLayer`.
- [x] Sin endpoint nuevo, sin CORS nuevo, sin webhook nuevo.
- [x] No afecta la CSP.

| Riesgo | Mitigación |
|---|---|
| El código se filtra y lo usa cualquiera | Asumido: Mariano eligió cupón reutilizable. Mitigación disponible: `endsAt` (una línea de cada lado) o borrarlo de los dos lados. **Sin `endsAt` no se apaga solo.** |
| Alguien manda `unit_price: 475` sin cupón | `price_mismatch`: el servidor espera 600/800 |
| Alguien manda 300 unidades a $475 | No califica (cantidad ≠ 100) → el servidor espera 600 → `price_mismatch` |
| Alguien mete 5 packs de 100 con el cupón | Solo el primero queda a $475; el resto a precio normal |
| El código se apaga solo en el frontend y no en el servidor | Es el error clásico del espejo. El test de paridad falla y **el build de Netlify no publica** (spec 004) |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Cupón escrito y el carrito no califica | No se marca como aplicado; no se toca ningún precio | *"EPIMAYOR aplica al pack mayorista de 100 calcos en 4 o 6 cm."* (con la cantidad real si hay un pack mayorista de otro tamaño/cantidad) |
| Cupón inexistente o vencido | Camino actual, sin cambios | *"Ese cupón no existe o venció."* |
| `price_mismatch` | El checkout no crea la preferencia | El mensaje actual: *"…no coincide con el vigente — recargá la página"* |
| Falla de red al crear la preferencia | Camino actual, sin cambios | Mensaje de error actual del checkout |
| Blobs no disponible | Camino actual: se loguea y sigue | Nada |
| Payload inválido | Camino actual | Mensaje de error actual |

---

## 8. Estrategia de migración

- **Datos existentes**: nada que migrar.
- **Carritos guardados**: siguen funcionando — la forma de las líneas no cambia.
- **Pedidos ya en Blobs**: se leen igual.
- **Compatibilidad hacia atrás**: un cliente con el bundle viejo en memoria no
  conoce `EPIMAYOR`; el checkout le dirá que el cupón no existe. Recargar lo arregla.
- **Rollback**: revertir el commit. Deja el sitio exactamente como estaba —
  ningún dato persistido depende del cupón.
- **Apagar sin revertir**: `endsAt` en el pasado, **en los dos lados del espejo**.
- **Feature flag**: no se agrega env var. El repo apaga promos por fecha o por
  interruptor en el config, no por entorno.

---

## 9. Testing

### Tests nuevos — `frontend/src/lib/promoPricing.test.js`
| Qué verifica |
|---|
| **Paridad**: `COUPONS.EPIMAYOR.pack` === `COUPON_PACKS.EPIMAYOR` (packType, qty, sizes, price) |
| `47500 / 100 === 475` exacto (sin redondeo que pueda separar los dos lados) |
| Servidor **acepta** `pack:mayorista:4cm:…` qty 100 a 475 con `EPIMAYOR` → `itemsTotal` 47.500 |
| Servidor **acepta** el mismo caso en 6 cm |
| Servidor **rechaza** 9 cm a 475 (espera 1.000) |
| Servidor **rechaza** qty 101 a 475 (espera 600) |
| Servidor **rechaza** 475 **sin** cupón |
| Dos packs de 100: el primero 475, el segundo a precio normal |
| `negocio:{ts}` sigue en 39.999 con `EPIMAYOR` aplicado |
| Calcos sueltos con `EPIMAYOR`: **sin** porcentaje del cupón; con transferencia y ≥ 10, conservan el 10 % |
| `couponApplied === 'EPIMAYOR'` cuando aplica |
| **Paridad cliente ↔ servidor**: los `unit_price` que produce `pricedItems()` son los que `validateAndPriceOrder()` espera, para un carrito con pack + sueltos |

### Tests nuevos — `frontend/src/lib/envio.test.js`
| Qué verifica |
|---|
| Pack con `EPIMAYOR` ($47.500) a **Rosario** paga $4.500 — **no** cruza el umbral de $50.000 |
| El mismo pack al **interior** paga $8.500 |
| (Fija por escrito la consecuencia de `requirements.md` §9.1) |

### ⚠️ Tests de paridad
- [x] `promoPricing.test.js`
- [x] `envio.test.js`
- [ ] `precioPersonalizados.test.js` — no aplica

### Verificación manual
- [ ] Compra completa **por Mercado Pago** con el cupón, en 4 cm y en 6 cm
- [ ] Compra completa **por transferencia** con el cupón
- [ ] El pedido llega al CRM con `EPIMAYOR` registrado
- [ ] A 375 px: el mensaje de "no califica" se lee sin scroll horizontal
- [ ] `grep -rn "EPIMAYOR" frontend/dist` aparece **solo** en el bundle (asumido), y el código **no** se muestra en ninguna pantalla

---

## 10. Dependencias nuevas

Ninguna.

---

## 11. Preguntas abiertas del diseño

- [ ] `REQUIRES CONFIRMATION` — Las tres de `requirements.md` §12 (vencimiento,
      si $47.500 incluye envío, y el armador sin tope en 100).
- [ ] `REQUIRES CONFIRMATION` — El precio **tiene que dividir por 100**. Si
      Mariano cambia $47.500 por, digamos, $47.550, hay que revisar el redondeo o
      cambiar de mecanismo (ver §0).
