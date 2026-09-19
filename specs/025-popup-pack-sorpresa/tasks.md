# Tasks — Popup: pack de stickers sorpresa gratis con tu compra

| | |
|---|---|
| **Spec** | `025-popup-pack-sorpresa` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `DONE` — implementada el 19/9/2026 |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 025"*.

- [x] Los tres documentos anteriores están completos
- [x] Mariano respondió o aceptó las propuestas de `requirements.md` §12 (P-1 a P-6)
      — aceptó las seis por defecto (19/9/2026)
- [x] Mariano aprobó el diseño
- [x] **Mariano pidió explícitamente la implementación** — *"dale, listame las P-1
      a P-6 e implementá la spec"* (19/9/2026)

---

## Fase 0 — Preparación

- [x] **0.1** Releer `WelcomePopup.jsx`, `CuponCountdown.jsx`, `cuponVentana.js`, `Checkout.jsx`, `lib/pricing.js` (§ventana y `validateAndPriceOrder`), `create-preference.js`, `create-order-transfer.js`, `notify.js` (`buildOrderView`, `itemsText`, `itemsHtml`), `metaCapi.js` y sus tests
  - *Verificación*: sé qué hace cada uno hoy y por qué
- [x] **0.2** `git status` y anotar el WIP ajeno en los archivos a tocar
  - *Resultado*: **no había WIP**. El árbol estaba limpio y la 023 ya estaba commiteada, así que el §8 del diseño (stagear `HEAD + cambio propio`) no hizo falta. Ver Bitácora.
- [x] **0.3** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Resultado*: **530 tests en 35 archivos**, todos en verde (N = 530).
- [x] **0.4** ⏭️ **No aplica**: esta sesión trabaja sola en el árbol y tiene rama
  propia asignada (`claude/popup-changes-main-n1ufu6`). No se cambió de rama en
  ningún momento; se trabajó entera sobre la asignada.

---

## Fase 1 — Config y espejo del servidor

- [x] **1.1** `REGALO_BIENVENIDA`, `REGALO_STORAGE_KEY` y `ventanaRegaloAbierta()` en `frontend/src/config/pricing.js`, con comentario del por qué (ausente = sin regalo, a diferencia del cupón)
  - *Verificación*: `ventanaRegaloAbierta(undefined)` es `false`
- [x] **1.2** Espejo en `netlify/functions/lib/pricing.js`: `REGALO_BIENVENIDA` idéntico, `REGALO_TOLERANCIA_MS = 60_000`, `LINEA_REGALO` y `regaloVigente({ emitidoEn, digitalOnly, now })`, con el aviso de "falsificable y aceptado"
  - *Verificación*: los tres campos de `REGALO_BIENVENIDA` coinciden en los dos archivos
- [x] **1.3** `validateAndPriceOrder` acepta `regaloEmitidoEn` y devuelve `regalo`, calculado **después** del pricing y sin tocar `clean`, `priced`, `itemsTotal` ni `shippingCost`
  - *Verificación*: `git diff` de la función muestra solo el parámetro nuevo, la llamada a `regaloVigente` y el campo en el `return`

## Fase 2 — Pedido del lado del servidor

- [x] **2.1** `create-preference.js`: coacciona `regaloEmitidoEn` como `couponIssuedAt`, lo pasa a `validateAndPriceOrder`, suma `LINEA_REGALO` a `storedOrder.items` y a los `items` de `crearLeadEnCRM` (**no** a `mpItems`) y agrega `metadata.regalo`
  - *Verificación*: `mpItems` no contiene `regalo:pack_sorpresa` en ningún camino
- [x] **2.2** `create-order-transfer.js`: lo mismo (sin metadata de MP)
  - *Verificación*: `storedOrder.total` no cambia con o sin regalo
- [x] **2.3** `notify.js`: `itemsText` / `itemsHtml` muestran "GRATIS" cuando `unit_price` es 0
  - *Verificación*: el mail de carrito abandonado (que usa las mismas funciones) no cambia para líneas con precio
- [x] **2.4** `notify.js`: banda "🎁 Incluir pack sorpresa" arriba del mail interno cuando el pedido trae `LINEA_REGALO`
- [x] **2.5** `buildOrderView`: si `payment.metadata.regalo` y los ítems no traen la línea, la agrega una vez
- [x] **2.6** `metaCapi.js`: filtra `LINEA_REGALO.id` de `contents`
- [x] **2.7** `capture-lead.js`: con `body.oferta === 'regalo'` y el regalo activo → `{ ok, oferta: 'regalo', regalo }`, sin `sendLeadCouponEmail`. Si no → igual que hoy + `oferta: 'cupon'`. El texto de `notifyCrmLead`, `sendLeadEmail` y `crearLeadNewsletter` según la oferta
  - *Verificación*: un POST sin `oferta` devuelve `code: 'EPICA10'` como hoy

