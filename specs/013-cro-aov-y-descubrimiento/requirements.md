# Requirements — CRO: ticket promedio y fricción de descubrimiento

| | |
|---|---|
| **Spec** | `013-cro-aov-y-descubrimiento` |
| **Estado** | `APROBADA — IMPLEMENTADA` |
| **Fecha** | 02/09/2026 |
| **Autor** | Mariano (plan CRO) + Claude (discovery) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

El plan CRO pide atacar dos métricas: **subir el ticket promedio (AOV)** y
**bajar la fricción de elegir** entre 3.397 diseños repartidos en 61 categorías.

El discovery sobre el código encontró que **la mitad de lo pedido ya existe**, y
que lo que falta está concentrado en tres huecos concretos y uno estructural:

1. **El carrito lateral (`CartDrawer`) es el punto ciego.** La barra de envío
   gratis existe (`FreeShippingProgress`) pero **solo vive en `/carrito`**. El
   drawer es lo que se abre cada vez que alguien toca "+" en la grilla: es la
   pantalla que más se ve en toda la compra, y es la única que no dice cuánto
   falta para el envío gratis.
2. **Los nudges de descuento son texto plano.** El "sumá N calcos más para el
   10 % off" existe en el drawer y en `/carrito`, pero como una línea gris de
   11 px. No hay medidor: no se ve *cuán cerca* está.
3. **El drawer no ofrece nada para sumar.** El cross-sell (`SuggestedStickers`)
   está en `/carrito` y en `/checkout`, pero no en el drawer, que es donde el
   cliente todavía está eligiendo.
4. **El autocomplete del buscador es texto.** Devuelve categorías como
   `🌸 Anime · 36 diseños`. En un negocio donde el producto **es** la imagen, la
   sugerencia no muestra ninguna imagen.
5. **La grilla no dice para qué sirve cada tamaño.** El `SizePicker` muestra
   `4 cm / 6 cm / 9 cm` y su precio. La información de uso ("ideal para termo",
   "ideal para notebook") existe en `SizeGuide`, pero ese componente sólo está en
   la ficha de producto y en las landings — **no en la grilla de categoría**,
   que es donde se toca "+".

---

## 2. Objetivo

Que el carrito lateral empuje activamente hacia los dos umbrales que suben el
ticket (envío gratis y 10 % por transferencia), que ofrezca algo para sumar en
un click, y que elegir deje de depender de leer texto.

**Cómo se sabrá que funcionó**
- `add_to_cart` con `item_list_name = 'order_bump_drawer'` > 0 en GA4.
- Sube la proporción de pedidos por encima de `freeShippingThresholdRosario`.
- Sube el CTR del autocomplete (`search` → navegación a `/categoria/*`).

---

## 3. Scope

Lo que **sí** entra:

- [x] Barra de progreso de envío gratis dentro del `CartDrawer`
- [x] Medidor visual (no texto) del 10 % por transferencia, en drawer y `/carrito`
- [x] Order bump de un click dentro del `CartDrawer`
- [x] Miniatura de la categoría en el autocomplete del buscador
- [x] Uso recomendado de cada tamaño ("termo", "notebook", "auto") en la grilla

---

## 4. Fuera de scope

- [ ] **Pack de N calcos sorpresa a precio fijo.** Inventa un precio nuevo, y un
      precio nuevo hay que espejarlo en el servidor (regla 11) y además es una
      decisión comercial de Mariano (`CLAUDE.md` § *Lo que NO se hace*).
- [ ] **Packs temáticos curados** ("Pack Termo Matero x20"). Requiere curaduría
      de diseños **y** precio nuevo **y** republicar `/armar-pack`, que Mariano
      despublicó el 26/8/2026 (`HIDDEN_SECTIONS`).
- [ ] **Doofinder / Algolia.** Servicio externo pago para un catálogo de 3.397
      archivos estáticos. `CLAUDE.md` regla 10.
- [ ] **Buscar diseños individuales.** Los diseños del catálogo no tienen nombre
      ni tags: se llaman `Anime #12`. No hay metadata sobre la que buscar (ver
      `design.md` §0).
- [ ] Cualquier cambio de precio, promo, cupón o umbral de envío.
- [ ] Fases 3 y 4 del plan (B2B y retención) — quedan para otro momento.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra | Ve cuánto le falta para el envío gratis y para el 10 %, sin salir del drawer; puede sumar un calco en un click |
| Cliente que vuelve (carrito guardado) | No afectado: no cambia la forma de las líneas de `epicalcos.cart.v2` |
| Mariano (operación) | No afectado: no cambia el mail del pedido ni el CRM |
| Sistemas externos (CRM, Meta, MP) | No afectado: mismo payload de checkout |

---

## 6. User stories

- **US-1** — Como cliente que acaba de agregar un calco, quiero ver cuánto me
  falta para el envío gratis **sin cerrar el carrito**, para decidir si sumo uno
  más antes de pagar.
- **US-2** — Como cliente al que le faltan 2 calcos para el 10 %, quiero **ver**
  cuán cerca estoy y no tener que leerlo, para que la meta se sienta alcanzable.
- **US-3** — Como cliente indeciso, quiero que el carrito me ofrezca un calco
  concreto para sumar en un toque, para no volver a la grilla de 3.397 diseños.
- **US-4** — Como cliente que escribe "anime", quiero **ver** un calco de anime
  en la sugerencia, para confirmar que es lo que busco antes de navegar.
- **US-5** — Como cliente que quiere decorar un termo, quiero que la grilla me
  diga qué tamaño le sirve a un termo, para no elegir mal.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | El `CartDrawer` muestra el progreso hacia el envío gratis, con barra y monto faltante | 🔴 must |
