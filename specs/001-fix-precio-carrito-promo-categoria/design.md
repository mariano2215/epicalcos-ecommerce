# Design — El carrito ignora las promos por categoría

| | |
|---|---|
| **Spec** | `001-fix-precio-carrito-promo-categoria` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 11/08/2026 |

---

## 0. Hallazgos del discovery

Código leído: `CartContext.jsx`, `config/pricing.js`, `routes/Cart.jsx`,
`components/CartDrawer.jsx`, `routes/Checkout.jsx`, `components/StickerCard.jsx`,
`components/SizePicker.jsx`, `components/FreeShippingProgress.jsx`,
`netlify/functions/lib/pricing.js`, `lib/promoPricing.test.js`.

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí.** `precioVidriera(stickerId, sizeId)` (`config/pricing.js:353`) ya resuelve exactamente esto para la grilla y la ficha. Falta el equivalente para una **línea del carrito**. |
| ¿Dónde nace el defecto? | `CartContext.jsx:277` — `const items = state.items.map((i) => ({ ...i, price: i.basePrice }))`. Todo el carrito muestra `basePrice`, que es el precio de lista. |
| ¿Hay tests que lo cubran? | **No.** Los tests cubren "lo que el cliente manda == lo que el servidor valida". Nadie verifica "lo que el cliente ve == lo que paga". |
| ¿Toca el camino de precios? | Toca la **presentación**. Ninguna regla cambia ⇒ el servidor no se toca. |
| ¿Comentarios que expliquen el estado actual? | Sí, y son clave (ver abajo). |

### Los comentarios del repo que hay que respetar

**`CartContext.jsx:265-271`** dice que el precio de vidriera es siempre
`basePrice` porque *"el 10 % por volumen recién se aplica en el checkout, y solo
si el cliente elige transferencia"*.

Ese razonamiento **sigue siendo correcto para los descuentos que dependen del
carrito** (volumen, cupón, medio de pago). Lo que no contempla es un descuento
que depende **solo del diseño**, que es lo que introdujo la promo por categoría
(11/08/2026, posterior a ese comentario). El comentario no está equivocado: está
incompleto. Hay que **extenderlo**, no borrarlo.

**`config/pricing.js:339-351`** explica por qué `precioVidriera` no incluye el
10 % ni el cupón: *"dependen del carrito entero y se resuelven en `pricedItems`.
Mostrarlos acá daría un precio que después no se puede sostener con un solo calco
en el carrito."* Este criterio es exactamente el que hay que replicar.

**`StickerCard.jsx:25-26`**: *"Sin esto la grilla anunciaría $1.600 mientras el
carrito cobra $800."* Se arregló la grilla; el carrito quedó del otro lado del
mismo problema.

### El hallazgo que cambia el diagnóstico inicial

**El checkout no está roto.** `Checkout.jsx:151-157`:

```js
const items = pricedItems(paymentMethod, appliedCoupon);   // price YA con el 50 %
const subtotal     = items.reduce((a, i) => a + i.price     * i.quantity, 0);
const listSubtotal = items.reduce((a, i) => a + i.basePrice * i.quantity, 0);
const discount     = listSubtotal - subtotal;              // incluye el 50 %
```

Lista los ítems a precio de lista y resta una línea "Descuento" que sí contiene
el 50 %. **Su total es correcto.** El único defecto ahí es cosmético: el
`discountLabel` (`Checkout.jsx:157-165`) se arma con `promoActive` (3x2),
`appliedCoupon` y `isTransfer` — la promo por categoría no aparece, así que
durante ARGENTINA con Mercado Pago y sin cupón el rótulo queda en `"Descuento"` a
secas.

### Por qué `pricedItems` no necesita cambios

`pricedItems` (`CartContext.jsx:389-402`) calcula desde `i.basePrice`, **no**
desde `i.price`:

```js
return rate === 0 ? i : { ...i, price: round(i.basePrice * (1 - rate)) };
```