## Fase 3 — Popup

- [x] **3.1** `lib/regaloBienvenida.js`: `emitirRegalo`, `leerRegalo`, `olvidarRegalo`, `msRestantesRegalo`, con `try/catch` en todo acceso a storage y copia en memoria
- [x] **3.2** `components/RegaloCountdown.jsx`: reloj real (intervalo de 500 ms contra `Date.now()`), `onVencido` una sola vez vía ref, `aria-hidden` en el número y `sr-only` al montar y al vencer, variante `compacto`
- [x] **3.3** `leadService.captureLead(email, oferta)`
- [x] **3.4** `WelcomePopup.jsx`: con `REGALO_BIENVENIDA.activa`, copy del pack y submit con `oferta: 'regalo'`. La pantalla de éxito se elige por `respuesta.oferta`: `'regalo'` → `emitirRegalo`, `trackRegaloEmitido`, `RegaloCountdown`, CTA "Ir a pagar" (carrito con productos → `/checkout`) o "Elegir mis calcos" (vacío → cierra); `'cupon'` → la pantalla de hoy sin cambios
  - *Verificación*: con `activa: false`, el popup es idéntico al de hoy (comparar el render)

## Fase 4 — Checkout

- [x] **4.1** Estado `regalo` inicializado con `leerRegalo()` solo si `ventanaRegaloAbierta` y `!digitalOnly`
- [x] **4.2** Línea "Pack de stickers sorpresa · x1 · GRATIS" con tile 🎁 (sin foto: no hay foto del pack y no se usan placeholders), **fuera** del área scrolleable de ítems, con `RegaloCountdown` debajo
- [x] **4.3** Banda compacta `lg:hidden` arriba del `CheckoutForm` con el contador (RF-9)
- [x] **4.4** `vencerRegalo()`: `trackRegaloVencido('checkout')`, `olvidarRegalo()`, `setRegalo(null)`, aviso "⌛ Se terminó el tiempo del pack sorpresa y lo sacamos de tu pedido. Tus datos quedaron como estaban." **Sin tocar ningún estado del formulario**
  - *Verificación*: el `useCallback` no referencia `ship`, `paymentMethod` ni nada de `CheckoutForm`
- [x] **4.5** `regaloEmitidoEn` en los dos payloads (`createPreference`, `createTransferOrder`) y en `paymentService.js`; `regalo` en `stashPurchase`
- [x] **4.6** `items`, `subtotal`, `discount`, `shippingCost` y `total` del checkout **no cambian**
  - *Verificación*: `git diff Checkout.jsx` no toca esas líneas

## Fase 5 — Analytics

- [x] **5.1** `trackRegaloEmitido(regalo, ventanaMs)` y `trackRegaloVencido(regalo, donde)` en `lib/analytics.js`, vía `pushDataLayer` (ya va en `try/catch`)
- [x] **5.2** `trackPurchase` acepta `regalo` y lo manda como parámetro del evento solo si viene. `PaymentSuccess.jsx` y `PaymentTransfer.jsx` pasan `paid.regalo`
- [x] **5.3** Sin PII: ningún evento lleva el mail
- [x] **5.4** `docs/analytics.md`: sección de la spec 025 + nota de que `cupon_emitido`/`cupon_vencido` se cortan el día del deploy

## Fase 6 — Tests

- [x] **6.1** `frontend/src/lib/regaloBienvenida.test.js` (design §9)
- [x] **6.2** Casos nuevos en `avisoPedido.test.js`, `metaMatching.test.js`, `pedidoTransferencia.test.js`
- [x] **6.3** Suite completa en verde
  ```bash
  npm test
  ```
  - *Resultado*: **587 tests en 38 archivos**, 0 fallidos (530 + 57 nuevos).
- [x] **6.4** `npm run build --prefix frontend` sin errores
- [x] **6.5** Verificación manual a 375 px, hecha con Chromium en 375×812 contra
  el dev server. Cubrió AC-1, AC-2, AC-3 (mecanismo), AC-4, AC-7, AC-8, AC-9,
  AC-10, AC-11, AC-12, AC-13, AC-14, AC-25, ANF-1, ANF-3 y ANF-5. Detalle en
  `acceptance.md`.

## Fase 7 — Documentación

