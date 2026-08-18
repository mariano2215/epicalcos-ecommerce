# Tasks — Cupón EPIMAYOR (pack mayorista de 100 a $47.500)

| | |
|---|---|
| **Spec** | `008-cupon-epimayor` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**
La implementación arranca solo cuando Mariano dice *"Implementá la spec 008"*.

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación**
- [ ] Están respondidas las preguntas abiertas de `requirements.md` §12
      (vencimiento · si $47.500 incluye envío · armador sin tope)

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `config/pricing.js`, `netlify/functions/lib/pricing.js`,
      `CartContext.pricedItems()` y el bloque de cupones de `Checkout.jsx`
  - *Verificación*: sé qué hace hoy cada uno de los dos tipos de cupón existentes
- [ ] **0.2** Correr la suite y confirmar que arranca en verde
  ```bash
  npm test
  ```
  - *Verificación*: 229 tests pasan
- [ ] **0.3** Crear rama de trabajo
  ```bash
  git checkout -b feat/008-cupon-epimayor
  ```
  - *Verificación*: `git branch --show-current` no dice `main`

---

## Fase 1 — Config del frontend

- [ ] **1.1** Agregar `EPIMAYOR` a `COUPONS` con su objeto `pack`
      (`packType: 'mayorista'`, `qty: 100`, `sizes: ['4cm','6cm']`, `price: 47500`,
      `hidden: true`)
  - *Archivo*: `frontend/src/config/pricing.js`
  - *Verificación*: `findCoupon('EPIMAYOR')` devuelve el cupón; `.discount` es
    `undefined` y `.bundle` es `undefined`
- [ ] **1.2** Documentar en el comentario de `COUPONS` que ahora hay **tres**
      tipos de cupón, y que el de pack no es acumulable con nada porque toca una
      línea que no participa de ningún %
  - *Verificación*: el comentario dice **por qué**, no repite el código
- [ ] **1.3** Agregar `couponPack()`, `precioUnitarioPackCupon()` y
      `esLineaPackCupon()`, con el comentario sobre por qué el precio **tiene que
      dividir exacto** por `qty`
  - *Verificación*: `precioUnitarioPackCupon(COUPONS.EPIMAYOR.pack) === 475`

---

## Fase 2 — Precio del lado del cliente

- [ ] **2.1** Pre-pass del cupón de pack en `pricedItems()`: la **primera** línea
      que califica pasa a `price = 475`; las dos ramas existentes operan sobre el
      resultado
  - *Archivo*: `frontend/src/context/CartContext.jsx`
  - *Verificación*: con un pack de 100 en 4 cm y `EPIMAYOR`, el subtotal del
    checkout es 47.500; sin cupón sigue siendo 60.000
- [ ] **2.2** Confirmar que `derived` **no** cambia
  - *Verificación*: `/carrito` y el drawer siguen mostrando $60.000; la barra de
    envío gratis no cambia de umbral
- [ ] **2.3** Comentar por qué el cupón **no** apaga el 10 % por transferencia de
      los calcos sueltos (a diferencia del bundle)
  - *Verificación*: el comentario explica que el cupón de pack toca una sola
    línea, no descontable

---

## Fase 3 — Espejo de precios ⚠️ OBLIGATORIA

- [ ] **3.1** Agregar `COUPON_PACKS` con la **misma** entrada `EPIMAYOR`
  - *Archivo*: `netlify/functions/lib/pricing.js`
  - *Verificación*: los cuatro valores coinciden carácter por carácter con el frontend
- [ ] **3.2** Espejar `esLineaPackCupon()` en el servidor
  - *Verificación*: mismos parámetros, misma decisión (id + cantidad, nada más)
- [ ] **3.3** Aplicar el override en `validateAndPriceOrder()` como **primera**
      decisión de precio de la línea, después de que `lineBase()` haya validado
      la forma
  - *Verificación*: un pack de 100 en 9 cm con el cupón sigue costando 1.000/u
- [ ] **3.4** Incluir el cupón de pack en `couponApplied`
  - *Verificación*: la respuesta devuelve `couponApplied: 'EPIMAYOR'`
- [ ] **3.5** Actualizar `promoPricing.test.js` con los tests de `design.md` §9
- [ ] **3.6** Actualizar `envio.test.js` con los dos tests de envío
- [ ] **3.7** Correr los tests y confirmar la paridad
  ```bash
  npm test
  ```
  - *Verificación*: ningún checkout con `EPIMAYOR` se rechazaría con `price_mismatch`

