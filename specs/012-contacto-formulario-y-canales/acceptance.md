# Acceptance — Contacto: formulario + canales (WhatsApp e Instagram)

| | |
|---|---|
| **Spec** | `012-contacto-formulario-y-canales` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 25/08/2026 |
| **Resultado** | ✅ aceptada — con 6 criterios que **solo se pueden verificar en producción** (marcados 🕓) |

> **Este documento determina cuándo la feature está terminada.**

---

## Cómo se valida

Al terminar la implementación se recorre punto por punto y se reporta el
resultado **real** (`CLAUDE.md` regla 15). **No se marca ✅ nada que no se haya
verificado.**

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | `/contacto` muestra formulario, WhatsApp e Instagram. No hay una card suelta de "Email" | Abrir la página | ✅ |
| AC-2 *(RF-2, RF-5)* | El formulario pide nombre y apellido, mail, teléfono, ciudad, provincia y consulta, en ese orden; la provincia es un `<select>` con las 24 provincias del checkout | Contar los campos y abrir el select | ✅ |
| AC-3 *(RF-3, RF-4)* | Enviar el formulario vacío marca los campos vacíos y **no dispara ninguna request** | Enviar vacío con Network abierto | ⚠️ **marca 5, no 6** — ver nota |
| AC-4 *(RF-6)* | Enviando *(Juan Pérez / juan@gmail.com / 3416806675 / Rosario / Santa Fe / "Quiero 200 calcos con mi logo")*, llega a `epicalcos@gmail.com` un mail con **los seis datos** | Enviar y abrir la casilla | 🕓 |
| AC-5 *(RF-6)* | Al apretar **Responder** en ese mail, el destinatario es `juan@gmail.com`, no `onboarding@resend.dev` | Responder desde Gmail y mirar el "Para" | 🟡 |
| AC-6 *(RF-7)* | Con `juan@gmail` el error aparece **junto al campo mail**, no como cartel general, y los otros campos no se marcan | Tipear y enviar | ✅ |
| AC-7 *(RF-8)* | Enviado con éxito, la pantalla confirma y promete **"Te respondemos en el día"** | Enviar y mirar | ✅ |
| AC-8 *(RF-8)* | Doble click en Enviar dispara **una sola** request a `/api/contacto` | Network del navegador | ✅ |
| AC-9 *(RF-9)* | Con la red cortada, aparece un error accionable **y un botón a WhatsApp**; los datos tipeados no se pierden | DevTools → Offline → Enviar | ✅ |
| AC-10 *(RF-10)* | La card de WhatsApp abre el chat de `+54 9 341 680-6675` con *"Hola! Quiero hacer una consulta sobre calcos"* ya escrito | Probar en un teléfono real (Android e iOS) | 🟡 |
| AC-11 *(RF-11)* | La consulta aparece como lead en el CRM interno, con contexto `Formulario de contacto` | Abrir el CRM | 🕓 |
| AC-12 *(RF-12)* | La card de Instagram muestra **3 fotos reales** de la cuenta y cada una abre su publicación | Abrir la página y tocar las 3 | ✅ |
| AC-15 *(RF-12)* | Si una imagen no carga, esa celda se oculta; si fallan las tres, queda el CTA al perfil y la página no se rompe | Bloquear `/images/instagram/*` en DevTools | ✅ |
| AC-13 *(RF-13)* | Un POST con el honeypot `website` lleno responde `200` y **no llega ningún mail** | `curl` + revisar la casilla | ✅ |
| AC-14 *(RF-14)* | La página sigue aclarando que la compra se cierra en la tienda | Leer la página | ✅ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px no hay scroll horizontal y todos los campos y botones miden ≥ 44 px | DevTools, iPhone SE | ✅ |
| ANF-2 | **Performance** — la ruta no agrega scripts bloqueantes; si hay algo de terceros, carga diferido y solo en `/contacto` | Lighthouse en `/contacto` + Network | 🟡 |
| ANF-3 | **Accesibilidad** — cada campo con `<label>`, errores asociados al campo, foco visible, navegable con Tab; el honeypot **no** entra en el orden de tabulación | Recorrido con teclado | ✅ |
| ANF-4 | **Compatibilidad** — un carrito guardado antes del cambio sigue funcionando | `localStorage` con datos viejos | ✅ |
| ANF-5 | **Sin dependencias nuevas** | `git diff package.json frontend/package.json` está vacío | ✅ |
| ANF-6 | **Sin secretos en el bundle** | `grep -ri "resend\|re_" frontend/dist` no encuentra la key | ✅ |
| ANF-7 | **Privacidad** — no hay PII en `dataLayer` ni en los logs de la Function | `window.dataLayer` + logs de Netlify | ✅ |
| ANF-8 | **Navegador embebido de Instagram** — el formulario se envía igual desde ahí | Abrir el link desde una historia | 🕓 |
| ANF-9 | **Peso de la grilla** — las 3 `webp` suman menos de 150 KB y cargan `lazy` | `du -ch frontend/public/images/instagram/*.webp` + Network | ✅ |
| ANF-10 | **Sin terceros nuevos** — la página no pide nada a `instagram.com` ni a ningún CDN externo al cargar | Network con filtro por dominio | ✅ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Campo vacío | Error junto al campo, sin request | ✅ |
| `juan@gmail` | Error de mail | ✅ |
| Teléfono `+54 9 341 680-6675` | **Válido** | ✅ |
| Teléfono `1234` | Inválido | ✅ |
| Consulta de 10.000 caracteres | Se corta en 2.000 y el contador lo avisa antes | ✅ `maxLength` en el campo + `slice` en el servidor |
| Consulta de 3 caracteres (`"hola"`) | Inválida | ✅ |
| Doble click en Enviar | Una sola request | ✅ **fallaba** — ver §Defectos |
| Resend caído | `502` + error con WhatsApp | ✅ |
| CRM caído, mail OK | `200`: la consulta llegó | ✅ por código; el CRM real no está configurado en local |
| Bot con el honeypot lleno | Descartado, sin mail | ✅ |
| Una imagen de la grilla no carga | Esa celda se oculta; las otras quedan | ✅ |
| No carga ninguna imagen de la grilla | Queda el CTA al perfil; la página no se rompe | ✅ |
| Sin conexión | Error accionable, no queda colgado | ✅ |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Los 258 tests existentes siguen pasando | ✅ |
| REG-2 | Se puede completar una compra por **Mercado Pago** de punta a punta | 🕓 |
| REG-3 | Se puede completar una compra por **transferencia** de punta a punta | 🕓 |
| REG-4 | El envío se calcula bien en las tres zonas | ✅ |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ✅ |
| REG-6 | El carrito sobrevive al refresh | ✅ |
| REG-7 | El `purchase` se dispara una sola vez | ✅ |
| REG-8 | El `value` del `purchase` es lo que se pagó | ✅ |
| REG-9 | El **botón flotante** de WhatsApp sigue igual en todas las páginas | ✅ |
| REG-10 | El popup de bienvenida sigue capturando leads (comparte Resend y CRM) | ✅ |
| REG-11 | El mail de pedido y el de carrito abandonado siguen saliendo (comparten `notify.js`) | ✅ |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `generate_lead` | El formulario se envió con éxito | `lead_source: 'contacto_form'` | ✅ |
| `contacto_form_error` | El envío falló | `motivo` ∈ {`validacion`, `red`, `servidor`} | ✅ verificados `validacion` y `servidor` |
| `whatsapp_click` | Click en la card de WhatsApp | `whatsapp_context: 'contacto_card'` | ✅ (+ `contacto_form_error` y `contacto_form_ok`, agregados durante la implementación) |
| `instagram_click` | Click en la card de Instagram | `instagram_context`: `contacto_grilla` / `contacto_cta` | ✅ |

