# Requirements — Ticker de confianza + devolución a 30 días

| | |
|---|---|
| **Spec** | `020-ticker-de-confianza` |
| **Estado** | `READY FOR REVIEW` — con 6 preguntas abiertas (§12) que bloquean la aprobación |
| **Fecha** | 14/09/2026 |
| **Autor** | Mariano (request) · Claude (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

El visitante llega de un anuncio de Instagram, en el celular, con tres dudas
antes de comprar: **¿cuánto me sale el envío?**, **¿hay alguna promo?** y
**¿qué pasa si no me gusta?** Hoy el sitio no le responde ninguna de las tres
arriba de la página:

- **La barra de anuncios está apagada desde el 7/9/2026.** Por decisión de la
  spec 014, se oculta cuando hay una promo viva, y desde la spec 017 el 3x2 está
  vivo y sin fecha de fin. Resultado: hace una semana que el header no dice en
  ningún lado desde cuánto el envío es gratis. El único mensaje de arriba es el
  banner del 3x2.
- **El envío gratis tiene dos umbrales** (Rosario y resto del país) y el Rosario
  no se anuncia en ningún lugar de arriba, ni siquiera cuando la barra se veía.
- **La política de devoluciones dice que no hay devoluciones.**
  `/politicas/cambios`, los Términos (§6) y el FAQ dicen *"no aceptamos cambios
  ni devoluciones"*, salvo fallas de fábrica reclamadas dentro de los 7 días.
  Para una persona que no conoce la marca y compra por primera vez, eso es un
  motivo para no comprar.

---

## 2. Objetivo

Que en todas las páginas, arriba, una tira en movimiento responda las tres
dudas —envío gratis, promo vigente y garantía de devolución— y que la política
publicada respalde exactamente lo que la tira promete.

**Cómo se sabrá que funcionó**: sube la tasa de conversión (sesión → compra) y
baja el abandono del checkout, comparando los 14 días previos con los 14
posteriores al deploy. Es una lectura débil —mide todo lo que cambió en esas
dos semanas, no solo el ticker—; aislar el efecto exige un A/B, que queda como
hallazgo (§4).

---

## 3. Scope

- [ ] Una **tira en movimiento continuo** (ticker) arriba de todas las páginas,
      con estos mensajes:
  - envío gratis, con **los dos** umbrales (Rosario y resto del país)
  - 2x1 en calcos de Argentina
  - 30 días de garantía y devolución
  - 10 % OFF desde 10 calcos pagando por transferencia *(ya estaba en la barra;
    se conserva — ver §12 P-6)*
- [ ] La tira **se ve también cuando hay un banner de promo** (hoy el 3x2).
- [ ] **Nueva política de devoluciones**: devolución por cualquier motivo
      durante 30 días. Se reescribe en `/politicas/cambios`, en los Términos y
      en el FAQ, y se documenta en las reglas de negocio.

---

## 4. Fuera de scope

- **Reactivar la promo Argentina 50 %.** Decisión de Mariano, 14/9/2026: la
  tira anuncia el **2x1** que ya está vivo. Reactivar el 50 % tocaría precios en
  los dos lados del espejo y se acumularía con el 2x1 (un par saldría 75 % off).
- **Cambiar precios, promos, cupones o umbrales de envío.** La tira solo lee lo
  que ya existe.
- **Cambiar el banner del 3x2** o qué promo gana el banner.
- **Sumar la garantía a la lista de confianza del checkout o a la ficha de
  producto.** Es probablemente donde más pesa, pero es otro cambio — hallazgo,
  se propone aparte.
- **Botón de arrepentimiento.** La Res. 424/2020 de Comercio Interior obliga a
  las tiendas online a tener un link visible para revocar la compra dentro de
  10 días. El sitio no lo tiene. Es independiente de esta política y conviene
  confirmarlo con un profesional — hallazgo.
- **A/B del ticker** con `lib/experiments.js`. Hallazgo.
- **Automatizar reembolsos.** Se hacen a mano, como hoy (panel de MP o
  transferencia).

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Visitante frío de Instagram | Ve arriba, sin buscar, envío gratis, promo y garantía |
| Cliente que compra | La política nueva le da 30 días para devolver |
| Cliente que vuelve (carrito guardado) | *No afectado* — no cambia nada del carrito |
| Mariano (operación) | Tiene que atender devoluciones y reembolsos, que hoy no existen |
| Sistemas externos (CRM, Meta, MP) | *No afectado* |

---

## 6. User stories

- **US-1** — Como visitante que llega de un anuncio, quiero ver apenas entro
  desde cuánto el envío es gratis a mi zona, para saber si me conviene sumar
  calcos.
- **US-2** — Como visitante, quiero enterarme de que las calcos de Argentina
  están 2x1, para aprovecharlo.
- **US-3** — Como comprador primerizo, quiero saber que si no me gusta lo puedo
  devolver, para animarme a comprarle a una marca que no conozco.
- **US-4** — Como Mariano, quiero que si apago el 2x1 el ticker deje de
  anunciarlo solo, para no prometer una promo muerta.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Arriba de todas las páginas hay una tira que desplaza en continuo los mensajes de §3, en loop y sin cortes visibles, a una velocidad que permite leerlos. | 🔴 must |
| RF-2 | La tira se ve **también** cuando hay un banner de promo activo. *(Revierte el RF-1 de la spec 014 — ver `design.md` §0.)* | 🔴 must |
| RF-3 | El mensaje de envío dice los **dos** umbrales, y los montos son exactamente los que aplica el checkout. Si un umbral cambia, la tira cambia sola. | 🔴 must |
| RF-4 | El mensaje del 2x1 de Argentina aparece **solo** mientras el 2x1 esté vigente para esa categoría. Si se apaga o Argentina sale de la lista, el mensaje desaparece sin tocar la tira. | 🔴 must |
| RF-5 | La tira **nunca** anuncia un % de descuento para Argentina si la promo Argentina 50 % no está vigente. | 🔴 must |
| RF-6 | La cantidad de días de garantía es un solo dato: la tira, `/politicas/cambios`, los Términos y el FAQ dicen el mismo número. | 🔴 must |
| RF-7 | `/politicas/cambios`, los Términos (§6) y el FAQ ofrecen devolución por cualquier motivo durante 30 días, con las condiciones de §9. Ninguno de los tres sigue diciendo "no aceptamos devoluciones". | 🔴 must |
| RF-8 | El 10 % sigue anunciándose con sus dos condiciones (desde 10 calcos **y** pagando por transferencia). | 🔴 must |
| RF-9 | La tira se frena mientras el mouse está encima. | 🟡 should |
| RF-10 | Con `prefers-reduced-motion` la tira **no se mueve** y muestra todos los mensajes quietos. | 🔴 must |
| RF-11 | Un lector de pantalla lee cada mensaje **una sola vez** (no la copia que usa el loop) y no lo va anunciando a medida que pasa. | 🔴 must |
| RF-12 | Al scrollear la tira se recoge, igual que hoy la barra de anuncios. | 🟡 should |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | a 375 px la tira no genera scroll horizontal de la página |
| RNF-2 | **Performance** | sin JavaScript de animación (ni timers ni `requestAnimationFrame`); sin imágenes; no empeora el LCP |
| RNF-3 | **Sin CLS** | la tira existe desde el primer render; no aparece después ni cambia de alto mientras se mueve |
| RNF-4 | **Accesibilidad** | contraste AA del texto sobre el fondo; RF-9 a RF-11 |
| RNF-5 | **Navegador embebido de Instagram** | la animación no depende de nada que ese navegador bloquee |
| RNF-6 | **Sin dependencias nuevas** | — |
| RNF-7 | **Compatibilidad** | los carritos guardados siguen funcionando (no se toca el carrito) |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Umbrales de envío gratis (Rosario $35.000 / país $50.000) | `business-rules.md` §5 | no — solo se anuncian |
| Promo 2x1 por categoría (incluye `argentina`) | `business-rules.md` §3.1-bis | no — solo se anuncia |
| Promo Argentina 50 % | `business-rules.md` §3.3 | no — sigue vencida |
| 10 % por transferencia desde 10 calcos | `business-rules.md` §2 | no |
| **Política de cambios y devoluciones** | *(no está en `business-rules.md`)* | **SÍ — se reemplaza** |

⚠️ Esta feature **no** toca el camino de precios:

- [ ] ~~Requiere cambio espejado en `config/pricing.js` y `lib/pricing.js`~~ — no
- [ ] ~~Requiere cambio espejado en `config/site.js` y el bloque de envío del servidor~~ — no
- [ ] ~~Requiere test de paridad~~ — no

### Política nueva de devoluciones *(decisión de Mariano, 14/9/2026)*

Lo decidido: **devolución por cualquier motivo durante 30 días.** Las
condiciones de abajo son la propuesta; las marcadas con **P-n** esperan
confirmación en §12.

| # | Regla | Estado |
|---|---|---|
| D-1 | **Plazo**: 30 días corridos desde que el cliente recibe el pedido. | propuesta |
| D-2 | **Motivo**: cualquiera, incluido "no me gustó". | decidido |
| D-3 | **Estado del producto**: calcos **sin pegar** (una vez pegadas el adhesivo se activa y no sirven más). | **P-1** |
| D-4 | **Qué entra**: todo lo de catálogo (calcos sueltas, packs, mayorista). Lo hecho con el archivo o las fotos del cliente, solo por falla. Los archivos imprimibles (digitales) no se devuelven. | **P-3** |
| D-5 | **Envío de vuelta**: a cargo del cliente, salvo falla de fabricación o error nuestro. | **P-2** |
| D-6 | **Reembolso**: lo pagado por los productos, por el mismo medio de pago, dentro de los 10 días hábiles de recibida la devolución. El envío original no se reembolsa, salvo falla o error nuestro. | **P-4** |
| D-7 | **Falla de fabricación**: reposición sin costo, avisando dentro de los 30 días (hoy son 7). | propuesta |
| D-8 | **Error en el pedido** (llegó otra cosa): envío de lo correcto sin costo, avisando dentro de los 30 días (hoy son 48 h). | propuesta |
| D-9 | **Cómo se pide**: por WhatsApp o mail, con el número de pedido. | propuesta |
| D-10 | **Cancelación antes de producir**: sin cambios respecto de hoy. | sin cambios |

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Hay un banner de promo activo (hoy, el 3x2) | Se ven los dos: el banner arriba, la tira abajo del nav, y no parecen dos tiras compitiendo |
| Se apaga el 2x1 (`activa: false`) | La tira sigue con el resto de los mensajes, sin el del 2x1 |
| `argentina` sale de la lista del 2x1 | Ídem |
| Pantalla ancha (1920 px o más) | El loop no deja un hueco vacío entre la última frase y la primera |
| `prefers-reduced-motion` | Tira quieta, todos los mensajes visibles, sin la copia del loop |
| Navegador embebido de Instagram | La tira se mueve igual (animación CSS) |
| Menú mobile abierto | La tira queda debajo del menú, como hoy la barra |
| Scroll > 80 px | La tira se recoge con el header compacto, como hoy |
| Checkout | La tira también está (el header es global); se recoge al bajar al formulario |
| Pedido hecho antes del cambio de política | ⚠️ ver §12 P-5 |

---

## 11. Analytics necesarios

### Eventos nuevos
**Ninguno.** La tira no es una acción del cliente: es texto que no se toca (ver
`design.md` §1, por qué los mensajes no son links). Un evento de "vio la tira"
se dispararía en el 100 % de las sesiones y no diría nada.

### Eventos existentes que cambian
Ninguno.

### Qué se quiere poder responder
- ¿Subió la conversión sesión → compra después del deploy? → GA4, con los
  eventos que ya existen (`view_item` → `add_to_cart` → `begin_checkout` →
  `purchase`), 14 días antes vs 14 después.
- ¿Cuántas devoluciones genera la política nueva? → **no es analytics**: es
  operación. Se cuenta a mano por WhatsApp/mail (ver §12 P-4).

---

## 12. Preguntas abiertas

Las cinco primeras bloquean la aprobación porque definen el texto legal de
`/politicas/cambios`. Cada una trae la opción recomendada.

- [ ] **P-1 — ¿Hay que devolver las calcos para recibir el reembolso?**
  - **Recomendado: sí, sin pegar.** Es la política estándar y la más barata de
    sostener.
  - Alternativa: no hace falta devolverlas ("si no te gustan, te devolvemos la
    plata"). Para compras chicas sale más barato que pagar el envío de vuelta,
    pero no hay nada que frene el abuso (sobre todo en mayorista: 100 calcos
    revendibles).
- [ ] **P-2 — ¿Quién paga el envío de vuelta?**
  - **Recomendado: el cliente, salvo falla o error nuestro.**
  - Alternativa: siempre EPICALCOS. Al interior son ~$8.500 por devolución, más
    que muchos pedidos.
  - ⚠️ Con la opción recomendada, en un pedido de pocas calcos el envío de
    vuelta cuesta más que el reembolso, así que casi nadie la va a usar. La
    promesa sigue siendo cierta, pero pesa menos de lo que suena.
- [ ] **P-3 — ¿Qué productos entran?**
  - **Recomendado**: catálogo (calcos sueltas, packs, mayorista) entra entero.
    Lo hecho con el archivo o las fotos del cliente —personalizados, Promo
    Negocio, Polaroid— entra **solo por falla**: no se puede revender, y el
    Código Civil y Comercial (art. 1116) excluye los productos personalizados
    del derecho de revocación (confirmarlo con un profesional). Los archivos
    imprimibles no se devuelven.
  - **¿Tatuajes temporales?** ¿Son diseños de catálogo o se hacen con el diseño
    del cliente? Eso define de qué lado quedan.
- [ ] **P-4 — ¿Cómo se reembolsa?**
  - **Recomendado**: por el mismo medio de pago (MP → devolución desde el panel;
    transferencia → a la cuenta del cliente), dentro de los 10 días hábiles de
    recibida la devolución. El envío original no se devuelve, salvo falla o
    error nuestro.
- [ ] **P-5 — ¿Desde cuándo rige?**
  - **Recomendado**: para todo pedido recibido en los últimos 30 días al
    momento de publicarla. Es lo más simple de explicar y el costo de
    retroactividad es de a lo sumo un mes de pedidos.
  - Alternativa: solo pedidos hechos desde la publicación.
- [ ] **P-6 — ¿El 10 % por transferencia sigue en la tira?**
  - **Recomendado: sí.** Ya estaba en la barra y es una promo vigente; sacarlo
    no estaba en el pedido. Si preferís una tira con solo lo que pediste, se
    saca.
