# Tasks — Popup: pack de stickers sorpresa gratis con tu compra

| | |
|---|---|
| **Spec** | `025-popup-pack-sorpresa` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 025"*.

- [x] Los tres documentos anteriores están completos
- [ ] Mariano respondió o aceptó las propuestas de `requirements.md` §12 (P-1 a P-6)
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación**

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `WelcomePopup.jsx`, `CuponCountdown.jsx`, `cuponVentana.js`, `Checkout.jsx`, `lib/pricing.js` (§ventana y `validateAndPriceOrder`), `create-preference.js`, `create-order-transfer.js`, `notify.js` (`buildOrderView`, `itemsText`, `itemsHtml`), `metaCapi.js` y sus tests
  - *Verificación*: sé qué hace cada uno hoy y por qué
- [ ] **0.2** `git status` y anotar el WIP ajeno en los archivos a tocar (hoy: `lib/analytics.js`, `docs/analytics.md`, `docs/business-rules.md`, `docs/architecture.md`, `docs/database.md`)
  - *Verificación*: lista escrita en la Bitácora
- [ ] **0.3** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Verificación*: N tests pasan (anotar N en la Bitácora)
- [ ] **0.4** **No** cambiar de rama en esta carpeta (otra sesión trabaja en el mismo árbol)
  - *Verificación*: `git branch --show-current` sigue diciendo `main` al final

---

## Fase 1 — Config y espejo del servidor

- [ ] **1.1** `REGALO_BIENVENIDA`, `REGALO_STORAGE_KEY` y `ventanaRegaloAbierta()` en `frontend/src/config/pricing.js`, con comentario del por qué (ausente = sin regalo, a diferencia del cupón)
  - *Verificación*: `ventanaRegaloAbierta(undefined)` es `false`
- [ ] **1.2** Espejo en `netlify/functions/lib/pricing.js`: `REGALO_BIENVENIDA` idéntico, `REGALO_TOLERANCIA_MS = 60_000`, `LINEA_REGALO` y `regaloVigente({ emitidoEn, digitalOnly, now })`, con el aviso de "falsificable y aceptado"
  - *Verificación*: los tres campos de `REGALO_BIENVENIDA` coinciden en los dos archivos
- [ ] **1.3** `validateAndPriceOrder` acepta `regaloEmitidoEn` y devuelve `regalo`, calculado **después** del pricing y sin tocar `clean`, `priced`, `itemsTotal` ni `shippingCost`
  - *Verificación*: `git diff` de la función muestra solo el parámetro nuevo, la llamada a `regaloVigente` y el campo en el `return`

## Fase 2 — Pedido del lado del servidor

- [ ] **2.1** `create-preference.js`: coacciona `regaloEmitidoEn` como `couponIssuedAt`, lo pasa a `validateAndPriceOrder`, suma `LINEA_REGALO` a `storedOrder.items` y a los `items` de `crearLeadEnCRM` (**no** a `mpItems`) y agrega `metadata.regalo`
  - *Verificación*: `mpItems` no contiene `regalo:pack_sorpresa` en ningún camino
- [ ] **2.2** `create-order-transfer.js`: lo mismo (sin metadata de MP)
  - *Verificación*: `storedOrder.total` no cambia con o sin regalo
- [ ] **2.3** `notify.js`: `itemsText` / `itemsHtml` muestran "GRATIS" cuando `unit_price` es 0
  - *Verificación*: el mail de carrito abandonado (que usa las mismas funciones) no cambia para líneas con precio
- [ ] **2.4** `notify.js`: banda "🎁 Incluir pack sorpresa" arriba del mail interno cuando el pedido trae `LINEA_REGALO`
- [ ] **2.5** `buildOrderView`: si `payment.metadata.regalo` y los ítems no traen la línea, la agrega una vez
- [ ] **2.6** `metaCapi.js`: filtra `LINEA_REGALO.id` de `contents`
- [ ] **2.7** `capture-lead.js`: con `body.oferta === 'regalo'` y el regalo activo → `{ ok, oferta: 'regalo', regalo }`, sin `sendLeadCouponEmail`. Si no → igual que hoy + `oferta: 'cupon'`. El texto de `notifyCrmLead`, `sendLeadEmail` y `crearLeadNewsletter` según la oferta
  - *Verificación*: un POST sin `oferta` devuelve `code: 'EPICA10'` como hoy

## Fase 3 — Popup

