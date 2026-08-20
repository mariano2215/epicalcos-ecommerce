# Design — Cupón EPI50 (50 % off por menor, para mandar por privado)

| | |
|---|---|
| **Spec** | `009-cupon-epi50` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Estado** | `IMPLEMENTADO` — 20/08/2026 |
| **Fecha** | 20/08/2026 |

> **Este documento define CÓMO se implementa.** Acá sí van rutas de archivo,
> nombres de función y formas de payload.

---

## 1. Idea central

El motor de cupones ya distingue **dos** tipos: el de **%** (`discount`) y el de
**bundle** (`bundle: { buy, pay }`). El de bundle ya es **no acumulable con
nada** — esa semántica está escrita, probada y espejada.

`EPI50` **no** necesita un tercer motor: necesita un cupón de % que se comporte,
en materia de acumulación, como uno de bundle. Se resuelve con **dos flags
declarativos** en la entrada del cupón, y ningún camino de precio nuevo:

| Flag | Qué hace |
|---|---|
| `exclusivo: true` | Mientras esté aplicado no corre **ningún** otro descuento: ni el 10 % por transferencia/volumen, ni el % de otra promo por categoría, ni la agrupación N×M de una promo por fecha. |
| `incluyeCustom: true` | El % alcanza también a las líneas `custom:` (personalizados sueltos), que hoy quedan afuera fuera de una promo N×M. |

**Por qué flags y no un `if (code === 'EPI50')`**: el próximo cupón fuerte va a
querer lo mismo, y un código hardcodeado en el camino de precios es exactamente
lo que la regla del espejo intenta evitar. Con flags, prender otro cupón
exclusivo vuelve a ser lo que es hoy: una línea de cada lado.

---

## 2. Arquitectura — dónde entra en el orden de descuentos

El orden documentado (`business-rules.md` §9) queda así, con lo nuevo marcado:

```
1. Precio base de la línea, según su id
      packs / negocio / fijos / digitales → precio final, FIN

2. Si hay agrupación N×M vigente (bundle del cupón, o promo 3x2 por fecha):
      keepFraction uniforme sobre las líneas elegibles (sticker + custom)
   ▸ NUEVO: con un cupón EXCLUSIVO no hay agrupación (igual que hoy pisa el bundle)

3. percentRate = min(volumen + cupón, cap)
   ▸ NUEVO: con un cupón EXCLUSIVO, volumen = 0 → percentRate = el % del cupón

4. Por línea, si es de la categoría en promo Argentina:
      rate = min(percentRate + 0.50, 0.90)
   ▸ NUEVO: no corre con un cupón EXCLUSIVO (igual que hoy no corre con bundle)

5. Alcance del % fuera de agrupación: solo `sticker`
   ▸ NUEVO: también `custom` si el cupón trae `incluyeCustom`

6. precio = round(base × keepFraction × (1 − rate))
```

Los tres "NUEVO" de los pasos 2-4 son **el mismo predicado**: hoy en el código se
llama `!bundle`; pasa a ser `!anulaTodo`, donde
`anulaTodo = Boolean(bundle) || exclusivo`.

---

## 3. Componentes afectados

| Archivo | Cambio | Radio |
|---|---|---|
| `frontend/src/config/pricing.js` | Entrada `EPI50` en `COUPONS` + helpers | 🔴 **compartido** (regla 9) |
| `netlify/functions/lib/pricing.js` | Espejo: `COUPONS` cambia de forma y suma `EPI50` | 🔴 **compartido** (regla 9) |
| `frontend/src/context/CartContext.jsx` | `pricedItems`: `anulaTodo` + alcance `custom` | 🔴 **compartido** (regla 9) |
| `frontend/src/routes/Checkout.jsx` | `percentBlocked` y copy del resumen | 🟡 pantalla |
| `frontend/src/lib/promoPricing.test.js` | Réplica del cálculo + tests de paridad | 🟢 test |

### 3.1 Quién importa los módulos que se tocan (regla 9)

`grep -rn "COUPONS\|findCoupon\|couponBundle\|MAX_STICKER_DISCOUNT" frontend/src netlify/`

