# Design — Popup: pack de stickers sorpresa gratis con tu compra

| | |
|---|---|
| **Spec** | `025-popup-pack-sorpresa` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 18/09/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, casi entero, para el cupón.** La spec 017 armó una ventana de 10 min por usuario para `EPICA10`: `lib/cuponVentana.js` (emitir, leer, olvidar, `msRestantes`), `components/CuponCountdown.jsx` (contador con reloj real, `onVencido` una sola vez, `sr-only`), `vencerCupon()` en `Checkout.jsx` (saca el cupón sin tocar el formulario) y `ventanaCuponAbierta()` espejada en los dos `pricing.js`, con 60 s de tolerancia en el servidor. El regalo **copia ese patrón**, no lo reemplaza. |
| ¿Existe un "pack sorpresa"? | No. `grep -i "sorpresa\|regalo"` no encuentra nada en `src/` ni en `functions/`. |
| ¿Qué archivos están involucrados? | Popup: `WelcomePopup.jsx`, `capture-lead.js`, `leadService.js`. Checkout: `Checkout.jsx`, `paymentService.js`, `purchaseTracking.js`. Servidor: `lib/pricing.js`, `create-preference.js`, `create-order-transfer.js`, `lib/notify.js`, `lib/metaCapi.js`, `_notion.js`. |
| ¿Hay tests que lo cubran hoy? | La ventana del cupón: `cuponVentana.test.js`, y la paridad de `CUPONES_CON_VENTANA` en `promoPricing.test.js:1346`. Mails: `avisoPedido.test.js`. Meta: `metaMatching.test.js`. Transferencia: `pedidoTransferencia.test.js`. Webhook: `webhookMercadoPago.test.js`. |
| ¿Toca el camino de precios? | **No cambia ningún precio.** Sí toca `validateAndPriceOrder`, que tiene que devolver los mismos `items` e `itemsTotal` con y sin regalo. Eso se cubre con un test. |
| ¿Mercado Pago acepta un ítem a $0? | **No está documentado** (`search_documentation` de MP no lo menciona). Si MP lo rechaza, se cae la preferencia y **la venta entera**. Por eso el regalo **no viaja como ítem de MP**. |
| ¿El CRM interno acepta una línea a $0? | Sí: `epicalcos-app/netlify/functions/webhooks-website-order.ts:81` valida `unitPrice: z.number().min(0)`. |
| ¿Meta recibiría el regalo como producto? | Sí, si va en `order.items`: `lib/metaCapi.js:117` manda todas las líneas salvo `shipping` como `contents`. Un id que no está en el catálogo ensucia el Purchase. **Hay que filtrarlo.** |
| ¿Dónde se ve el resumen en el celular? | En `Checkout.jsx` el `<aside>` va **después** del formulario en la grilla: a 375 px queda al final de todo. Un contador ahí no lo ve nadie mientras completa los datos → RF-9. |
| ¿Hay WIP sin commitear en archivos a tocar? | **Sí: `frontend/src/lib/analytics.js`** (spec 023, +110/−24) y `docs/analytics.md`, `docs/business-rules.md`, `docs/architecture.md`, `docs/database.md`. Al implementar hay que separar el hunk propio (ver §8). El resto de los archivos a tocar están limpios. |
| Comentarios que explican por qué algo está así | `CuponCountdown.jsx`: el contador va en popup **y** checkout porque uno que no se ve no cambia conductas; `onVencido` se llama una sola vez; recalcula desde `Date.now()` porque los timers en segundo plano se atrasan. `Checkout.jsx:173`: al vencer **no se toca el formulario**. `lib/pricing.js:200`: la ventana es falsificable y está aceptada. `notify.js:68`: el plan B de `buildOrderView` son los ítems de MP porque Blobs se cayó en silencio. **Todos siguen vigentes y el diseño los respeta.** |

---

## 1. Arquitectura propuesta

