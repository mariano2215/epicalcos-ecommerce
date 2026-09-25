# Tasks — Popup CRO: del mail a la compra

| | |
|---|---|
| **Spec** | `026-popup-embudo-de-compra` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 026"*.

- [x] Los tres documentos anteriores están completos
- [x] Mariano respondió P-2 a P-7 (25/09/2026, ver `requirements.md` §0)
- [ ] P-1 (spec 025) sin respuesta: rige la propuesta, la 026 la reemplaza
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación**

El orden de las fases sigue la prioridad del pedido (§37): disparo y frecuencia
primero, tracking y A/B al final. Cada fase deja la suite en verde.

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `WelcomePopup.jsx`, `cuponVentana.js` y su test, `CuponCountdown.jsx`, `Checkout.jsx:88-200`, `CartDrawer.jsx`, `Cart.jsx:176-222`, `BuscadorModal.jsx`, `WhatsAppButton.jsx`, `lib/experiments.js`, `lib/analytics.js:20-110` y `437-672`
  - *Verificación*: sé qué hace cada uno hoy y por qué
- [ ] **0.2** `git status` limpio en los archivos a tocar (si hay WIP ajeno, anotarlo en la Bitácora)
- [ ] **0.3** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Verificación*: 623 tests pasan (o el número que haya ese día, anotado en la Bitácora)

## Fase 1 — Config y reglas puras

- [ ] **1.1** `frontend/src/config/popup.js` con `POPUP_CONFIG`, `POPUP_VARIANTES`, `POPUP_OFERTA`, `INTERESES`, `RUTAS_FLUJO_COMPRA`, `RUTAS_SIN_DESCUENTO` (design §3), con comentarios del por qué
- [ ] **1.2** `popup_disparo` en `EXPERIMENTS` con `active: false` y `variants[0] === 'b_12s'`
- [ ] **1.3** `export const WELCOME_COUPON_CODE` en `netlify/functions/capture-lead.js`
  - *Verificación*: `git diff capture-lead.js` muestra solo la palabra `export`
- [ ] **1.4** `frontend/src/lib/popupReglas.js` con las funciones de design §3
- [ ] **1.5** `frontend/src/lib/popupReglas.test.js` con los casos de design §9, **incluida la paridad del código**
  - *Verificación*: `npm test` verde con los tests nuevos

## Fase 2 — Estado y frecuencia

- [ ] **2.1** `frontend/src/lib/popupEstado.js`: `epicalcos.popup.v1` y `epicalcos.popup.sesion.v1`, todo acceso en `try/catch`, copia en memoria, `storageOk()`, `suscribir` + `usePopupEstado()` (mismo patrón que `lib/tamanoElegido.js`)
- [ ] **2.2** `registrarVisto`, `registrarCerrado`, `registrarConvertido`, `registrarCompra` (esta **no** toca el cupón guardado, P-3), `registrarSenal`
- [ ] **2.3** Migración de `epicalcos.welcomePopup.seen` con `migrarEstadoViejo`, sin borrar la clave vieja
- [ ] **2.4** `emitirCupon(code, { conVentana = true } = {})` en `lib/cuponVentana.js`
  - *Verificación*: los tests existentes de `cuponVentana.test.js` pasan sin tocarlos
- [ ] **2.5** `frontend/src/lib/popupEstado.test.js` (design §9)

## Fase 3 — Disparo y anti-interrupción

- [ ] **3.1** `components/popup/usePopupDisparo.js`: timer de sesión, scroll con `requestAnimationFrame` y `passive`, salida con `mousemove` previo (se conserva el comentario de `WelcomePopup.jsx:88-100`), intención por `pathname` (`/producto/*`, `/categoria/*` que no sea la de entrada) y por `registrarSenal('search')`
- [ ] **3.2** `bloqueado()` (design §3) + sondeo cada 1 s + gracia de 3 s; `ultimoCambioCarrito` a partir de `items.length` de `useCart()`
- [ ] **3.3** El hook se re-arma al navegar (a diferencia de hoy, que solo evalúa al montar), junta señales en cualquier página y solo abre en `/` (`popupPermitido`)
  - *Verificación*: con todos los disparos cumplidos en `/categorias`, no abre; al volver a `/`, abre