| Importador | Qué usa | ¿Se rompe? |
|---|---|---|
| `context/CartContext.jsx` | `findCoupon`, `couponBundle`, `MAX_STICKER_DISCOUNT` | se modifica (§4.3) |
| `routes/Checkout.jsx` | `findCoupon`, `couponBundle` | se modifica (§4.4) |
| `lib/promoPricing.test.js` | `COUPONS`, `findCoupon`, `couponBundle`, `COUPON_BUNDLES` | se modifica (§4.5) |
| `components/WelcomePopup.jsx` | solo `WELCOME_COUPON_STORAGE_KEY` | **no** |
| `netlify/functions/capture-lead.js` | `EPICA10` hardcodeado como cupón del popup | **no se toca** |
| `netlify/functions/create-preference.js` | `validateAndPriceOrder` | **no**: la firma no cambia |
| `netlify/functions/create-order-transfer.js` | `validateAndPriceOrder` | **no**: la firma no cambia |

**`COUPONS` del servidor no está exportado hoy** y solo se lee dentro de
`pricing.js` (`COUPONS[code] || 0`). Cambiarle la forma es seguro; se **exporta**
para que el test pueda comparar la paridad campo por campo (§4.5).

---

## 4. Cambios, archivo por archivo

### 4.1 `frontend/src/config/pricing.js`

```js
export const COUPONS = {
  EPICA10: { discount: 0.10, label: 'Bienvenida 10% OFF', hidden: true },
  EPI50:   { discount: 0.50, label: '50% OFF', hidden: true,
             exclusivo: true, incluyeCustom: true, activa: true }
};
```

Y dos helpers al lado de `findCoupon` / `couponBundle`:

```js
/** ¿El cupón anula todos los demás descuentos? (bundle o `exclusivo`). */
export function couponAnulaTodo(code, now = Date.now()) {
  const c = findCoupon(code, now);
  return Boolean(c?.bundle || c?.exclusivo);
}

/** ¿El % de este cupón alcanza también a los personalizados sueltos (`custom`)? */
export function couponIncluyeCustom(code, now = Date.now()) {
  return Boolean(findCoupon(code, now)?.incluyeCustom);
}
```

**Interruptor (RF-9)**: `activa` se lee dentro de `isCouponActive()`, que ya es
el único filtro por el que pasan `findCoupon` y `couponBundle`:

```js
export function isCouponActive(coupon, now = Date.now()) {
  if (coupon?.activa === false) return false;   // interruptor manual
  if (!coupon?.endsAt) return true;             // sin fecha, no vence nunca
  const end = Date.parse(coupon.endsAt);
  return !Number.isFinite(end) || now <= end;
}
```

Poner el interruptor acá y no en cada consumidor es lo que hace que apagarlo sea
**una sola línea**: apagado, el cupón deja de existir para el carrito, para el
checkout ("Ese cupón no existe o venció") y para el servidor, todo junto.

El comentario grande de `COUPONS` se actualiza para documentar los dos flags
nuevos y el interruptor, manteniendo la densidad del archivo.

### 4.2 `netlify/functions/lib/pricing.js` (el espejo)

`COUPONS` pasa de mapa plano a la **misma forma que el frontend**, y se exporta:

```js
export const COUPONS = {
  EPICA10: { discount: 0.1 },
  EPI50:   { discount: 0.5, exclusivo: true, incluyeCustom: true, activa: true }
};
```

`isCouponActive` incorpora el interruptor:

```js
export function isCouponActive(code, now = Date.now()) {
  const c = COUPONS[String(code || '').trim().toUpperCase()];
  if (c?.activa === false) return false;
  const end = COUPON_ENDS_MS[String(code || '').trim().toUpperCase()];
  return !Number.isFinite(end) || now <= end;
}
```

En `validateAndPriceOrder`:

```js
const cupon = COUPONS[normalizedCoupon];
const bundle = COUPON_BUNDLES[normalizedCoupon] || null;
const couponDiscount = bundle ? 0 : (cupon?.discount || 0);
const exclusivo = Boolean(cupon?.exclusivo);
const anulaTodo = Boolean(bundle) || exclusivo;
const incluyeCustom = Boolean(cupon?.incluyeCustom);
```

Y los tres puntos donde hoy dice `bundle`:

```js
const bulkDiscount = !anulaTodo && stickerUnits >= BULK_THRESHOLD && ... ;
const grouping = bundle || (!exclusivo && promoActive ? { buy: PROMO_BUY, pay: PROMO_PAY } : null);
const rateDe = (id) => !anulaTodo && esPromoArgentina(id) ? Math.min(...) : percentRate;
```

El alcance, en el loop de precios — hoy la rama final es
`else if (lb.kind === 'sticker')`:

