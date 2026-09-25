# Design — Popup CRO: del mail a la compra

| | |
|---|---|
| **Spec** | `026-popup-embudo-de-compra` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 25/09/2026 |

> **Este documento define CÓMO se implementará.**
> Usa las propuestas por defecto de `requirements.md` §12. Si Mariano cambia
> alguna, se ajusta la sección que corresponda antes de implementar.

---

## 0. Hallazgos del discovery

### Auditoría del estado actual

| Pieza | Cómo está hoy | Dónde |
|---|---|---|
| **Popup** | Un componente con todo adentro: disparo, formulario y éxito. Estado con `status` (`idle · submitting · done · error`) + `visible` + `code` + `emitidoEn` | `components/WelcomePopup.jsx`, montado siempre en `App.jsx` (bundle principal) |
| **Disparo** | Home: cuando `#categorias-destacadas` entra al 90% del viewport. Resto: `scrollY > 2600` **y** 20 s en la página. Compu: intención de salida (`mouseout` por arriba, con `mousemove` previo, ≥ 10 s). Se evalúa **una vez, al montar la app** | `WelcomePopup.jsx:43-122` |
| **Persistencia** | `epicalcos.welcomePopup.seen = '1'` al cerrar o convertir: **nunca más**. Sin storage → no aparece | `WelcomePopup.jsx:9, 124` |
| **Rutas excluidas** | `/checkout`, `/carrito`. Las pantallas de pago (`/pago-*`) no, pero como solo evalúa al montar, casi nunca aparece ahí | `WelcomePopup.jsx:26` |
| **Integración mail** | `POST /api/capture-lead` → Notion (fila nueva por envío, sin dedup), CRM interno, aviso interno (Resend) y mail al cliente con el código. Devuelve `{ ok, code: 'EPICA10' }`, incluso si algo interno falla | `netlify/functions/capture-lead.js`, `services/leadService.js` |
| **Descuento** | `EPICA10`: 10% solo sobre `type === 'sticker'`, acumulable con transferencia y 3x2, tope 20%. Espejado en los dos `pricing.js` | `config/pricing.js:80`, `lib/pricing.js:33` |
| **Ventana** | 10 min desde la emisión (spec 017). `emitirCupon()` guarda `{ code, emitidoEn }`; el checkout la lee, muestra `CuponCountdown` y manda `couponIssuedAt`; el servidor revalida con 60 s de tolerancia. **Sin `emitidoEn` no hay ventana** y el cupón vale | `lib/cuponVentana.js`, `CuponCountdown.jsx`, `Checkout.jsx:119-193`, `lib/pricing.js:200-230` |
| **Aplicación automática** | **Ya existe**: el checkout lee el cupón guardado y lo aplica solo. Carrito lateral y `/carrito` **no** lo muestran ("tu cupón se aplica en el checkout") | `Checkout.jsx:119`, `CartDrawer.jsx:176`, `Cart.jsx:218` |
| **Upsell del carrito** | **Ya existe y cumple el §18 del pedido**: `OrderBump` en el carrito lateral y `SuggestedStickers` en `/carrito` y checkout, de las mismas categorías del carrito, excluyendo lo que ya está (`elegirUno`/`elegirVarios` con `enCarrito`) | `OrderBump.jsx:71-86`, `SuggestedStickers.jsx:158-171`, `lib/sugerencias.js` |
| **Analytics** | `generate_lead` (`lead_source: 'welcome_popup'`) + `Lead` de Meta; `cupon_emitido`, `cupon_vencido`. No hay vista, cierre ni después. GA4 por `gtag` directo; GTM y Pixel solo si hay `VITE_*`. `ga4()` ya soporta `user_properties` | `lib/analytics.js:39-50, 437, 646-660` |
| **A/B** | Propio, sin dependencias, asignación síncrona por hash. `active: false` → todos a `variants[0]` | `lib/experiments.js` |
| **Feature flags** | No hay sistema `FEATURES`. La convención del repo es un campo `activa`/`active` en el objeto de config (`PROMO_3X2.activa`, `EXPERIMENTS.*.active`) y `HIDDEN_SECTIONS` | `config/pricing.js`, `lib/experiments.js`, `config/site.js:292` |
| **Rutas de uso** | Existen `/calcos-termo`, `/calcos-notebook`, `/calcos-auto` (`config/landings.js`). **No** hay mate ni celular. `lib/usosPorTamano.js` dice 4 cm → celular, 6 cm → termo, notebook, mate. `lib/tamanoElegido.js` recuerda el tamaño de la grilla (`setTamano`) | — |
| **Otros diálogos** | `BuscadorModal` tiene `role="dialog" aria-modal="true"` y bloquea el scroll del `body`. El carrito lateral expone `drawerOpen` en el contexto. El menú del celular es estado local de `Header` sin marca en el DOM | `BuscadorModal.jsx:48`, `CartContext.jsx:584`, `Header.jsx:20` |
| **Barras fijas abajo** | WhatsApp abajo a la derecha (`z-40`), se eleva en `/producto/*` y `/personalizados` por las barras fijas del celular | `WhatsAppButton.jsx:21-31` |
| **Tests** | 40 archivos, **623 tests en verde** (25/9/2026). `cuponVentana.test.js` cubre la ventana; `promoPricing.test.js:1346` la paridad de `CUPONES_CON_VENTANA` | — |