- [ ] **3.4** Exposición del A/B: `trackExperimentView` solo si `EXPERIMENTS.popup_disparo.active`, cuando el disparo se arma para alguien elegible
- [ ] **3.5** `data-popup-bloqueo` en el contenedor del menú del celular de `Header.jsx` cuando `open`
- [ ] **3.6** `registrarSenal('search')` junto a los dos `trackSearch` de `BuscadorCalcos.jsx`

## Fase 4 — Popup (pasos 1 y 2)

- [ ] **4.1** `PopupDialogo.jsx`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, foco al título con `tabIndex={-1}`, trampa de Tab, Escape, cierre por fondo, bloqueo del scroll del `body` y devolución de foco (mismo patrón que `BuscadorModal.jsx`). En celular arriba con margen, `max-h-[calc(100dvh-2rem)] overflow-y-auto`; desde `sm` centrado
- [ ] **4.2** `PopupCaptura.jsx`: copy de RF-18, porcentaje desde `COUPONS[POPUP_OFERTA.codigo].discount`, `<form noValidate>`, input `type="email" inputMode="email" autoComplete="email"`, **`text-base`** (16 px) y 48 px de alto, label `sr-only`, botón de 48 px, errores de RF-20/RF-21 con `role="alert"`
- [ ] **4.3** `leadService.captureLead`: `err.status` y timeout de 10 s con `AbortController`
- [ ] **4.4** Reducer de estados (design §1): nada de `visible` + `status` + `code` sueltos
- [ ] **4.5** `PopupExito.jsx`: título, código, **Copiar** (`navigator.clipboard` en `try/catch`, si falla selecciona el texto), línea de P-5, selector de 4 intereses (botones de 44 px, grilla 2×2), CTA "Elegir mis calcos →" a `/categorias`, link "Ya tengo calcos en el carrito: ir a pagar" si `items.length > 0`. Con `POPUP_OFERTA.ventanaMs` definido, muestra `CuponCountdown`
- [ ] **4.6** Los 4 intereses navegan con `destinoInteres` (mate y celular a `/categorias`, sin tocar el tamaño de la grilla) y cierran el popup
- [ ] **4.7** ✕ de 44 × 44 px con `aria-label="Cerrar"`, con menos peso visual que el CTA
- [ ] **4.8** `WelcomePopup.jsx` reescrito como orquestador: `lazy(() => import('./popup/PopupDialogo.jsx'))` precargado cuando el disparo se arma, `Suspense` con `fallback={null}`; si el `import()` falla, no marca visto
- [ ] **4.9** El comentario de `WelcomePopup.jsx:14-24` se reescribe con la historia (600 px → 2.600 px y 20 s → spec 026: solo en el Home)
  - *Verificación*: el archivo nuevo explica por qué el popup solo se abre en el Home y por qué ahí el disparo puede ser "o"

## Fase 5 — Beneficio activo

- [ ] **5.1** Al convertir: `emitirCupon(code, { conVentana: POPUP_OFERTA.ventanaMs != null })`, `registrarConvertido()`
- [ ] **5.2** `AccesoBeneficio.jsx`: abajo a la izquierda, `z-40`, alto 44 px, `bottom` igual a `WhatsAppButton` (elevado en `/producto/*` y `/personalizados`; el comentario apunta a `WhatsAppButton.jsx` para que no se desincronicen). Estado `activo` (con `accesoVisible`) → al tocarlo despliega código + Copiar + "Se aplica solo en el checkout" (`aria-expanded`), **sin abrir el popup**; sigue después de comprar. Estado `oferta` (cerrado, sin cupón, sin compra) → solo en `/`, abre el paso 1 con `popup_trigger: 'manual'`. Nada con `POPUP_CONFIG.activo: false`
  - *Verificación*: a 375 px no se superpone con WhatsApp ni con la `StickyMobileBar`
- [ ] **5.3** `CuponEnCarrito.jsx`: `useCuponEnCarrito({ totalActual, totalTransferActual })` con la guardia de identidad (design §1) y `CuponEnCarritoLinea`
- [ ] **5.4** `CartDrawer.jsx`: línea arriba del Total y Total con cupón cuando `mostrarMonto`
  - *Verificación*: el Total del carrito con el cupón coincide con el Total del checkout con Mercado Pago, para un carrito de 3 calcos del catálogo
- [ ] **5.5** `Cart.jsx`: lo mismo, incluida la caja "Con transferencia" con `pricedItems('transferencia', code, …)`
  - *Verificación*: con 10 calcos, "Con transferencia" coincide con el checkout por transferencia