```js
} else if (lb.kind === 'sticker' || (incluyeCustom && lb.kind === 'custom')) {
  expected = round(lb.base * (1 - rateDe(item.id)));
} else {
  expected = lb.base; // custom fuera de promo y sin cupón que lo alcance
}
```

⚠️ **No se toca `lineBase()`**: `discountable` sigue significando lo mismo y los
packs, negocio, fijos y digitales siguen devolviendo su precio final en el paso
1. El cupón no puede alcanzarlos por construcción — es la garantía de RF-4.

⚠️ **No se toca `stickerUnits`**: el 10 % por volumen se sigue contando solo con
líneas `sticker:`. Extender el alcance del **cupón** a `custom` no extiende el
del **volumen**; son dos descuentos distintos y con `EPI50` el de volumen vale 0.

### 4.3 `frontend/src/context/CartContext.jsx` → `pricedItems`

Espejo exacto de §4.2:

```js
const bundle = couponBundle(couponCode);
const anulaTodo = couponAnulaTodo(couponCode);
const incluyeCustom = couponIncluyeCustom(couponCode);

const bulkRate = !anulaTodo && derived.bulkEligible && paymentMethod === BULK_DISCOUNT_PAYMENT_METHOD
  ? BULK_DISCOUNT : 0;
const couponRate = bundle ? 0 : findCoupon(couponCode)?.discount || 0;
const percentRate = Math.min(bulkRate + couponRate, cap);

const grouping = bundle || (!anulaTodo && derived.promoActive ? PROMO_3X2 : null);
const rateDe = (i) => !anulaTodo && esPromoArgentina(i.id) ? Math.min(...) : percentRate;

// Alcance del % fuera de agrupación:
const alcanza = (i) => i.type === 'sticker' || (incluyeCustom && i.type === 'custom');
if (!grouping) {
  return derived.items.map((i) => {
    if (!alcanza(i)) return i;
    const rate = rateDe(i);
    return rate === 0 ? i : { ...i, price: round(i.basePrice * (1 - rate)) };
  });
}
```

⚠️ **`derived` no cambia.** `bulkEligible`, `eligibleUnitBasePrices` y
`promoKeepFraction` se siguen calculando igual: el cupón se conoce recién en el
checkout, y meter el cupón dentro de `derived` obligaría a recalcular el carrito
entero en cada tecla del input. `pricedItems(paymentMethod, couponCode)` ya
existe justo para esto.

⚠️ **Nada de esto se persiste.** `basePrice` sigue siendo el precio de lista y el
precio con cupón se deriva en cada render. Guardarlo rompería los carritos
guardados el día que el cupón se apague — el precedente está en
`esCustomViejo()` y en el comentario de `precioVidrieraLinea()`.

### 4.4 `frontend/src/routes/Checkout.jsx` (UI)

El hook ya existe: `CheckoutForm` recibe `percentBlocked` y muestra *"Ya tenés un
cupón aplicado: no se le suma el 10% por transferencia."* Hoy se pasa
`Boolean(appliedBundle)`; pasa a:

```js
percentBlocked={couponAnulaTodo(appliedCoupon)}
```

Con eso RF-10 queda cubierto del lado del selector de medio de pago **sin
componente nuevo**.

Falta el resumen del aside, que hoy promete el 10 % siempre que no haya bundle:

```jsx
{appliedBundle ? (
  <div className="text-emerald-400">🎟️ Cupón {appliedBundle.buy}x{appliedBundle.pay} …</div>
) : (
  <div>🏷️ Desde 10 calcos sueltos, 10% off pagando por transferencia.</div>
)}
```

Se agrega la rama del cupón exclusivo **antes** del `else`:

```jsx
) : cuponExclusivo ? (
  <div className="text-emerald-400">
    🎟️ Cupón {appliedCoupon}: {Math.round(cuponExclusivo.discount * 100)}% off en calcos y
    personalizados. No se combina con el 10% por transferencia ni con el 10% desde 10 calcos.
  </div>
) : (
```

El % sale del config, no escrito a mano — mismo criterio que los copys de las
promos.

**Lo que NO se toca** (RF-7, cupón oculto): home, banners, `CartDrawer`,
`DiscountNote`, `PackBuilder`, `FAQ`, `HowToBuy`. Esas pantallas siguen contando
el 10 % por transferencia, que es la regla vigente para quien **no** tiene el
código. El cupón solo se nombra en el checkout, y solo después de que el cliente
lo escribió.