```
POPUP (WelcomePopup)                      CHECKOUT                                SERVIDOR
─────────────────────                     ────────                                ────────
POST /api/capture-lead                    leerRegalo()                            validateAndPriceOrder({ …, regaloEmitidoEn })
  { email, oferta: 'regalo' }               └ ventana abierta?                      ├ precios: IGUAL que hoy (el regalo no entra)
  ← { ok, oferta: 'regalo' }                    ├ sí → línea GRATIS + contador      └ regalo = regaloVigente(emitidoEn, digitalOnly)
emitirRegalo() → localStorage                   │      banda arriba (mobile)                       ↓
  { regalo:'pack_sorpresa', emitidoEn }         │      onVencido → sale + aviso     create-preference / create-order-transfer
  + copia en memoria (storage bloqueado)        └ no → nada                          ├ items de MP: SIN el regalo
RegaloCountdown 10:00 ↓                   payload: regaloEmitidoEn                   ├ storedOrder.items: + LINEA_REGALO
                                                                                     ├ Notion / CRM: + LINEA_REGALO
                                                                                     └ metadata MP: regalo:'pack_sorpresa'
                                                                                                   ↓
                                                                               buildOrderView (mail interno / cliente)
                                                                                 └ sin Blobs: repone la línea desde metadata
                                                                               metaCapi: filtra LINEA_REGALO
```

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| El regalo **no es una línea del carrito** (`CartContext`) | Agregarlo como línea `regalo:` en `epicalcos.cart.v2` | Cambiaría la forma del carrito guardado (regla 11), entraría a `pricedItems`, al 3x2, al conteo de unidades, al `add_to_cart` y al carrito abandonado. Se vería en el carrito lateral, que está fuera de scope. Y al vencer habría que sacarlo del storage del carrito. Como estado del checkout no toca nada de eso. |
| El regalo **no viaja como ítem de MP** | `unit_price: 0` en la preferencia | No está documentado que MP lo acepte, y si lo rechaza se cae la venta (§0). |
| El servidor agrega la línea a `storedOrder.items` / Notion / CRM | Guardar solo un campo `regalo` y que cada canal lo dibuje | Con la línea en `items`, el pack aparece **solo** en los cuatro canales que ya dibujan ítems (mail interno, mail al cliente, Notion, CRM). Con un campo aparte, cada canal necesita código nuevo, y el que se olvide despacha una caja sin pack. El costo es un filtro en `metaCapi`. |
| Metadata de MP `regalo` + reposición en `buildOrderView` | Confiar en `storedOrder` | Blobs ya se cayó en silencio dos veces (`notify.js:68`). Sin esto, el aviso rearmado desde MP diría "todo bien" sin el pack. |
| Storage nuevo `epicalcos.regaloBienvenida` | Reusar `epicalcos.welcomeCoupon` | Ese key ya cambió de formato una vez (`cuponVentana.js`: string → objeto) y tiene lectores con compatibilidad. Mezclar el regalo ahí obliga a tocar esos lectores y arriesga el cupón de quien ya lo tiene. |
| Copia **en memoria** además de `localStorage` | Solo `localStorage`, como el cupón | Con el cupón, si el storage fallaba el código se podía tipear a mano. El regalo no tiene código: sin la copia en memoria, en el navegador de Instagram con storage bloqueado se perdería al pasar del popup al checkout, aunque sea navegación SPA sin recarga. |
| `capture-lead` recibe `oferta: 'regalo'` del cliente | Que el servidor decida solo | Un navegador con **el bundle viejo** (cargado antes del deploy) muestra "10 % OFF" y espera un `code`. Si no manda `oferta`, recibe `EPICA10`, que es lo que su pantalla prometió. |
| Componente nuevo `RegaloCountdown.jsx` | Parametrizar `CuponCountdown.jsx` | `CuponCountdown` está atado a `msRestantes(cupon)` y al copy del 10 %, y sigue en uso por el cupón (que vuelve con el interruptor apagado). Generalizarlo es un refactor de algo que funciona (regla 8). Se duplican unas 30 líneas de lógica de intervalo y se anota como hallazgo. |
| Interruptor `REGALO_BIENVENIDA.activa` espejado | Revertir el commit para apagar | Mismo patrón que las promos de la 017 ("apagar cambiando una línea"). Apagado, el popup vuelve **exactamente** al 10 % OFF actual, que queda intacto. |
| Sin mail al lead con el regalo | Mandarle "tu pack te espera" | El regalo vive en el navegador donde dejó el mail, y el link del mail abre otro navegador (el de Gmail). Ver requirements §12, P-3. |

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/config/pricing.js` | `REGALO_BIENVENIDA`, `REGALO_STORAGE_KEY`, `ventanaRegaloAbierta()` | 🟡 compartido (39 importadores), pero es **solo adición** |
| `netlify/functions/lib/pricing.js` | Espejo de lo anterior + `LINEA_REGALO`, `regaloVigente()`. `validateAndPriceOrder` acepta `regaloEmitidoEn` y devuelve `regalo` | 🔴 revalida todos los checkouts. Mitigación: el regalo no entra a `clean` ni a `priced`, y hay test de precios idénticos |
| `netlify/functions/create-preference.js` | Lee `regaloEmitidoEn`, suma `LINEA_REGALO` a `storedOrder.items` y a los ítems de Notion (no a `mpItems`), agrega `metadata.regalo` | 🔴 camino de pago |
| `netlify/functions/create-order-transfer.js` | Lee `regaloEmitidoEn` y suma `LINEA_REGALO` a `storedOrder.items` y a Notion | 🔴 camino de pago |
| `netlify/functions/lib/notify.js` | `itemsText`/`itemsHtml`: `unit_price 0` → "GRATIS". Banda "🎁 Incluir pack sorpresa" en el mail interno. `buildOrderView` repone la línea desde `meta.regalo`. `sendLeadEmail(email, contexto)` con el texto según la oferta | 🟡 lo usan 8 funciones; los cambios son de presentación, y `money(0)` hoy imprime "$ 0" |
| `netlify/functions/lib/metaCapi.js` | Filtra `LINEA_REGALO.id` de `contents` | 🟡 |
| `netlify/functions/capture-lead.js` | Si `body.oferta === 'regalo'` y el regalo está activo: responde `{ ok, oferta: 'regalo' }` y no manda el mail del cupón. Si no: igual que hoy | 🟡 |
| `netlify/functions/_notion.js` | `crearLeadNewsletter(email, contexto)`: el texto de Observaciones según la oferta. El select `Estado` **no cambia** (P-6) | 🟢 |
| `frontend/src/components/WelcomePopup.jsx` | Rama "regalo" (copy, submit con `oferta`, `emitirRegalo`, `RegaloCountdown`, CTA según carrito) cuando `REGALO_BIENVENIDA.activa`. La rama 10 % queda intacta | 🟡 |
| `frontend/src/services/leadService.js` | `captureLead(email, oferta)` → manda `oferta` en el body | 🟢 |
| `frontend/src/routes/Checkout.jsx` | Estado `regalo`, línea GRATIS en el resumen, banda mobile, `vencerRegalo()`, `regaloEmitidoEn` en los dos payloads, `regalo` en `stashPurchase` | 🔴 camino de compra. El cálculo de `items`/`subtotal`/`total` **no se toca** |
| `frontend/src/services/paymentService.js` | Pasa `regaloEmitidoEn` en los dos POST | 🟢 |
| `frontend/src/lib/purchaseTracking.js` | `stashPurchase` guarda `regalo` | 🟢 |
| `frontend/src/lib/analytics.js` | `trackRegaloEmitido`, `trackRegaloVencido`; `trackPurchase` acepta `regalo` | 🟡 compartido + **WIP ajeno** en el archivo |
| `frontend/src/routes/PaymentSuccess.jsx`, `PaymentTransfer.jsx` | Pasan `paid.regalo` a `trackPurchase` | 🟢 |

### Archivos nuevos
| Archivo | Responsabilidad |
|---|---|
| `frontend/src/lib/regaloBienvenida.js` | `emitirRegalo()`, `leerRegalo()`, `olvidarRegalo()`, `msRestantesRegalo()`. Toda lectura y escritura de storage en `try/catch`, con copia en memoria. Espejo de `cuponVentana.js` |
| `frontend/src/components/RegaloCountdown.jsx` | Contador del regalo: reloj real, `onVencido` una sola vez, anuncio `sr-only` al montar y al vencer, variante `compacto` para la banda mobile |
| `frontend/src/lib/regaloBienvenida.test.js` | Ver §9 |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **sí** (solo adición) | 39 archivos de `src/`. Nadie importa los nombres nuevos salvo `regaloBienvenida.js`, `WelcomePopup.jsx` y `Checkout.jsx` |
| `frontend/src/config/site.js` | no | — |
| `frontend/src/context/CartContext.jsx` | **no** | — (decisión clave: el regalo no es línea del carrito) |
| `netlify/functions/lib/pricing.js` | **sí** | `create-preference.js`, `create-order-transfer.js`; tests: `promoPricing`, `precioPersonalizados`, `envio`, `ofertasSimultaneas`. Todos leen campos puntuales del resultado; ninguno compara el objeto entero, así que sumar `regalo` es aditivo |
| `frontend/src/lib/analytics.js` | **sí** (solo adición) | 41 archivos. `trackPurchase` lo llaman `PaymentSuccess.jsx` y `PaymentTransfer.jsx` |
| `netlify/functions/lib/notify.js` | **sí** | `canario-blobs`, `abandoned-cart`, `mercadopago-webhook`, `create-order-transfer`, `contacto`, `entregar-digital`, `capture-lead`, `lib/digital`; tests `entregaDigital`, `carritoAbandonado`, `envioAviso`, `avisoPedido` |

```bash
grep -rn "config/pricing\|lib/pricing\|lib/analytics\|lib/notify\|metaCapi" frontend/src netlify/
```

---

## 3. Datos

### Estructuras nuevas
```js
// frontend/src/config/pricing.js  (espejo EXACTO en netlify/functions/lib/pricing.js)
export const REGALO_BIENVENIDA = {
  activa: true,                    // interruptor: false → el popup vuelve al 10 % OFF
  id: 'pack_sorpresa',
  titulo: 'Pack de stickers sorpresa',
  ventanaMs: 10 * 60 * 1000
};
export const REGALO_STORAGE_KEY = 'epicalcos.regaloBienvenida';
export function ventanaRegaloAbierta(emitidoEn, now = Date.now(), tolerancia = 0) { … }
//   A DIFERENCIA del cupón: `emitidoEn` ausente = NO hay regalo (no "vale sin ventana").
//   El cupón sin emisión es un código tipeado; un regalo sin emisión no existe.

