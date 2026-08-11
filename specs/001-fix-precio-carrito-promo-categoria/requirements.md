# Requirements — El carrito ignora las promos por categoría

| | |
|---|---|
| **Spec** | `001-fix-precio-carrito-promo-categoria` |
| **Estado** | `DONE` (11/08/2026) |
| **Fecha** | 11/08/2026 |
| **Autor** | Claude (auditoría SDD) |
| **Urgencia** | 🔴 la promo Argentina arranca el **17/08/2026** — quedan 6 días |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

El carrito muestra el **precio de lista** de los calcos que están en promo por
categoría, mientras la grilla, la ficha y el total del checkout muestran el
precio con descuento.

Del **17 al 19 de agosto de 2026**, con la promo ARGENTINA 50 % activa, un calco
de la categoría `argentina` de 6 cm recorre así el camino de compra:

| Pantalla | Precio por unidad | ¿Correcto? |
|---|---|---|
| Grilla de categoría | $800 | ✅ |
| Ficha del producto | $800 | ✅ |
| **Carrito y drawer** | **$1.600** | ❌ |
| **Subtotal y Total del carrito** | **$1.600** | ❌ |
| Checkout — total a pagar | $800 | ✅ |

El cliente elige por $800, abre el carrito y ve $1.600. En el paso donde decide
si sigue o abandona, el sitio le dice que el precio subió al doble.

### Por qué pasa

El descuento de la promo por categoría **no depende del carrito**: depende
únicamente del diseño. Los otros descuentos sí dependen del carrito (el 10 % por
volumen necesita saber cuántas unidades hay; el cupón y el 10 % por transferencia
necesitan el medio de pago), y por eso se resuelven correctamente recién en el
checkout.

La promo por categoría se implementó siguiendo ese mismo camino, pero es de otra
naturaleza: se puede —y se debe— mostrar desde el momento en que el calco entra
al carrito.

### Dos daños colaterales

**a) La barra de envío gratis promete de más.** El progreso hacia el envío
gratis se calcula sobre el subtotal del carrito. Con precios de lista, un carrito
de calcos de Argentina alcanza el umbral **antes** de lo que el checkout va a
reconocer: el cliente lee *"✓ Tenés envío gratis"* y en el checkout le aparece el
costo de envío.

**b) Analytics reporta el doble.** Los eventos `add_to_cart`, `remove_from_cart` y
`view_cart` viajan a GA4 y Meta con el precio de lista. Durante la promo, la parte
alta del funnel reporta el doble del valor real, mientras `purchase` reporta bien.
Los ratios por valor quedan distorsionados y Meta optimiza contra una señal
inflada.

### Aclaración sobre el checkout

El checkout **no está roto**: lista los ítems a precio de lista y aplica una línea
"Descuento" que sí incluye el 50 %. Su total es correcto. El único problema real
ahí es que esa línea se rotula "Descuento" a secas — no nombra la promo (ver RF-5).

### Alcance real del defecto

Esto **no es un problema de la promo Argentina**: es un problema del mecanismo de
promos por categoría. Cualquier promo por categoría futura va a tener el mismo
comportamiento. Se arregla el mecanismo, no la promo puntual.

---

## 2. Objetivo

Que el precio que el cliente ve para un producto sea **el mismo en toda la
tienda**, desde la grilla hasta el total que paga.

**Cómo se sabrá que funcionó**: durante la ventana de la promo, un calco de la
categoría en oferta muestra el mismo importe en la grilla, en la ficha, en el
carrito y en el total del checkout. La barra de envío gratis se activa en el
mismo punto en que el checkout lo reconoce.

---

## 3. Scope

- [ ] El carrito y el drawer muestran el precio con la promo por categoría
      aplicada, por ítem y en el subtotal/total
- [ ] El progreso hacia el envío gratis se calcula sobre ese precio
- [ ] `add_to_cart`, `remove_from_cart` y `view_cart` reportan ese precio
- [ ] La línea "Descuento" del checkout nombra la promo por categoría cuando
      corresponde
- [ ] La solución es **genérica**: sirve para cualquier promo por categoría
      futura, no solo para ARGENTINA 50 %
- [ ] La solución es **estable en el tiempo**: un carrito guardado antes,
      durante o después de la ventana muestra y cobra el precio correcto

---

## 4. Fuera de scope

- [ ] **Refactorizar el espejo de precios frontend↔servidor.** Es la deuda más
      grande del repo y merece su propia spec.