### Problemas encontrados

1. El disparo no distingue dispositivo ni intención, y se evalúa una sola vez
   al montar la app: si la persona entra por `/checkout` y vuelve al catálogo,
   el popup ya no se arma en esa carga.
2. Frecuencia binaria y permanente. Cerrar y convertir son lo mismo.
3. El éxito cierra el popup sin llevar a ningún lado.
4. "Ya te lo dejamos aplicado en tu carrito" es falso: el carrito no lo muestra.
5. Aparece en secciones donde el 10% no aplica.
6. Sin `role="dialog"`, sin foco, sin Escape; la ✕ mide ~28 px.
7. `input-dark` tiene `font-size: 0.95rem` (15,2 px) y el viewport no limita el
   zoom: **iOS hace zoom al tocar el campo**. Afecta a todos los campos del
   sitio, checkout incluido (hallazgo fuera de scope).
8. El mismo EPICA10 llega por mail sin ventana, así que la ventana de 10 min
   solo alcanza al que no abre el mail.

### Comentarios que explican por qué algo está así

| Comentario | ¿Sigue vigente? |
|---|---|
| `WelcomePopup.jsx:14-24`: el fallback era 600 px de scroll y tapaba la grilla "justo en el momento de más intención de compra"; por eso pasó a exigir scroll profundo **y** tiempo | **Choca con el pedido** (12 s **o** 30%). Se respeta el pedido de Mariano, pero el riesgo que documenta ese comentario se mitiga con las reglas anti-interrupción (RF-7): no abre mientras escribe, busca, tiene el carrito abierto ni en los 3 s posteriores a agregar un producto. Si `popup_close` en `/categoria/*` sale alto, es la primera palanca a tocar. El comentario se reescribe con esta historia |
| `WelcomePopup.jsx:88-100`: la salida exige un `mousemove` previo porque algunos navegadores emiten un `mouseout` con `clientY 0` al cargar | **Vigente.** Se conserva tal cual. El pedido sugiere `mouseY <= 20`, pero eso dispararía al llevar el mouse al menú del header, que está pegado arriba |
| `WelcomePopup.jsx:41`: sin storage no se muestra | **Vigente** (RF-15) |
| `cuponVentana.js`: todo acceso a storage en `try/catch` por el navegador de Instagram | **Vigente.** El módulo nuevo sigue la misma regla |
| `CuponCountdown.jsx`: contador `aria-hidden` + anuncio `sr-only` | Vigente; solo se usa si la oferta tiene ventana |
| `experiments.js`: los experimentos son solo de presentación | Vigente: se testea cuándo aparece el popup, no un precio |

---

## 1. Arquitectura propuesta

