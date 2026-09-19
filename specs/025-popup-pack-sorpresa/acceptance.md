# Acceptance — Popup: pack de stickers sorpresa gratis con tu compra

| | |
|---|---|
| **Spec** | `025-popup-pack-sorpresa` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 19/9/2026 |
| **Resultado** | ✅ **Cumple**, con 4 puntos que necesitan una prueba real de Mariano (AC-5, AC-17 parcial, REG-2, REG-3) |

> Se recorre punto por punto al terminar (`CLAUDE.md` regla 15). No se marca ✅
> nada que no se haya verificado; lo que no se pudo probar se dice.

Para forzar tiempos sin esperar, en la consola del navegador:
```js
// ventana con 5 s restantes
localStorage.setItem('epicalcos.regaloBienvenida',
  JSON.stringify({ regalo: 'pack_sorpresa', emitidoEn: Date.now() - (10 * 60 - 5) * 1000 }))
```

---

## 1. Criterios funcionales

### Popup
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | El popup ofrece un pack de stickers sorpresa gratis con la compra, válido por 10 minutos, y **no** dice "10%" en ninguna parte | Borrar `epicalcos.welcomePopup.seen`, disparar el popup, leer el texto | ✅ Browser 375×812: “PACK DE STICKERS SORPRESA GRATIS”, sin “10 %” en ninguna parte |
| AC-2 *(RF-2)* | Al dejar un mail válido, el popup muestra el pack reservado y un contador que arranca en 10:00 (o 09:59) y baja | Dejar un mail, mirar el contador 5 s | ✅ Arranca en 10:00 y baja |
| AC-3 *(RF-3)* | Con la pestaña 60 s en segundo plano, al volver el contador muestra ~1 minuto menos | Cambiar de pestaña, volver | ✅ Mecanismo verificado, no la pestaña real: con `emitidoEn` de hace 5 min el contador abre en **04:59**, o sea sale de `Date.now()` y no de un decremento. Más el test de `msRestantesRegalo` |
| AC-4 *(RF-4)* | Con productos en el carrito, el botón del popup lleva a `/checkout`; con el carrito vacío, cierra el popup | Probar los dos casos | ✅ Con carrito → “Ir a pagar” → `/checkout` con el pack. Vacío → “Elegir mis calcos” → cierra y se queda en `/` |
| AC-5 *(RF-5)* | El lead se registra en Notion y en el CRM interno, y llega el aviso interno por mail diciendo "pack sorpresa" | Un mail de prueba real; mirar Notion y la casilla | ⏭️ **Falta prueba real de Mariano.** Sin credenciales no se puede escribir en Notion ni en el CRM. Sí verificado por test: el aviso interno dice “pack sorpresa” y no “EPICA10” |
| AC-6 *(RF-6)* | El mail de prueba **no** recibe un mail con el código EPICA10 | Casilla del mail de prueba | ✅ Test: no sale **ningún** mail al lead con `oferta: regalo` |

### Checkout
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-7 *(RF-7)* | Con la ventana abierta, "Tu pedido" muestra "Pack de stickers sorpresa · x1 · GRATIS", visible sin scrollear la lista de productos aunque el carrito tenga 10 líneas | Carrito con 10 líneas + regalo | ✅ Con 10 líneas en el carrito: la línea del regalo queda **fuera** del contenedor que scrollea y se ve; aparece una sola vez |
| AC-8 *(RF-8)* | La línea tiene un contador que baja | Mirar 5 s | ✅ Contador debajo de la línea, bajando |
| AC-9 *(RF-9)* | A 375 px, el contador del regalo se ve **arriba del formulario** al entrar al checkout, sin scrollear | Viewport 375×812 | ✅ A 375×812 la banda queda en y=375, alto 38 — **dentro del viewport**, sin scrollear |
| AC-10 *(RF-10)* | Subtotal, descuento, envío y total son **idénticos** con y sin regalo, para el mismo carrito, envío y medio de pago | Anotar los 4 números; borrar el key del regalo, recargar, comparar | ✅ Idénticos: Subtotal $ 3.200 · Envío $ 4.500 · Total $ 7.700, con y sin regalo |
| AC-11 *(RF-11)* | Con 5 s restantes, al llegar a cero la línea desaparece sola y aparece el aviso de que se terminó el tiempo | Snippet de arriba + esperar | ✅ Con 6 s restantes: la línea desaparece sola y aparece el aviso |
| AC-12 *(RF-12)* | Con nombre, mail, teléfono, dirección, envío "interior" y transferencia ya elegidos, el vencimiento no cambia ninguno | Completar todo, forzar el vencimiento, revisar cada campo | ✅ Nombre, mail, teléfono, dirección, ciudad, provincia y método: los 7 campos **iguales** antes y después |
| AC-13 *(RF-13)* | Con `emitidoEn` de hace 12 minutos, el checkout no muestra línea ni aviso | Setear el key a −12 min, entrar | ✅ Con `emitidoEn` de hace 12 min: ni línea ni aviso |
| AC-14 *(RF-14)* | Recargando el checkout a mitad de ventana, el regalo sigue y el contador continúa (no vuelve a 10:00) | F5 | ✅ El contador continúa desde el tiempo real (mismo mecanismo que AC-3) |

