# Tasks — Cupón EPI50 (50 % off por menor, para mandar por privado)

| | |
|---|---|
| **Spec** | `009-cupon-epi50` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**
La implementación arranca solo cuando Mariano dice *"Implementá la spec 009"*.

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación**
- [ ] Están respondidas las preguntas abiertas de `requirements.md` §12
      (armador de personalizados · pérdida de envío gratis · interruptor)

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `config/pricing.js`, `netlify/functions/lib/pricing.js`,
      `CartContext.pricedItems()` y el bloque de cupones de `Checkout.jsx`
  - *Verificación*: sé exactamente en qué puntos el código de hoy dice `!bundle`
    (son tres: volumen, agrupación N×M y promo Argentina)
- [ ] **0.2** Correr la suite y confirmar que arranca en verde
  ```bash
  npm test
  ```
  - *Verificación*: **229 tests** pasan
- [ ] **0.3** Crear rama de trabajo
  ```bash
  git checkout -b feat/009-cupon-epi50
  ```
  - *Verificación*: `git branch --show-current` no dice `main`

---

## Fase 1 — Config del frontend

- [ ] **1.1** Agregar `EPI50` a `COUPONS` con `discount: 0.50`, `hidden: true`,
      `exclusivo: true`, `incluyeCustom: true`, `activa: true`
  - *Archivo*: `frontend/src/config/pricing.js`
  - *Verificación*: `findCoupon('EPI50').discount === 0.5` y
    `findCoupon('EPI50').bundle === undefined`
- [ ] **1.2** Sumar el interruptor `activa` a `isCouponActive()`
  - *Verificación*: con `activa: false`, `findCoupon('EPI50')` devuelve `null`
- [ ] **1.3** Agregar `couponAnulaTodo()` y `couponIncluyeCustom()`
  - *Verificación*: `couponAnulaTodo('EPI50') === true`,
    `couponAnulaTodo('EPICA10') === false`, `couponAnulaTodo('') === false`
- [ ] **1.4** Actualizar el comentario grande de `COUPONS`: qué significan los dos
      flags nuevos, por qué el exclusivo se comporta como un bundle en materia de
      acumulación, y que el interruptor existe porque el código no vence
  - *Verificación*: el comentario explica **por qué**, no parafrasea el código

## Fase 2 — Espejo del servidor

- [ ] **2.1** Cambiar `COUPONS` de mapa plano a objetos y **exportarlo**
      (`EPICA10: { discount: 0.1 }`, `EPI50: { … }`)
  - *Archivo*: `netlify/functions/lib/pricing.js`
  - *Verificación*: `grep -n "COUPONS\[" netlify/functions/lib/pricing.js` — todos
    los accesos leen `.discount`, ninguno usa el número directo
- [ ] **2.2** Sumar el interruptor `activa` a `isCouponActive()` del servidor
  - *Verificación*: con `activa: false` el servidor cobra precio de lista
- [ ] **2.3** En `validateAndPriceOrder`, derivar `exclusivo`, `anulaTodo` e
      `incluyeCustom`, y reemplazar los **tres** `!bundle` por `!anulaTodo`
      (volumen, agrupación N×M, promo Argentina)
  - *Verificación*: `grep -n "!bundle" netlify/functions/lib/pricing.js` no
    devuelve nada en el camino de precios
- [ ] **2.4** Extender el alcance del % a `custom` cuando `incluyeCustom`
  - *Verificación*: con `EPI50`, una línea `custom:6cm:…` espera $800; con
    `EPICA10`, sigue esperando $1.600
- [ ] **2.5** Actualizar el comentario del bloque de cupones del servidor
  - *Verificación*: dice que es espejo de los mismos flags del frontend

⚠️ **No tocar** `lineBase()` ni el conteo de `stickerUnits` (design §4.2).

## Fase 3 — Cálculo del cliente

- [ ] **3.1** En `pricedItems`, derivar `anulaTodo` e `incluyeCustom` y reemplazar
      los tres `!bundle`
  - *Archivo*: `frontend/src/context/CartContext.jsx`
  - *Verificación*: el bloque queda línea a línea equivalente al del servidor