// netlify/functions/lib/pricing.js (solo servidor)
export const REGALO_TOLERANCIA_MS = 60 * 1000;
export const LINEA_REGALO = {
  id: 'regalo:pack_sorpresa',
  title: '🎁 Pack de stickers sorpresa (regalo)',
  quantity: 1,
  unit_price: 0,
  currency_id: 'ARS'
};
export function regaloVigente({ emitidoEn, digitalOnly, now }) → 'pack_sorpresa' | null

// validateAndPriceOrder(…) → { ok: true, …lo de hoy, regalo: 'pack_sorpresa' | null }
```

```js
// localStorage['epicalcos.regaloBienvenida']
{ "regalo": "pack_sorpresa", "emitidoEn": 1789757296733 }
```

### Persistencia
| Dónde | Qué | Ref. |
|---|---|---|
| Netlify Blobs `orders` | `storedOrder.items` puede traer `LINEA_REGALO` (a $0) | `docs/database.md` §1 |
| `localStorage` | `epicalcos.regaloBienvenida` (nuevo) | `docs/database.md` §3 |
| Metadata de la preferencia MP | `regalo: 'pack_sorpresa'` | — |
| `sessionStorage` `epicalcos.purchase.v1` | campo `regalo` | `purchaseTracking.js` |

### ⚠️ Compatibilidad con datos existentes
- [x] **No cambia la forma de las líneas del carrito.** `epicalcos.cart.v2` no se toca.
- [x] **Pedidos viejos en Blobs**: no tienen la línea ni el campo. Todo lector trata la ausencia como "sin regalo".
- [x] **`epicalcos.welcomeCoupon`** sigue leyéndose igual: quien tenga `EPICA10` guardado lo ve aplicado como hoy.
- [x] **Consumidores de `storedOrder.items`** revisados: `notify` (lo muestra), `buildCrmOrder` (lo manda a $0; el CRM acepta `min(0)`), `metaCapi` (se filtra), `lib/digital.js` (`isDigitalLine` mira el prefijo `digital:`; `regalo:` no lo confunde), Notion `buildObservaciones` (lo lista con su título).

---

## 4. APIs

### Endpoints afectados
| Endpoint | Method | Cambio |
|---|---|---|
| `/api/create-preference` | POST | campo opcional `regaloEmitidoEn: number` |
| `/api/create-order-transfer` | POST | campo opcional `regaloEmitidoEn: number` |
| `/api/capture-lead` | POST | campo opcional `oferta: 'regalo'`; la respuesta dice `oferta` |
| `/api/mercadopago-webhook` | POST | sin cambio de contrato; `buildOrderView` lee `metadata.regalo` |

Endpoints nuevos: ninguno.

### Contratos
```js
// POST /api/capture-lead — bundle nuevo, regalo activo
→ { email, oferta: 'regalo' }
← 200 { ok: true, oferta: 'regalo', regalo: 'pack_sorpresa' }

