# Requirements — Precios +10 % y 20 % OFF por transferencia

| | |
|---|---|
| **Spec** | `029-precios-mas-10-y-transferencia-20` |
| **Estado** | ✅ `DONE` — Mariano aprobó la tabla (§9.1) y P-2/P-3 el 01/10/2026 ("Aprobado, implementá la spec 029") |
| **Fecha** | 01/10/2026 |
| **Autor** | Claude Code, a partir del pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

> **Pedido de Mariano (1/10/2026)**: *"Aumenta un 10% más todos los precios y
> para TRANSFERENCIA que sea un 20% OFF en todo."*
>
> Es la segunda suba en cinco días: la spec 027 (26/9/2026) subió todo un 20 %
> y llevó la transferencia al 15 %. Esta spec repite sus criterios —qué sube,
> cómo se redondea, qué no se toca— salvo que Mariano diga otra cosa (§12).

---

## 1. Problema

Mariano decidió subir otra vez los precios, un 10 %, y a la vez agrandar el
incentivo a pagar por transferencia: hoy es 15 % OFF en cualquier compra.

## 2. Objetivo

Todos los precios de producto del sitio suben ~10 % (redondeados), y pagar por
transferencia da **20 % OFF en cualquier compra**, desde 1 unidad, con el mismo
precio en pantalla que en el cobro.

## 3. Scope

- Precio de todo producto: calcos por tamaño, promo de 100 calcos, Promo
  Negocio, recargo holográfico, tatuajes, Polaroid (y su descuento por volumen),
  imprimibles. Los derivados (pack mayorista, pack personalizados, packs del
  catálogo, pack holográfico) se mueven solos.
- Precios tachados de display (Negocio, imprimibles).
- Descuento por transferencia: 15 % → **20 %**, sin mínimo, sobre todo producto.
- El tope de "transferencia + cupón" mientras corre una promo N x M, para que
  siga entrando el % por transferencia más el 10 % del cupón.
- El feed del catálogo de Meta (los anuncios muestran el precio).

## 4. Fuera de scope

- Costos de envío ($4.500 / $6.500 / $8.500) y umbrales de envío gratis
  ($35.000 Rosario / $50.000 país) — mismo criterio que la spec 027 (P-2).
- El 20 % no se aplica al costo de envío — mismo criterio que la 027 (P-3).
- Los cupones (EPICA10 10 %, EPI50 50 %): no cambian.
- Las promos 3x2 y 2x1: siguen **apagadas** desde el 1/10/2026; no se tocan.

## 5. Usuarios afectados

Todo comprador. El que paga con Mercado Pago paga ~10 % más; el que paga por
transferencia paga ~3,5 % más que hoy (1,1 × 0,80 = 0,88 contra 0,85).
Ejemplo: un calco de 6 cm pasa de $1.900 a $2.100 con MP, y de $1.615 a
$1.680 con transferencia.

## 6. User stories

- Como cliente, quiero ver desde el principio que pagando por transferencia
  tengo 20 % OFF, para elegir cómo pagar.
- Como Mariano, quiero que lo que muestra la pantalla sea exactamente lo que
  se cobra, con cualquier medio de pago.
- Como cliente con un carrito armado antes del cambio, quiero poder comprar sin
  que el checkout me rechace.

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Todo precio de producto sube según la tabla de §9.1 (aprox. +10 %, redondeado) | 🔴 must |
| RF-2 | Pagando por transferencia, **todo producto** del pedido tiene 20 % OFF, desde 1 unidad | 🔴 must |
| RF-3 | El 20 % no se aplica al costo de envío | 🔴 must |
| RF-4 | El 20 % se suma a un cupón de % (EPICA10): 30 %. Si vuelve una promo N x M, el tope de los dos juntos pasa a 30 % para que sigan entrando los dos | 🔴 must |
| RF-5 | Con un cupón exclusivo (EPI50) o de bundle, el 20 % no corre (el cupón es el único descuento, como hoy) | 🔴 must |
| RF-6 | Todo texto del sitio que nombra el descuento por transferencia dice 20 %; ninguno queda en 15 % | 🔴 must |
| RF-7 | Lo que el sitio muestra con transferencia es exactamente lo que cobra el servidor (sin `price_mismatch`) | 🔴 must |
| RF-8 | Un carrito guardado antes del cambio se cobra al precio nuevo sin trabar el checkout | 🔴 must |
| RF-9 | El catálogo de Meta publica los precios nuevos | 🟡 should |

## 8. Requisitos no funcionales

| ID | Tipo | Requisito |
|---|---|---|
| RNF-1 | Consistencia | Cliente y servidor con las mismas reglas (espejo, CLAUDE.md regla 11) |
| RNF-2 | Conversión | El 20 % se comunica donde hoy se comunica el 15 % (sin agregar pasos) |
| RNF-3 | Mobile | Los textos entran a 375 px |

## 9. Reglas de negocio

### 9.1 Tabla de precios (redondeada — aprobada por Mariano el 01/10/2026)

Mismo criterio de redondeo que la spec 027: calcos a los $50 más cercanos;
montos redondos a los $500 más cercanos; los que terminan en …999 siguen
terminando en …999 (al millar más cercano, menos 1).