- [x] **7.1** `docs/business-rules.md`: §7 Popup de bienvenida, sección nueva "Pack sorpresa (spec 025)" junto a §3.4
- [x] **7.2** `docs/database.md` §3: key `epicalcos.regaloBienvenida`
- [x] **7.3** `docs/architecture.md`: el regalo en el flujo de pedido (si describe `capture-lead` / `storedOrder`)
- [x] **7.4** Comentarios del por qué en el código, con la densidad del repo

## Fase 8 — Cierre

- [x] **8.1** Validar contra `acceptance.md`, punto por punto
- [x] **8.2** Commit solo con las rutas propias. No hubo WIP ajeno que separar
  (ver 0.2). Sí se descartaron dos cambios que no son de esta spec y que dejaron
  el `npm install` y el build: `frontend/package-lock.json` (campos `libc` que
  saca otra versión de npm) y `frontend/public/sitemap.xml` (lo regenera el
  build y estaba desactualizado en el repo — ver Hallazgos).
- [x] **8.3** ⚠️ **Push a `claude/popup-changes-main-n1ufu6`, NO a `main`.** Esta
  sesión tiene prohibido pushear a otra rama que la asignada. **Esto significa
  que la spec NO está deployada**: sale a producción recién cuando Mariano
  mergee esa rama a `main`.
- [x] **8.4** No había WIP ajeno que devolver al disco (ver 0.2).
- [x] **8.5** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| `RegaloCountdown` y `CuponCountdown` duplican la lógica de intervalo | `components/` | Extraer un hook si conviven; borrar uno si el cupón con ventana se retira |
| El estado del lead en Notion se sigue llamando "Lead 10% OFF" | `_notion.js` `ESTADOS.lead` | Renombrar en Notion y en el código a la vez (P-6) |
| **El `sitemap.xml` commiteado está desactualizado**: el build lo regenera y agrega 11 categorías que hoy no están en el archivo del repo (arte, aura, bad-bunny, …). Google está viendo un sitemap viejo | `frontend/public/sitemap.xml` | Commitear el regenerado, aparte de esta spec. **No se tocó acá** (regla 8) |
| El popup no distingue un carrito de SOLO archivos imprimibles: con uno así el CTA dice "Ir a pagar" y lleva al checkout, donde el regalo no aplica (RF-20) | `WelcomePopup.jsx` | Es el mismo criterio que pide RF-4 (`totalItems > 0`). Si pasa seguido, mirar `digitalOnly` en el CTA |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 19/9/2026 | **No había WIP ajeno.** El §8 del diseño avisaba de cambios sin commitear de la spec 023 en `lib/analytics.js` y cuatro `docs/*.md`. El árbol estaba limpio: la 023 ya estaba commiteada. No hizo falta separar nada. | El diseño se escribió el 18/9 y la 023 se commiteó después |
| 19/9/2026 | **Dos tests de mail se movieron de archivo.** El diseño §9 los ponía en `avisoPedido.test.js`; el mail interno con banda + GRATIS se verifica en `pedidoTransferencia.test.js`. | Ahí ya está montada la plomería de mails (fetch ruteado por dominio) y corre el handler entero, así que el test es más fiel: arma el mail de un pedido real con regalo en vez de uno inventado. `avisoPedido.test.js` se quedó con la reposición desde metadata, que es lo suyo |
| 19/9/2026 | **Dos archivos de test de más**, no previstos en el diseño: `preferenciaRegalo.test.js` y `capturaLead.test.js`. | El diseño no cubría con tests los dos riesgos que él mismo declara como los más caros: que el regalo se cuele en los ítems de Mercado Pago (se caería la venta entera, AC-23) y que el bundle viejo deje de recibir EPICA10 el día del deploy (AC-26). Se verifican sobre lo que sale por la red |
| 19/9/2026 | **El interruptor se pregunta también en el checkout**, no solo en el popup y el servidor. | Bug encontrado en la verificación manual: `ventanaRegaloAbierta` solo mira la ventana, así que con `activa: false` el checkout le seguía mostrando el pack a cualquiera que lo tuviera guardado — y el servidor se lo sacaba del pedido sin decir nada. Rompía RF-23 y AC-25 |
| 19/9/2026 | **`RegaloCountdown` compacto no anuncia por lector de pantalla.** | En el checkout conviven dos contadores (la banda mobile y el del resumen). Con los dos anunciando, el lector leía la misma frase dos veces seguidas |
| 19/9/2026 | **Push a la rama `claude/popup-changes-main-n1ufu6`, no a `main`.** | La sesión tiene rama asignada y prohibido pushear a otra. La spec queda implementada pero **sin deployar** hasta que Mariano mergee |