// POST /api/capture-lead — bundle viejo (sin `oferta`) o regalo apagado en el servidor
← 200 { ok: true, oferta: 'cupon', code: 'EPICA10' }      // igual que hoy + `oferta`

// POST /api/create-preference | /api/create-order-transfer
→ { items, payer, shipping, couponCode, couponIssuedAt, regaloEmitidoEn }
//   regaloEmitidoEn: Number(...) o se descarta, igual que couponIssuedAt
← sin cambios (el regalo nunca produce un 400)
```

El popup decide qué pantalla mostrar **por la respuesta** (`oferta`), no por su
propio flag: si el servidor tiene el regalo apagado, la persona ve el cupón que
de verdad recibió.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago | `metadata.regalo`. Los ítems cobrados no cambian | No: la preferencia es idéntica en ítems y montos |
| Notion | La línea sale sola en Observaciones del pedido como `• 🎁 Pack de stickers sorpresa (regalo) x1 ($0)`: el título ya dice "regalo", así que `buildObservaciones` no se toca. Cambia el texto del lead | No (`crearLeadEnCRM` nunca lanza) |
| Resend | Línea GRATIS + banda en el mail interno y la línea en el del cliente. Con el regalo activo, **no** se manda el mail del cupón al lead | No |
| Meta (Pixel / CAPI) | CAPI filtra la línea. El Pixel no la ve (el regalo no está en `items` del cliente) | No |
| CRM interno | Recibe la línea a $0 | No (`notifyCrm` nunca lanza) |
| Cloudinary | — | — |

### Variables de entorno nuevas
Ninguna.

---

## 6. Seguridad

- [x] Ningún secreto en el frontend
- [x] El servidor no confía en el cliente: `regaloEmitidoEn` se coacciona a número, se valida contra la ventana, se rechaza en el futuro y se ignora en pedidos solo digitales. **Nunca** cambia un precio ni el envío
- [x] Payloads ya acotados (`MAX_BODY_BYTES`); el campo nuevo es un número
- [x] Sin PII en `dataLayer`: los eventos llevan `regalo`, `ventana_ms` y `donde`, nada más
- [x] Sin endpoint nuevo; CSP sin cambios

**Riesgos identificados y cómo se mitigan**

| Riesgo | Mitigación |
|---|---|
| Falsificar `emitidoEn` para ganar el pack en cada compra | **Aceptado** (requirements §9 y P-4). El techo es un pack por pedido pagado. Se documenta en código con el mismo aviso que `lib/pricing.js:200` |
| Que el regalo altere un precio y dispare `price_mismatch` | El regalo se evalúa **después** del pricing y no entra a `clean` ni a `priced`. Test: mismo payload con y sin regalo → `items` e `itemsTotal` idénticos |
| Despachar una caja sin el pack | La línea va en `items` (sale sola en los 4 canales), más la banda en el mail interno y la reposición desde metadata de MP |
| Meta recibe un producto que no está en el catálogo | Filtro en `metaCapi.js` + test en `metaMatching.test.js` |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| `localStorage` bloqueado | `emitirRegalo` guarda en memoria; `leerRegalo` cae a memoria | El regalo en el checkout mientras no recargue |
| `capture-lead` falla | Igual que hoy: `status: 'error'` | "No pudimos registrar tu mail. Probá de nuevo." Sin regalo |
| Vence con el checkout abierto | `vencerRegalo()`: `trackRegaloVencido('checkout')`, `olvidarRegalo()`, aviso | La línea sale, aparece el aviso, el formulario intacto |
| Vence entre el click en pagar y el servidor | 60 s de tolerancia | Nada: el pedido sale con el pack |
| `regaloEmitidoEn` basura o futuro | `regalo: null` | Pedido normal, sin 400 |
| Blobs no disponible | `buildOrderView` repone la línea desde `metadata.regalo` | — (el mail interno igual lo dice) |
| El tracking tira | Todo en `try/catch` vía `pushDataLayer` | Nada |

---

## 8. Estrategia de migración

- **Datos existentes**: no hay que migrar nada. El key nuevo arranca vacío.
- **Carritos guardados**: sin cambios.
- **Pedidos ya en Blobs**: sin la línea; se leen igual.
- **Compatibilidad hacia atrás**: el bundle viejo (sin `oferta`) sigue recibiendo `EPICA10`. Quien tenga `EPICA10` guardado lo sigue viendo aplicado.
- **Rollback**: `REGALO_BIENVENIDA.activa = false` en **los dos** `pricing.js` → el popup vuelve al 10 % OFF, el checkout no muestra regalos y el servidor los ignora. O revertir el commit.
- **Feature flag**: el interruptor de arriba (requiere deploy, igual que las promos).
- ⚠️ **WIP ajeno**: `frontend/src/lib/analytics.js` y cuatro `docs/*.md` tienen cambios sin commitear de la spec 023. Al commitear: construir el archivo como `HEAD + solo el cambio propio`, stagearlo, devolver el WIP al disco y commitear con `git commit -- rutas`. Verificar con `git diff --cached` que no entra nada de la 023.

---

## 9. Testing

### Tests nuevos
| Archivo | Qué verifica |
|---|---|
| `frontend/src/lib/regaloBienvenida.test.js` | **Paridad**: `REGALO_BIENVENIDA.activa`, `.id` y `.ventanaMs` iguales en front y servidor. `ventanaRegaloAbierta`: abierta a 9:59, cerrada a 10:01 sin tolerancia, cerrada con `emitidoEn` ausente, cerrada en el futuro. `emitirRegalo` + `leerRegalo` ida y vuelta; con `localStorage` que tira, `leerRegalo` devuelve lo emitido en memoria. `msRestantesRegalo` nunca es negativo. |
| ídem (servidor) | `validateAndPriceOrder` con `regaloEmitidoEn` fresco → `regalo: 'pack_sorpresa'` y **`items`/`itemsTotal`/`shippingCost` idénticos** al mismo pedido sin regalo. A 10:30 → sigue (tolerancia). A 11:30 → `null` y `ok: true`. Futuro → `null`. Basura (`'abc'`, `{}`) → `null`. Pedido solo digital → `null`. Con `activa: false` → `null`. |
| `frontend/src/lib/avisoPedido.test.js` | Pedido con `LINEA_REGALO`: el mail interno y el del cliente dicen "GRATIS" y no "$ 0"; el interno trae la banda. `buildOrderView(null, payment)` con `metadata.regalo` y sin la línea en los ítems de MP → la repone una sola vez. Con la línea ya presente → no la duplica. |
| `frontend/src/lib/metaMatching.test.js` | Un pedido con `LINEA_REGALO` no la manda en `contents` ni la cuenta en `num_items`. |
| `frontend/src/lib/pedidoTransferencia.test.js` | Pedido por transferencia con regalo vigente → `storedOrder.items` trae la línea y el total no cambia. |

### ⚠️ Tests de paridad
- [x] Nuevo: paridad de `REGALO_BIENVENIDA` (arriba)
- [x] `promoPricing.test.js`, `envio.test.js`, `precioPersonalizados.test.js` sin cambios y en verde (el regalo no toca precios)

### Verificación manual
- [ ] Popup en 375 px: dejar un mail, ver el contador bajando
- [ ] Checkout en 375 px: la banda arriba del formulario y la línea GRATIS en el resumen
- [ ] Forzar el vencimiento (`emitidoEn` = ahora − 9:55 en `localStorage`) y ver que la línea sale sola con el formulario completo intacto
- [ ] Una compra real por transferencia con regalo: el mail interno trae la banda y la línea GRATIS
- [ ] Con `activa: false` local: el popup muestra el 10 % OFF de siempre

---

## 10. Dependencias nuevas

Ninguna.

---

## 11. Preguntas abiertas del diseño

- [ ] El título de la línea (`🎁 Pack de stickers sorpresa (regalo)`) depende de
      P-1: si Mariano define "10 calcos de 4 cm", el título lo dice y el mail
      interno también, para que el armado sea inequívoco.
- [ ] Hallazgo para después: `RegaloCountdown` y `CuponCountdown` comparten la
      lógica de intervalo. Si el cupón con ventana se retira del todo, se puede
      borrar uno. Si conviven, conviene extraer un hook. No entra acá (regla 8).
