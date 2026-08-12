# Design — Precio tachado y % de descuento en el checkout

| | |
|---|---|
| **Spec** | `005-checkout-precio-tachado` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 12/08/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, dos veces.** `Cart.jsx:137-147` y `CartDrawer.jsx:79-84` ya muestran el tachado con el mismo criterio (`it.price < it.basePrice`). Esta spec replica ese patrón, no inventa uno. |
| ¿Qué archivos están involucrados? | `frontend/src/routes/Checkout.jsx` (el bloque "Tu pedido", líneas 349-421). Nada más. |
| ¿Hay tests que lo cubran hoy? | La **presentación** no tiene tests (no hay testing library en el repo). Los **precios** sí: `promoPricing.test.js`, y son los que no hay que mover. |
| ¿Toca el camino de precios? | **No.** Ver §3: el dato ya está calculado y el payload sale de otro lado. |
| ¿Hay comentarios que expliquen por qué está así? | Sí, tres. Ver abajo. |

### Los comentarios del repo que hay que respetar

1. **`Checkout.jsx:171-174`** — el rótulo de la línea de descuento nombra la
   promo por categoría porque antes decía "Descuento" a secas y nadie entendía
   de dónde salía el 50 %. Es la RF-5 de la spec 001: **no se pierde**.
2. **`Cart.jsx:131-136`** — el tachado se decide comparando `price` contra
   `basePrice` y **no** preguntando por una promo puntual, para que cualquier
   promo futura muestre el antes/después sin tocar el código. Y lleva
   `aria-hidden` para que el lector de pantalla no lea los dos números seguidos.
   **Los dos criterios se copian tal cual.**
3. **`CartContext.jsx:305-308`** — la bolsa de las promos N x M va con
   `basePrice` porque el servidor arma la misma bolsa con `SIZE_PRICES`. Esta
   spec **no toca `pricedItems`**, así que ese equilibrio queda intacto.

### Por qué esto NO puede romper un checkout

El precio que viaja al servidor se arma en
`frontend/src/services/paymentService.js:37` y `:84`, con `unit_price:
Number(i.price)` — el mismo array `items` que ya devuelve `pricedItems`. La
feature **solo agrega una cifra en pantalla al lado de la que ya se muestra**. No
hay forma de que cambie lo que se envía, salvo que alguien toque
`paymentService.js`, que está declarado fuera de scope.

---

## 1. Arquitectura propuesta

Cambio **100 % presentacional**, contenido en un solo archivo.

```
CartContext.pricedItems(medioDePago, cupón)     ← NO SE TOCA
        ↓ items[] con { basePrice, price, quantity }
Checkout.jsx  →  aside "Tu pedido"              ← ÚNICO ARCHIVO QUE CAMBIA
        ↓
paymentService.js  →  unit_price: i.price       ← NO SE TOCA
```

### El bloque de totales: la decisión que hay que aprobar

Hoy el bloque es internamente coherente: líneas a lista → Subtotal a lista →
"Descuento −$X" → Total. Si las líneas pasan a mostrar el precio real y el
Subtotal se queda en lista, **la suma de lo que se ve deja de dar el subtotal**
(RF-5) y el cliente ve el descuento dos veces.

**Propuesta (necesita OK de Mariano):**

| Fila | Hoy | Propuesta |
|---|---|---|
| Líneas | precio de lista | ~~lista~~ **real** + `−50%` |
| Subtotal | `listSubtotal` | `subtotal` (el real, suma de las líneas) |
| Descuento | `🎉 3x2 + ARGENTINA 50%` `−$8.000` | `🎉 3x2 + ARGENTINA 50%` **`ahorrás $8.000`** |
| Envío | igual | igual |
| **Total** | **igual** | **igual** |

La línea verde deja de **restar** y pasa a **informar** — el descuento ya está
adentro de cada línea y del subtotal. Se conserva el rótulo con el nombre de la
promo (RF-6) y se conserva el número del ahorro, que es el argumento de venta.

