# Requirements — Precios +20 % y 15 % OFF por transferencia

| | |
|---|---|
| **Spec** | `027-precios-mas-20-y-transferencia-15` |
| **Estado** | ✅ `DONE` — Mariano aprobó la tabla de precios (§9.1) el 26/09/2026 |
| **Fecha** | 26/09/2026 |
| **Autor** | Claude Code, a partir del pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

> **Pedido de Mariano (26/9/2026)**: *"Aumentar todos los precios TODOS DE
> TODO EL SITIO UN 20 % y luego poner que por TRANSFERENCIA tenés un 15 % OFF
> descuento en cualquier compra independientemente de cuántas compre (el
> mínimo es 1)."*
>
> **Decisiones de Mariano (26/9/2026)**, a las preguntas que dejaba abiertas:
> - Sube todo **producto**; los costos de envío y los umbrales de envío gratis
>   **no** cambian.
> - Los precios nuevos se redondean a **números redondos** (no ×1,2 exacto):
>   la tabla (§9.1) se le muestra antes de publicar.
> - El 15 % por transferencia aplica a **todo el pedido** (todo producto),
>   desde 1 unidad. No aplica al envío.
> - Se **suma** a los cupones de % y corre encima de las promos, con tope del
>   **25 %** (hoy 20 %). Un cupón exclusivo (EPI50) sigue sin sumar nada.

---

## 1. Problema

Mariano decidió subir los precios un 20 % y, a la vez, mover el incentivo a
pagar por transferencia: hoy es un 10 % que solo corre en calcos de catálogo
y desde 10 unidades, así que la mayoría de los pedidos (personalizados, packs,
Negocio, Polaroid, tatuajes, imprimibles, o menos de 10 calcos) no lo tienen.

## 2. Objetivo

Todos los precios de producto del sitio suben ~20 % (redondeados), y pagar por
transferencia da **15 % OFF en cualquier compra**, desde 1 unidad, con el mismo
precio en pantalla que en el cobro.

## 3. Scope

- Precio de todo producto: calcos por tamaño, promo de 100 calcos, Promo
  Negocio, recargo holográfico, tatuajes, Polaroid (y su descuento por volumen),
  imprimibles. Los precios derivados (pack mayorista, pack personalizados,
  packs del catálogo, 3x2, Argentina) se mueven solos.
- Precios tachados de display (Negocio, imprimibles).
- Descuento por transferencia: 15 %, sin mínimo, sobre todo producto.
- Todo texto del sitio que hoy dice "10 % … desde 10 calcos" por transferencia.
- Descripciones SEO con precios escritos a mano.

## 4. Fuera de scope

- Costos de envío ($4.500 / $6.500 / $8.500) y umbrales de envío gratis
  ($35.000 Rosario / $50.000 país) — decisión de Mariano.
- Los cupones (EPICA10 10 %, EPI50 50 %): no cambian.
- El descuento del 3x2, del 2x1 y de Argentina (50 %): no cambian.
- El popup de bienvenida "10 % OFF por tu mail" (EPICA10): es un cupón, no el
  descuento por transferencia.

## 5. Usuarios afectados

Todo comprador. El que paga con Mercado Pago paga ~20 % más; el que paga por
transferencia paga ~2 % más que hoy (1,2 × 0,85 = 1,02) y ahora también tiene
descuento en productos que antes no lo tenían.

## 6. User stories

- Como cliente, quiero saber desde el principio que pagando por transferencia
  tengo 15 % OFF, para elegir cómo pagar.
- Como cliente que compra 1 calco, un personalizado o un pack, quiero el
  mismo 15 % que el que compra 10 calcos.
- Como Mariano, quiero que lo que muestra la pantalla sea exactamente lo que
  se cobra, con cualquier medio de pago.

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Todo precio de producto sube según la tabla de §9.1 (aprox. +20 %, redondeado) | 🔴 must |
| RF-2 | Pagando por transferencia, **todo producto** del pedido tiene 15 % OFF, desde 1 unidad | 🔴 must |
| RF-3 | El 15 % no se aplica al costo de envío | 🔴 must |
| RF-4 | El 15 % se suma a un cupón de % (EPICA10) y corre encima del 3x2 / 2x1; lo que suman transferencia + cupón queda topeado en 25 % mientras corre una promo N x M | 🔴 must |
| RF-5 | Con un cupón exclusivo (EPI50) o de bundle, el 15 % no corre (el cupón es el único descuento, como hoy) | 🔴 must |
| RF-6 | En Argentina (50 %) el 15 % se suma: 65 % pagando por transferencia (con cupón, topeado como hoy) | 🟡 should |
| RF-7 | Ningún texto del sitio vuelve a decir "10 %" ni "desde 10 calcos" para el descuento por transferencia; el porcentaje sale de una sola constante | 🔴 must |
| RF-8 | El carrito y el checkout muestran cuánto se ahorra pagando por transferencia, para cualquier carrito | 🟡 should |
| RF-9 | Lo que el sitio muestra con transferencia es exactamente lo que cobra el servidor (sin `price_mismatch`) | 🔴 must |
| RF-10 | Un carrito guardado antes del cambio (precio viejo en `basePrice`) se cobra al precio nuevo sin trabar el checkout | 🔴 must |

