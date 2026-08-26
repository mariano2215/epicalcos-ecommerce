# Acceptance — Contacto: formulario + canales (WhatsApp e Instagram)

| | |
|---|---|
| **Spec** | `012-contacto-formulario-y-canales` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | — |
| **Resultado** | ⬜ pendiente |

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
| AC-1 *(RF-1)* | `/contacto` muestra formulario, WhatsApp e Instagram. No hay una card suelta de "Email" | Abrir la página | ⬜ |
| AC-2 *(RF-2, RF-5)* | El formulario pide nombre y apellido, mail, teléfono, ciudad, provincia y consulta, en ese orden; la provincia es un `<select>` con las 24 provincias del checkout | Contar los campos y abrir el select | ⬜ |
| AC-3 *(RF-3, RF-4)* | Enviar el formulario vacío marca **los seis** campos y no dispara ninguna request | Enviar vacío con Network abierto | ⬜ |
| AC-4 *(RF-6)* | Enviando *(Juan Pérez / juan@gmail.com / 3416806675 / Rosario / Santa Fe / "Quiero 200 calcos con mi logo")*, llega a `epicalcos@gmail.com` un mail con **los seis datos** | Enviar y abrir la casilla | ⬜ |
| AC-5 *(RF-6)* | Al apretar **Responder** en ese mail, el destinatario es `juan@gmail.com`, no `onboarding@resend.dev` | Responder desde Gmail y mirar el "Para" | ⬜ |
| AC-6 *(RF-7)* | Con `juan@gmail` el error aparece **junto al campo mail**, no como cartel general, y los otros campos no se marcan | Tipear y enviar | ⬜ |
| AC-7 *(RF-8)* | Enviado con éxito, la pantalla confirma y promete **"Te respondemos en el día"** | Enviar y mirar | ⬜ |
| AC-8 *(RF-8)* | Doble click en Enviar dispara **una sola** request a `/api/contacto` | Network del navegador | ⬜ |
| AC-9 *(RF-9)* | Con la red cortada, aparece un error accionable **y un botón a WhatsApp**; los datos tipeados no se pierden | DevTools → Offline → Enviar | ⬜ |
| AC-10 *(RF-10)* | La card de WhatsApp abre el chat de `+54 9 341 680-6675` con *"Hola! Quiero hacer una consulta sobre calcos"* ya escrito | Probar en un teléfono real (Android e iOS) | ⬜ |
| AC-11 *(RF-11)* | La consulta aparece como lead en el CRM interno, con contexto `Formulario de contacto` | Abrir el CRM | ⬜ |
| AC-12 *(RF-12)* | La card de Instagram muestra **6 fotos reales** de la cuenta y cada una abre su publicación | Abrir la página y tocar las 6 | ⬜ |
| AC-15 *(RF-12)* | Si una imagen no carga, esa celda se oculta; si fallan las seis, queda el CTA al perfil y la página no se rompe | Bloquear `/images/instagram/*` en DevTools | ⬜ |
| AC-13 *(RF-13)* | Un POST con el honeypot `website` lleno responde `200` y **no llega ningún mail** | `curl` + revisar la casilla | ⬜ |
| AC-14 *(RF-14)* | La página sigue aclarando que la compra se cierra en la tienda | Leer la página | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px no hay scroll horizontal y todos los campos y botones miden ≥ 44 px | DevTools, iPhone SE | ⬜ |
| ANF-2 | **Performance** — la ruta no agrega scripts bloqueantes; si hay algo de terceros, carga diferido y solo en `/contacto` | Lighthouse en `/contacto` + Network | ⬜ |
| ANF-3 | **Accesibilidad** — cada campo con `<label>`, errores asociados al campo, foco visible, navegable con Tab; el honeypot **no** entra en el orden de tabulación | Recorrido con teclado | ⬜ |
| ANF-4 | **Compatibilidad** — un carrito guardado antes del cambio sigue funcionando | `localStorage` con datos viejos | ⬜ |
| ANF-5 | **Sin dependencias nuevas** | `git diff package.json frontend/package.json` está vacío | ⬜ |
| ANF-6 | **Sin secretos en el bundle** | `grep -ri "resend\|re_" frontend/dist` no encuentra la key | ⬜ |
| ANF-7 | **Privacidad** — no hay PII en `dataLayer` ni en los logs de la Function | `window.dataLayer` + logs de Netlify | ⬜ |
| ANF-8 | **Navegador embebido de Instagram** — el formulario se envía igual desde ahí | Abrir el link desde una historia | ⬜ |
| ANF-9 | **Peso de la grilla** — las 6 `webp` suman menos de 250 KB y cargan `lazy` | `du -ch frontend/public/images/instagram/*.webp` + Network | ⬜ |
| ANF-10 | **Sin terceros nuevos** — la página no pide nada a `instagram.com` ni a ningún CDN externo al cargar | Network con filtro por dominio | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Campo vacío | Error junto al campo, sin request | ⬜ |
| `juan@gmail` | Error de mail | ⬜ |
| Teléfono `+54 9 341 680-6675` | **Válido** | ⬜ |
| Teléfono `1234` | Inválido | ⬜ |
| Consulta de 10.000 caracteres | Se corta en 2.000 y el contador lo avisa antes | ⬜ |
| Consulta de 3 caracteres (`"hola"`) | Inválida | ⬜ |
| Doble click en Enviar | Una sola request | ⬜ |
| Resend caído | `502` + error con WhatsApp | ⬜ |
| CRM caído, mail OK | `200`: la consulta llegó | ⬜ |
| Bot con el honeypot lleno | Descartado, sin mail | ⬜ |
| Una imagen de la grilla no carga | Esa celda se oculta; las otras cinco quedan | ⬜ |
| No carga ninguna imagen de la grilla | Queda el CTA al perfil; la página no se rompe | ⬜ |
| Sin conexión | Error accionable, no queda colgado | ⬜ |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Los 258 tests existentes siguen pasando | ⬜ |
| REG-2 | Se puede completar una compra por **Mercado Pago** de punta a punta | ⬜ |
| REG-3 | Se puede completar una compra por **transferencia** de punta a punta | ⬜ |
| REG-4 | El envío se calcula bien en las tres zonas | ⬜ |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ⬜ |
| REG-6 | El carrito sobrevive al refresh | ⬜ |
| REG-7 | El `purchase` se dispara una sola vez | ⬜ |
| REG-8 | El `value` del `purchase` es lo que se pagó | ⬜ |
| REG-9 | El **botón flotante** de WhatsApp sigue igual en todas las páginas | ⬜ |
| REG-10 | El popup de bienvenida sigue capturando leads (comparte Resend y CRM) | ⬜ |
| REG-11 | El mail de pedido y el de carrito abandonado siguen saliendo (comparten `notify.js`) | ⬜ |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `generate_lead` | El formulario se envió con éxito | `lead_source: 'contacto_form'` | ⬜ |
| `contacto_form_error` | El envío falló | `motivo` ∈ {`validacion`, `red`, `servidor`} | ⬜ |
| `whatsapp_click` | Click en la card de WhatsApp | `whatsapp_context: 'contacto_card'` | ⬜ |
| `instagram_click` | Click en la card de Instagram | `contexto: 'contacto'` | ⬜ |

