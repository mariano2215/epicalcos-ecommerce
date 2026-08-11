# Tasks — El carrito ignora las promos por categoría

| | |
|---|---|
| **Spec** | `001-fix-precio-carrito-promo-categoria` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |
| **Estimación** | ~1 h de implementación + verificación manual |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación**
      (*"Implementá la spec 001"*)

---

## Reglas de esta implementación

1. **`basePrice` no se toca nunca.** Ni al agregar, ni al hidratar, ni al
   persistir. Es el precio de lista y no lleva tiempo adentro.
2. **`pricedItems` no se toca.** Ya calcula bien desde `basePrice`.
3. **`eligibleUnitBasePrices` sigue usando `basePrice`.** Espeja la bolsa del
   N×M del servidor; cambiarlo rompe la promo 3x2.
4. **El servidor no se toca.** Ninguna regla comercial cambia.
5. Sin refactors de oportunidad: lo que aparezca va a *Hallazgos*.

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `CartContext.jsx` (`derived` y `pricedItems`),
      `config/pricing.js` (`precioVidriera`, `esPromoArgentina`) y el bloque de
      la promo Argentina en `netlify/functions/lib/pricing.js`
  - *Verificación*: puedo explicar por qué `pricedItems` no necesita cambios
- [ ] **0.2** Suite en verde antes de empezar
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 100/100 pasan
- [ ] **0.3** Rama de trabajo
  ```bash
  git checkout -b feat/001-fix-precio-carrito-promo-categoria
  ```
  - *Verificación*: `git branch --show-current` no dice `main`

---

## Fase 1 — El helper de precio de vidriera

- [ ] **1.1** Agregar `precioVidrieraLinea(line, now = Date.now())` en
      `frontend/src/config/pricing.js`, junto a `precioVidriera`
  - *Archivo*: `frontend/src/config/pricing.js`
  - *Contenido*: ver `design.md` §3
  - *Verificación*: la función es pura, recibe la línea, decide por `line.id` y
    devuelve un entero
- [ ] **1.2** Escribir el comentario del helper con la densidad del repo: qué NO
      incluye (volumen, cupón, transferencia) y **por qué el resultado no se
      persiste nunca**
  - *Verificación*: menciona el `price_mismatch` que causaría congelarlo, y
    referencia el precedente de `esCustomViejo()`
- [ ] **1.3** Confirmar que no rompió nada
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 100/100 (todavía no hay tests nuevos)

---

## Fase 2 — El carrito

- [ ] **2.1** En `CartContext.jsx`, importar `precioVidrieraLinea` desde
      `config/pricing.js`
  - *Verificación*: el import se suma al bloque existente de `config/pricing.js`
- [ ] **2.2** Cambiar `derived.items` para que use el helper
  - *Archivo*: `frontend/src/context/CartContext.jsx:277`
  - *Antes*: `const items = state.items.map((i) => ({ ...i, price: i.basePrice }));`
  - *Después*: `const items = state.items.map((i) => ({ ...i, price: precioVidrieraLinea(i) }));`
  - *Verificación*: es **la única** línea modificada de `derived`
- [ ] **2.3** Extender el comentario de `derived` (`CartContext.jsx:265-271`)
  - ⚠️ **No borrarlo**: su razonamiento sigue siendo correcto para los descuentos
    que dependen del carrito. Agregar que las promos **por categoría** dependen
    solo del diseño y por eso sí se muestran acá.
  - *Verificación*: el comentario distingue los dos tipos de descuento
- [ ] **2.4** Confirmar que `eligibleUnitBasePrices` (`:296`) **sigue** usando
      `basePrice`
  - *Verificación*: `grep -n "eligibleUnitBasePrices.push" frontend/src/context/CartContext.jsx`
    muestra `i.basePrice`
- [ ] **2.5** Confirmar que `pricedItems` (`:363-405`) quedó **sin tocar**
  - *Verificación*: `git diff` no muestra cambios entre las líneas 363 y 405
- [ ] **2.6** Suite en verde
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 100/100 — si alguno falla, el cambio se fue de scope

---

## Fase 3 — Espejo de precios

⚠️ Esta feature **no cambia ninguna regla comercial**, así que no hay nada que
espejar en el servidor. Lo que sí hay es que **probar** que el espejo sigue
intacto.

- [ ] **3.1** Confirmar que `netlify/functions/lib/pricing.js` quedó sin tocar
  - *Verificación*: `git diff --stat -- netlify/` está vacío
- [ ] **3.2** Confirmar que `config/pricing.js` solo **agregó** una función, sin
      modificar ninguna existente
  - *Verificación*: el `git diff` del archivo es puramente aditivo
- [ ] **3.3** Confirmar que `config/site.js` quedó sin tocar
  - *Verificación*: `git diff --stat -- frontend/src/config/site.js` vacío

---

## Fase 4 — Analytics

- [ ] **4.1** `addSticker`: `trackAddToCart` con el precio de vidriera
  - *Archivo*: `frontend/src/context/CartContext.jsx:149`
  - *Después*: `trackAddToCart({ ...line, price: precioVidrieraLinea(line) }, quantity);`