## 8. Requisitos no funcionales

| ID | Tipo | Requisito |
|---|---|---|
| RNF-1 | Consistencia | Cliente y servidor con las mismas reglas (espejo, CLAUDE.md regla 11) |
| RNF-2 | Conversión | El 15 % se comunica donde hoy se comunicaba el 10 % (sin agregar pasos) |
| RNF-3 | Mobile | Los textos nuevos entran a 375 px |

## 9. Reglas de negocio

### 9.1 Tabla de precios (redondeada — pendiente del OK de Mariano)

Criterio de redondeo: calcos a los $50 más cercanos; montos redondos a los $500
más cercanos; los que terminan en …999 siguen terminando en …999 (al millar
más cercano, menos 1).

| Producto | Hoy | ×1,2 exacto | **Nuevo** |
|---|---|---|---|
| Calco 4 cm | $1.200 | $1.440 | **$1.450** |
| Calco 6 cm | $1.600 | $1.920 | **$1.900** |
| Calco 9 cm | $2.000 | $2.400 | **$2.400** |
| Promo 100 calcos (4 y 6 cm) | $39.999 | $47.998,80 | **$47.999** |
| Promo Negocio (100 de 6 cm) | $39.999 | $47.998,80 | **$47.999** |
| Negocio · precio tachado (solo display) | $96.999 | $116.398,80 | **$115.999** |
| Recargo holográfico (por pack de 100) | $15.000 | $18.000 | **$18.000** |
| → Pack holográfico completo | $54.999 | — | **$65.999** |
| Tatuajes · hoja | $12.000 | $14.400 | **$14.500** |
| Polaroid x10 · 5×8 | $9.000 | $10.800 | **$11.000** |
| Polaroid x10 · 7×10 | $12.000 | $14.400 | **$14.500** |
| Polaroid x10 · 9×13 | $15.000 | $18.000 | **$18.000** |
| Polaroid x10 · 5×8 imantadas | $15.000 | $18.000 | **$18.000** |
| Polaroid x10 · 7×10 imantadas | $18.000 | $21.600 | **$21.500** |
| Polaroid x10 · 9×13 imantadas | $21.000 | $25.200 | **$25.000** |
| Polaroid · descuento por volumen (por pack, desde 2) | $2.000 | $2.400 | **$2.500** ($250 por foto) |
| Polaroid · recargo imantado por foto (display) | $600 | $720 | **$700** (coincide con la tabla: +$7.000 por pack en los tres tamaños) |
| Imprimibles · pack de stickers | $9.999 | $11.998,80 | **$11.999** |
| Imprimibles · precio tachado (solo display) | $39.999 | $47.998,80 | **$47.999** |

Derivados (sin número propio, se mueven solos): pack mayorista (50 % off),
pack personalizados (−10 %), packs x10/x20/x50 del catálogo, 3x2, 2x1,
Argentina 50 %, umbral en que conviene Negocio.

### 9.2 Descuento por transferencia

| Regla | ¿Se modifica? |
|---|---|
| 10 % por transferencia, solo calcos de catálogo, desde 10 calcos | **sí** → 15 %, todo producto, desde 1 |
| El % no toca el envío | no |
| Transferencia + cupón se suman; tope 20 % con promo N x M | **sí** → tope 25 % |
| Cupón exclusivo / bundle anula todo % | no (y ahora anula también el 15 % de packs/fijos/digitales) |
| El envío gratis se mide sobre el subtotal YA descontado | no — pagando por transferencia hace falta un poco más de lista para cruzar el umbral |

## 10. Edge cases

| Caso | Comportamiento |
|---|---|
| 1 calco pagando por transferencia | 15 % OFF |
| Carrito solo de packs / Negocio / Polaroid / imprimibles | 15 % OFF con transferencia |
| Pack holográfico + recargo | 15 % OFF sobre los dos |
| Polaroid con descuento por volumen | el 15 % corre sobre el precio ya descontado |
| 3x2 vivo + transferencia | 3x2 primero, 15 % encima |
| EPICA10 + transferencia con 3x2 | 25 % encima del 3x2 (tope) |
| EPI50 + transferencia | solo el 50 % (sin 15 %, en ninguna línea) |
| Carrito guardado con el precio viejo | el carrito toma el precio nuevo y el servidor lo acepta |
| Cambio de medio de pago en el checkout | el total se recalcula al toque |

## 11. Analytics necesarios

Sin eventos nuevos. Cambia:

| Evento | Cambio |
|---|---|
| `promo_unlock` con `promo: 'transferencia_10'` | deja de dispararse: ya no hay umbral que desbloquear |
| `purchase` / `begin_checkout` | `value` con los precios nuevos |

## 12. Preguntas abiertas

| ID | Pregunta | Estado |
|---|---|---|
| P-1 | ¿Aprobás la tabla de §9.1? | ✅ aprobada por Mariano el 26/09/2026 |
