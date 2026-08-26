# Requirements — Contacto: formulario + canales (WhatsApp e Instagram)

| | |
|---|---|
| **Spec** | `012-contacto-formulario-y-canales` |
| **Estado** | `DONE` — implementada y validada el 25/08/2026 |
| **Fecha** | 25/08/2026 |
| **Autor** | Claude, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

`/contacto` son hoy tres cards planas —WhatsApp, Email, Instagram— que solo
abren un enlace. La página no recibe nada: es una lista de salidas.

Lo observable hoy:

- **No se puede dejar una consulta desde el sitio.** El que no quiere abrir
  WhatsApp tiene que copiar el mail, salir a su casilla y escribir de cero.
- **La card de Email abre `mailto:`.** En el navegador embebido de Instagram
  —de donde viene la mayoría del tráfico— muchas veces no abre nada: el tap
  no hace nada visible y la consulta se pierde ahí.
- **La card de WhatsApp abre el chat vacío.** El cliente tiene que redactar
  qué quiere; la fricción cae justo en el momento de escribir.
- **La card de Instagram es texto.** Dice `@epicalcos` y nada más: no muestra
  el feed, así que no aporta la prueba social que sí tiene la cuenta.
- **Ninguna consulta queda registrada.** Si el cliente no escribe, no hay lead,
  no hay mail y no hay dato.

Las tres cards miden lo mismo y pesan lo mismo, cuando los tres canales no
valen lo mismo: WhatsApp es el que convierte.

---

## 2. Objetivo

Que `/contacto` deje de ser una lista de enlaces y pase a ser el lugar donde una
consulta se deja **en el sitio**, en menos de un minuto, o se deriva a WhatsApp
**con el mensaje ya escrito**.

**Cómo se sabrá que funcionó**

- Llegan consultas del formulario al mail de EPICALCOS (hoy: 0, porque no existe).
- `whatsapp_click` con contexto `contacto` aparece en GA4 y se puede comparar
  contra el botón flotante.
- El evento `generate_lead` con `lead_source = contacto_form` se puede contar.

---

## 3. Scope

- [ ] Rediseño de las tres cards de `/contacto`, con jerarquía: el formulario y
      WhatsApp mandan, Instagram acompaña.
- [ ] Formulario de contacto con: **nombre y apellido, mail, teléfono, ciudad,
      provincia y consulta**.
- [ ] El formulario **manda la consulta al mail de EPICALCOS** y confirma en
      pantalla que se envió.
- [ ] Card de WhatsApp que abra el chat con el texto *"Hola! Quiero hacer una
      consulta sobre calcos"* ya escrito.
- [ ] Card de Instagram con una **grilla de 3 posteos reales** de la cuenta,
      servidos desde el propio sitio (decisión del 25/8/2026, ver §12).
- [ ] Analytics de los tres caminos.
- [ ] Protección anti-spam del formulario **sin** captcha ni fricción visible.

---

## 4. Fuera de scope

- Mail automático de confirmación **al cliente** — hoy Resend envía desde
  `onboarding@resend.dev`, que solo puede escribirle a la casilla dueña de la
  cuenta. Requiere dominio verificado; se decide aparte.
- Chat en vivo, bot o respuestas automáticas.
- Cambiar el número de WhatsApp, el mail o el arroba de Instagram.
- Tocar el **botón flotante** de WhatsApp (está en todas las páginas).
- Poner el formulario en otras páginas (Home, ficha de producto, checkout).
- Captcha, reCAPTCHA o cualquier verificación que agregue un paso.
- **Feed de Instagram automático** (API de Meta, widget de terceros): se
  descartó el 25/8/2026 a favor de la grilla curada. El motivo está en
  [`design.md` §11](design.md).