- [ ] **3.1** `lib/regaloBienvenida.js`: `emitirRegalo`, `leerRegalo`, `olvidarRegalo`, `msRestantesRegalo`, con `try/catch` en todo acceso a storage y copia en memoria
- [ ] **3.2** `components/RegaloCountdown.jsx`: reloj real (intervalo de 500 ms contra `Date.now()`), `onVencido` una sola vez vía ref, `aria-hidden` en el número y `sr-only` al montar y al vencer, variante `compacto`
- [ ] **3.3** `leadService.captureLead(email, oferta)`
- [ ] **3.4** `WelcomePopup.jsx`: con `REGALO_BIENVENIDA.activa`, copy del pack y submit con `oferta: 'regalo'`. La pantalla de éxito se elige por `respuesta.oferta`: `'regalo'` → `emitirRegalo`, `trackRegaloEmitido`, `RegaloCountdown`, CTA "Ir a pagar" (carrito con productos → `/checkout`) o "Elegir mis calcos" (vacío → cierra); `'cupon'` → la pantalla de hoy sin cambios
  - *Verificación*: con `activa: false`, el popup es idéntico al de hoy (comparar el render)

## Fase 4 — Checkout

- [ ] **4.1** Estado `regalo` inicializado con `leerRegalo()` solo si `ventanaRegaloAbierta` y `!digitalOnly`
- [ ] **4.2** Línea "Pack de stickers sorpresa · x1 · GRATIS" con tile 🎁 (sin foto: no hay foto del pack y no se usan placeholders), **fuera** del área scrolleable de ítems, con `RegaloCountdown` debajo
- [ ] **4.3** Banda compacta `lg:hidden` arriba del `CheckoutForm` con el contador (RF-9)
- [ ] **4.4** `vencerRegalo()`: `trackRegaloVencido('checkout')`, `olvidarRegalo()`, `setRegalo(null)`, aviso "⌛ Se terminó el tiempo del pack sorpresa y lo sacamos de tu pedido. Tus datos quedaron como estaban." **Sin tocar ningún estado del formulario**
  - *Verificación*: el `useCallback` no referencia `ship`, `paymentMethod` ni nada de `CheckoutForm`
- [ ] **4.5** `regaloEmitidoEn` en los dos payloads (`createPreference`, `createTransferOrder`) y en `paymentService.js`; `regalo` en `stashPurchase`
- [ ] **4.6** `items`, `subtotal`, `discount`, `shippingCost` y `total` del checkout **no cambian**
  - *Verificación*: `git diff Checkout.jsx` no toca esas líneas

## Fase 5 — Analytics

- [ ] **5.1** `trackRegaloEmitido(regalo, ventanaMs)` y `trackRegaloVencido(regalo, donde)` en `lib/analytics.js`, vía `pushDataLayer` (ya va en `try/catch`)
- [ ] **5.2** `trackPurchase` acepta `regalo` y lo manda como parámetro del evento solo si viene. `PaymentSuccess.jsx` y `PaymentTransfer.jsx` pasan `paid.regalo`
- [ ] **5.3** Sin PII: ningún evento lleva el mail
- [ ] **5.4** `docs/analytics.md`: sección de la spec 025 + nota de que `cupon_emitido`/`cupon_vencido` se cortan el día del deploy

## Fase 6 — Tests

- [ ] **6.1** `frontend/src/lib/regaloBienvenida.test.js` (design §9)
- [ ] **6.2** Casos nuevos en `avisoPedido.test.js`, `metaMatching.test.js`, `pedidoTransferencia.test.js`
- [ ] **6.3** Suite completa en verde
  ```bash
  npm test
  ```
  - *Verificación*: N + los nuevos, 0 fallidos
- [ ] **6.4** `npm run build --prefix frontend` sin errores
- [ ] **6.5** Verificación manual de design §9 en el browser pane a 375 px

## Fase 7 — Documentación

- [ ] **7.1** `docs/business-rules.md`: §7 Popup de bienvenida, sección nueva "Pack sorpresa (spec 025)" junto a §3.4
- [ ] **7.2** `docs/database.md` §3: key `epicalcos.regaloBienvenida`
- [ ] **7.3** `docs/architecture.md`: el regalo en el flujo de pedido (si describe `capture-lead` / `storedOrder`)
- [ ] **7.4** Comentarios del por qué en el código, con la densidad del repo

## Fase 8 — Cierre

- [ ] **8.1** Validar contra `acceptance.md`, punto por punto
- [ ] **8.2** Commit **solo con rutas** (`git commit -m "…" -- ruta/a ruta/b`). En los archivos con WIP ajeno (`analytics.js`, `docs/*`), stagear `HEAD + cambio propio` y devolver el WIP al disco. Verificar con `git diff --cached`
- [ ] **8.3** `git fetch` + push a `main` (**= deploy**)
- [ ] **8.4** Confirmar que el WIP ajeno sigue en el disco (`git status`) y avisarle a Mariano
- [ ] **8.5** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| `RegaloCountdown` y `CuponCountdown` duplican la lógica de intervalo | `components/` | Extraer un hook si conviven; borrar uno si el cupón con ventana se retira |
| El estado del lead en Notion se sigue llamando "Lead 10% OFF" | `_notion.js` `ESTADOS.lead` | Renombrar en Notion y en el código a la vez (P-6) |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