- [ ] **3.2** Extender el alcance del % a las líneas `custom` con el helper
      `alcanza()`
  - *Verificación*: con `EPI50`, una línea `custom` sale a mitad de precio en el
    carrito; con `EPICA10` no cambia
- [ ] **3.3** Confirmar que **no** se tocó `derived` ni se persistió ningún precio
  - *Verificación*: `basePrice` sigue siendo el de lista en `localStorage`
    después de aplicar el cupón

## Fase 4 — Checkout (UI)

- [ ] **4.1** Pasar `percentBlocked={couponAnulaTodo(appliedCoupon)}` a
      `CheckoutForm`
  - *Archivo*: `frontend/src/routes/Checkout.jsx`
  - *Verificación*: con `EPI50` y transferencia elegida, el aviso dice que el
    10 % no se suma
- [ ] **4.2** Agregar la rama del cupón exclusivo en el resumen del aside, con el
      % derivado del config
  - *Verificación*: con `EPI50` **no** aparece "Desde 10 calcos sueltos, 10% off"
- [ ] **4.3** Confirmar que ninguna otra pantalla nombra el cupón (RF-7)
  - *Verificación*: `grep -rn "EPI50" frontend/src` solo devuelve
    `config/pricing.js` y los tests

## Fase 5 — Tests

- [ ] **5.1** Enseñarle a `clientItems()` las reglas nuevas (`anulaTodo`,
      `incluyeCustom`)
  - *Archivo*: `frontend/src/lib/promoPricing.test.js`
  - *Verificación*: los tests existentes siguen pasando sin tocarlos
- [ ] **5.2** Test de **paridad de la tabla de cupones**: por cada código,
      `discount`/`exclusivo`/`incluyeCustom`/`activa` iguales en los dos lados
  - *Verificación*: falla a propósito si se cambia el % en un solo lado
- [ ] **5.3** Test: **50 % en catálogo** (4, 6 y 9 cm) → $600 / $800 / $1.000
- [ ] **5.4** Test: **50 % en personalizados sueltos** (`custom`)
- [ ] **5.5** Test: **no acumulación** — mismo carrito con transferencia y +10
      calcos da el mismo unitario que con Mercado Pago
- [ ] **5.6** Test: **`EPICA10` no cambia** — sigue sumando al 10 % por
      transferencia (20 %) y sigue sin tocar `custom`
- [ ] **5.7** Test: packs, negocio, fijos y digitales **intactos** con `EPI50`
- [ ] **5.8** Test: **Argentina + `EPI50`** (reloj falso en la ventana) → 50 %
- [ ] **5.9** Test: **3x2 + `EPI50`** (reloj falso en la promo) → 50 % y sin N×M
- [ ] **5.10** Test: **interruptor** — con `activa: false` el cupón no existe y el
      servidor cobra lista
- [ ] **5.11** Test: payload adulterado a $800/u **sin** cupón → `price_mismatch`
  - *Verificación de la fase*: `npm test` en verde, con **229 + los nuevos**

## Fase 6 — Documentación

- [ ] **6.1** `docs/business-rules.md` §2: sumar `EPI50` a la tabla de cupones y
      documentar el tipo "cupón exclusivo"
- [ ] **6.2** `docs/business-rules.md` §9: actualizar el orden de descuentos con
      los tres puntos nuevos
- [ ] **6.3** `docs/business-rules.md` §5: nota sobre la pérdida de envío gratis
      (requirements §9.1)
  - *Verificación*: leyendo solo `business-rules.md` se entiende qué hace `EPI50`

## Fase 7 — Cierre

- [ ] **7.1** Recorrer `acceptance.md` **punto por punto** y reportar el resultado
      real de cada criterio (regla 15)
- [ ] **7.2** Prueba manual en los **dos** caminos de pago, con cupón y sin cupón
- [ ] **7.3** Confirmar que el hook de pre-push está activo
  ```bash
  git config core.hooksPath .githooks
  ```
- [ ] **7.4** Avisar a Mariano que el código queda **vivo desde el deploy**: un
      push a `main` es un deploy, y el cupón empieza a funcionar en ese momento