```
App.jsx (sin cambios)
└─ <WelcomePopup />  ← orquestador chico, en el bundle principal
    ├─ usePopupDisparo()          arma tiempo/scroll/intención/salida, chequea bloqueos
    │    └─ lib/popupReglas.js    funciones puras: ¿puede abrir? ¿qué destino? (testeables)
    │    └─ lib/popupEstado.js    storage (local + sesión) con try/catch, memoria de respaldo,
    │                             suscripción (useSyncExternalStore) y migración de `seen`
    ├─ <AccesoBeneficio />        chip fijo abajo a la izquierda: "🎁 10% OFF" / "🎁 10% OFF activo"
    └─ lazy(<PopupDialogo />)     baja recién cuando el disparo se arma (a los 5 s)
         ├─ <PopupCaptura />      paso 1
         └─ <PopupExito />        paso 2 + selector de interés + CTA

lib/cuponVentana.js  emitirCupon(code, { conVentana })   ← mismo storage que ya lee el checkout
Checkout.jsx         SIN CAMBIOS: ya aplica solo el cupón guardado
CartDrawer / Cart    <CuponEnCarrito />: aviso + línea con el monto de pricedItems()
PaymentSuccess/Transfer  registrarCompra()  → popup y acceso apagados, cupón olvidado
BuscadorCalcos       registrarSenal('search')
Header               data-popup-bloqueo en el menú del celular abierto
```

### Estados del popup

Un solo `useReducer`, sin booleanos sueltos:

```
oculto ──abrir(disparo)──► captura ──enviar──► enviando ──ok──► exito
   ▲                          │  ▲                 │
   │                          │  └────error────────┘  (error: 'email' | 'servidor')
   └──────cerrar──────────────┴────────────────────── exito ──cerrar / navegar
```

- `captura` lleva `error: null | 'email' | 'servidor'` y conserva el mail.
- `exito` se puede abrir directo desde el acceso "10% OFF activo".
- "dismissed" y "converted" son **persistencia**, no estados de pantalla.