- [ ] **5.6** `registrarCompra()` al montar `PaymentSuccess.jsx` y `PaymentTransfer.jsx`
  - *Verificación*: después de comprar, el popup no se abre solo, el acceso "🎁 10% OFF" no aparece y `epicalcos.welcomeCoupon` **sigue** guardado

## Fase 6 — Tracking

- [ ] **6.1** En `lib/analytics.js`: `trackPopupView`, `trackPopupClose`, `trackPopupEmailSubmit`, `trackPopupInterestSelected`, `trackPopupCtaClick`, todos por `pushDataLayer` (design §1, requirements §11)
- [ ] **6.2** `setPopupUserProperties({ exposed, converted })`: `gtag('set', 'user_properties', …)` en `try/catch` + push al `dataLayer`. Se llama al montar el orquestador con lo que haya en `epicalcos.popup.v1`, al primer `popup_view` y al convertir
- [ ] **6.3** `trackLeadCapture(source, extra = {})`: el popup pasa `popup_variant`, `popup_trigger`, `device_type`
  - *Verificación*: `FormularioContacto.jsx` sigue mandando exactamente lo mismo
- [ ] **6.4** Sin PII: ningún evento lleva el mail; `page_path` es `location.pathname`
- [ ] **6.5** Un solo `popup_view` por apertura (guardia con `useRef` contra el doble efecto de StrictMode)

## Fase 7 — Verificación

- [ ] **7.1** Suite completa en verde
  ```bash
  npm test
  ```
  - *Verificación*: 623 + los nuevos, 0 fallidos
- [ ] **7.2** `npm run build --prefix frontend` sin errores; el diálogo sale en un chunk aparte
  - *Verificación*: el bundle principal no crece más de 3 KB gzip (anotar antes/después)
- [ ] **7.3** Pruebas manuales de `acceptance.md` a 375 px y en escritorio

## Fase 8 — Documentación

- [ ] **8.1** `docs/business-rules.md` "Popup de bienvenida": solo en el Home, disparo, frecuencia, sin ventana (P-2), el cupón sigue después de comprar (P-3), acumulación con 3x2 y transferencia confirmada el 25/9. En §3.4 anotar que el popup ya no arranca la ventana
- [ ] **8.2** `docs/analytics.md`: sección de la spec 026 con los eventos, las propiedades de usuario, cómo leer el funnel y el sesgo de `new_vs_returning` en la primera semana
- [ ] **8.3** `docs/database.md` §3: `epicalcos.popup.v1`, `epicalcos.popup.sesion.v1`, y que `welcomeCoupon` puede tener `emitidoEn: null`
- [ ] **8.4** `specs/025-popup-pack-sorpresa/requirements.md`: estado según P-1, con el motivo
- [ ] **8.5** `CLAUDE.md` dice "210 tests"; hoy son 623. Actualizar el número (cambio de documentación, no necesita spec)

## Fase 9 — Cierre

- [ ] **9.1** Validar contra `acceptance.md`, punto por punto, con resultados reales
- [ ] **9.2** Commit y push **a la rama de trabajo**, no a `main`. El merge a `main` es deploy y lo decide Mariano
- [ ] **9.3** **Acción de Mariano**: registrar en GA4 las dimensiones personalizadas (evento: `popup_variant`, `popup_trigger`, `page_path`, `device_type`, `new_vs_returning`, `discount_type`, `popup_step`, `close_method`, `interest`, `destination`; usuario: `popup_exposed`, `popup_converted`)
- [ ] **9.4** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| `input-dark` tiene 15,2 px de letra: iOS hace zoom al tocar cualquier campo, **checkout incluido** | `frontend/src/styles/index.css:178` | Subir a `1rem` en una spec chica: es fricción en el paso de pago |
| El copy del popup viejo dice "aplicado en tu carrito" y el carrito no lo mostraba | `WelcomePopup.jsx` | Se resuelve con esta spec (RF-35) |
| Notion crea una fila por cada envío del mismo mail | `_notion.js` `crearLeadNewsletter` | Buscar por `Correo` antes de crear |
| No hay landing de mate ni de celular | `config/landings.js` | Decidir con `popup_interest_selected` después de 4 semanas |
| El mail del cupón no tiene link de baja | `notify.js` `sendLeadCouponEmail` | Link de baja firmado, como el del carrito abandonado |
| `CLAUDE.md` y `specs/README.md` dicen "210 tests" | — | Se actualiza en 8.5 |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