### Pedido
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-15 *(RF-15)* | `validateAndPriceOrder` con `regaloEmitidoEn` de hace 10:30 → `regalo: 'pack_sorpresa'`; de hace 11:30 → `regalo: null` | Test | ✅ Test: 10:30 → `pack_sorpresa`; 11:30 → `null` |
| AC-16 *(RF-16)* | `regaloEmitidoEn` vencido, futuro, `'abc'` u objeto → `ok: true`, `regalo: null`, nunca un 400 | Test | ✅ Test: vencido, futuro, `abc`, `{}`, `[]`, `null`, `NaN` → `ok: true`, `regalo: null` |
| AC-17 *(RF-17)* | Un pedido real con regalo muestra "Pack de stickers sorpresa — GRATIS" en el mail interno, el mail al cliente, la fila de Notion y el CRM interno | Compra real por transferencia (monto mínimo); revisar los 4 | ⚠️ **Parcial.** Mail interno y mail al cliente: ✅ por test (dicen “Pack de stickers sorpresa” y “GRATIS”). **Notion y CRM interno: sin verificar** — necesitan una compra real. La línea viaja a los dos por el mismo `items`, así que el riesgo es bajo, pero no está probado |
| AC-18 *(RF-18)* | El mail interno de ese pedido trae "🎁 Incluir pack sorpresa" arriba de la tabla de ítems | Mismo pedido | ✅ Test: “🎁 INCLUIR PACK SORPRESA” en el HTML y en el texto del mail interno |
| AC-19 *(RF-19)* | `buildOrderView(null, payment)` con `metadata.regalo` repone la línea exactamente una vez | Test | ✅ Test: la repone **una** vez; con la línea ya presente no la duplica |
| AC-20 *(RF-20)* | Pedido solo digital con ventana abierta → `regalo: null` | Test | ✅ Test: pedido solo digital → `regalo: null` |
| AC-21 *(RF-21)* | Un pedido de 30 líneas con regalo tiene **una** `LINEA_REGALO` con `quantity: 1` | Test | ✅ Test: pedido de 30 líneas → un solo pack. Y la línea aparece **una** vez en el mail |
| AC-22 *(RF-22)* | El regalo sale con Mercado Pago y con transferencia, con envío y con retiro | Tests de los dos endpoints + la compra de AC-17 | ✅ Test en los dos endpoints; con retiro y con envío a domicilio |
| AC-23 | La preferencia de MP **no** contiene ningún ítem `regalo:` y cobra lo mismo que sin regalo | Test de `create-preference` o log de `mpItems` en una preferencia de prueba | ✅ Test sobre el body que sale a MP: ningún ítem `regalo:`, y los ítems son **idénticos** con y sin regalo |
| AC-24 | El Purchase de la API de conversiones de Meta no incluye la línea del regalo en `contents` | Test en `metaMatching.test.js` | ✅ Test: `contents` solo trae el calco; `num_items` = 2 (ni envío ni pack suman) |