### Decisiones y alternativas descartadas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| El popup deja de arrancar la ventana (`emitirCupon(code, { conVentana: false })`) | Vaciar `CUPONES_CON_VENTANA` en los dos `pricing.js` | Con `emitidoEn` ausente, cliente y servidor **ya** tratan el cupón como sin ventana (`ventanaCuponAbierta`). Así no se toca el espejo de precios ni `cuponVentana.test.js`, y volver a la ventana es un valor de config. Los cupones ya guardados con su ventana siguen como se les prometió |
| Reusar `epicalcos.welcomeCoupon` y `lib/cuponVentana.js` | Clave nueva `epicalcos_discount_code` (como sugiere el pedido) | El checkout ya lee esa clave, con compatibilidad del formato viejo. Una segunda clave obliga a sincronizar dos fuentes de verdad del mismo cupón |
| Código y % salen de config (`POPUP_OFERTA.codigo` + `COUPONS[codigo].discount`) | Escribir "10%" y "EPICA10" en el JSX | Pedido §9 y RF-19. Test de paridad con el código que devuelve `capture-lead` |
| El chip fijo chico como "barra" del beneficio | Barra de ancho completo arriba | A 375 px el header ya tiene `PromoBanner` + `AnnouncementBar`: una tercera barra empuja el contenido y, al aparecer después de convertir, mueve el layout (CLS). El chip no mueve nada y se puede tocar para volver al paso 2 |
| El monto en el carrito sale de `pricedItems()` con el mismo medio y cupón que usa el checkout | Calcular 10% del subtotal | EPICA10 solo alcanza calcos sueltas, se acumula con 3x2 y transferencia con tope. Un cálculo propio **simularía** el descuento (pedido §17). `pricedItems` es la función que el checkout ya usa y que el servidor espeja |
| Guardia de identidad en el carrito: si Σ `pricedItems('mercadopago', '', null)` no es igual al Total que el carrito ya muestra, no se muestran números | Confiar en que coinciden | El carrito arma su total con `subtotal − promoSavings`, el checkout con `pricedItems`. Si alguna vez divergen, preferimos un aviso sin monto a un resumen que no cierra (RF-36) |
| Lógica de decisión en funciones puras (`lib/popupReglas.js`) | Todo dentro del hook | El repo no tiene tests de componentes. Así cooldowns, rutas, destinos y migración quedan testeados con Vitest en `node` |
| El diálogo en un chunk `lazy()` | Todo en el bundle principal | El popup nunca aparece antes de 5 s: no tiene sentido que su UI pese en el LCP del Home |
| Detección de "otro diálogo" por DOM (`[aria-modal="true"]`, `[data-popup-bloqueo]`) + `drawerOpen` | Un registro global de bloqueos que cada componente actualice | Cubre el buscador sin tocarlo y solo agrega un atributo al menú del header. Cualquier diálogo futuro con `aria-modal` queda cubierto solo |
| Intención por ruta (`/producto/*`, `/categoria/*`) + una línea en el buscador | Llamar `registrarSenal` desde `Producto.jsx` y `Category.jsx` | Leer el `pathname` desde el orquestador no toca esas páginas. La búsqueda no cambia la ruta, así que ahí sí hace falta una línea |
| `generate_lead` es la conversión; no hay `popup_conversion` | Evento nuevo | Regla del pedido: no duplicar. `generate_lead` ya alimenta el `Lead` de Meta |
| Kill switch `POPUP_CONFIG.activo` | Objeto `FEATURES` nuevo | El repo ya usa `activa`/`active` por objeto de config (pedido §34: integrarse al sistema existente) |
| A/B como entrada `popup_disparo` en `EXPERIMENTS` con `active: false` | Lógica de variantes propia del popup | Reusa asignación, override por URL (`?exp_popup_disparo=a_8s`) y kill switch |
| La exposición del A/B se reporta cuando la persona **queda elegible** (el disparo se arma), no al ver el popup | Reportarla en `popup_view` | En un test de disparo la variante decide **si** se ve el popup. Contar solo a quien lo vio sesga el denominador |
| Foco al título al abrir | Foco al campo de mail | En celular, enfocar el campo abre el teclado sin que la persona lo pida |
| Popup arriba en celular (`items-start`, con margen), centrado desde `sm` | Bottom sheet | En iOS el teclado tapa lo que está anclado abajo; arriba, el botón queda visible con el teclado abierto (RNF-2) |

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/components/WelcomePopup.jsx` | Se reescribe como orquestador: `usePopupDisparo`, `AccesoBeneficio`, `lazy(PopupDialogo)`, migración. Mantiene nombre y export (lo importa solo `App.jsx`) | 🟡 1 importador |
| `frontend/src/lib/cuponVentana.js` | `emitirCupon(code, { conVentana = true } = {})`: con `false` guarda `emitidoEn: null`. El default deja igual a cualquier otro llamador | 🟢 3 importadores, cambio aditivo |
| `frontend/src/lib/analytics.js` | `trackPopupView`, `trackPopupClose`, `trackPopupEmailSubmit`, `trackPopupInterestSelected`, `trackPopupCtaClick`, `setPopupUserProperties`; `trackLeadCapture(source, extra = {})` | 🟡 compartido (44 archivos), solo adición |
| `frontend/src/lib/experiments.js` | Entrada `popup_disparo` con `active: false` | 🟢 |
| `frontend/src/components/BuscadorCalcos.jsx` | `registrarSenal('search')` junto a cada `trackSearch` | 🟢 |
| `frontend/src/components/Header.jsx` | `data-popup-bloqueo` en el contenedor del menú del celular cuando `open` | 🟢 un atributo |
| `frontend/src/components/CartDrawer.jsx` | `useCuponEnCarrito()` + `<CuponEnCarritoLinea>` arriba del Total; el Total usa el total con cupón cuando corresponde | 🟡 pantalla más vista de la compra |
| `frontend/src/routes/Cart.jsx` | Lo mismo en el resumen, incluida la caja "Con transferencia" | 🟡 |
| `frontend/src/routes/PaymentSuccess.jsx`, `PaymentTransfer.jsx` | `registrarCompra()` al montar | 🟢 |
| `netlify/functions/capture-lead.js` | `export const WELCOME_COUPON_CODE` (para el test de paridad). El contrato no cambia | 🟢 |
| `frontend/src/services/leadService.js` | `err.status` en el error que tira y timeout de 10 s con `AbortController` | 🟢 1 importador |

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/config/popup.js` | `POPUP_CONFIG`, `POPUP_VARIANTES`, `POPUP_OFERTA`, `INTERESES`, `RUTAS_FLUJO_COMPRA`, `RUTAS_SIN_DESCUENTO` |
| `frontend/src/lib/popupReglas.js` | Puras: `rutaPermitida`, `puedeAbrirSolo`, `disparoCumplido`, `porcentajeScroll`, `destinoInteres`, `destinoCta`, `tipoVisitante`, `migrarEstadoViejo` |
| `frontend/src/lib/popupEstado.js` | Lectura/escritura de `epicalcos.popup.v1` (local) y `epicalcos.popup.sesion.v1` (sesión) con `try/catch` y copia en memoria; `registrarVisto/Cerrado/Convertido/Compra`, `registrarSenal`; `suscribir` + `usePopupEstado()` |
| `frontend/src/components/popup/usePopupDisparo.js` | Listeners (scroll con `rAF`, timer, `mouseout`), sondeo de bloqueos cada 1 s, gracia de 3 s, una sola apertura |
| `frontend/src/components/popup/PopupDialogo.jsx` | Cáscara del diálogo: `role="dialog"`, `aria-modal`, foco, trampa de Tab, Escape, bloqueo de scroll, devolución de foco |
| `frontend/src/components/popup/PopupCaptura.jsx` | Paso 1 |
| `frontend/src/components/popup/PopupExito.jsx` | Paso 2: código + Copiar, selector de interés, CTA, link a pagar |
| `frontend/src/components/popup/AccesoBeneficio.jsx` | Chip fijo abajo a la izquierda, 44 px, elevado donde se eleva WhatsApp |
| `frontend/src/components/popup/CuponEnCarrito.jsx` | `useCuponEnCarrito(totales)` + `CuponEnCarritoLinea` |
| `frontend/src/lib/popupReglas.test.js` | Ver §9 |
| `frontend/src/lib/popupEstado.test.js` | Ver §9 |