**Alternativas descartadas:**

| Alternativa | Por qué no |
|---|---|
| Líneas reales + Subtotal a lista + descuento que resta | Las líneas visibles no suman el subtotal. Es el bug de presentación de hoy, al revés. |
| Sacar la línea de ahorro | Se pierde el nombre de la promo y el "ahorrás $X". Sería desandar la RF-5 de la spec 001. |
| Mostrar el tachado **solo** en el total del pedido | No responde el pedido de Mariano ni resuelve la contradicción con el carrito, que es por línea. |
| Extraer un componente `<PrecioTachado>` compartido con el carrito | Refactor fuera de scope (`CLAUDE.md` regla 8). Toca dos archivos que hoy funcionan. Queda como hallazgo. |

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Qué cambia |
|---|---|
| `frontend/src/routes/Checkout.jsx` | El `map` de líneas (349-366) y el bloque de totales (414-421). |
| `frontend/src/lib/formato.js` | Se agrega `porcentajeOff(base, precio)`. |
| `frontend/src/lib/formato.test.js` | **Archivo nuevo**: tests de `porcentajeOff`. |

### Archivos que NO se modifican (y por qué)

| Archivo | Por qué |
|---|---|
| `frontend/src/context/CartContext.jsx` | Ya expone `basePrice` y `price`. No falta ningún dato. |
| `frontend/src/config/pricing.js` | Ninguna regla de precio cambia. |
| `netlify/functions/lib/pricing.js` | Ídem. **El espejo no se toca.** |
| `frontend/src/services/paymentService.js` | Manda `i.price`, que ya es el correcto. |
| `Cart.jsx` / `CartDrawer.jsx` | Ya están bien desde la spec 001. |
| `frontend/src/lib/analytics.js` | Sin eventos nuevos. |

### ⚠️ Módulos compartidos

`lib/formato.js` lo importa medio frontend (es el de `formatPrice`). El cambio es
**aditivo**: una función exportada nueva, sin tocar `formatPrice`. Quién lo
importa hoy:

```bash
grep -rn "from '.*lib/formato" frontend/src | wc -l
```

Ninguno de esos imports se ve afectado por agregar un export.

---

## 3. Datos

Todo sale de lo que `pricedItems` ya devuelve:

```js
{ id, name, image, type, quantity,
  basePrice,  // precio de LISTA de una unidad
  price }     // precio REAL de una unidad, con promos + medio de pago + cupón
```

### Función nueva — `lib/formato.js`

```js
/**
 * Porcentaje de descuento de una línea, redondeado a entero.
 * Devuelve 0 si no hay descuento (o si el precio subió, que no debería pasar).
 *
 * Se calcula sobre los precios YA calculados por pricedItems en vez de sumar
 * las promos: el cálculo real está topeado (MAX_STICKER_DISCOUNT) y las promos
 * N x M se prorratean, así que sumar "50 + 10" mostraría un número que no es el
 * que se cobra.
 */
export const porcentajeOff = (base, precio) => {
  if (!(base > 0) || !(precio >= 0) || precio >= base) return 0;
  return Math.round(((base - precio) / base) * 100);
};
```

### Render de la línea (RF-1 a RF-4)

```jsx
<div className="flex-1 text-sm">
  <div className="font-semibold leading-snug">{it.name}</div>
  <div className="text-white/50">
    x{it.quantity} · {formatPrice(it.price)}
    {it.price < it.basePrice && (
      <span className="text-emerald-400 font-semibold ml-1">−{porcentajeOff(it.basePrice, it.price)}%</span>
    )}
  </div>
</div>
<div className="text-sm font-semibold text-right">
  {it.price < it.basePrice && (
    <span className="block text-[11px] font-normal text-white/40 line-through leading-none" aria-hidden="true">
      {formatPrice(it.basePrice * it.quantity)}
    </span>
  )}
  {formatPrice(it.price * it.quantity)}
</div>
```