| RF-2 | Ese progreso usa el subtotal **físico** (los archivos digitales no viajan en la caja) y no aparece con un carrito 100 % digital | 🔴 must |
| RF-3 | El progreso hacia el 10 % por transferencia se muestra como medidor de unidades (N de 10), en drawer y en `/carrito` | 🔴 must |
| RF-4 | El medidor del 10 % declara siempre la condición "pagando por transferencia" — nunca "10 % off" a secas | 🔴 must |
| RF-5 | El `CartDrawer` ofrece **un** calco concreto para sumar en un click, en el tamaño ya elegido, sin cerrar el drawer | 🔴 must |
| RF-6 | El order bump no ofrece nada que ya esté en el carrito, y desaparece si no queda nada para ofrecer | 🔴 must |
| RF-7 | El order bump prioriza categorías que el cliente ya tiene en el carrito | 🟡 should |
| RF-8 | El autocomplete muestra una miniatura de la categoría junto a cada sugerencia | 🔴 must |
| RF-9 | Si la miniatura no carga, la sugerencia sigue siendo legible (cae al emoji) | 🔴 must |
| RF-10 | El `SizePicker` de la grilla muestra el uso recomendado de cada tamaño | 🟡 should |
| RF-11 | El uso recomendado se escribe **una sola vez** y lo consumen el picker y la guía | 🟡 should |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | El drawer a 375 px sigue mostrando el botón "Ir al checkout" sin scroll |
| RNF-2 | **Performance** | Sin scripts bloqueantes; el manifest del order bump se baja recién al abrir el drawer y comparte cache con `SuggestedStickers` |
| RNF-3 | **Accesibilidad** | `role="progressbar"` con `aria-valuenow`; botón de agregar con `aria-label`; targets de 44 px |
| RNF-4 | **Compatibilidad** | No cambia la forma de las líneas del carrito guardado |
| RNF-5 | **Seguridad** | Ningún precio nuevo; todo sale de `config/pricing.js`, ya espejado |
| RNF-6 | **Sin dependencias nuevas** | Ninguna |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Envío gratis sólo por umbral de zona | `business-rules.md` §envíos | **no** |
| 10 % por volumen sólo con transferencia, desde 10 calcos | `business-rules.md` §descuentos | **no** |
| Precio por tamaño (4/6/9 cm) | `business-rules.md` §precios | **no** |

⚠️ **Esta feature NO toca el camino de precios.**

- [ ] ~~Requiere cambio espejado en `pricing.js`~~ — **no**: consume
      `BULK_THRESHOLD`, `SIZES` y `shipping` tal como están.
- [ ] ~~Requiere cambio espejado en `site.js` y el servidor~~ — **no**.
- [ ] ~~Requiere test de paridad nuevo~~ — **no**. Los existentes deben seguir
      pasando sin cambios (§4 de `acceptance.md`).

El order bump agrega líneas con `addSticker()`, exactamente el mismo camino que
la grilla: el id es `sticker:{id}:{size}` y el precio lo pone `priceForSize()`.
No hay forma de que introduzca un `price_mismatch` que la grilla no introduzca.

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Carrito vacío | El drawer muestra el estado vacío de siempre; ni barras ni order bump |
| Carrito 100 % digital | Sin barra de envío y sin medidor del 10 % (ninguno aplica a un archivo) |
| Carrito guardado con formato viejo | Sin cambios: no se toca la forma de la línea |
| Promo 3x2 vigente | El mensaje de la promo manda; el medidor del 10 % igual se muestra porque el 10 % por transferencia **sí** se suma encima de la 3x2 (tope `percentCap`) |
| Ya alcanzó los dos umbrales | Las dos barras muestran el estado "logrado", no desaparecen |
| El manifest de una categoría no baja | El order bump no se muestra; el drawer funciona igual |
| Una miniatura del autocomplete no carga | Se oculta la imagen y queda el emoji |
| `localStorage` bloqueado (Instagram embebido) | El tamaño elegido cae al default; el order bump agrega igual |

---

## 11. Analytics necesarios

### Eventos nuevos
| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| — | — | — | — |

**No hay eventos nuevos.** El order bump agrega con `addSticker()`, que ya
dispara `add_to_cart` por `lib/analytics.js`.

### Eventos existentes que cambian
| Evento | Qué cambia | Por qué |
|---|---|---|
| `add_to_cart` | Los items agregados desde el order bump viajan con `item_list_name: 'order_bump_drawer'` | Sin eso, en GA4 un calco sumado desde el drawer es indistinguible de uno sumado desde la grilla, y no se puede medir si el bump sirve |

### Qué se quiere poder responder
- ¿Cuántos pedidos suman al menos un calco desde el order bump del drawer?
- ¿Sube la proporción de pedidos por encima del umbral de envío gratis?

**Recordatorios respetados**: todo por `lib/analytics.js`, todo en `try/catch`
(ya lo está en `pushDataLayer`), sin PII.

---

## 12. Preguntas abiertas

- [x] **RESUELTO** — ¿Se puede hacer el "pack de 3 calcos sorpresa a $2.500"?
      **No sin decisión de Mariano**: es un precio nuevo. Queda fuera de scope.
- [x] **RESUELTO** — ¿Se republica `/armar-pack` para los packs temáticos?
      **No**: lo despublicó Mariano el 26/8/2026 y republicar una sección está en
      la lista de lo que no se hace sin pedirlo.
- [ ] `REQUIERE DECISIÓN DE MARIANO` — Si querés los packs temáticos, hace falta:
      qué diseños entran en cada pack, a qué precio, y si `/armar-pack` vuelve.