### Lo que **no** se toca

`Checkout.jsx`, `CartContext.jsx`, `config/pricing.js`, `netlify/functions/lib/pricing.js`,
`config/site.js`, `App.jsx`, `Home.jsx`, `CuponCountdown.jsx`, `notify.js`, `_notion.js`.

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **no** (solo se lee `COUPONS`) | 50 archivos |
| `frontend/src/config/site.js` | no | 48 archivos |
| `frontend/src/context/CartContext.jsx` | **no** (se consume `pricedItems`, `items`, `drawerOpen`) | 30 archivos |
| `netlify/functions/lib/pricing.js` | **no** | `create-preference`, `create-order-transfer` y 4 tests |
| `frontend/src/lib/analytics.js` | **sí**, solo adición. `trackLeadCapture` gana un 2º parámetro opcional: su único otro llamador es `FormularioContacto.jsx` (`'contacto_form'`), que no lo pasa y queda igual | 44 archivos |

```bash
grep -rln "config/pricing\|context/CartContext\|lib/analytics\|config/site\|lib/cuponVentana" frontend/src netlify | wc -l
grep -rn "trackLeadCapture" frontend/src
```

---

## 3. Datos

### Configuración

```js
// frontend/src/config/popup.js
export const POPUP_CONFIG = {
  /** Interruptor: false → sin apertura automática ni acceso manual. El cupón ya activo sigue. */
  activo: true,
  escritorio: { demoraMs: 12_000, scrollPct: 30 },
  movil: { demoraMs: 15_000, scrollPct: 50 },
  intencion: { productosVistos: 2, busqueda: true, categoria: true },
  salida: { activa: true, minMsEnSitio: 5_000 },   // solo con puntero fino
  minMsEnPagina: 5_000,        // RF-5: nada abre antes
  graciaMs: 3_000,             // RF-7: espera después de un bloqueo
  sondeoMs: 1_000,
  timeoutEnvioMs: 10_000,      // RF-21
  cooldownCerradoDias: 7,
  cooldownConvertidoDias: 30
};

/** variants[0] = control = producción. Solo cambia CUÁNDO, nunca la oferta. */
export const POPUP_VARIANTES = {
  b_12s:    { escritorio: { demoraMs: 12_000, scrollPct: 30 }, movil: { demoraMs: 15_000, scrollPct: 50 } },
  a_8s:     { escritorio: { demoraMs: 8_000,  scrollPct: 30 }, movil: { demoraMs: 8_000,  scrollPct: 50 } },
  c_scroll: { escritorio: { demoraMs: null,   scrollPct: 30 }, movil: { demoraMs: null,   scrollPct: 50 } }
};

/** Lo que ofrece el popup. `tipo` solo describe el texto: el precio lo decide COUPONS. */
export const POPUP_OFERTA = {
  tipo: 'porcentaje',      // futuro: 'monto' | 'monto_con_minimo' (requiere spec de precios)
  codigo: 'EPICA10',       // debe existir en COUPONS de los dos lados (test)
  ventanaMs: null          // P-2. 10 * 60 * 1000 devuelve el comportamiento de la spec 017
};

export const INTERESES = [
  { id: 'mate',     emoji: '🧉', label: 'Mate',     to: '/calcos-termo' },
  { id: 'termo',    emoji: '☕', label: 'Termo',    to: '/calcos-termo' },
  { id: 'notebook', emoji: '💻', label: 'Notebook', to: '/calcos-notebook' },
  { id: 'celular',  emoji: '📱', label: 'Celular',  to: '/categorias', tamano: '4cm' }
];

export const RUTAS_FLUJO_COMPRA = ['/carrito', '/checkout', '/pago-exitoso',
  '/pago-transferencia', '/pago-pendiente', '/pago-error'];
export const RUTAS_SIN_DESCUENTO = ['/personalizados', '/mayorista', '/negocio',
  '/polaroid', '/tatuajes', '/archivos-imprimibles', '/armar-pack'];
```