- Tocar el camino de precios, promos, cupones o envíos. **Esta feature no toca
  ningún precio.**

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que quiere consultar antes de comprar | Gana un canal que no lo obliga a salir del sitio |
| Cliente que llega desde un anuncio de Instagram | Deja de chocar con un `mailto:` que no abre en el navegador embebido |
| Cliente que ya compró | Igual: es el mismo canal para postventa |
| Mariano (operación) | Recibe la consulta por mail **con los datos ya cargados** (nombre, teléfono, ciudad, provincia) en vez de tener que pedirlos |
| Sistemas externos (CRM, Meta, MP) | MP no se toca. CRM: opcional, ver RF-11 |

---

## 6. User stories

- **US-1** — Como cliente que está mirando calcos, quiero dejar mi consulta sin
  salir de la página, para no perder lo que estaba viendo.
- **US-2** — Como cliente en el celular, quiero tocar un botón y que WhatsApp se
  abra con el mensaje escrito, para no tener que redactar nada.
- **US-3** — Como cliente que no conoce la marca, quiero ver el Instagram real,
  para confirmar que atrás hay alguien que produce y responde.
- **US-4** — Como Mariano, quiero que la consulta me llegue con nombre,
  teléfono, ciudad y provincia, para poder cotizar el envío en la primera
  respuesta en vez de en la tercera.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | La página presenta tres bloques: **formulario**, **WhatsApp** e **Instagram**. El canal de mail deja de ser una card suelta: el formulario **es** el mail | 🔴 must |
| RF-2 | El formulario pide, en este orden: nombre y apellido, mail, teléfono, ciudad, provincia y consulta | 🔴 must |
| RF-3 | Todos los campos son obligatorios salvo los que RF-4 declare opcionales | 🔴 must |
| RF-4 | Ciudad y provincia son obligatorias *(sirven para cotizar el envío en la primera respuesta)*. Ningún campo es opcional | 🔴 must |
| RF-5 | La provincia se elige de la lista de provincias argentinas que ya usa el checkout, no se tipea | 🔴 must |
| RF-6 | Al enviar, la consulta llega **al mail de EPICALCOS** con todos los datos y con el mail del cliente como dirección de respuesta | 🔴 must |
| RF-7 | El formulario valida antes de enviar y muestra el error **junto al campo** que falla, no un cartel general | 🔴 must |
| RF-8 | Enviado el formulario, la pantalla confirma el envío y promete **respuesta en el día**; el formulario no se puede reenviar de un doble click | 🔴 must |
| RF-9 | Si el envío falla, el cliente ve un error accionable **y el camino a WhatsApp**, para que la consulta no se pierda | 🔴 must |
| RF-10 | La card de WhatsApp abre el chat del número publicado con el texto *"Hola! Quiero hacer una consulta sobre calcos"* pre-cargado | 🔴 must |
| RF-11 | La consulta se registra además como lead en el CRM interno, si el CRM está configurado | 🔴 must |
| RF-12 | La card de Instagram muestra una **grilla de 3 posteos reales** de la cuenta; cada uno abre su publicación | 🔴 must |
| RF-13 | El formulario descarta envíos automatizados sin pedirle nada al cliente | 🟡 should |
| RF-14 | La página sigue aclarando que **la compra se termina en la tienda**, no por WhatsApp | 🟢 could |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | A 375 px: sin scroll horizontal, campos de 44 px de alto, WhatsApp visible sin scrollear |
| RNF-2 | **Performance** | Ningún script bloqueante. Lo que sea de terceros (si Instagram lo requiere) carga diferido y solo en esta ruta; `/contacto` ya es `lazy()` |
| RNF-3 | **Accesibilidad** | Cada campo con `<label>` propio, errores asociados al campo, foco visible, targets de 44 px |
| RNF-4 | **Conversión** | El formulario es un solo paso. Ningún campo extra más allá de los seis pedidos |
| RNF-5 | **Seguridad** | Ningún secreto en el bundle. El servidor valida todo de nuevo y no confía en el cliente |
| RNF-6 | **Privacidad** | Los datos del formulario son PII: no viajan al `dataLayer` ni a los logs |
| RNF-7 | **Sin dependencias nuevas** | El formulario se escribe a mano, como el resto del repo |
| RNF-8 | **No rompe nada del carrito** | La feature no toca `CartContext` ni `localStorage` |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| WhatsApp es canal de **consulta**, no de venta: la compra se cierra en la tienda | `business-rules.md` (canales) | no |
| Los plazos de producción y entrega que se muestran salen del config | `site.js` → `shipping` | no |
| El número de WhatsApp y el mail salen del config | `site.js` → `contact` | no |