- [ ] **Retirar la promo 3x2 vencida** (`docs/architecture.md` §12.4).
- [ ] **Rediseñar cómo el checkout lista los ítems.** Hoy muestra precio de lista
      + línea de descuento y su total es correcto; cambiar esa presentación es
      una decisión de diseño aparte.
- [ ] Cambiar el porcentaje, la categoría o las fechas de la promo ARGENTINA.
- [ ] Tocar el 10 % por volumen, los cupones o el 10 % por transferencia: esos
      **sí** dependen del carrito y está bien que se resuelvan en el checkout.
- [ ] Corregir el `value` de `begin_checkout` o `purchase`: ya son correctos.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| **Cliente que compra durante la promo** | Hoy ve el precio duplicado en el carrito, justo antes de decidir. Es quien sufre el problema. |
| **Cliente que llega desde un anuncio** | Peor caso: el anuncio promete la promo, la grilla la confirma y el carrito la desmiente. |
| **Cliente con carrito guardado** | Agregó calcos antes de la promo y vuelve durante (o al revés): el precio tiene que corregirse solo al cargar. |
| **Mariano** | Los datos de GA4 y Meta de la parte alta del funnel no son confiables durante promos por categoría. |
| **Meta (optimización de campañas)** | Recibe señales de valor infladas en `add_to_cart` durante la promo. |
| Sistemas externos (MP, CRM, Notion) | **No afectados**: reciben el precio final, que ya es correcto. |

---

## 6. User stories

- **US-1** — Como cliente que agrega un calco en promo, quiero que el carrito
  muestre el mismo precio que vi en la grilla, para no desconfiar del sitio justo
  antes de pagar.

- **US-2** — Como cliente que está juntando calcos para llegar al envío gratis,
  quiero que la barra de progreso use el precio real, para que el checkout no me
  desmienta después de cargar todos mis datos.

- **US-3** — Como cliente que dejó el carrito armado antes de que empezara la
  promo, quiero que al volver el precio se actualice solo, sin tener que vaciar
  el carrito.

- **US-4** — Como Mariano, quiero que el valor reportado a GA4 y Meta durante una
  promo sea el real, para poder confiar en el ROAS y en la optimización de las
  campañas.

- **US-5** — Como Mariano, quiero que la próxima promo por categoría funcione
  bien sin volver a tocar el carrito, para no repetir este arreglo cada vez.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| **RF-1** | El carrito y el drawer muestran, por ítem, el precio con la promo por categoría aplicada | 🔴 must |
| **RF-2** | El subtotal y el total del carrito se calculan sobre ese precio | 🔴 must |
| **RF-3** | El progreso hacia el envío gratis se calcula sobre ese precio | 🔴 must |
| **RF-4** | `add_to_cart`, `remove_from_cart` y `view_cart` reportan ese precio | 🔴 must |
| **RF-5** | Cuando hay una promo por categoría activa, la línea "Descuento" del checkout la nombra | 🟡 should |
| **RF-6** | El bloque "Con transferencia" del carrito sigue mostrando el importe correcto | 🔴 must |
| **RF-7** | El precio que se manda al servidor **no cambia**: el checkout sigue siendo aceptado sin `price_mismatch` | 🔴 must |
| **RF-8** | La regla vale para cualquier categoría en promo, no solo `argentina` | 🔴 must |
| **RF-9** | Fuera de la ventana de la promo, todos los precios vuelven solos al de lista | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| **RNF-1** | Mobile-first | el carrito funciona a 375 px sin scroll horizontal |
| **RNF-2** | Performance | sin recálculos por render fuera del `useMemo` existente; sin scripts nuevos |
| **RNF-3** | Accesibilidad | si se agrega un precio tachado, el lector de pantalla anuncia el precio vigente, no el tachado |
| **RNF-4** | **Compatibilidad con carritos guardados** | un carrito en `epicalcos.cart.v2` guardado antes del cambio sigue funcionando **sin migración** |
| **RNF-5** | **Estabilidad temporal** | el precio guardado en el carrito no puede quedar "congelado" con el valor de la promo |
| **RNF-6** | Seguridad | el servidor sigue sin confiar en ningún valor del cliente |
| **RNF-7** | Sin dependencias nuevas | ninguna |
| **RNF-8** | Consistencia del espejo | no cambia ninguna regla de precio ⇒ no requiere tocar el servidor |