```js
// frontend/src/lib/experiments.js — EXPERIMENTS
popup_disparo: {
  active: false,
  variants: ['b_12s', 'a_8s', 'c_scroll'],
  descripcion: 'Popup: 12 s (control) vs 8 s vs solo scroll/intención'
}
```

### Persistencia

| Dónde | Clave | Forma | Vida |
|---|---|---|---|
| `localStorage` | `epicalcos.popup.v1` **(nueva)** | `{ primeraVisitaEn, vistoEn, cerradoEn, convertidoEn, compradoEn }` (timestamps o `null`) | permanente |
| `sessionStorage` | `epicalcos.popup.sesion.v1` **(nueva)** | `{ inicioEn, autoAbierto, productos: string[], busqueda, categoria, visitante: 'new'\|'returning' }` | la pestaña |
| `localStorage` | `epicalcos.welcomeCoupon` (existente) | `{ code, emitidoEn }`; con `ventanaMs: null` → `emitidoEn: null` | hasta la compra (P-3) |
| `localStorage` | `epicalcos.welcomePopup.seen` (existente) | se **lee** para migrar, no se borra (ver §8) | — |
| `localStorage` | `epicalcos.tamano.v1` (existente) | `'4cm'` al elegir Celular | — |

`productos` guarda slugs de ruta (`/producto/:slug/:num`), sin PII. Se guardan
hasta 2 distintos: con eso alcanza para decidir.

### Reglas en funciones puras

```js
// lib/popupReglas.js — firmas
rutaPermitida(pathname) → boolean               // fuera de FLUJO_COMPRA y SIN_DESCUENTO
puedeAbrirSolo({ estado, sesion, cuponActivo, storageOk, ahora }) → boolean
  // !storageOk → false · sesion.autoAbierto → false · compradoEn → false · cuponActivo → false
  // convertidoEn + 30 d > ahora → false · max(cerradoEn, vistoEn) + 7 d > ahora → false
disparoCumplido({ variante, esMovil, msEnSitio, msEnPagina, scrollPct, sesion, salida }) → null | 'time' | 'scroll' | 'product_views' | 'search' | 'category' | 'exit_intent'
  // msEnPagina < minMsEnPagina → null siempre (RF-5)
porcentajeScroll({ scrollY, alto, altoVentana }) → number | null   // null si la página no scrollea
destinoInteres(interesId) → { to, tamano? }
destinoCta(pathname) → 'catalog' | 'stay'       // stay en /categoria/*, /producto/*, landings de uso, /categorias
tipoVisitante(estado, sesion) → 'new' | 'returning'
migrarEstadoViejo({ seen, cupon, ahora }) → estado | null
```

`bloqueado()` vive en el hook porque mira el DOM:

```js
const el = document.activeElement;
const escribiendo = el?.matches?.('input, textarea, select, [contenteditable="true"]');
const dialogo = document.querySelector('[aria-modal="true"], [data-popup-bloqueo]');
return escribiendo || dialogo || drawerOpen || document.visibilityState !== 'visible'
  || ahora - ultimoCambioCarrito < POPUP_CONFIG.graciaMs;
```

Cuando `bloqueado()` pasa a `false`, se exige que siga así `graciaMs` antes de
abrir.

---

## 4. APIs

| Endpoint | Method | Cambio |
|---|---|---|
| `/api/capture-lead` | POST | **Ninguno en el contrato.** Solo se exporta `WELCOME_COUPON_CODE` |
| `/api/create-preference` | POST | ninguno |
| `/api/create-order-transfer` | POST | ninguno (con P-2, `couponIssuedAt` llega `null` para el EPICA10 del popup, caso que el servidor ya acepta) |

Contrato que el cliente interpreta:

```js
// Request
{ email: 'x@y.com' }
// 200 → { ok: true, code: 'EPICA10' }       → paso 2
// 400 → { error: 'email_invalid' }            → "Ingresá un email válido."
// otro / red / 10 s sin respuesta              → "No pudimos activar el descuento. Intentá nuevamente."
```

`leadService.captureLead` hoy tira un `Error` con el status solo dentro del
texto. Se le agrega `err.status` (aditivo) para que el popup distinga el 400, y
el timeout con `AbortController` dentro del mismo servicio.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago | ninguno | no |
| Notion | ninguno. Sigue creando una fila por envío (quien vuelve a dejar el mail después de 7 o 30 días crea otra, como hoy desde otro dispositivo) | no |
| Resend | ninguno: el mail con el código sigue saliendo | no |
| Cloudinary | ninguno | no |
| Meta (Pixel / CAPI) | ninguno: `Lead` sale igual desde `trackLeadCapture` | no |
| CRM interno | ninguno | no |
| GA4 | eventos y propiedades nuevas. **Mariano** registra las dimensiones personalizadas | no: todo en `try/catch` |

### Variables de entorno nuevas
Ninguna.

---

## 6. Seguridad

- [x] Ningún secreto en el frontend
- [x] El servidor no confía en el cliente: el % sigue saliendo de `COUPONS` del
      servidor; con P-2, que el cliente no mande `couponIssuedAt` no le da nada
      que no tenga hoy tipeando el código
- [x] Sin endpoint nuevo
- [x] Sin PII en `dataLayer`: `page_path` es `location.pathname`, sin query
- [x] El mail no se guarda en el navegador (solo viaja al endpoint)
- [x] CSP: sin scripts ni orígenes nuevos

| Riesgo | Mitigación |
|---|---|
| Alguien edita `epicalcos.popup.v1` para ver el popup de nuevo | Sin costo: el cupón ya se puede escribir a mano |
| Con P-2, un EPICA10 sin vencimiento en el navegador | Se olvida después de comprar (P-3). El código ya circulaba sin ventana por mail |
| Margen: más pedidos con 10% encima del 3x2 | Se mide con `cupon_aplicado_en_promo`; el tope del 20% no cambia |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Storage bloqueado | `popupEstado` trabaja en memoria; `puedeAbrirSolo` da `false` | Nada automático; el acceso manual abre el popup si lo toca |
| Falla de red al enviar | `catch` → `captura` con `error: 'servidor'` | "No pudimos activar el descuento. Intentá nuevamente." con el mail escrito |
| 10 s sin respuesta | `AbortController` corta → igual que red | ídem |
| 400 `email_invalid` | `captura` con `error: 'email'` | "Ingresá un email válido." |
| Falla el chunk lazy del diálogo | `catch` del `import()`: no se abre y **no** se marca como visto | Nada |
| `navigator.clipboard` no existe o rechaza | `try/catch` → selecciona el texto del código | "Seleccionado: copialo con el menú" |
| El tracking tira | `pushDataLayer` ya envuelve en `try/catch` | Nada |
| Guardia de identidad del carrito falla | `CuponEnCarrito` muestra solo el aviso | "🎁 Tu 10% OFF está activo. Se aplica en el checkout." |

---