Cambiar el `price` de `derived.items` **no lo afecta**. Esto es lo que permite
una solución quirúrgica y sin riesgo de doble descuento.

---

## 1. Arquitectura propuesta

Separar con precisión dos conceptos que hoy están mezclados en `basePrice`:

| Concepto | Qué es | Depende de | Se guarda en `localStorage` |
|---|---|---|---|
| **`basePrice`** | precio de **lista** del ítem | tamaño / producto | ✅ sí |
| **precio de vidriera** | lo que el cliente ve **hoy** | `basePrice` + promos por categoría (**tiempo**) | ❌ **nunca** |
| **precio final** | lo que paga | vidriera + volumen + cupón + medio de pago | ❌ no |

```
línea del carrito (localStorage)
   └── basePrice = $1.600        ← inmutable, sin tiempo adentro
            │
            ├──► precioVidrieraLinea(línea)      [NUEVO]
            │       = $800 durante la promo
            │       → derived.items[].price → carrito, drawer, subtotal,
            │         envío gratis, analytics
            │
            └──► pricedItems(método, cupón)      [SIN CAMBIOS]
                    = round(basePrice × keep × (1 − rateDe))
                    → checkout → servidor
```

**La clave**: `basePrice` **nunca** se toca. El precio de vidriera se **deriva en
cada render** desde `Date.now()`, igual que ya lo hacen la grilla y el servidor.
Así la promo se activa y se desactiva sola, y ningún carrito guardado queda con
un precio congelado que el servidor rechazaría (RNF-5).