### 4.5 `frontend/src/lib/promoPricing.test.js`

El test tiene su **propia réplica** del cálculo (`clientItems()`), que es lo que
verifica que cliente y servidor coincidan. Hay que enseñarle las mismas reglas
—`anulaTodo`, `incluyeCustom`— o los tests nuevos pasarían por espejar el bug.

Tests nuevos (detallados en `tasks.md`):

1. **Paridad de la tabla de cupones**: por cada código, `discount`, `exclusivo`,
   `incluyeCustom` y `activa` iguales en los dos lados. Reemplaza al assert suelto
   de hoy (`findCoupon('EPICA10')?.discount === 0.10`) por uno que cubre todo.
2. **50 % en catálogo y en personalizados**, en los tres tamaños.
3. **No acumulación**: mismo carrito con `paymentMethod: 'transferencia'` y +10
   calcos → el unitario es idéntico al de Mercado Pago (50 %, no 60 %).
4. **`EPICA10` no cambia**: sigue sumando con el 10 % por transferencia (20 %) y
   sigue sin tocar `custom`. Es el test que protege de que el flag se filtre.
5. **Packs / negocio / fijos / digitales intactos** con `EPI50` aplicado.
6. **Argentina + `EPI50`** (con reloj falso dentro de la ventana) → 50 %, no 90 %.
7. **3x2 + `EPI50`** (reloj falso dentro de la promo) → 50 % y sin N×M.
8. **Interruptor**: con `activa: false`, `findCoupon('EPI50')` da `null` y el
   servidor cobra precio de lista.

---

## 5. Datos

Ninguna estructura nueva. No cambia la forma de las líneas del carrito
(`epicalcos.cart.v2`), ni el payload de `create-preference` /
`create-order-transfer` (`couponCode` ya viaja), ni el CRM: `couponApplied` ya
se devuelve y se registra igual que `EPICA10`.

## 6. APIs

Sin endpoints nuevos. `validateAndPriceOrder({ items, shipping, paymentMethod,
couponCode })` mantiene firma y forma de respuesta.

## 7. Integraciones

- **Mercado Pago**: los unitarios siguen siendo enteros positivos (50 % de
  precios redondos: $600 / $800 / $1.000). No hay líneas negativas ni ≤ 0.
- **Notion / Resend / Meta / GA4**: sin cambios de código. `add_payment_info` ya
  manda el cupón; `purchase` ya reporta lo pagado.

## 8. Seguridad

- El precio lo decide el servidor desde el **id** de la línea. Un payload con
  $800/u sin cupón (o con el cupón apagado) se rechaza con `price_mismatch`.
- El código viaja en el bundle JS: **oculto ≠ secreto**. Está asumido en el
  diseño de `EPICA10` y es lo que justifica el interruptor de RF-9.
- Nada que loguear: el cupón no es PII y ya se loguea igual que hoy.

## 9. Manejo de errores

Sin caminos nuevos. Cupón inexistente o apagado → "Ese cupón no existe o
venció". Precio adulterado o desactualizado → `price_mismatch` con el mensaje de
recargar la página.

## 10. Estrategia de migración

Ninguna. Es config + cálculo; no hay datos que migrar ni carritos que convertir.
Un carrito guardado antes del cambio se re-precia solo al abrir el checkout.

**Rollback**: sacar la entrada `EPI50` de los dos lados, o poner
`activa: false` en los dos. Los flags y helpers pueden quedar: sin cupón que los
use, el comportamiento es idéntico al de hoy.

## 11. Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Cupón de bundle 2x1 | Da ~50 % pero necesita 2 unidades y no sirve para un pedido de 1. Mariano pidió 50 % directo |
| Dejar que los % se sumen y bajar `MAX_STICKER_DISCOUNT` | Convierte la red de seguridad en regla de negocio y hace que el descuento real dependa del medio de pago (§9.3 de requirements) |
| `if (code === 'EPI50')` en el camino de precios | Código hardcodeado en los dos lados del espejo: es exactamente lo que la regla 11 intenta evitar |
| Marcar `custom` como `discountable` para todos los cupones | Le cambiaría el precio a `EPICA10` para todo el mundo, hoy mismo. Fuera de scope |
| Cupón con tope de usos | Requiere estado en el servidor (Blobs) y un camino de fallo nuevo en el checkout. Descartado también en la spec 008 |

## 12. Dependencias nuevas

Ninguna (regla 10).
