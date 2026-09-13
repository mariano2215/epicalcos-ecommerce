# Requirements — Polaroid imantadas y descuento por volumen

| | |
|---|---|
| **Spec** | `019-polaroid-imantadas` |
| **Estado** | `DONE` — implementada y validada el 13/09/2026 |
| **Fecha** | 13/09/2026 |
| **Autor** | Claude Code, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

---

## 1. Problema

Hoy `/polaroid` vende **una sola cosa**: un pack de 10 fotos en papel, en tres
tamaños (5×8, 7×10 y 9×13), a $9.000 / $12.000 / $15.000. No hay forma de pedir
las fotos **imantadas**, que es un producto que Mariano ya puede producir y que
tiene un valor percibido distinto (la foto va a la heladera, no a un cajón).

Además, la página no premia comprar más: pedir 20 fotos cuesta exactamente el
doble que pedir 10. No hay ningún motivo para que el cliente suba de un pack,
y el costo de producción y de envío de 20 fotos no es el doble que el de 10.

Las dos cosas van juntas en el mismo cambio porque tocan el mismo precio y la
misma pantalla: separarlas obligaría a tocar el camino de precios dos veces.

---

## 2. Objetivo

Que en `/polaroid` el cliente pueda elegir **imantadas o comunes** en cualquiera
de los tres tamaños, y que a partir de **20 fotos** el precio por foto baje
$200 — con el mismo número mostrado en la ficha, en el carrito y en el checkout.

**Cómo se sabrá que funcionó**: entran pedidos de Polaroid imantadas, y el
ticket promedio de `/polaroid` sube porque aparecen pedidos de 20 fotos o más.
Señal de alarma equivalente: ningún checkout de Polaroid se rechaza con
`price_mismatch`.

---

## 3. Scope

Lo que **sí** entra:

- [ ] Opción **imantadas** en `/polaroid`, disponible en los tres tamaños, con
      un recargo de **$600 por foto** ($6.000 sobre el pack de 10).
- [ ] **Descuento por volumen**: desde **20 fotos**, $200 menos por foto.
- [ ] El descuento por volumen aplica **a todas las Polaroid**, imantadas y
      comunes (decisión de Mariano, 13/09/2026).
- [ ] Que el precio se vea igual en la ficha, en el carrito y en el checkout, y
      que el servidor lo revalide.
- [ ] Que el pedido diga claramente si las fotos son imantadas o comunes, en el
      carrito, en el mail, en el CRM y en el resumen de WhatsApp.
- [ ] Analytics de la elección de imantadas (§11).

---

## 4. Fuera de scope

Lo que **no** entra, aunque esté cerca y sea tentador:

- [ ] Cambiar los precios base de las Polaroid comunes de 10 fotos
      ($9.000 / $12.000 / $15.000 quedan como están).
- [ ] Agregar tamaños nuevos.
- [ ] Extender el imantado ni el descuento por volumen a otros productos
      (tatuajes, calcos, packs).
- [ ] Tocar el descuento por volumen de calcos sueltos, los cupones, las promos
      N×M ni los umbrales de envío.
- [ ] Rediseñar la ficha de producto de precio fijo. Se agregan los controles
      que la feature necesita y nada más.
- [ ] Un flujo de subida de archivos distinto para imantadas: sube las fotos
      igual que hoy.
- [ ] Producto nuevo en el catálogo de Meta: las imantadas son una variante del
      mismo producto (§5, sistemas externos).

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra | Ve una opción más (imantadas / comunes) y un precio que baja al llegar a 20 fotos. Un paso más en la decisión, sin campos nuevos que completar. |
| Cliente que vuelve (carrito guardado) | **No afectado**: las líneas de Polaroid que ya están guardadas siguen siendo válidas y mantienen su precio. Ver §10. |
| Mariano (operación) | Tiene que poder distinguir un pedido de imantadas de uno común sin preguntarle al cliente: cambia el material y el proceso de producción. |
| Sistemas externos (CRM, Meta, MP) | El nombre de la línea que viaja al CRM, al mail y a Mercado Pago dice si es imantada. En el catálogo de Meta sigue siendo el mismo producto (Polaroid), sin SKU nuevo. |

---

## 6. User stories

```
Como cliente que quiere regalar fotos
quiero pedirlas imantadas
para que queden pegadas en la heladera y no guardadas en un cajón
```

```
Como cliente que ya decidió comprar Polaroid
quiero que pedir 20 me salga más barato por foto que pedir 10
para que me convenga llevar el doble
```

```
Como Mariano
quiero ver en el pedido si las fotos son imantadas
para producirlas con el material correcto sin tener que preguntar
```

- **US-1** — Elegir imantadas o comunes en cualquiera de los tres tamaños.
- **US-2** — Ver el precio actualizado, con el recargo y con el descuento por
  volumen ya aplicados, **antes** de agregar al carrito.