| Producto | Hoy | ×1,1 exacto | **Nuevo** |
|---|---|---|---|
| Calco 4 cm | $1.450 | $1.595 | **$1.600** |
| Calco 6 cm | $1.900 | $2.090 | **$2.100** |
| Calco 9 cm | $2.400 | $2.640 | **$2.650** |
| Promo 100 calcos (4 y 6 cm) | $47.999 | $52.798,90 | **$52.999** |
| Promo Negocio (100 de 6 cm) | $47.999 | $52.798,90 | **$52.999** |
| Negocio · precio tachado (solo display) | $115.999 | $127.598,90 | **$127.999** |
| Recargo holográfico (por pack de 100) | $18.000 | $19.800 | **$20.000** |
| → Pack holográfico completo | $65.999 | — | **$72.999** |
| Tatuajes · hoja | $14.500 | $15.950 | **$16.000** |
| Polaroid x10 · 5×8 | $11.000 | $12.100 | **$12.000** |
| Polaroid x10 · 7×10 | $14.500 | $15.950 | **$16.000** |
| Polaroid x10 · 9×13 | $18.000 | $19.800 | **$20.000** |
| Polaroid x10 · 5×8 imantadas | $18.000 | $19.800 | **$19.500** ⚠️ |
| Polaroid x10 · 7×10 imantadas | $21.500 | $23.650 | **$23.500** |
| Polaroid x10 · 9×13 imantadas | $25.000 | $27.500 | **$27.500** |
| Polaroid · recargo imantado por foto (display) | $700 | $770 | **$750** |
| Polaroid · descuento por volumen (por pack, desde 2) | $2.500 | $2.750 | **$3.000** ⚠️ ($300 por foto) |
| Imprimibles · pack de stickers | $11.999 | $13.198,90 | **$12.999** |
| Imprimibles · precio tachado (solo display) | $47.999 | $52.798,90 | **$52.999** |

⚠️ **Dos casos que no salen del redondeo a secas:**

- **5×8 imantadas**: redondeado daría $20.000, y el recargo por imantar sería
  $8.000 en 5×8 contra $7.500 en los otros dos tamaños. La página dice un solo
  recargo por foto ($750), así que se baja a $19.500 para que coincida en los
  tres (como hizo la 027 con los $700).
- **Descuento por volumen**: ×1,1 da $275 por foto, justo en el medio entre
  $250 y $300. Se propone $300 ($3.000 por pack); la alternativa es dejarlo en
  $250.

Derivados (sin número propio, se mueven solos): pack mayorista (50 % off),
pack personalizados (−10 %), packs x10/x20/x50 del catálogo, pack holográfico,
umbral en que conviene Negocio.

### 9.2 Descuento por transferencia

| Regla | ¿Se modifica? |
|---|---|
| 15 % por transferencia, todo producto, desde 1 | **sí** → 20 % |
| El % no toca el envío | no |
| Transferencia + cupón se suman | no (ahora dan 30 %) |
| Tope de los dos juntos con promo N x M: 25 % | **sí** → 30 % (hoy no corre: las N x M están apagadas) |
| Cupón exclusivo / bundle anula todo % | no |
| El envío gratis se mide sobre el subtotal YA descontado | no |

## 10. Edge cases

| Caso | Comportamiento |
|---|---|
| 1 calco de 6 cm por transferencia | $2.100 → $1.680 |
| Carrito solo de packs / Negocio / Polaroid / imprimibles | 20 % OFF con transferencia |
| Polaroid con descuento por volumen | el 20 % corre sobre el precio ya descontado |
| EPICA10 + transferencia | 30 % |
| EPI50 + transferencia | solo el 50 % |
| Carrito guardado con el precio viejo | el carrito toma el precio nuevo y el servidor lo acepta |
| Pestaña abierta durante el deploy | `price_mismatch` → "recargá la página" → al recargar, precio nuevo |

## 11. Analytics necesarios

Sin eventos nuevos. `purchase` / `begin_checkout` llevan el `value` con los
precios nuevos.

## 12. Preguntas abiertas

| ID | Pregunta | Estado |
|---|---|---|
| P-1 | ¿Aprobás la tabla de §9.1, con los dos ajustes marcados ⚠️? | ✅ aprobada el 01/10/2026 (con los dos ajustes) |
| P-2 | ¿Los costos y umbrales de envío quedan como están (como en la 027)? | ✅ sí, sin cambios |
| P-3 | ¿El 20 % sigue sin aplicarse al envío (como el 15 %)? | ✅ sí, no se aplica al envío |

## 13. Hallazgo de la implementación

⚠️ **La promo de 100 calcos y la Promo Negocio ($52.999) cruzan ahora el
umbral de envío gratis a todo el país ($50.000) pagando con Mercado Pago.**
Hasta el 1/10/2026 ($47.999) quedaban abajo y pagaban $6.500 a ciudades
próximas y $8.500 al interior. No es una promo regalando el envío: es la regla
de siempre (manda el umbral) con el precio nuevo. Por transferencia ($42.399)
siguen pagando envío fuera de Rosario.

### 13.1 Enmienda (1/10/2026) — umbral nacional a $55.000

**Decisión de Mariano**: *"Subí el umbral a $55.000"*. El umbral de envío
gratis al resto del país pasa de $50.000 a **$55.000**; el de Rosario sigue en
$35.000 y los costos de envío no cambian. Con eso la promo de 100 calcos y
Negocio ($52.999) vuelven a pagar envío fuera de Rosario con cualquier medio de
pago, como hasta el 1/10/2026.

| ID | Requisito | Prioridad |
|---|---|---|
| RF-10 | El envío es gratis al resto del país desde $55.000 (subtotal ya descontado) | 🔴 must |
| RF-11 | La promo de 100 calcos y Negocio quedan por debajo del umbral nacional; si una suba futura las deja arriba, el deploy se frena hasta que alguien lo decida | 🟡 should |

Esto deja sin efecto la línea de §4 que dejaba los umbrales fuera de scope, solo
para el nacional.
