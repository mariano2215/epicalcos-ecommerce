# Tasks — Precio tachado y % de descuento en el checkout

| | |
|---|---|
| **Spec** | `005-checkout-precio-tachado` |
| **Design** | [`design.md`](design.md) |
| **Fecha** | 12/08/2026 |

> **Checklist ordenado. Cada paso se marca sin ambigüedad.**
> ⛔ Esta lista **no autoriza a implementar**. Arranca cuando Mariano diga
> *"Implementá la spec 005"*.

---

## ⛔ Antes de tocar una sola línea

- [ ] **0.1** Leer `Checkout.jsx:155-195` (cálculo) y `:345-421` (render)
- [ ] **0.2** Leer `Cart.jsx:131-147` — el patrón que se replica, con su comentario
- [ ] **0.3** Leer `CartContext.jsx:379-421` (`pricedItems`) para confirmar que
      `basePrice` y `price` están en todas las líneas
- [ ] **0.4** Confirmar que las preguntas abiertas de `design.md` §11 están
      respondidas

## Reglas de esta implementación

1. **No se toca ningún cálculo de precio.** Si hace falta, volver al diseño.
2. **No se toca `paymentService.js`.** El payload no cambia.
3. Sin refactors de oportunidad: lo que aparezca va a *Hallazgos*.
4. El total a pagar tiene que ser idéntico antes y después, con el mismo carrito.

---

## Fase 1 — El helper

- [ ] **1.1** Agregar `porcentajeOff(base, precio)` a `frontend/src/lib/formato.js`
      con el comentario que explica **por qué** se calcula sobre los precios ya
      calculados y no sumando las promos
- [ ] **1.2** Crear `frontend/src/lib/formato.test.js` con los 7 casos de
      `design.md` §9
- [ ] **1.3** `npm test` en verde

## Fase 2 — Las líneas del pedido (RF-1 a RF-4)

- [ ] **2.1** En `Checkout.jsx`, cambiar el unitario de `it.basePrice` a `it.price`
- [ ] **2.2** Agregar el `−X%` al lado del unitario, solo si `it.price < it.basePrice`
- [ ] **2.3** Agregar el tachado del total de línea, con `aria-hidden="true"`
      (RNF-4), y el total real debajo
- [ ] **2.4** Comentar **por qué** se compara contra `basePrice` en vez de
      preguntar por una promo puntual (mismo criterio que `Cart.jsx`)

## Fase 3 — El bloque de totales (RF-5, RF-6)

- [ ] **3.1** Subtotal pasa a mostrar `subtotal` en vez de `listSubtotal`
- [ ] **3.2** La línea verde pasa de `−$X` a `ahorrás $X`, conservando
      `discountLabel` intacto
- [ ] **3.3** Verificar que `listSubtotal` sigue usándose para calcular
      `discount` y que no quedó código muerto
- [ ] **3.4** Verificar en pantalla que **la suma de las líneas da el subtotal**

## Fase 4 — Verificación manual (`vite preview`)

- [ ] **4.1** Anotar el total de un carrito de prueba **antes** del cambio
- [ ] **4.2** Mismo carrito después: **el total tiene que ser idéntico**
- [ ] **4.3** Carrito con la promo por categoría: la cifra del carrito y la del
      checkout coinciden
- [ ] **4.4** Cambiar Mercado Pago ↔ transferencia: las líneas se mueven
- [ ] **4.5** Aplicar y quitar `EPICA10`
- [ ] **4.6** Carrito con 3x2 activo: el % da ≈33 % y el total no cambió
- [ ] **4.7** Carrito solo de imprimibles: sin tachado y sin línea de ahorro
- [ ] **4.8** 375 px: las dos cifras entran, el botón de pagar no se corre
- [ ] **4.9** Cantidad > 1 en una línea con descuento: el tachado es el del total

## Fase 5 — Que no se rompió nada

- [ ] **5.1** `npm test` — los 210 + los nuevos, **ninguno modificado**
- [ ] **5.2** Confirmar con el inspector de red que el payload de
      `create-order-transfer` es idéntico al de antes (RNF-1)
- [ ] **5.3** Confirmar que `begin_checkout` sale una sola vez y con el mismo
      `value`

## Fase 6 — Cierre

- [ ] **6.1** Recorrer `acceptance.md` punto por punto con resultados **reales**
- [ ] **6.2** Reportar hallazgos fuera de scope
- [ ] **6.3** Marcar la spec como `DONE`
- [ ] **6.4** Commit + push

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| El precio tachado está escrito tres veces (carrito, drawer y ahora checkout) con el mismo criterio. | `Cart.jsx`, `CartDrawer.jsx`, `Checkout.jsx` | Un `<PrecioTachado>` compartido, en una spec aparte. |
| Los packs y la promo negocio traen su descuento adentro de `basePrice`: nunca muestran tachado, ni en el carrito ni acá. | `config/pricing.js` | Decidir si el pack debe mostrar su "precio si lo comprabas suelto". Es una spec de conversión, no de presentación. |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| | | |