> **RNF-5 es el requisito más delicado de esta spec.** Guardar el precio con
> descuento en la línea del carrito parece la solución obvia y es una trampa: un
> carrito guardado durante la promo y retomado después mandaría un precio que el
> servidor ya no acepta, y le trabaría **todo** el checkout al cliente con
> `price_mismatch`. Hay precedente exacto de este tipo de daño en
> `esCustomViejo()` del `CartContext`.

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Promo ARGENTINA 50 % — fechas, categoría, porcentaje | `business-rules.md` §3.3 | **no** |
| Acumulación con transferencia y cupón (se suman, tope 90 %) | `business-rules.md` §2, §9 | **no** |
| Orden de aplicación de descuentos | `business-rules.md` §9 | **no** |
| Umbrales de envío gratis | `business-rules.md` §5 | **no** |
| Precio de vidriera = precio de Mercado Pago | `business-rules.md` §1 | **no** |

**Esta spec no cambia ninguna regla comercial.** Corrige dónde y cuándo se
*muestra* una regla que ya existe y que el servidor ya aplica.

### Espejo de precios

- [x] **NO** requiere cambio en `frontend/src/config/pricing.js` (reglas)
- [x] **NO** requiere cambio en `netlify/functions/lib/pricing.js`
- [x] **NO** requiere cambio en `frontend/src/config/site.js`
- [ ] **SÍ** requiere test nuevo que verifique que lo que el carrito **muestra**
      coincide con lo que el servidor **cobra**

> El espejo hoy está verificado en el eje "lo que el cliente **manda** == lo que
> el servidor **valida**". Este defecto vivía en un eje que ningún test cubre:
> "lo que el cliente **ve** == lo que el cliente **paga**". Cerrar ese hueco es
> parte del entregable.

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Carrito vacío | sin cambios |
| Calco de una categoría **sin** promo | precio de lista, sin cambios |
| Carrito mixto (categoría en promo + otras + packs + digitales) | solo los de la categoría en promo se muestran con descuento |
| **Carrito armado antes de la promo, abierto durante** | al cargar la página muestra el precio con descuento |
| **Carrito armado durante la promo, abierto después** | al cargar la página vuelve al precio de lista |
| **La promo vence con el cliente en el carrito** | al recargar o navegar el precio vuelve al de lista |
| **La promo vence entre el checkout y el submit** | el servidor rechaza con `price_mismatch` y el mensaje pide recargar (comportamiento actual, se conserva) |
| Cliente con ≥10 calcos de la categoría en promo + transferencia | el bloque "Con transferencia" muestra base × 0,40 (50 % + 10 % acumulados) |
| Cliente con cupón `EPICA10` + transferencia + promo | 50 % + 10 % + 10 % = 70 %, bajo el tope de 90 % |
| Pack mayorista con calcos de la categoría en promo | el pack ya trae precio final: **no** recibe el 50 % |
| Línea `custom` (personalizado) | **no** recibe el 50 %: la promo es de catálogo |
| Archivo digital en el carrito | precio fijo, no participa, y no suma para el envío gratis |
| Promo desactivada a mano (`activa: false`) | todo vuelve al precio de lista de inmediato |

---

## 11. Analytics necesarios

### Eventos nuevos
Ninguno.

### Eventos existentes que cambian

| Evento | Qué cambia | Por qué |
|---|---|---|
| `add_to_cart` | `value` e `items[].price` pasan a reflejar la promo por categoría | hoy reporta el doble durante la promo |
| `remove_from_cart` | ídem | consistencia con `add_to_cart` |
| `view_cart` | `value` e `items[].price` | se alimenta del carrito, que hoy está inflado |

### Eventos que NO cambian
`begin_checkout`, `add_payment_info`, `add_shipping_info` y `purchase` ya reportan
el precio correcto (`purchaseTracking.js`). **No tocarlos.**

### Qué se quiere poder responder
- Cuál es el ratio real `add_to_cart → purchase` **por valor** durante una promo
- Cuánto valor real entra al carrito durante una promo por categoría
- Si Meta recibe una señal de valor coherente en todo el funnel

**Recordatorios**: todo sale por `frontend/src/lib/analytics.js`; el tracking va
en `try/catch`; nunca PII. Ver `docs/analytics.md` §8.

---

## 12. Preguntas abiertas

Ninguna bloqueante. Las 8 preguntas de la auditoría fueron respondidas por
Mariano el 11/08/2026 y ninguna afecta a esta spec.

Una decisión menor, resoluble en `design.md`:

- [ ] ¿El carrito muestra también el **precio tachado** al lado del precio con
      descuento, como ya hace la grilla (`StickerCard`)? Refuerza el valor
      percibido, pero agrega ruido en una lista de ítems.
      **Recomendación**: sí, con el mismo tratamiento visual que la grilla, para
      que el carrito no pierda el argumento de venta que la grilla sí da.