⚠️ **Esta feature no toca precios, promos, cupones ni envíos.**

- [ ] ~~Cambio espejado en `pricing.js`~~ — **no aplica**
- [ ] ~~Cambio espejado en el bloque de envío del servidor~~ — **no aplica**
- [ ] ~~Test de paridad~~ — **no aplica**

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Campo vacío | Error junto al campo; no se envía nada |
| Mail mal escrito (`juan@gmail`) | Error junto al campo |
| Teléfono con espacios, guiones o `+54` | Se acepta: se valida por cantidad de dígitos, no por formato |
| Consulta larguísima (pegan un texto de 10.000 caracteres) | Se corta en un tope declarado y el contador lo avisa antes |
| Doble click en Enviar | Se envía **una sola vez** |
| Falla la red / el servidor | Error accionable + link a WhatsApp con el mismo mensaje pre-cargado |
| Falla Resend | Igual que el anterior: el cliente se entera de que no llegó |
| Falla el CRM pero el mail salió | La consulta se da por enviada: el mail es lo que importa |
| Bot que postea al endpoint | Se descarta en el servidor, sin mail |
| Navegador embebido de Instagram | El formulario funciona igual: no depende de `mailto:` ni de abrir otra app |
| Sin conexión | El submit falla con el error accionable, no queda colgado |
| Instagram caído o el embed bloqueado | La card degrada a un enlace al perfil; **nunca** rompe la página |

---

## 11. Analytics necesarios

`CLAUDE.md` regla 13.

### Eventos nuevos

| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| `generate_lead` | El formulario se envió **con éxito** | `lead_source: 'contacto_form'` | GA4 + Meta *(evento ya existente, contexto nuevo)* |
| `contacto_form_error` | El envío falló | `motivo` (`validacion` / `red` / `servidor`) | GA4 |
| `instagram_click` | Click a Instagram desde la card | `contexto: 'contacto'` | GA4 |

### Eventos existentes que cambian

| Evento | Qué cambia | Por qué |
|---|---|---|
| `whatsapp_click` | Se dispara también desde la card de contacto, con `whatsapp_context: 'contacto_card'` | Para poder separar la card del botón flotante, que ya manda `contacto` como ruta |

### Qué se quiere poder responder

- ¿Cuánta gente que entra a `/contacto` termina consultando por algún canal?
- ¿Qué canal eligen: formulario o WhatsApp?
- ¿El formulario falla? ¿Cuánto?

**Recordatorios**

- Todo sale por `frontend/src/lib/analytics.js`.
- Todo en `try/catch`: un fallo de tracking no puede impedir que se envíe la consulta.
- **Nunca PII**: ni nombre, ni mail, ni teléfono, ni ciudad en el `dataLayer`.

---

## 12. Preguntas abiertas

**Ninguna.** Las tres se resolvieron con Mariano el 25/8/2026:

| Pregunta | Decisión | Consecuencia |
|---|---|---|
| ¿Cómo se enlaza Instagram? | **Grilla curada propia** (opción A de `design.md` §11) | Sin token, sin script de terceros, sin CSP nueva. Se actualiza corriendo un script, como el ticker de marcas |
| ¿La consulta entra al CRM? | **Sí** | RF-11 pasa a 🔴 must |
| ¿Qué plazo se promete? | ***"Te respondemos en el día"*** | RF-8. ⚠️ Es una promesa al cliente: si un sábado a la noche no se puede sostener, hay que bajarla a "menos de 24 hs hábiles" |