---

## Fase 4 — Checkout (mensaje cuando no califica)

- [ ] **4.1** Al aplicar un cupón de pack, verificar que el carrito tenga una
      línea que califique antes de marcarlo como aplicado
  - *Archivo*: `frontend/src/routes/Checkout.jsx`
  - *Verificación*: con el carrito vacío, `EPIMAYOR` **no** queda marcado como aplicado
- [ ] **4.2** Mensaje accionable, con el mismo tratamiento visual que
      *"Ese cupón no existe o venció"*
  - *Verificación*: con un pack de 103 calcos, el mensaje dice la cantidad real;
    con 9 cm, dice que es solo para 4 y 6 cm
- [ ] **4.3** Confirmar que el descuento se muestra bien cuando **sí** califica
  - *Verificación*: el checkout muestra $60.000 tachado, "Descuento $12.500" con
    la etiqueta `EPIMAYOR`, y total $47.500 + envío
- [ ] **4.4** Confirmar que el prellenado por URL sigue andando
  - *Verificación*: `/checkout?cupon=EPIMAYOR` con el pack armado lo deja aplicado

---

## Fase 5 — Analytics

No hay eventos nuevos (`requirements.md` §11). Solo verificación:

- [ ] **5.1** `add_payment_info` viaja con `EPIMAYOR` en el campo de cupón que ya existe
  - *Verificación*: `window.dataLayer.filter(e => e.event === 'add_payment_info')`
- [ ] **5.2** El `value` del `purchase` es $47.500 + envío
- [ ] **5.3** Sin PII nueva en el `dataLayer`

---

## Fase 6 — Tests y verificación manual

- [ ] **6.1** Suite completa en verde
  ```bash
  npm test
  ```
  - *Verificación*: 229 + los nuevos, todos pasan
- [ ] **6.2** Compra de punta a punta **por Mercado Pago** con el cupón (4 cm y 6 cm)
- [ ] **6.3** Compra de punta a punta **por transferencia** con el cupón
- [ ] **6.4** El pedido llega al CRM con el cupón registrado
- [ ] **6.5** Recorrido en mobile a 375 px
- [ ] **6.6** El código **no** aparece en ninguna pantalla del sitio
  - *Verificación*: `grep -rn "EPIMAYOR" frontend/src` solo lo muestra en config,
    lógica de precio y tests — nunca dentro de un texto que se renderice

---

## Fase 7 — Documentación

- [ ] **7.1** `docs/business-rules.md` §2: subsección "Cupones de pack" + fila en
      la tabla de cupones
- [ ] **7.2** `docs/business-rules.md` §9: el override de pack entra en el paso 1
- [ ] **7.3** `docs/business-rules.md` §5: dejar escrito que el pack con cupón
      **no** cruza ningún umbral de envío gratis (`requirements.md` §9.1)
- [ ] **7.4** Comentarios en el código con la densidad del repo

---

## Fase 8 — Cierre

- [ ] **8.1** Validar contra `acceptance.md`, punto por punto, con resultados reales
- [ ] **8.2** Reportar hallazgos fuera de scope
- [ ] **8.3** Commit + push
  - ⚠️ **push a `main` = deploy a producción**
- [ ] **8.4** Marcar esta spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| `CLAUDE.md` y `specs/README.md` dicen "210 tests"; la suite tiene **229** | `CLAUDE.md`, `specs/README.md`, `specs/_template/tasks.md` ("100 tests") | Actualizar el número, o cambiarlo por "la suite completa". Cambio de documentación — no entra en este diff |
| La promo mayorista de $39.999 está **vencida** (14/8/2026) pero `PROMO_MAYORISTA_100.activa` sigue en `true` y toda su maquinaria sigue viva en Header, Hero, `/categorias`, `/armar-pack` y `/mayorista` | `config/pricing.js` y 6 consumidores | Igual que `PROMO_3X2`: se deja. Sacarla es un refactor del camino de precios, no una limpieza. Anotado para que quede claro que se vio |
| El armador de `/mayorista` no tiene tope en 100 unidades | `components/PackBuilder.jsx` | Ver `requirements.md` §12 |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