El `−0%` no aparece nunca: cuando el porcentaje redondea a 0 el descuento es
menor a medio punto, y en ese caso el tachado ya alcanza (edge case declarado).

### Bloque de totales

```jsx
<div className="flex justify-between text-white/70 text-sm mb-1.5">
  <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
</div>
{discount > 0 && (
  <div className="flex justify-between text-emerald-400 text-sm mb-1.5">
    <span>🎉 {discountLabel}</span><span>ahorrás {formatPrice(discount)}</span>
  </div>
)}
```

`subtotal`, `listSubtotal`, `discount` y `discountLabel` **ya existen**
(`Checkout.jsx:161-178`): solo cambia cuál se muestra. `listSubtotal` queda en
uso para calcular `discount`.

---

## 4. Analytics

Ninguno. `trackBeginCheckout(items)` (`Checkout.jsx:203`) ya recibe los ítems
repreciados: el `value` que reporta hoy ya es el real. No se toca esa llamada ni
su guarda de StrictMode.

---

## 5. APIs e integraciones

Ninguna. Sin variables de entorno nuevas.

---

## 6. Seguridad

Sin superficie nueva: no hay input, ni fetch, ni datos del cliente en juego. El
único texto interpolado nuevo es un número calculado en el cliente.

---

## 7. Manejo de errores

| Situación | Comportamiento |
|---|---|
| `basePrice` ausente en una línea vieja de `localStorage` | `porcentajeOff` devuelve 0 y la comparación `price < basePrice` es `false`: se muestra una sola cifra. **Falla hacia el comportamiento de hoy.** |
| `price` mayor que `basePrice` | Imposible por construcción, pero la función devuelve 0 y no se tacha nada. |
| División por cero | La guarda `base > 0` la cubre. |

---

## 8. Estrategia de migración

No hay migración: es render. Los carritos guardados en `localStorage`
(`epicalcos.cart.v2`) ya traen `basePrice` desde antes de la spec 001; los que no
lo tengan caen en el caso de arriba y se ven como hoy.

---

## 9. Testing

### Tests nuevos — `frontend/src/lib/formato.test.js`

| Caso | Espera |
|---|---|
| $1.600 → $800 | 50 |
| $1.600 → $1.440 (10 % transf.) | 10 |
| $1.600 → $1.067 (3x2 prorrateado) | 33 |
| Sin descuento ($1.600 → $1.600) | 0 |
| `basePrice` 0 / undefined / null | 0 |
| Precio mayor al base | 0 |
| Redondeo (diferencia < 0,5 %) | 0 |

### Regresión

`npm test` completo (210 tests). Ninguno debería tocarse: si un test de precios
cambia, **el diseño está mal**.

### Verificación manual (en `vite preview`, no en producción)

1. Carrito con 1 calco de la categoría Argentina, con la promo simulada:
   comparar la cifra del carrito con la del checkout — tienen que ser iguales.
2. Cambiar Mercado Pago ↔ transferencia: las líneas se mueven a la vista.
3. Aplicar y quitar `EPICA10`.
4. Un carrito con imprimibles: sin tachado, sin línea de ahorro.
5. En 375 px: las dos cifras entran y el botón de pagar no se corre.
6. **Verificar que el total no cambió** respecto de la versión de hoy, con el
   mismo carrito.

---

## 10. Dependencias nuevas

Ninguna.

---

## 11. Preguntas abiertas del diseño

1. **El bloque de totales** (§1): ¿Subtotal real + "ahorrás $X", como se propone?
2. ¿El `−50%` va en verde al lado del unitario, o preferís que vaya como badge
   al lado del nombre del producto?
3. Con la promo 3x2, el % por línea da ≈33 % en todas las líneas elegibles
   porque el descuento se prorratea. ¿Te sirve así, o preferís que en las promos
   N x M se muestre el tachado **sin** porcentaje?