### Decisiones y alternativas descartadas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Derivar el precio de vidriera en `derived` | **Guardar el precio con descuento en `basePrice` al agregar** | 🔴 Rompería todo. Un carrito guardado el 18/8 y retomado el 20/8 mandaría $800 cuando el servidor ya espera $1.600 → `price_mismatch` en **todo** el checkout, no solo en esa línea. Además `pricedItems` aplicaría el 50 % **otra vez** sobre un precio ya descontado ($400) y el servidor lo rechazaría incluso durante la promo. Es exactamente el daño de `esCustomViejo()`. |
| Un helper que recibe **la línea** | Reusar `precioVidriera(stickerId, sizeId)` | La línea del carrito no guarda `stickerId` suelto: guarda el `id` compuesto (`sticker:argentina-72:6cm`). Decidir por el `id` es además lo que hace el servidor (`esPromoArgentina`), así que los dos lados miran el mismo dato y el espejo no se puede desincronizar. |
| Poner el helper en `config/pricing.js` | Calcularlo dentro del `CartContext` | La regla comercial vive en `config/`, no en el contexto de React. Además así el test puede importarla sin montar React (los tests corren en `environment: 'node'`). |
| Dejar `pricedItems` intacto | Reescribirlo para partir del precio de vidriera | Innecesario y riesgoso: ya calcula bien desde `basePrice`. Tocarlo pondría en juego el espejo con el servidor sin ningún beneficio. |
| No tocar el servidor | Espejar algo del lado del servidor | El servidor **ya** aplica el 50 % correctamente (`lib/pricing.js:430-433`). Este defecto es solo de presentación en el cliente. |

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/config/pricing.js` | agregar `precioVidrieraLinea(line, now)` | 🟢 función nueva, no modifica ninguna existente |
| `frontend/src/context/CartContext.jsx` | usar el helper en `derived.items` y en los `track*` | 🔴 **módulo compartido — es el corazón del carrito** |
| `frontend/src/routes/Checkout.jsx` | agregar la promo al `discountLabel` (RF-5) | 🟢 solo un rótulo |
| `frontend/src/lib/promoPricing.test.js` | tests nuevos del eje "ve == paga" | 🟢 |

### Archivos que NO se modifican (y por qué)

| Archivo | Por qué no |
|---|---|
| `netlify/functions/lib/pricing.js` | ya aplica el 50 % bien; ninguna regla cambia |
| `routes/Cart.jsx`, `components/CartDrawer.jsx` | ya muestran `it.price`: se corrigen solos |
| `components/FreeShippingProgress.jsx` | recibe `physicalSubtotal` por props: se corrige solo |
| `components/StickerCard.jsx`, `routes/Producto.jsx`, `SizePicker.jsx` | ya usan `precioVidriera`, ya están bien |
| `lib/purchaseTracking.js` | el `purchase` ya reporta bien |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **sí** (solo agrega) | `CartContext`, `Cart`, `CartDrawer`, `Checkout`, `StickerCard`, `SizePicker`, `Producto`, `PackBuilder`, `Mayorista`, `Negocio`, `ArmaTuPack`, `Home`, `Header`, `Imprimibles`, `personalizados.js`, `metaCatalog.js`, `promo.js`, 3 tests |
| `frontend/src/context/CartContext.jsx` | **sí** | **43 componentes y rutas** vía `useCart()` |
| `netlify/functions/lib/pricing.js` | **no** | `create-preference`, `create-order-transfer` |
| `frontend/src/lib/analytics.js` | **no** (solo cambia el valor que recibe) | `CartContext`, `Cart`, `Checkout`, `Producto`, y otros |

Verificado con:
```bash
grep -rn "config/pricing" frontend/src | wc -l
grep -rn "useCart" frontend/src | wc -l
```

**Mitigación del riesgo en `CartContext`**: el cambio es de **una línea** en
`derived` más los `track*`. No toca el reducer, ni la hidratación, ni la
persistencia, ni `pricedItems`. La superficie es mínima y los 100 tests actuales
más los nuevos cubren el resultado.

---

## 3. Datos

### Función nueva — `config/pricing.js`

```js
/**
 * Precio de VIDRIERA de una línea del carrito: el de lista, o el de la promo
 * por categoría si esa línea entra.
 *
 * Es el hermano de `precioVidriera()` (que recibe stickerId + tamaño, para la
 * grilla y la ficha): este recibe la LÍNEA ya armada, que es lo que tiene el
 * carrito.
 *
 * Se decide por el ID de la línea —igual que `esPromoArgentina`— y NO por el
 * campo `category` que guarda el carrito: el servidor solo recibe el id, así
 * que mirando lo mismo de los dos lados el espejo no se puede desincronizar.
 *
 * ⚠️ NO incluye el 10 % por volumen, el cupón ni el 10 % por transferencia:
 * esos dependen del carrito entero (cantidad, medio de pago) y se resuelven en
 * `pricedItems`. Mismo criterio que `precioVidriera` — ver su comentario.
 *
 * ⚠️ El resultado NO se guarda en la línea: se deriva en cada render desde
 * `Date.now()`. Congelarlo en `basePrice` haría que un carrito guardado durante
 * la promo mande, una vez vencida, un precio que el servidor rechaza con
 * `price_mismatch` (precedente: `esCustomViejo()` en CartContext).
 */
export function precioVidrieraLinea(line, now = Date.now()) {
  const base = Number(line?.basePrice) || 0;
  return esPromoArgentina(line?.id, now)
    ? round(base * (1 - PROMO_ARGENTINA.discount))
    : base;
}
```

**Genérica por construcción** (RF-8): toda la lógica de "¿qué categoría está en
promo?" ya vive en `esPromoArgentina`. Una promo por categoría futura se prende
ahí y este helper la toma sin cambios.

### Cambio en `CartContext.jsx:277`

```js
// antes
const items = state.items.map((i) => ({ ...i, price: i.basePrice }));

