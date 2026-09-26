# Requirements — Garantía en el checkout

| | |
|---|---|
| **Spec** | `021-garantia-en-checkout` |
| **Estado** | ⛔ `RETIRADA` — 26/09/2026: Mariano pidió sacar el bloque del checkout ("eso SACARLO del checkout"). Estuvo `IMPLEMENTADA` del 14 al 26/09/2026. Se borró `GarantiaCheckout.jsx`; `lib/garantia.js` (+ tests) y `trackGarantiaCondiciones` quedan sin uso, por si vuelve |
| **Fecha** | 14/09/2026 |
| **Autor** | Mariano (request) · Claude (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

Desde la spec 020 (14/9/2026) la tienda ofrece **devolución por cualquier motivo
durante 30 días**, y la tira de arriba lo anuncia en todas las páginas. Pero en
el checkout —el momento en que la duda *"¿y si no me gusta?"* pesa más— la
promesa **no está**:

- La tira se recoge al primer scroll, y el formulario del checkout se completa
  scrolleando: cuando la persona llega al botón de pagar, la tira ya no se ve.
- La lista de confianza que está justo arriba del botón (*"Pago procesado por
  Mercado Pago"*, *"No guardamos datos de tarjeta"*, *"Envíos a todo el país"*,
  *"Te escribimos por WhatsApp"*) no menciona la garantía. Se armó cuando no
  había devoluciones, y su comentario lo dice: *"Nada de garantías inventadas"*.
- La garantía **no es igual para todos los carritos**: lo de catálogo se
  devuelve por cualquier motivo; lo hecho con el archivo o las fotos del
  cliente, solo por falla; los archivos imprimibles no se devuelven. Un mensaje
  único le prometería a alguien algo que la política no le da.

---

## 2. Objetivo

Que al momento de pagar, cada persona vea **la garantía que le corresponde a su
carrito**, dicha en una línea y con las condiciones a mano sin salir del
checkout.

**Cómo se sabrá que funcionó**: sube la tasa `purchase / begin_checkout`
(*checkout completion*, ya definida en `docs/analytics.md`) comparando 14 días
antes y 14 después. Lectura débil por las mismas razones que la spec 020: mide
todo lo que cambió en esas semanas. Además, el evento nuevo (§11) dice cuánta
gente abre las condiciones.

---

## 3. Scope

- [x] Un mensaje de garantía en la lista de confianza del checkout, **arriba del
      botón de pagar**, que cambia según lo que hay en el carrito (§7).
- [x] Las condiciones de esa garantía, plegadas, desplegables sin salir del
      checkout.
- [x] Un evento de analytics al abrir las condiciones.

---

## 4. Fuera de scope

- **Cambiar la política de devoluciones.** Se muestra la de la spec 020, tal cual.
- **El carrito (`/carrito`) y el carrito lateral.** El pedido es el checkout.
  Hallazgo si se quiere extender.
- **El mail de confirmación y la pantalla de gracias.** Hallazgo.
- **Sacar o reescribir los otros cuatro ítems de la lista de confianza.**
- **Cambiar la tira de arriba** (spec 020), aunque ver §10: dice "30 días de
  garantía y devolución" sin distinguir tipo de producto.
- **A/B del mensaje.** Hay cuatro experimentos activos y ya hubo que pausar uno
  (`hero_cta`) para poder leer otro: no sobra tráfico para uno más. Hallazgo.
- **Botón de arrepentimiento** (hallazgo de la spec 020, sigue abierto).

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra | Ve, antes de pagar, qué garantía tiene su pedido |
| Cliente que vuelve (carrito guardado) | Igual que cualquiera: el mensaje se deriva de lo que tiene el carrito, no se guarda |
| Mariano (operación) | *No afectado* — la política ya estaba vigente |
| Sistemas externos (CRM, Meta, MP) | GA4 recibe un evento nuevo. Nada más |

---

## 6. User stories

- **US-1** — Como comprador primerizo, justo antes de pagar quiero leer que si
  no me gusta lo puedo devolver, para animarme a confirmar.
- **US-2** — Como comprador de calcos personalizadas, quiero saber qué pasa si
  me llegan mal impresas, sin que me prometan una devolución que no existe.
- **US-3** — Como comprador, quiero ver las condiciones (sin pegar, quién paga
  la vuelta) **sin salir del checkout**, para no perder lo que ya tipeé.
- **US-4** — Como Mariano, quiero saber cuánta gente abre las condiciones, para
  entender si la garantía es una duda real en el checkout.

---

## 7. Requisitos funcionales

### Qué garantía le toca a cada carrito

Cada producto del carrito cae en uno de tres grupos, igual que en la política
(`business-rules.md` §7, D-4):

| Grupo | Qué es | Garantía |
|---|---|---|
| **Catálogo** | calcos sueltas del catálogo, pack mayorista armado con diseños del catálogo | devolución por cualquier motivo, 30 días |
| **Hecho con tu archivo** | personalizados, pack de personalizados, Promo Negocio, Polaroid, tatuajes, y la parte de un pack mayorista armada con archivos del cliente | solo por falla de fabricación, 30 días |
| **Digital** | archivos imprimibles | ninguna (no se devuelven) |

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Carrito **solo de catálogo** → el checkout dice que hay 30 días para devolverlo por cualquier motivo. | 🔴 must |
| RF-2 | Carrito **mixto** (catálogo + hecho con tu archivo) → dice que hay 30 días para devolver **lo de catálogo**, sin extender la promesa a lo personalizado. *(P-1: preciso)* | 🔴 must |
| RF-3 | Carrito **solo hecho con tu archivo** → dice que si llega con una falla se repone gratis. **No** usa la palabra "devolver". *(P-2: se muestra)* | 🔴 must |
| RF-4 | Carrito **solo digital** → no hay mensaje de garantía; la lista queda como hoy. | 🔴 must |
| RF-5 | Lo digital **no cuenta** para decidir el mensaje: digital + catálogo se trata como solo catálogo. | 🔴 must |
| RF-6 | Los días son **el mismo número** que usan la tira, la política, los Términos y el FAQ. | 🔴 must |
| RF-7 | El mensaje está **arriba del botón de pagar**, en la lista de confianza, y se distingue de los otros cuatro ítems (es el que responde la duda más cara). | 🔴 must |
| RF-8 | Debajo del mensaje hay un **"Ver condiciones"** plegado. Abierto, muestra las condiciones del grupo que corresponde, **sin navegar fuera del checkout**. | 🔴 must |
| RF-9 | Las condiciones que se muestran son las de la política (spec 020) y no agregan ni sacan nada. | 🔴 must |
| RF-10 | El mensaje cambia en vivo si el carrito cambia (en el checkout no se agrega nada, pero el upsell de abajo sí puede sumar un calco). | 🟡 should |
| RF-11 | Al abrir las condiciones se registra un evento (§11). Cerrarlas no registra nada. | 🟡 should |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | a 375 px, sin scroll horizontal; el mensaje entra en una o dos líneas |
| RNF-2 | **Conversión** | no agrega pasos ni campos. Empuja el botón de pagar hacia abajo lo mínimo (una fila, plegada) — ver `design.md` §1 |
| RNF-3 | **Accesibilidad** | "Ver condiciones" operable con teclado y lector de pantalla, target de 44 px, foco visible |
| RNF-4 | **Navegador embebido de Instagram** | nada de lo nuevo abre ventanas ni navega: el formulario no guarda lo tipeado |
| RNF-5 | **El tracking no rompe la compra** | el evento va por `lib/analytics.js`, con su `try/catch` |
| RNF-6 | **Sin dependencias nuevas** | — |
| RNF-7 | **Compatibilidad** | carritos guardados (`epicalcos.cart.v2`) funcionan sin migrar nada |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Cambios y devoluciones (D-1 a D-11) | `business-rules.md` §7 | no — solo se muestra |
| Tira de anuncios | `business-rules.md` §7 | no |

Esta feature **no** toca el camino de precios ni el de envíos:

- [ ] ~~Cambio espejado en `pricing.js`~~ — no
- [ ] ~~Cambio espejado en `site.js` y el bloque de envío del servidor~~ — no
- [ ] ~~Test de paridad~~ — no

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Carrito vacío | El checkout ya muestra "No hay productos en el carrito"; no hay lista ni mensaje |
| Solo digital | Sin mensaje de garantía (RF-4) |
| Digital + catálogo | Como solo catálogo (RF-5) |
| Pack mayorista con algún archivo del cliente | Cuenta como mixto: tiene catálogo y tiene hecho con archivo |
| Pack mayorista sin archivos | Catálogo |
| Línea guardada que no permite saber si lleva archivos del cliente | Se trata como *hecho con tu archivo*: prometer de menos no le miente a nadie |
| El upsell suma un calco de catálogo a un carrito de personalizados | El mensaje pasa de "falla" a "mixto" sin recargar (RF-10) |
| La tira de arriba (spec 020) dice "30 días de garantía y devolución" a un carrito de personalizados | Convive: la tira es una promesa general de la tienda y se recoge al scrollear; el checkout precisa para ese carrito. Se anota como hallazgo |
| Navegador de Instagram | "Ver condiciones" se despliega en el lugar; no hay link que salga |

---

## 11. Analytics necesarios

### Eventos nuevos

| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| `garantia_condiciones_ver` | al **abrir** "Ver condiciones" en el checkout | `tipo`: `devolucion` · `mixto` · `falla` | GA4 |

Sin PII. Sin valor monetario (no es un evento de comercio).

### Eventos existentes que cambian
Ninguno.

### Qué se quiere poder responder
- ¿Qué proporción de los que llegan al checkout abre las condiciones?
  (`garantia_condiciones_ver` / `begin_checkout`)
- Los que las abren, ¿compran más o menos que los que no?
  (`purchase` en sesiones con y sin el evento)
- ¿Cambió *checkout completion* (`purchase / begin_checkout`) después del deploy?

---

## 12. Preguntas abiertas — ✅ resueltas

**Mariano, 14/9/2026: "ok a lo recomendado".** Se conservan las alternativas
para que se entienda qué se descartó.

- [x] **P-1 — Carritos mixtos: ¿mensaje preciso o general?**
  - **Recomendado: preciso** — *"30 días para devolver las calcos de catálogo"*.
    El general (*"30 días de garantía y devolución"*, como la tira) le promete
    devolución a un personalizado que la política excluye, justo en el momento
    de pagar.
  - Alternativa: general. Más corto y más fuerte, pero promete de más.
- [x] **P-2 — Carritos solo de personalizados: ¿mostrar la garantía de
      fabricación o nada?**
  - **Recomendado: mostrarla** — *"Si llega con una falla, te lo reponemos
    gratis"*. Es cierta y responde la duda típica de quien sube su archivo:
    *"¿y si sale mal?"*.
  - Alternativa: no mostrar nada para esos carritos.