**Verificación**
```js
window.dataLayer.filter(e => ['generate_lead','contacto_form_error','whatsapp_click','instagram_click'].includes(e.event))
```
- [ ] 🕓 GA4 DebugView los recibe — se confirma con el sitio publicado
- [ ] 🕓 Meta → Administrador de eventos recibe el `Lead` — idem
- [x] ✅ **No viaja PII** en ninguno — verificado buscando nombre, mail, teléfono, ciudad y texto de la consulta en el `dataLayer` entero: 0 coincidencias

---

## 6. ⚠️ Paridad de precios

⏭️ **No aplica**: la feature no toca precios, promos, cupones ni envíos.
`promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js` igual
tienen que seguir en verde (REG-1).

---

## Definition of Done

### Código
- [x] Criterios de §1, §2 y §3 verificados (6 quedan 🕓: necesitan producción)
- [x] Regresión (§4) verificada salvo las dos compras de punta a punta (🕓)
- [x] `npm test` en verde — **295 tests** (258 previos + 37 nuevos)
- [x] Sin dependencias nuevas — `package.json` sin cambios
- [x] Sin refactors fuera de scope — los cambios a módulos compartidos son solo agregados
- [x] Comentarios que explican el **por qué**

### Seguridad
- [x] Ningún secreto en el bundle — `grep` sobre `frontend/dist`: 0 coincidencias
- [x] El servidor revalida los seis campos — probado con el handler real
- [x] Sin PII en logs, URLs ni `dataLayer` — el endpoint loguea nombres de campo, nunca valores
- [x] CORS restringido a los orígenes propios