// después
const items = state.items.map((i) => ({ ...i, price: precioVidrieraLinea(i) }));
```

### Persistencia

| Dónde | Qué cambia |
|---|---|
| `localStorage` (`epicalcos.cart.v2`) | **nada**. La forma de la línea es idéntica. |
| `sessionStorage` | **nada** |
| Netlify Blobs | **nada** |

**Compatibilidad**: ✅ total, sin migración. Un carrito guardado antes del cambio
tiene exactamente la misma forma; el precio de vidriera se deriva al vuelo.

---

## 4. Efecto en cascada (lo que se arregla solo)

Este es el argumento central del diseño: **una línea corrige seis síntomas**,
porque todos leen del mismo `derived`.

| Consumidor | Ref. | Cómo se corrige |
|---|---|---|
| Precio por ítem en `/carrito` | `Cart.jsx:131` | usa `it.price` |
| Precio por ítem en el drawer | `CartDrawer.jsx:77` | usa `item.price` |
| `subtotal` | `CartContext.jsx:279` | suma `price × quantity` |
| `physicalSubtotal` | `CartContext.jsx:328` | deriva de `subtotal` |
| Barra de envío gratis | `Cart.jsx:204` | recibe `physicalSubtotal` |
| `view_cart` | `Cart.jsx:27` | recibe `items` |

### Verificación aritmética de los valores derivados

**`bulkSavings`** (`CartContext.jsx:281-286`) se calcula desde `basePrice`, y hay
que confirmar que sigue siendo correcto. Para un calco de 6 cm en promo, con ≥10
unidades y transferencia:

```
bulkSavings por unidad = basePrice − round(basePrice × 0,9) = 1600 − 1440 = 160

Precio real en el checkout:
  sin transferencia → rate = 0,50        → 1600 × 0,50 = 800
  con transferencia → rate = 0,50 + 0,10 → 1600 × 0,40 = 640
  diferencia = 160 ✅  (coincide con bulkSavings)

Bloque "Con transferencia" del carrito (Cart.jsx:179):
  subtotal(nuevo) − bulkSavings = 800 − 160 = 640 ✅
