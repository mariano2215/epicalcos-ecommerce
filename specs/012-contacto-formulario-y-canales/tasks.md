# Tasks — Contacto: formulario + canales (WhatsApp e Instagram)

| | |
|---|---|
| **Spec** | `012-contacto-formulario-y-canales` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETADA` — 25/08/2026 |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] **Mariano pidió explícitamente la implementación** — *"Implementá la spec 012"*, 25/8/2026
- [x] Está respondida la pregunta de la card de Instagram (`design.md` §11):
      **grilla curada propia**, decidido el 25/8/2026
- [x] **Mariano eligió los posteos**: 3 permalinks, pasados el 25/8/2026

---

## Fase 0 — Preparación

- [x] **0.1** Releer `routes/Contact.jsx`, `config/site.js` (`contact`, `provinces`), `netlify/functions/capture-lead.js` y `lib/notify.js`
  - *Verificación*: sé qué hace cada uno y por qué
- [x] **0.2** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Verificación*: ✅ 258 tests pasaban al arrancar
- [x] **0.3** Rama de trabajo
  ```bash
  git checkout -b feat/012-contacto
  ```
  - *Verificación*: `git branch --show-current` no dice `main`

---

## Fase 1 — Validación (primero lo testeable)

- [x] **1.1** `validarConsulta(form)` devuelve `{}` con datos válidos y `{ campo: mensaje }` con los inválidos
  - *Archivo*: `frontend/src/lib/contacto.js` (nuevo)
  - *Verificación*: función pura — no importa React ni hace `fetch`
- [x] **1.2** Tests de todos los casos de `design.md` §9
  - *Archivo*: `frontend/src/lib/contacto.test.js` (nuevo)
  - *Verificación*: `npm test` pasa y el archivo aparece en la lista
- [x] **1.3** El teléfono se valida por **cantidad de dígitos** (≥ 8), no por formato
  - *Verificación*: `+54 9 341 680-6675`, `3416806675` y `341 680 6675` son todos válidos

---

## Fase 2 — Endpoint

- [x] **2.1** Función `sendContactEmail(consulta)` — mail a `NOTIFY_EMAIL_TO`, `reply_to` con el mail del cliente, todos los campos escapados con `esc()`
  - *Archivo*: `netlify/functions/lib/notify.js` (**export nuevo**, no se toca ninguno existente)
  - *Verificación*: `git diff` muestra solo líneas agregadas
- [x] **2.2** Endpoint `POST /api/contacto`: CORS con la lista blanca, `OPTIONS`, `405`, tope de body de 8 KB, topes por campo
  - *Archivo*: `netlify/functions/contacto.js` (nuevo)
  - *Verificación*: un `GET` devuelve 405; un body de 9 KB devuelve 413
- [x] **2.3** El endpoint **revalida los seis campos** en el servidor
  - *Verificación*: un POST con `email: "asd"` devuelve `400 { campos: ['email'] }`
- [x] **2.4** Honeypot: si `website` viene con contenido, se descarta sin mandar mail
  - *Verificación*: responde `200` (no le avisa al bot) y no llega ningún mail
- [x] **2.5** Si Resend falla → `502`. Si falla solo el CRM → `200`
  - *Verificación*: con `RESEND_API_KEY` vacía el endpoint devuelve 502
- [x] **2.6** Redirect `/api/contacto` en `netlify.toml`, **antes** del fallback SPA
  - *Archivo*: `netlify.toml`
  - *Verificación*: está junto a los otros `/api/*`, no después del `/*`
- [x] **2.7** Ningún `console.log` con PII
  - *Verificación*: `grep -n "console\." netlify/functions/contacto.js` — nada imprime el body

---

## Fase 3 — UI

- [x] **3.1** `FormularioContacto`: los 6 campos en el orden de RF-2, con `type` + `autoComplete` + `inputMode` en cada uno *(igual que `CheckoutForm`)*, provincia con `provinces` de `site.js`
  - *Archivo*: `frontend/src/components/contacto/FormularioContacto.jsx` (nuevo)
  - *Verificación*: en mobile cada campo abre el teclado correcto
- [x] **3.2** Estados: `idle` / `enviando` / `ok` / `error`. Botón deshabilitado mientras envía
  - *Verificación*: doble click manda una sola request (Network del navegador)
- [x] **3.3** Errores junto al campo, con el estilo del repo (`text-xs text-brand-pink`)
  - *Verificación*: enviar vacío marca los seis campos
- [x] **3.4** Estado de error con **botón a WhatsApp** para no perder la consulta
  - *Verificación*: cortando la red, el mensaje ofrece WhatsApp
- [x] **3.5** Honeypot `website`: oculto de verdad y fuera del orden de tabulación
  - *Verificación*: `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`; el teclado nunca lo alcanza
- [x] **3.6** `CardWhatsapp`: link `wa.me` con el texto pre-cargado, ícono real, target de 44 px
  - *Archivo*: `frontend/src/components/contacto/CardWhatsapp.jsx` (nuevo)
  - *Verificación*: abre el chat **con el mensaje escrito**, probado en un teléfono
- [x] **3.7** `CardInstagram`: grilla de 3 desde `data/instagram.js`, cada foto linkeando a su posteo, CTA al perfil abajo
  - *Archivo*: `frontend/src/components/contacto/CardInstagram.jsx` (nuevo)
  - *Verificación*: las 3 fotos abren su publicación; si una imagen falla, esa celda se oculta y la página no se rompe
- [x] **3.8** `Contact.jsx` arma el layout: WhatsApp primero en mobile, dos columnas en `lg`
  - *Archivo*: `frontend/src/routes/Contact.jsx`
  - *Verificación*: a 375 px no hay scroll horizontal; el orden es el de `design.md` §1

---

## Fase 3B — Grilla de Instagram

Los 3 permalinks los pasó Mariano el 25/8/2026.

- [x] **3B.1** `scripts/build-instagram.mjs`: baja el `og:image` de cada permalink y exporta `webp` de 640×640
  - *Archivo*: `scripts/build-instagram.mjs` (nuevo)
  - *Verificación*: correrlo dos veces da el mismo resultado (es idempotente, como `build-marcas.mjs`)
- [x] **3B.2** El script regenera `frontend/src/data/instagram.js` con `{ src, permalink, alt }`
  - *Verificación*: el archivo tiene el encabezado de "generado, no editar a mano"
- [x] **3B.3** Cada foto tiene un `alt` escrito a mano que describe el posteo, no `"instagram-1"`
  - *Verificación*: leído con un lector de pantalla, se entiende qué hay en cada foto
- [x] **3B.4** Las 3 imágenes pesan en conjunto menos de 150 KB
  - *Verificación*: `du -ch frontend/public/images/instagram/*.webp`
- [x] **3B.5** Documentar el comando de actualización
  - *Archivo*: `docs/` (junto a lo del ticker de marcas)
  - *Verificación*: dice dónde se pegan los links nuevos y cómo se corre

---

## Fase 4 — Analytics

- [x] **4.1** `trackLeadCapture('contacto_form')` al enviar con éxito; `trackContactoFormError(motivo)` y `trackInstagramClick('contacto')` nuevos; `trackWhatsappClick('contacto_card')` en la card
  - *Archivo*: `frontend/src/lib/analytics.js` (**exports nuevos**, ninguno modificado)
  - *Verificación*: ningún componente llama a `gtag`/`fbq`/`dataLayer` directo
- [x] **4.2** Todo en `try/catch`
  - *Verificación*: un fallo de tracking no impide que la consulta se envíe
- [x] **4.3** **Sin PII** en el `dataLayer`
  - *Verificación*: `window.dataLayer.filter(e => e.event === 'generate_lead')` no trae nombre, mail, teléfono ni ciudad
- [x] **4.4** Actualizar `docs/analytics.md`

---

## Fase 5 — Tests

- [x] **5.1** Los tests de la Fase 1 están escritos y pasan
- [x] **5.2** Suite completa en verde
  ```bash
  npm test
  ```
  - *Verificación*: ✅ **295 tests** (258 + 37 nuevos)
- [x] **5.3** Verificación manual de `design.md` §9
  - *Verificación*: mail recibido, respuesta que cae en la casilla del cliente, WhatsApp con texto, 375 px

---

## Fase 6 — Documentación

- [x] **6.1** `docs/business-rules.md` — *(probablemente no aplica: no cambia ninguna regla comercial)*
- [x] **6.2** `docs/architecture.md` — sumar `/api/contacto` al mapa de Functions
- [x] **6.3** `docs/integrations.md` — el uso nuevo de Resend (y de Instagram, si aplica)
- [x] **6.4** Comentar el **por qué** con la densidad del repo
  - *Verificación*: está escrito por qué el endpoint devuelve `502` y no `200` como `capture-lead`

---

## Fase 7 — Cierre

- [x] **7.1** Validar contra `acceptance.md`, punto por punto
- [x] **7.2** Reportar hallazgos y lo que quedó fuera de scope
- [x] **7.3** Commit + push
  - ⚠️ **push a `main` = deploy a producción**
- [x] **7.4** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

Anotados **antes** de empezar, para no arreglarlos de paso (regla 8):

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| El `<svg>` de WhatsApp queda duplicado (el botón flotante y la card nueva) | `components/WhatsAppButton.jsx` + `components/contacto/CardWhatsapp.jsx` | Extraer un `IconWhatsapp` compartido, en un cambio propio |
| `CheckoutForm.validate()` no tiene tests porque vive dentro del componente | `components/CheckoutForm.jsx` | Mover la validación a un módulo puro, como `lib/contacto.js` |
| El endpoint no tiene rate-limit por IP, solo honeypot y cooldown de UI | `netlify/functions/contacto.js` | Evaluarlo si aparece spam real |
| La grilla de Instagram se actualiza a mano (decisión consciente, `design.md` §11) | `scripts/build-instagram.mjs` | Si molesta, la opción C automatiza — con el costo del token que vence cada 60 días |
| La página no tiene tests de componente porque no hay infraestructura para renderizarlos | `frontend/package.json` | Decidir aparte si se suma Testing Library (regla 10: hay que justificarla) |
| **Los dos defectos de esta implementación (card duplicada y doble submit) los habría cazado un test de componente**, no una relectura del código | `frontend/package.json` | Refuerza el hallazgo de arriba: es el argumento concreto que le faltaba |
| El mismo patrón de doble submit puede estar en otros formularios del repo | `CheckoutForm.jsx`, `NegocioForm.jsx`, `WelcomePopup.jsx` | Revisar si el guard es por estado o por ref. **En el checkout, un doble submit es un pedido duplicado** |
| `frontend/src/lib/contacto.js` y `netlify/functions/contacto.js` repiten las reglas de validación a mano —como el espejo de precios— pero **sin un test de paridad que lo verifique** | los dos archivos | Un test de paridad como el de `promoPricing`, si el formulario crece |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 25/8/2026 | **3 fotos en vez de 6** | Lo pidió Mariano al autorizar la implementación |
| 25/8/2026 | La fuente de las imágenes es el **permalink** (se baja el `og:image`), no una carpeta de fotos fuera del repo | Mariano pasó links, no archivos. Además el `og:image` **es** el recorte que Instagram usa en la grilla del perfil, así que la card queda idéntica al perfil real. El script igual acepta un archivo local si algún día se quiere otro encuadre |
| 25/8/2026 | La Fase 4 (analytics) se hizo **antes** que la Fase 3 (UI) | Los componentes importan las funciones de tracking: al revés no compilaba |
| 25/8/2026 | Se agregaron dos contextos de `whatsapp_click` que no estaban en la spec (`contacto_form_ok`, `contacto_form_error`) | Sin el del error no hay forma de saber si al que se le rompió el formulario logró escaparse a WhatsApp, que es exactamente lo que RF-9 promete |
| 25/8/2026 | El redirect hubo que agregarlo también en `frontend/public/_redirects` | `design.md` §4 solo nombraba `netlify.toml`. El test `redirects.test.js` lo cazó al toque — que es para lo que existe |