- [ ] **4.2** Mismo cambio en `addPack` (`:168`), `addCustom` (`:181`),
      `addNegocio` (`:189`), `addFixed` (`:214`) y `addDigital` (`:245`)
  - *Nota*: hoy el valor no cambia para estos tipos (`esPromoArgentina` da
    `false`), pero deja el código uniforme ante una promo futura
- [ ] **4.3** `removeItem`: `trackRemoveFromCart` con el precio de vidriera
  - *Archivo*: `frontend/src/context/CartContext.jsx:253`
- [ ] **4.4** Confirmar que `view_cart` se corrige solo
  - *Verificación*: `Cart.jsx:27` pasa `items` de `useCart()`, sin cambios
- [ ] **4.5** Confirmar que **no** se tocaron `begin_checkout`,
      `add_payment_info`, `add_shipping_info` ni `purchase`
  - *Verificación*: `git diff -- frontend/src/lib/purchaseTracking.js` vacío
- [ ] **4.6** Confirmar que todo sigue saliendo por `lib/analytics.js`
  - *Verificación*: ningún `gtag`/`fbq`/`dataLayer` directo en el diff

---

## Fase 5 — El rótulo del checkout (RF-5)

- [ ] **5.1** Agregar la promo por categoría al `discountLabel`
  - *Archivo*: `frontend/src/routes/Checkout.jsx:157-165`
  - *Qué*: si hay una promo por categoría activa **y** el carrito tiene al menos
    una línea que entra, sumar su nombre a `parts` (leerlo de
    `PROMO_ARGENTINA.titulo`, no escribirlo a mano)
  - *Verificación*: durante la promo, con Mercado Pago y sin cupón, la línea deja
    de decir `"Descuento"` a secas
- [ ] **5.2** Confirmar que el **cálculo** del checkout no cambió
  - *Verificación*: `subtotal`, `listSubtotal`, `discount`, `physicalSubtotal`,
    `shippingCost` y `total` quedan idénticos en el diff

---

## Fase 6 — Tests

- [ ] **6.1** Bloque nuevo en `frontend/src/lib/promoPricing.test.js`:
      *"el carrito muestra lo que el cliente paga"*
- [ ] **6.2** T-1 a T-3 — el helper: en promo, otra categoría, fuera de ventana
- [ ] **6.3** **T-4 — el test central**: `precioVidrieraLinea` == el precio que
      valida `validateAndPriceOrder` con Mercado Pago y sin cupón
  - *Verificación*: falla si alguien vuelve a desincronizar vidriera y checkout
- [ ] **6.4** T-5 y T-6 — transferencia + volumen, y cupón + transferencia + promo
- [ ] **6.5** T-7 — packs, `custom`, `negocio`, `fixed` y `digital` no reciben el 50 %
- [ ] **6.6** T-8 — `precioVidrieraLinea` == `precioVidriera` (grilla == carrito)
- [ ] **6.7** **T-9 — RNF-5**: un carrito con `basePrice` de lista guardado
      durante la promo sigue siendo aceptado por el servidor **después** de la
      ventana
- [ ] **6.8** Suite completa
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 100 anteriores + los nuevos, todos en verde

---

## Fase 7 — Verificación manual

Con el reloj del sistema dentro de la ventana de la promo (17–19/08/2026), o con
`vi.setSystemTime` en un test de apoyo.

- [ ] **7.1** Mobile 375 px: grilla → ficha → carrito → drawer → checkout
  - *Verificación*: el mismo importe en las cuatro pantallas
- [ ] **7.2** Subtotal y Total del carrito con el descuento aplicado
- [ ] **7.3** Barra de envío gratis: se activa en el mismo punto que el checkout
- [ ] **7.4** Carrito armado **antes** de la ventana, recargado **dentro** → baja solo
- [ ] **7.5** Carrito armado **dentro**, recargado **fuera** → vuelve solo al de lista
- [ ] **7.6** Compra completa por Mercado Pago sin `price_mismatch`
- [ ] **7.7** Compra completa por transferencia sin `price_mismatch`
- [ ] **7.8** GA4 DebugView: `add_to_cart` con el `value` correcto
- [ ] **7.9** Carrito mixto (promo + otras categorías + pack + digital): solo los
      de la categoría en promo bajan

---

## Fase 8 — Documentación

- [ ] **8.1** `docs/architecture.md` §12.1 — marcar la deuda como resuelta, con
      la fecha y esta spec
- [ ] **8.2** `docs/analytics.md` §8 — marcar el riesgo como cerrado y tildar el
      pendiente de §9
- [ ] **8.3** `docs/business-rules.md` §3.3 — sacar la advertencia de
      inconsistencia conocida
- [ ] **8.4** Verificar que los comentarios nuevos explican el **por qué**
  - *Verificación*: alguien que lea `precioVidrieraLinea` en 6 meses entiende por
    qué el resultado no se persiste

---

## Fase 9 — Cierre

- [ ] **9.1** Recorrer `acceptance.md` punto por punto con resultados reales
- [ ] **9.2** Reportar hallazgos fuera de scope
- [ ] **9.3** Commit + push
  - ⚠️ **push a `main` = deploy a producción**
  - ⚠️ Idealmente **antes del 17/08/2026**
- [ ] **9.4** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| | | |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