**Verificación**
```js
window.dataLayer.filter(e => ['generate_lead','contacto_form_error','whatsapp_click','instagram_click'].includes(e.event))
```
- [ ] GA4 DebugView los recibe
- [ ] Meta → Administrador de eventos recibe el `Lead`
- [ ] **No viaja PII** en ninguno

---

## 6. ⚠️ Paridad de precios

⏭️ **No aplica**: la feature no toca precios, promos, cupones ni envíos.
`promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js` igual
tienen que seguir en verde (REG-1).

---

## Definition of Done

### Código
- [ ] Todos los criterios de §1, §2 y §3 en ✅
- [ ] Todos los de regresión (§4) en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff
- [ ] Comentarios que explican el **por qué**

### Seguridad
- [ ] Ningún secreto en el frontend ni en el bundle
- [ ] El servidor revalida los seis campos
- [ ] Sin PII en logs, URLs ni `dataLayer`
- [ ] CORS restringido a los orígenes propios

### Documentación
- [ ] `docs/architecture.md` con `/api/contacto`
- [ ] `docs/integrations.md` con el uso nuevo de Resend
- [ ] `docs/analytics.md` con los eventos nuevos

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope reportados
- [ ] Este documento recorrido punto por punto
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: —
**Ejecutada por**: —

| | Cantidad |
|---|---|
| ✅ Cumple | |
| ❌ No cumple | |
| ⏭️ No aplica | |