### Interruptor
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-25 *(RF-23)* | Con `activa: false` en los dos `pricing.js`: el popup es el de 10 % OFF de hoy y entrega EPICA10 con su contador; el checkout no muestra regalos; el servidor devuelve `regalo: null` aunque llegue un `regaloEmitidoEn` fresco | Build local con el flag apagado + test | ✅ Con `activa: false` en los dos `pricing.js`: el popup es el de 10 % OFF con EPICA10 y su contador; el checkout no muestra el pack aunque esté guardado y la ventana abierta; y el servidor devuelve `null` (test) |
| AC-26 | `capture-lead` **sin** `oferta` devuelve `code: 'EPICA10'` (compatibilidad con el bundle viejo) | Test o `curl` a la función | ✅ Test: un POST sin `oferta` devuelve `code: EPICA10` y le manda el cupón por mail |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile**: popup y checkout a 375 px sin scroll horizontal | `document.documentElement.scrollWidth <= 375` | ✅ `scrollWidth` = 375 en el popup y en el checkout |
| ANF-2 | **Performance**: sin requests nuevos al cargar el Home | Network del Home antes/después | ✅ Por inspección: el regalo no agrega ni un request al cargar. El único fetch es el POST de `capture-lead`, que ya existía. No se tocó el Home |
| ANF-3 | **Accesibilidad**: el contador visible es `aria-hidden`; hay un `role="status"` que se anuncia al montar y al vencer; los botones miden ≥ 44 px de alto | Inspección | ✅ El contador visible es `aria-hidden`; hay un `role="status"` que se anuncia al montar y al vencer; el CTA mide 51 px |
| ANF-4 | **Compatibilidad**: un carrito guardado antes del cambio se abre igual; un `epicalcos.welcomeCoupon = "EPICA10"` (formato viejo) sigue aplicando el 10 % en el checkout | Setear los dos keys a mano | ✅ No se tocó la forma del carrito ni el lector de `epicalcos.welcomeCoupon`. Los tests de `cuponVentana` (formato viejo incluido) siguen en verde |
| ANF-5 | **Storage bloqueado**: con `localStorage.setItem` tirando, dejar el mail y navegar al checkout sin recargar muestra el regalo | Test de `regaloBienvenida.js` + prueba manual pisando `setItem` | ✅ Con `localStorage.setItem` tirando: se deja el mail, se navega al checkout **sin recargar** y el pack está. Cero errores de JS. Más el test del módulo |
| ANF-6 | **Sin dependencias nuevas** | `git diff frontend/package.json` sin cambios propios | ✅ `git diff package.json frontend/package.json` vacío |
| ANF-7 | **Sin secretos en el bundle** | `grep` de tokens conocidos sobre `frontend/dist` | ✅ grep de patrones de token (`re_`, `APP_USR-`, `ntn_`, nombres de las env vars) sobre `frontend/dist`: sin coincidencias |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Paga a los 10:30 habiendo entrado al checkout a los 9:50 | La línea salió de la pantalla a las 10:00, pero el pedido lleva el pack (tolerancia) | ✅ Test: a 10:30 el servidor lo sigue dando (60 s de tolerancia); a 11:30 no |
| Preferencia creada con regalo, pago en MP a los 20 min | El aviso del pago aprobado muestra el pack | ✅ Se decide al **crear** el pedido, no al pagar: la línea queda en el pedido guardado y en `metadata.regalo`. Test del webhook con Blobs caído |
| Pago de MP fallido, reintento con la ventana cerrada | El pedido nuevo no lleva el pack | ✅ Test: con la ventana vencida la preferencia se crea igual, sin `metadata.regalo` |
| Retiro en mano | Lleva el pack | ✅ Test: es el método de los dos endpoints; también probado con envío |
| Cliente con EPICA10 guardado (formato nuevo, ventana vencida) | Mismo comportamiento que hoy: se aplica, vence y se olvida | ✅ No se tocó ese camino. `cuponVentana.test.js` (formato viejo incluido) sigue en verde |
| Blobs caído al confirmar el pago de MP | El mail interno igual dice "Incluir pack sorpresa" | ✅ Test del webhook entero con Blobs abajo: el mail interno trae la banda y la línea GRATIS, reponiéndolas desde `metadata.regalo` |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Todos los tests existentes siguen pasando (N de la Fase 0) | ✅ 530 → **585** (55 nuevos), 0 fallidos |
| REG-2 | Se puede completar una compra por **Mercado Pago** de punta a punta | ⏭️ **Falta prueba real de Mariano**: una compra por Mercado Pago de punta a punta necesita el checkout real |
| REG-3 | Se puede completar una compra por **transferencia** de punta a punta | ⏭️ **Falta prueba real de Mariano**: ídem por transferencia. El handler entero sí corre en los tests |
| REG-4 | El envío se calcula igual en las tres zonas | ✅ `envio.test.js` sin cambios y en verde; en el browser el envío a Rosario da $ 4.500 con y sin regalo |
| REG-5 | Ningún checkout se rechaza con `price_mismatch`, con o sin regalo | ✅ Ningún pedido se rechazó en los tests; el regalo se calcula **después** del pricing |
| REG-6 | El carrito sobrevive al refresh | ✅ No se tocó `CartContext` ni la forma de las líneas |
| REG-7 | `purchase` se dispara una sola vez | ✅ `consumePurchase()` sigue leyendo y borrando; no se tocó |
| REG-8 | El `value` del `purchase` es lo que se pagó (el regalo no suma nada) | ✅ El `value` no cambia: el pack va como parámetro del evento, no como ítem |
| REG-9 | El mail de carrito abandonado sigue mostrando los precios de sus líneas (no "GRATIS") | ✅ Test: el mail de un pedido sin regalo muestra “x2 — $ 3.200” y no dice GRATIS |
| REG-10 | La entrega de archivos digitales no cambia | ✅ No se tocó `lib/digital.js`; `isDigitalLine` mira el prefijo `digital:` y `regalo:` no lo confunde. `entregaDigital.test.js` en verde |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `regalo_emitido` | se deja el mail en el popup con el regalo activo | `regalo: 'pack_sorpresa'`, `ventana_ms: 600000` | ✅ `{ regalo: "pack_sorpresa", ventana_ms: 600000 }` |
| `regalo_vencido` | el contador llega a 0 en el popup | `donde: 'popup'` | ✅ `{ regalo: "pack_sorpresa", donde: "popup" }` (reloj adelantado 11 min) |
| `regalo_vencido` | el contador llega a 0 en el checkout | `donde: 'checkout'`, **una sola vez** | ✅ `{ regalo: "pack_sorpresa", donde: "checkout" }`, **una sola vez** |
| `purchase` | compra con regalo | `regalo: 'pack_sorpresa'` | ✅ `regalo: "pack_sorpresa"`, `value: 7700` |
| `purchase` | compra sin regalo | sin el parámetro `regalo` | ✅ Sin el parámetro `regalo`, mismo `value: 7700` |
| `generate_lead` | igual que hoy | `lead_source: 'welcome_popup'` | ✅ `lead_source: "welcome_popup"`, sin cambios |

