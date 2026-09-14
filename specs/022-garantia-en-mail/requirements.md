# Requirements — Garantía en el mail de confirmación

| | |
|---|---|
| **Spec** | `022-garantia-en-mail` |
| **Estado** | `READY FOR REVIEW` — con 2 preguntas abiertas (§12) |
| **Fecha** | 14/09/2026 |
| **Autor** | Mariano (request) · Claude (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

Desde la spec 020 hay devolución por cualquier motivo durante 30 días, y desde
la 021 el checkout la muestra arriba del botón de pagar. Pero **después de
pagar**, la garantía desaparece:

- El mail de confirmación —el que dice *"Guardá este mail como comprobante"*—
  no la menciona. Tiene el pedido, la entrega y los contactos, pero nada sobre
  qué hacer si el pedido no gusta o llega mal.
- Para pedir una devolución hace falta el **número de pedido** (política, D-9).
  Ese número está en el mail, pero el mail no dice que sirve para eso.
- Quien paga por transferencia recibe **un solo mail**, el de *"hacé la
  transferencia"*. Es el único registro escrito que se lleva de lo que compró.
- La garantía no es igual para todo (catálogo por cualquier motivo, lo hecho con
  el archivo del cliente solo por falla, lo digital no se devuelve), y el mail
  es un compromiso **por escrito** de EPICALCOS: prometer de más ahí pesa más
  que en una pantalla.

---

## 2. Objetivo

Que el mail de confirmación diga, para ese pedido, qué garantía tiene y cómo
pedirla con el número de pedido que ya trae.

**Cómo se sabrá que funcionó**:
- Las consultas de devolución llegan con el número de pedido (se ve en el
  WhatsApp y el mail de Mariano: es operativo, no analytics).
- GA4 cuenta las visitas a la política que vienen del mail (§11).

---

## 3. Scope

- [ ] Un bloque **"Tu garantía"** en el mail de confirmación al cliente, en la
      versión HTML y en la de texto plano.
- [ ] El contenido depende de lo que tiene el pedido (§7).
- [ ] Un link a la política completa, medible en GA4.

---

## 4. Fuera de scope

- **Cambiar la política** (spec 020) o lo que muestra el checkout (spec 021).
- **El mail interno a Mariano.** Hallazgo: podría decir qué garantía tiene cada
  pedido.
- **La pantalla de gracias** (`/pago-exitoso`). Hallazgo, ya anotado en la 021.
- **Los demás mails** (cupón, contacto, carrito abandonado).
- **Mandar la garantía a pedidos ya confirmados.** Nadie recibe un mail nuevo.
- **Cambiar qué datos del pedido viajan del checkout al servidor.** Ver §7 y
  `design.md` §1: el servidor no sabe si un pack mayorista trae archivos del
  cliente, y se resuelve con cómo se escribe, no agregando datos.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que pagó con Mercado Pago | El mail de "pago aprobado" dice su garantía |
| Cliente que paga por transferencia | Su único mail dice su garantía *(ver §12 P-1)* |
| Cliente de archivos imprimibles | *No afectado*: lo digital no tiene garantía de devolución |
| Mariano (operación) | Recibe los reclamos con número de pedido |
| Sistemas externos | Resend: mismo mail, un bloque más. GA4: visitas con UTM |

---

## 6. User stories

- **US-1** — Como cliente, en el mail que guardo como comprobante quiero leer
  cuánto tiempo tengo para devolver y cómo se hace, para no tener que buscarlo
  si lo necesito.
- **US-2** — Como cliente de un personalizado, quiero que el mail me diga que si
  llega con una falla me lo reponen, sin prometerme una devolución que no existe.
- **US-3** — Como Mariano, quiero que los reclamos lleguen con el número de
  pedido, para encontrarlo sin preguntar.

---

## 7. Requisitos funcionales

El servidor clasifica cada producto del pedido con la **misma política** que
el checkout (`business-rules.md` §7, D-4), pero con lo que tiene: el **id** de
cada línea.

| Lo que hay en el pedido | Qué tiene que decir el mail |
|---|---|
| Calcos de catálogo | Que hay 30 días desde que lo recibe para devolverlas, por cualquier motivo, **sin pegar** |
| Algo hecho con el archivo del cliente (personalizados, Negocio, Polaroid, tatuajes) | Que si llega con una falla se repone gratis, y que **no** entra en la devolución por cualquier motivo |
| Un pack mayorista | Lo que sea cierto **aunque traiga archivos del cliente**: el servidor no puede saberlo |
| Solo archivos imprimibles | Nada |

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Pedido **solo de catálogo** → el mail dice que tiene 30 días desde que lo recibe para devolverlo, por cualquier motivo, con las calcos sin pegar. | 🔴 must |
| RF-2 | Pedido con algo **hecho con el archivo del cliente** → dice que si llega con una falla se repone gratis, y que eso no entra en la devolución por cualquier motivo. **No** le promete devolución a esos productos. | 🔴 must |
| RF-3 | Pedido **mixto** → las dos cosas, y la devolución queda **acotada a lo de catálogo**. | 🔴 must |
| RF-4 | Pedido con **pack mayorista** → la devolución se escribe acotada a *"las calcos de catálogo"*, que es cierto traiga o no archivos del cliente. | 🔴 must |
| RF-5 | Todo pedido con algo físico dice que una **falla de fabricación** se repone gratis, avisando dentro de los 30 días. | 🔴 must |
| RF-6 | Pedido **solo digital** → sin bloque de garantía. Lo digital y la línea de envío no cuentan para decidir. | 🔴 must |
| RF-7 | El bloque dice **cómo pedirla**: WhatsApp o mail con el número de pedido, y muestra ese número. | 🔴 must |
| RF-8 | El bloque tiene un link a la política completa, medible en GA4. | 🟡 should |
| RF-9 | Los días son el **mismo número** que el checkout, la tira, la política, los Términos y el FAQ. | 🔴 must |
| RF-10 | Está en la versión **HTML y en la de texto plano** del mail, con el mismo contenido. | 🔴 must |
| RF-11 | Aparece en el mail de **pago aprobado** (Mercado Pago) y en el de **transferencia pendiente** *(ver §12 P-1)*. | 🔴 must |
| RF-12 | Si armar el bloque falla por cualquier motivo, **el mail sale igual sin el bloque**. Nunca puede costar la confirmación del pedido. | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Confiabilidad** | los mails de pedido son el único registro con Blobs caído (`notify.js`): el bloque no agrega ninguna llamada externa ni puede hacer fallar el armado |
| RNF-2 | **Clientes de mail** | HTML con estilos inline, como el resto del mail; se lee en Gmail y en el cliente de iPhone |
| RNF-3 | **Mobile** | se lee sin scroll horizontal en un celular |
| RNF-4 | **Sin secretos ni PII nueva** | el link lleva solo UTM, no el mail ni el pedido |
| RNF-5 | **Sin dependencias nuevas** | — |
| RNF-6 | **Compatibilidad** | pedidos guardados antes del cambio (o rearmados desde Mercado Pago con Blobs caído) arman el bloque igual: solo hace falta el id de cada línea |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Cambios y devoluciones (D-1 a D-11) | `business-rules.md` §7 | no — solo se comunica |

⚠️ **Espejo nuevo** (`CLAUDE.md` regla 11): el servidor no importa código del
frontend, así que el plazo de 30 días queda escrito también del lado de
`netlify/functions`. Un test tiene que verificar que sean iguales, como con los
precios.

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Pedido rearmado desde Mercado Pago (Blobs caído) | Mismo bloque: los items del pago traen los mismos ids |
| Pedido sin items | Sin bloque (no hay nada que garantizar); el resto del mail, igual |
| Pedido con items que no son una lista | El mail se comporta como hoy (el armado ya lo detecta); el bloque no agrega un error nuevo |
| Id de línea desconocido | Cuenta como algo físico **sin** devolución por cualquier motivo (se promete de menos) |
| Línea de envío (`shipping`) | No cuenta |
| Pedido con digital + físico | El bloque según lo físico; el bloque de descarga, como hoy |
| Reenvío desde "entregar archivos" (`entregar-digital`) | Usa el mismo mail: el bloque sale si el pedido tiene algo físico |
| Mail ya enviado antes del deploy | No se reenvía |

---

## 11. Analytics necesarios

### Eventos nuevos
**Ninguno** en el sitio: un mail no dispara eventos del `dataLayer`.

El link a la política lleva **UTM** para que GA4 cuente esas visitas como
tráfico del mail:

| Parámetro | Valor |
|---|---|
| `utm_source` | `email` |
| `utm_medium` | `confirmacion` |
| `utm_campaign` | `garantia` |

### Qué se quiere poder responder
- ¿Cuántos clientes abren la política desde el mail? (sesiones con esa UTM)
- Cruzado con pedidos: ¿qué proporción de compradores la mira después de pagar?

---

## 12. Preguntas abiertas

- [ ] **P-1 — ¿La garantía va también en el mail de transferencia pendiente?**
  - **Recomendado: sí.** Es el **único** mail que recibe quien paga por
    transferencia: si no va ahí, esos clientes nunca la tienen por escrito. Y
    antes de transferir, leer que hay 30 días para devolver es un motivo más
    para completar el pago.
  - Alternativa: solo en el de pago aprobado (Mercado Pago), y dejar el de
    transferencia enfocado en pagar.
- [ ] **P-2 — ¿Link a la política en el mail?**
  - **Recomendado: sí**, con UTM. En el checkout se evitó porque el formulario
    no guarda lo tipeado; en un mail no hay nada que perder, y es la única forma
    de medir si alguien lo lee.
  - Alternativa: sin link, solo el texto.