```

**`bulkSavings` no necesita cambios** y el bloque "Con transferencia" queda
correcto (RF-6). Verificar con un test.

**`eligibleUnitBasePrices`** (`CartContext.jsx:296`) empuja `basePrice` y **debe
seguir haciéndolo**: el servidor arma la misma bolsa con `bases[idx].base`, que
es `SIZE_PRICES` (precio de lista). Cambiarlo rompería el espejo del N×M.
**No tocar.**

---

## 5. Analytics

```js
// CartContext.jsx:149 y 253
trackAddToCart({ ...line, price: precioVidrieraLinea(line) }, quantity);
trackRemoveFromCart({ ...item, price: precioVidrieraLinea(item) });
```

`view_cart` se corrige solo (recibe `derived.items`).

Aplicar el mismo helper en **todos** los `add*` (`addPack`, `addCustom`,
`addNegocio`, `addFixed`, `addDigital`): para esos tipos `esPromoArgentina`
devuelve `false`, así que el valor no cambia hoy, pero deja el código uniforme y
correcto ante una promo futura.

**No tocar**: `begin_checkout`, `add_payment_info`, `add_shipping_info`,
`purchase`.

---

## 6. APIs e integraciones

**Ninguna.** No hay endpoints nuevos ni modificados, ni cambios en Mercado Pago,
Notion, Resend, Cloudinary, Meta CAPI o el CRM interno. El payload que sale al
servidor es **byte por byte el mismo** que hoy.

### Variables de entorno
Ninguna.

---

## 7. Seguridad

- [x] Ningún secreto en el frontend — no se agregan variables
- [x] El servidor sigue sin confiar en el cliente — **no se toca**
- [x] Sin cambios en payloads, topes ni validaciones
- [x] Sin PII nueva en logs, URLs ni `dataLayer`
- [x] Sin endpoints nuevos ⇒ sin cambios de CORS
- [x] Sin impacto en la CSP

| Riesgo | Mitigación |
|---|---|
| Doble aplicación del descuento (vidriera + `pricedItems`) | `pricedItems` parte de `basePrice`, no de `price`. Test explícito. |
| Precio congelado en `localStorage` | El helper es una función pura sobre `Date.now()`; nada se persiste. Test de cruce de ventana. |
| Romper el N×M al tocar `eligibleUnitBasePrices` | Se documenta explícitamente que debe seguir usando `basePrice`. Los tests de 3x2 existentes lo protegen. |

**El riesgo de seguridad es nulo**: aunque el cambio estuviera mal, el servidor
revalida y rechazaría el pedido. El peor caso es una venta perdida, no una venta
mal cobrada.

---

## 8. Manejo de errores

| Escenario | Qué hace | Qué ve el cliente |
|---|---|---|
| `basePrice` ausente o corrupto en una línea vieja | `Number(...) || 0` → 0, sin `NaN` en pantalla | precio $0 en esa línea; el servidor la rechaza al pagar |
| `id` malformado | `esPromoArgentina` devuelve `false` | precio de lista (degradación segura) |
| Promo vence entre render y submit | el servidor rechaza con `price_mismatch` | *"el precio no coincide con el vigente — recargá la página"* (actual) |
| Reloj del cliente adelantado/atrasado | el cliente ve un precio que el servidor no acepta | `price_mismatch` con mensaje accionable (limitación preexistente, no la introduce esta spec) |

**Degradación segura**: ante cualquier duda el helper devuelve el precio de
lista, que es el más alto. Nunca muestra de menos por accidente.

---

## 9. Estrategia de migración

**No aplica**: no hay datos que migrar. La forma de la línea del carrito no
cambia y los carritos guardados funcionan sin intervención.

- **Rollback**: revertir el commit. Sin datos que deshacer, sin env vars que
  tocar, sin estado persistido que limpiar.
- **Feature flag**: no hace falta uno propio — `PROMO_ARGENTINA.activa = false`
  ya desactiva toda la promo sin redeployar lógica.

---

## 10. Testing

### Tests nuevos — `frontend/src/lib/promoPricing.test.js`

Bloque nuevo: **"el carrito muestra lo que el cliente paga"**.

| # | Test | Verifica |
|---|---|---|
| T-1 | `precioVidrieraLinea` de un calco en promo = mitad del `basePrice` | RF-1 |
| T-2 | `precioVidrieraLinea` de un calco de otra categoría = `basePrice` | RF-8 |
| T-3 | Fuera de la ventana (antes y después) = `basePrice` | RF-9 |
| T-4 | **`precioVidrieraLinea` == el precio que valida el servidor**, con Mercado Pago y sin cupón | **RF-7 — el test central** |
| T-5 | Con transferencia + ≥10 unidades: vidriera − `bulkSavings` == precio del servidor | RF-6 |
| T-6 | Con `EPICA10` + transferencia + promo: 70 % off, bajo el tope | acumulación |
| T-7 | Packs, `custom`, `negocio`, `fixed` y `digital` **no** reciben el 50 % | edge cases |
| T-8 | `precioVidrieraLinea` da lo mismo que `precioVidriera(stickerId, size)` | grilla == carrito |
| T-9 | Un carrito con `basePrice` de lista guardado durante la promo sigue siendo aceptado por el servidor **después** de la ventana | **RNF-5** |

**T-4 es el que cierra el hueco** que dejó pasar este defecto: verifica el eje
"lo que el cliente **ve** == lo que el cliente **paga**", que ningún test cubría.

### Regresión
Los 100 tests actuales tienen que seguir pasando sin modificarse. Si alguno hay
que tocar, es señal de que el cambio se fue de scope.

### Verificación manual
- [ ] Con el reloj del sistema en la ventana de la promo: recorrido completo
      grilla → ficha → carrito → drawer → checkout, en mobile (375 px)
- [ ] Carrito armado antes de la ventana y recargado dentro
- [ ] Carrito armado dentro y recargado fuera
- [ ] Barra de envío gratis: que se active en el mismo punto que el checkout
- [ ] GA4 DebugView: `add_to_cart` con el `value` correcto

---

## 11. Dependencias nuevas

**Ninguna.**

---

## 12. Preguntas abiertas del diseño

- [ ] **Precio tachado en el carrito** (ver `requirements.md` §12).
      Recomendación: sí, replicando el tratamiento de `StickerCard.jsx:91-95`.
      Es puramente visual y no afecta ningún cálculo.