```js
window.dataLayer.filter(e => /^regalo_|^purchase$/.test(e.event))
```
- [x] Ningún evento lleva el mail ni datos del lead — los eventos capturados solo traen `regalo`, `ventana_ms`, `donde`, `lead_source` y `ecommerce`

---

## 6. Paridad

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | `REGALO_BIENVENIDA` (`activa`, `id`, `ventanaMs`) idéntico en los dos `pricing.js` — test | ✅ Test de paridad de `activa`, `id` y `ventanaMs` |
| PAR-2 | Mismo pedido con y sin regalo → `items`, `itemsTotal` y `shippingCost` idénticos — test | ✅ Test: `items`, `itemsTotal` y `shippingCost` idénticos |
| PAR-3 | `promoPricing`, `envio` y `precioPersonalizados` pasan sin cambios | ✅ Los tres pasan sin cambios |

---

## Definition of Done

- [x] §1, §2 y §3 en ✅ — salvo AC-5 (⏭️) y AC-17 (⚠️ parcial), los dos por el
      mismo motivo: escriben en Notion y en el CRM interno, que necesitan
      credenciales reales
- [x] §4 completo en ✅ — salvo REG-2 y REG-3 (⏭️): una compra de punta a punta
      necesita el checkout real
- [x] `npm test` en verde (**587**) y build de producción sin errores
- [x] Sin dependencias nuevas
- [x] Sin refactors fuera de scope en el diff; no había WIP ajeno que separar
- [x] Sin PII en logs, URLs ni `dataLayer`
- [x] `docs/business-rules.md`, `docs/database.md`, `docs/analytics.md` y
      `docs/architecture.md` actualizados
- [x] `tasks.md` con todos los pasos marcados y la Bitácora completa
- [x] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: 19/9/2026
**Ejecutada por**: Claude (implementación) — revisión de Mariano pendiente

| | Cantidad |
|---|---|
| ✅ Cumple | 54 |
| ⚠️ Parcial | 1 (AC-17) |
| ❌ No cumple | 0 |
| ⏭️ No verificable en esta sesión | 3 (AC-5, REG-2, REG-3) |

### Lo que falta probar, y por qué

Cuatro puntos necesitan **una prueba real de Mariano**, porque escriben en
servicios con credenciales que esta sesión no tiene:

1. **AC-5 / AC-17** — que el lead y el pedido con pack aparezcan en **Notion** y
   en el **CRM interno**. Los mails sí están verificados: el interno trae la
   banda “🎁 INCLUIR PACK SORPRESA” y la línea GRATIS, y el del cliente la
   lista. La línea viaja a Notion y al CRM por el mismo `items` que ya usan los
   mails, así que el riesgo es bajo — pero no está probado.
2. **REG-2 / REG-3** — una compra de punta a punta por Mercado Pago y por
   transferencia. Los dos handlers corren enteros en los tests (incluido el
   webhook con Blobs caído), pero nadie pagó de verdad.

**La prueba mínima que cierra los cuatro**: una compra real por transferencia
por el monto más chico, con el pack ganado. Revisar el mail interno (banda +
línea), el mail al cliente, la fila de Notion y el CRM. Con eso quedan ✅ AC-5,
AC-17 y REG-3, y REG-2 se cierra con una compra por MP.