- **US-3** — Que el pedido identifique el material sin ambigüedad.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | En `/polaroid` el cliente puede elegir entre **Polaroid comunes** e **imantadas**, en los tres tamaños. Por defecto arranca en **comunes**. | 🔴 must |
| RF-2 | Las imantadas cuestan **$600 más por foto** que las comunes del mismo tamaño: $15.000 / $18.000 / $21.000 el pack de 10 (5×8 / 7×10 / 9×13). | 🔴 must |
| RF-3 | Desde **20 fotos** (2 packs o más), el precio baja **$200 por foto** — $2.000 por pack — tanto en comunes como en imantadas. | 🔴 must |
| RF-4 | El descuento por volumen **escala**: 30 fotos también pagan $200 menos por foto, y así hacia arriba. No es un escalón único de 20. | 🔴 must |
| RF-5 | El precio que se muestra en la ficha es el mismo que el del carrito y el del checkout, incluido el caso de 20 o más fotos. | 🔴 must |
| RF-6 | El servidor revalida el precio de las Polaroid con las mismas reglas y **rechaza** lo que no coincida. | 🔴 must |
| RF-7 | El nombre de la línea del pedido dice tamaño **y** material (ej. *"Fotos Polaroid · x10 · 7 × 10 cm · Imantadas"*), y ese nombre llega al carrito, al checkout, al mail, al CRM y al resumen de WhatsApp. | 🔴 must |
| RF-8 | Cambiar de comunes a imantadas, o de tamaño, actualiza el precio mostrado sin recargar la página. | 🔴 must |
| RF-9 | La ficha le dice al cliente, antes de que elija, que desde 20 fotos el precio por foto baja $200. | 🟡 should |
| RF-10 | El cupo de fotos que se pueden subir sigue siendo 10 por pack (sube solo al subir la cantidad), igual que hoy, sin importar si son imantadas. | 🔴 must |
| RF-11 | Una línea de Polaroid imantadas y una de comunes del mismo tamaño conviven en el carrito como **dos líneas distintas**. | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | El selector de material funciona a 375 px sin scroll horizontal y sin empujar el botón de agregar fuera de la pantalla. |
| RNF-2 | **Performance** | Sin scripts nuevos, sin imágenes nuevas bloqueantes. `/polaroid` sigue siendo una ruta `lazy()`. |
| RNF-3 | **Accesibilidad** | El selector de material se opera con teclado, tiene foco visible, targets de 44 px y estado seleccionado anunciado (no solo color). |
| RNF-4 | **Compatibilidad** | Las líneas de Polaroid ya guardadas en `localStorage` siguen siendo válidas y no cambian de precio. |
| RNF-5 | **Seguridad** | El precio no se confía al cliente: el servidor lo deriva del id de la línea y de la cantidad. |
| RNF-6 | **Sin dependencias nuevas** | Ninguna. |
| RNF-7 | **Conversión** | El paso nuevo es una elección con default ya puesto (comunes): el cliente que no quiere elegir nada compra igual que hoy, con los mismos clicks. |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Productos de precio fijo: precio por id de línea, sin descuentos | `business-rules.md` §Productos de precio fijo | **sí** — las Polaroid pasan a tener precio dependiente de la cantidad |
| Polaroid x10 en tres tamaños | `business-rules.md` §Productos de precio fijo | **sí** — se suma la variante imantada |
| El envío gratis se gana solo cruzando el umbral | `business-rules.md` §Envíos | no |
| Cupones, promos N×M y 10 % por transferencia no tocan las líneas de precio fijo | `business-rules.md` §Descuentos | **no** — las Polaroid siguen fuera de todos esos descuentos |
| 10 % por volumen de calcos sueltos | `business-rules.md` §Descuentos | no |

⚠️ **Esta feature toca precios**:

- [x] Requiere cambio espejado en `frontend/src/config/pricing.js` **y**
      `netlify/functions/lib/pricing.js`
- [ ] Requiere cambio espejado en `frontend/src/config/site.js` **y** el bloque
      de envío del servidor
- [x] Requiere test de paridad nuevo o actualizado

Ver `CLAUDE.md` regla 11 y `docs/business-rules.md` §8.

### Tabla de precios resultante

Precio **por pack de 10 fotos**:

| Tamaño | Comunes x10 | Imantadas x10 | Comunes desde 20 (c/pack) | Imantadas desde 20 (c/pack) |
|---|---|---|---|---|
| 5 × 8 cm | $9.000 | $15.000 | $7.000 | $13.000 |
| 7 × 10 cm | $12.000 | $18.000 | $10.000 | $16.000 |
| 9 × 13 cm | $15.000 | $21.000 | $13.000 | $19.000 |

Totales de referencia con **20 fotos**:

| Tamaño | 20 comunes | 20 imantadas |
|---|---|---|
| 5 × 8 cm | $14.000 | $26.000 |
| 7 × 10 cm | **$20.000** | **$32.000** ← el ejemplo que dio Mariano |
| 9 × 13 cm | $26.000 | $38.000 |

Con **30 fotos** de 7 × 10 imantadas: $48.000 (3 × $16.000).

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Carrito guardado con una línea de Polaroid de antes del cambio | Sigue siendo válida y se cobra al mismo precio que hoy si es de 1 pack. Si tenía 2 packs o más, **pasa a valer menos** (le corre el descuento nuevo): el cliente nunca ve un precio que sube, y el servidor espera exactamente ese número. |
| Carrito con 2 líneas de 10 fotos en vez de 1 línea de 20 | **No** se lleva el descuento: el volumen se cuenta por línea. Es el caso que aparece al subir fotos en dos tandas — ver `design.md` §1, es una decisión consciente y tiene mitigación en la ficha. |
| Cliente sube el contador a 2 y después lo baja a 1 | El precio vuelve al de 1 pack, en la ficha y en el carrito, sin quedar pegado el precio con descuento. |
| Cliente cambia de comunes a imantadas con fotos ya subidas | Las fotos subidas se mantienen: el material no cambia el cupo ni los formatos aceptados. |
| Cantidad máxima (1.000 por línea) | El descuento sigue siendo $200 por foto, sin escalones nuevos ni tope. |
| Cliente vuelve de Mercado Pago y refresca | Sin cambios respecto de hoy: el pedido ya está cerrado del lado del servidor. |
| Falla Cloudinary al subir las fotos | Sin cambios respecto de hoy: se puede comprar igual y mandar las fotos por WhatsApp. |

---

## 11. Analytics necesarios

`CLAUDE.md` regla 13.

### Eventos nuevos

| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| `polaroid_material` | El cliente cambia el selector de material en `/polaroid` | `material` (`comunes` \| `imantadas`), `tamano` (`5x8` \| `7x10` \| `9x13`) | GA4 |

Un solo evento nuevo, y es el que contesta la única pregunta comercial que hoy
no se puede contestar: **qué porcentaje elige imantadas**. El descuento por
volumen no necesita evento propio: se lee de la cantidad de los `add_to_cart` y
de los `purchase` que ya existen.

### Eventos existentes que cambian

| Evento | Qué cambia | Por qué |
|---|---|---|
| `view_item` | El `price` pasa a ser el del material y tamaño elegidos | Si no, Meta y GA4 reciben el precio de las comunes para una ficha que muestra imantadas |
| `add_to_cart` | El `item_name` y el `item_id` distinguen imantadas de comunes; el `price` ya trae el descuento por volumen | El valor reportado tiene que ser el que el cliente va a pagar |
| `purchase` | Nada estructural: hereda el nombre y el precio de la línea | — |

### Qué se quiere poder responder con estos datos

- ¿Qué proporción de los pedidos de Polaroid elige imantadas?
- ¿Cambia esa proporción por tamaño?
- ¿Cuántos pedidos llegan a 20 fotos, y cuánto sube el ticket promedio de
  `/polaroid` después del cambio?

**Recordatorios**
- Todo sale por `frontend/src/lib/analytics.js`. Nunca `gtag`/`fbq`/`dataLayer`
  directo desde un componente.
- El tracking va en `try/catch` — nunca puede romper la compra.
- **Nunca PII** en el `dataLayer`.

---

## 12. Preguntas abiertas

- [x] ~~¿El descuento de $200/foto es solo para imantadas o para todas?~~ →
      **para todas las Polaroid** (Mariano, 13/09/2026).
- [x] ~~¿El descuento es solo en el escalón de 20 o de 20 en adelante?~~ →
      **de 20 en adelante** (Mariano, 13/09/2026).
- [x] ~~¿El recargo de imantadas es $600 por foto en los tres tamaños?~~ →
      **sí, $600 en los tres** (Mariano, 13/09/2026).
- [x] ~~¿El volumen se cuenta por línea o sumando todo el carrito?~~ → se
      implementó **por línea**, como proponía `design.md` §1. Sigue siendo la
      decisión más fácil de revisar si la operación muestra que molesta.
- [ ] `SIGUE ABIERTA` — ¿Hay capacidad de producción para las imantadas en los
      tres tamaños desde el día uno? Están publicados los tres. Si alguno no
      está listo, se saca esa opción sin tocar el resto de la tabla.
- [ ] `SIGUE ABIERTA` — La ficha usa `/images/polaroid.webp` para las dos
      variantes. El imantado hoy se vende **solo con texto**: una foto de las
      fotos pegadas en la heladera es la mejora más barata que le queda a esta
      página.