### Documentación
- [x] `docs/architecture.md` con `/api/contacto` + los scripts manuales
- [x] `docs/integrations.md` con el uso nuevo de Resend
- [x] `docs/analytics.md` con los eventos nuevos

### Proceso
- [x] `tasks.md` con todos los pasos marcados
- [x] Hallazgos fuera de scope reportados
- [x] Este documento recorrido punto por punto
- [x] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: 25/08/2026
**Ejecutada por**: Claude, sobre el dev server + el handler real de la Function

| | Cantidad |
|---|---|
| ✅ Cumple, verificado | 30 |
| 🟡 Cumple parcialmente (lo verificable, verificado) | 3 |
| ⚠️ Se cumple distinto a como estaba escrito | 1 |
| 🕓 No verificable sin producción | 6 |
| ❌ No cumple | 0 |
| ⏭️ No aplica | 7 *(§6 entera: no toca precios)* |

### 🕓 Lo que NO se pudo verificar acá, y por qué

Ninguno de estos es un problema conocido: es que **no hay forma de probarlos sin
el sitio publicado**. Van todos a la checklist de después del deploy.

| ID | Qué falta | Qué SÍ se verificó |
|---|---|---|
| AC-4 | Que el mail **llegue** a `epicalcos@gmail.com` | El handler real arma y manda el payload correcto a Resend, con los seis datos |
| AC-11 | Que la consulta aparezca en el CRM | El código llama a `notifyCrmLead` con el contexto correcto; en local el CRM no está configurado (es no-op a propósito) |
| ANF-8 | El formulario dentro del navegador embebido de Instagram | Que no depende de `mailto:` ni de abrir otra app — que era la causa del problema |
| REG-2, REG-3 | Compra completa por MP y por transferencia | Nada del checkout se tocó; los 71 tests de `promoPricing` y los 11 de `envio` siguen en verde |
| GA4 / Meta | Que los eventos lleguen a los paneles | Que se disparan, con los parámetros correctos y **sin PII** |

### 🟡 Cumple parcialmente

| ID | Qué se verificó | Qué queda |
|---|---|---|
| AC-5 | El payload lleva `reply_to: juan@gmail.com` | Apretar "Responder" en Gmail sobre el mail real |
| AC-10 | El `href` es `wa.me/5493416806675?text=Hola!%20Quiero%20hacer%20una%20consulta%20sobre%20calcos` y dispara `whatsapp_click` | Abrirlo en un teléfono Android y en un iPhone |
| ANF-2 | Ruta `lazy()` (chunk propio de 15 KB / 5,8 KB gzip), cero scripts nuevos, cero pedidos a terceros al cargar | Lighthouse antes/después |

### ⚠️ Un criterio se cumple distinto a como estaba escrito

**AC-3** decía *"marca los seis campos"*. Marca **cinco**: `provincia` es un
`<select>` que arranca en "Santa Fe", así que por la UI nunca puede estar vacía.
Es deliberado y es lo que ya hace `CheckoutForm` — preseleccionar la provincia
más común es una decisión de conversión que el repo ya había tomado, y obligar a
elegirla agregaría un paso (RNF-4).

La regla igual existe y se verifica: el servidor rechaza `provincia` vacía
(probado: un POST con el body vacío devuelve los **seis** campos), y el test
unitario cubre los seis. Lo que cambia es el criterio, no el comportamiento.

### 🐞 Defectos encontrados durante la validación y corregidos

Los dos salieron de esta validación, no de la revisión del código:

1. **`CardInstagram` se renderizaba dos veces.** El layout la montaba con
   `hidden lg:block` y con `lg:hidden`: las dos quedan en el DOM, así que había
   **6 imágenes y dos `<h2>Instagram</h2>`** con todos los links duplicados para
   un lector de pantalla y para Google. Se resolvió ubicando con
   `col-start`/`row-start` en vez de duplicar.
2. **Doble click = dos consultas enviadas.** El guard era `if (estado ===
   'enviando')`, y `setEstado` no se aplica hasta el próximo render: cinco
   clicks disparaban **cinco requests**. Con un click humano casi siempre daba
   tiempo a renderizar — "casi siempre" acá significa que un doble tap en un
   celular lento le duplicaba la consulta a Mariano. Se cambió por un candado
   `useRef`, que es sincrónico. Reverificado: 5 clicks → **1 request**.

### Notas

- Se agregaron **dos contextos de `whatsapp_click` que no estaban en la spec**
  (`contacto_form_ok` y `contacto_form_error`). El del error importa: es la
  persona a la que se le rompió el formulario, y sin ese evento no hay forma de
  saber si logró escaparse a WhatsApp o si la consulta se perdió.
- Las 3 imágenes de la grilla pesan **60 KB** en total (el presupuesto era 150).