## 8. Estrategia de migración

- **`epicalcos.welcomePopup.seen = '1'` sin `epicalcos.popup.v1`**: en la
  primera carga después del deploy se crea el estado nuevo:
  - con `epicalcos.welcomeCoupon` guardado → `convertidoEn = ahora`
  - sin cupón → `cerradoEn = ahora` (elegible de nuevo en 7 días)
  - La clave vieja **no se borra**: si se revierte el deploy, el popup viejo la
    sigue respetando.
- **Cupones guardados con `emitidoEn`**: quedan como están. Si la ventana ya se
  cerró, siguen cerrados (se les prometió eso). El acceso manual les ofrece
  activarlo de nuevo, y el nuevo se emite sin ventana.
- **Carritos guardados**: no cambian.
- **Pedidos en Blobs**: no cambian.
- **Visitantes con el bundle viejo abierto**: siguen con el popup viejo hasta
  recargar; el endpoint responde igual.
- **Primera sesión después del deploy**: todos cuentan como `new` en
  `new_vs_returning`, porque `primeraVisitaEn` todavía no existe. El sesgo se
  diluye en días; se anota en `docs/analytics.md`.

---

## 9. Tests

`frontend/src/lib/popupReglas.test.js`
- `rutaPermitida`: falso en las 6 rutas del flujo de compra y las 7 sin descuento; verdadero en `/`, `/categorias`, `/categoria/boca`, `/producto/boca/3`, `/calcos-termo`
- `puedeAbrirSolo`: storage bloqueado, ya abierto en la sesión, comprado, cupón activo, cerrado hace 6 d (no) y 8 d (sí), visto sin cerrar hace 6 d (no), convertido hace 29 d (no) y 31 d (sí)
- `disparoCumplido`: nada antes de 5 s en la página aunque se cumpla todo; 12 s compu / 15 s celular; 30% / 50%; 2 productos distintos (el mismo dos veces no); categoría de entrada no cuenta; `c_scroll` no dispara por tiempo; salida solo en compu y con ≥ 5 s en el sitio
- `porcentajeScroll`: página sin scroll → `null`
- `destinoInteres`: los 4 destinos existen como ruta en `App.jsx` o en `LANDING_SLUGS`; `celular` trae `tamano: '4cm'` y ese id existe en `SIZES`
- `destinoCta`: `stay` en catálogo/ficha/landing, `catalog` en `/` y `/contacto`
- `migrarEstadoViejo`: `seen` + cupón → convertido; `seen` sin cupón → cerrado; sin `seen` → `null`
- **Paridad**: `POPUP_OFERTA.codigo === WELCOME_COUPON_CODE` (de `capture-lead.js`), existe en `COUPONS` del front y del servidor, y el % que muestra el copy es `COUPONS[codigo].discount * 100`
- `POPUP_VARIANTES` tiene exactamente las variantes de `EXPERIMENTS.popup_disparo`, con `variants[0] === 'b_12s'` igual a `POPUP_CONFIG`

`frontend/src/lib/popupEstado.test.js`
- con `localStorage` simulado (mismo patrón que `cuponVentana.test.js`): registrar visto/cerrado/convertido/compra persiste; storage que tira no rompe y queda en memoria; `registrarCompra` borra `epicalcos.welcomeCoupon`
- `emitirCupon(code, { conVentana: false })` guarda `emitidoEn: null` y `msRestantes` da `Infinity`

Manual (acceptance): disparos reales, teclado en iPhone y Android, foco y
lector de pantalla, carrito con y sin productos elegibles.

---

## 10. Medición después del deploy

| Semana | Mirar | Decisión |
|---|---|---|
| 1 | `popup_view` por `popup_trigger` y `device_type`; `popup_close / popup_view` | Si el cierre en celular supera el 85%, revisar el 15 s / 50% |
| 1 | `popup_email_submit − generate_lead` | Si falla más del 5%, hay un problema de red o del endpoint |
| 2-4 | Revenue por sesión y CVR de sesiones con `popup_converted` vs sin | El dato que decide si el popup suma |
| 4 | Con volumen suficiente, prender `popup_disparo` | Ver `docs/CRO-EXPERIMENTS.md` para el tamaño de muestra |
