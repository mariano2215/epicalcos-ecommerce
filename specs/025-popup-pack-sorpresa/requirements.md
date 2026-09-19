# Requirements — Popup: pack de stickers sorpresa gratis con tu compra

| | |
|---|---|
| **Spec** | `025-popup-pack-sorpresa` |
| **Estado** | `DONE` — implementada el 19/9/2026 |
| **Fecha** | 18/09/2026 |
| **Autor** | Mariano (request) · Claude (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

---

## 0. El pedido, textual

> *Cambiar el POP UP donde dejando el mail accedés a un pack de stickers
> sorpresa gratis con tu compra en los próximos 10 minutos.*
> *Agregarlo al checkout como GRATIS y un contador que vaya bajando. Una vez que
> se terminen los 10 minutos, que salga solo del checkout.*

---

## 1. Problema

El popup de bienvenida ofrece hoy **10 % OFF** a cambio del mail, con una
ventana de 10 minutos (spec 017). Es el mismo número que el sitio ya regala por
otros caminos: el 10 % por transferencia desde 10 calcos, y encima corren el 3x2
y el 2x1 sin código. Para el visitante que llega de Instagram, un 10 % más no se
distingue de lo que ya ve en la grilla.

Además, sobre un carrito típico de 1 a 3 calcos ($1.600 a $4.800), el 10 % son
$160 a $480: un incentivo que casi no se nota, y que en el checkout aparece como
un descuento más, mezclado con el 3x2.

---

## 2. Objetivo

Que el popup ofrezca algo **tangible y distinto** de lo que ya regala el sitio:
un pack de stickers sorpresa que va **gratis dentro del pedido** si la persona
compra dentro de los 10 minutos siguientes a dejar el mail. El regalo tiene que
**verse en el checkout como una línea más del pedido, marcada GRATIS, con su
contador**, y desaparecer solo cuando el tiempo se termina.

**Cómo se sabrá que funcionó**: sube la tasa `generate_lead → purchase` dentro
de la ventana comparada con el período del 10 % OFF (spec 017, desde el
7/9/2026). Y el pack llega a todos los pedidos que lo ganaron: ninguno sale sin
el regalo por falta de aviso.

---

## 3. Scope

- [ ] El popup ofrece el **pack de stickers sorpresa gratis** en lugar del 10 % OFF.
- [ ] Al dejar el mail, arranca una **ventana de 10 minutos por persona**, con
      contador visible en el popup.
- [ ] En el checkout, el pack aparece como **línea del pedido marcada GRATIS**,
      con el **contador bajando**.
- [ ] Al llegar a cero, el pack **sale solo del checkout**, con un aviso y sin
      borrar nada de lo que la persona ya escribió.
- [ ] El servidor **decide si el pedido lleva el regalo**, y el pack figura en
      todo lo que usa Mariano para armar el pedido: mail interno, CRM de Notion
      y CRM interno. También en el mail de confirmación al cliente.
- [ ] Un **interruptor** para apagar el regalo y volver al popup de 10 % OFF.
- [ ] Los eventos de analytics del §11.

---

## 4. Fuera de scope

- **Mostrar el pack en el carrito lateral o en `/carrito`.** El pedido lo pide
  en el checkout. Queda como propuesta (§12, P-5).
- **Cambiar cuándo aparece el popup** (disparo por scroll, tiempo o salida). Se
  deja como está.
- **Borrar el cupón `EPICA10` o la maquinaria de su ventana.** Sigue vivo para
  quien ya lo tiene guardado o lo escribe a mano, y es lo que vuelve si se apaga
  el regalo.
- **Límite de un regalo por persona o por mail.** Ver §9 y §12, P-4.
- **Stock o costo del pack.** El sitio no lleva inventario; armar el pack es
  operación de Mariano.
- **Cambiar el estado "Lead 10% OFF" del CRM de Notion** (§12, P-6).
- Todo lo que está sin commitear en el árbol (spec 023). No se toca.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Visitante que deja el mail | Recibe un regalo físico con su compra en vez de un 10 % |
| Cliente que compra dentro de la ventana | Ve el pack GRATIS en el checkout y lo recibe en la caja |
| Cliente que se pasa de los 10 minutos | El pack sale del checkout con un aviso; el precio no cambia |
| Cliente que ya tenía `EPICA10` guardado | *No afectado*: su cupón sigue funcionando igual |
| Cliente que vuelve (carrito guardado) | *No afectado*: el regalo no es una línea del carrito |
| Mariano (operación) | Ve el pedido marcado "incluir pack sorpresa" en el mail, Notion y el CRM |
| Mercado Pago | *No afectado*: cobra lo mismo, el regalo no viaja como ítem |
| Meta (Pixel / CAPI) | El regalo **no** se reporta como producto comprado |

---

## 6. User stories

- **US-1** — Como visitante, quiero dejar mi mail y ganar un pack de stickers
  sorpresa gratis, para tener un motivo concreto de comprar ahora.
- **US-2** — Como visitante que dejó el mail, quiero ver cuánto tiempo me queda,
  en el popup y en el checkout, para saber si llego.
- **US-3** — Como cliente en el checkout, quiero ver el pack como parte de mi
  pedido, marcado GRATIS, para saber que va en la caja.
- **US-4** — Como cliente que se pasó de los 10 minutos, quiero entender por qué
  desapareció el pack, sin perder lo que ya completé.
- **US-5** — Como Mariano, quiero que cada pedido con regalo me lo diga sin que
  lo tenga que buscar, para no despachar una caja sin el pack.
- **US-6** — Como Mariano, quiero apagar el regalo cambiando una línea y volver
  al 10 % OFF.

---

## 7. Requisitos funcionales

### Popup

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | El popup ofrece un **pack de stickers sorpresa gratis con la compra**, válido por 10 minutos desde que se deja el mail. El copy no menciona el 10 % OFF. | 🔴 must |
| RF-2 | Al dejar el mail con éxito, el popup confirma que el pack quedó reservado y muestra un **contador de 10:00 que baja** en tiempo real. | 🔴 must |
| RF-3 | El contador se calcula contra el reloj real: si la pestaña queda en segundo plano, al volver muestra el tiempo que de verdad queda, no el que había al irse. | 🔴 must |
| RF-4 | Si el carrito ya tiene productos, el botón del popup confirmado lleva al checkout. Si está vacío, cierra el popup para seguir eligiendo. | 🟡 should |
| RF-5 | El popup sigue registrando el lead igual que hoy: CRM de Notion, CRM interno y aviso interno por mail. | 🔴 must |
| RF-6 | Con el regalo prendido, **no se le manda al lead un mail con el cupón** (ver §12, P-3). | 🟡 should |

### Checkout

| ID | Requisito | Prioridad |
|---|---|---|
| RF-7 | Si la persona entra al checkout con la ventana abierta, "Tu pedido" muestra una línea **"Pack de stickers sorpresa · x1 · GRATIS"** junto a sus productos. | 🔴 must |
| RF-8 | Esa línea lleva el **contador bajando** con el tiempo que queda. | 🔴 must |
| RF-9 | En el celular, el contador del regalo se ve **arriba del formulario**, no solo en el resumen, que en 375 px queda debajo de todo. | 🔴 must |
| RF-10 | El regalo **no cambia ningún número**: subtotal, descuentos, envío, umbral de envío gratis y total quedan exactamente iguales que sin el regalo. | 🔴 must |
| RF-11 | Cuando el contador llega a cero, la línea del regalo **sale sola** del resumen y en su lugar aparece un aviso: se terminó el tiempo y lo sacamos del pedido. | 🔴 must |
| RF-12 | Al vencer, **no se toca nada del formulario**: nombre, mail, teléfono, dirección, envío y medio de pago quedan como estaban. | 🔴 must |
| RF-13 | Si la persona entra al checkout con la ventana ya cerrada, no hay línea de regalo ni aviso. | 🔴 must |
| RF-14 | Recargar el checkout durante la ventana mantiene el regalo y el contador sigue desde el tiempo real. | 🔴 must |

### Pedido

| ID | Requisito | Prioridad |
|---|---|---|
| RF-15 | Al confirmar la compra, el **servidor decide** si el pedido lleva el regalo, con la ventana de 10 minutos más un margen para relojes corridos. | 🔴 must |
| RF-16 | Un regalo vencido, ausente o inválido **nunca rechaza el pedido**: la compra sigue, sin el regalo. | 🔴 must |
| RF-17 | Un pedido con regalo lo muestra como línea **"Pack de stickers sorpresa — GRATIS"** en el mail interno, el mail de confirmación al cliente, el CRM de Notion y el CRM interno. | 🔴 must |
| RF-18 | El mail interno de un pedido con regalo lo **destaca arriba** ("🎁 Incluir pack sorpresa"), no solo como una línea más de la tabla. | 🟡 should |
| RF-19 | El regalo figura en el pedido aunque falle el almacenamiento de pedidos y el aviso se arme con los datos de Mercado Pago. | 🔴 must |
| RF-20 | Un pedido **solo digital** (archivos imprimibles) nunca lleva el regalo: no hay caja donde meterlo. | 🔴 must |
| RF-21 | El regalo es **uno por pedido**, sin importar cuántos productos tenga. | 🔴 must |
| RF-22 | El regalo vale con los dos medios de pago (Mercado Pago y transferencia) y con envío o retiro. | 🔴 must |

### Interruptor

| ID | Requisito | Prioridad |
|---|---|---|
| RF-23 | Con un solo interruptor se apaga el regalo en el popup, el checkout y el servidor a la vez. Apagado, el popup vuelve a ofrecer el 10 % OFF tal como funciona hoy. | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | popup y checkout a 375 px sin scroll horizontal; el contador del regalo visible sin llegar al final del formulario |
| RNF-2 | **Performance** | no agrega scripts ni peticiones al cargar el sitio; no toca el Home |
| RNF-3 | **Accesibilidad** | el contador no se anuncia cada segundo; se anuncia al aparecer y al vencer. Targets de 44 px |
| RNF-4 | **Compatibilidad** | los carritos guardados no cambian de forma; el `EPICA10` ya guardado sigue funcionando |
| RNF-5 | **Instagram / storage bloqueado** | si el navegador no deja guardar datos, el regalo igual funciona en la misma sesión |
| RNF-6 | **Nunca rompe la venta** | ningún fallo del regalo (storage, reloj, tracking) puede impedir pagar |
| RNF-7 | **Sin dependencias nuevas** | — |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| El popup entrega `EPICA10` | `business-rules.md` §7 Popup de bienvenida | **sí**: con el regalo prendido entrega el pack |
| Ventana de 10 min por usuario, falsificable y aceptada | `business-rules.md` §3.4 | se **replica** para el regalo, con el mismo criterio |
| `EPICA10` sigue siendo válido escrito a mano | `business-rules.md` §2 Cupones | no |
| Ninguna promo regala el envío | `business-rules.md` §5 | no: el regalo no toca el envío |
| El 3x2 / 2x1 / volumen cuentan unidades del carrito | `business-rules.md` §3 | no: el pack no es una unidad del carrito |
| Precios de lista, promos y cupones | `business-rules.md` §1–§3 | no |

**Regla nueva — el pack sorpresa:**
- Uno por pedido, a $0, con cualquier compra que lleve algo físico.
- Se gana dejando el mail en el popup y vence 10 minutos después. El servidor
  suma 60 segundos de margen por relojes corridos, igual que en el cupón.
- **No suma** al subtotal, al umbral de envío gratis ni a ninguna promo.
- **No acumula ni excluye nada**: con el regalo corren todas las promos
  vigentes, igual que sin él.

⚠️ **Falsificable, como el cupón de la spec 017.** El instante en que se dejó el
mail lo guarda el navegador. Alguien que sepa editarlo, o que vuelva a dejar un
mail en una ventana privada, puede ganar un pack en **cada** compra. El techo
del abuso es un pack por pedido pagado. Se propone aceptarlo igual que en la
017 (§12, P-4).

**Espejo de precios:**
- [ ] ~~Cambio espejado de precios~~ — el regalo **no cambia ningún precio**
- [x] Sí hay un espejo nuevo: la **duración de la ventana** y el **interruptor**
      tienen que coincidir entre sitio y servidor
- [x] Test de paridad nuevo para esas dos constantes, y test de que un pedido
      con regalo tiene **los mismos precios** que sin él

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Deja el mail y compra a los 3 minutos | Checkout con el pack GRATIS y el contador; el pedido llega con el pack |
| Llega al checkout a los 9:50 y paga a los 10:30 | Al llegar a cero el pack sale del resumen. El servidor tiene 60 s de margen: si el pedido se crea antes de 11:00, lo lleva igual (el cliente no lo sabía, pero no pierde nada) |
| Llega al checkout a los 12 minutos | Sin línea de regalo ni aviso |
| El contador llega a cero con el formulario a medio llenar | Sale la línea, aparece el aviso, nada del formulario cambia |
| Recarga el checkout durante la ventana | El regalo sigue ahí con el tiempo real |
| Pestaña en segundo plano 5 minutos | Al volver, el contador muestra lo que queda de verdad |
| Navegador de Instagram con storage bloqueado | El regalo funciona mientras no recargue la página. Si recarga, lo pierde (no hay dónde guardarlo) |
| Se crea la preferencia de MP con regalo y paga en MP a los 20 minutos | El pedido lleva el regalo: se decide al crear el pedido, no al pagar |
| El pago en MP falla y vuelve a intentar con la ventana cerrada | El pedido nuevo no lleva regalo |
| Pedido solo de archivos imprimibles | Sin regalo, aunque la ventana esté abierta |
| Retiro en mano | Lleva el regalo |
| Fecha de emisión en el futuro o basura | El servidor lo ignora; pedido sin regalo, no se rechaza |
| Cliente con `EPICA10` guardado de antes | Su cupón sigue funcionando; no ve el regalo |
| Deja el mail con el sitio viejo cargado en el navegador (antes del deploy) | Ve y recibe el 10 % OFF, como prometía la pantalla que tenía abierta |
| Falla el almacenamiento de pedidos (Blobs) | El aviso se arma desde Mercado Pago y **igual** dice que lleva el pack |
| Falla Notion o el CRM interno | La venta sigue; el pack figura en los canales que sí respondieron |
| Interruptor apagado con alguien a mitad de la ventana | Al recargar ya no ve el regalo. Si no recarga, el servidor igual lo ignora: el pedido sale sin pack |

---

## 11. Analytics necesarios

### Eventos nuevos
| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| `regalo_emitido` | el popup entrega el pack | `regalo: 'pack_sorpresa'`, `ventana_ms` | GA4 |
| `regalo_vencido` | la ventana llega a cero sin comprar | `regalo`, `donde`: `popup` · `checkout` | GA4 |

### Eventos existentes que cambian
| Evento | Qué cambia | Por qué |
|---|---|---|
| `purchase` | lleva `regalo: 'pack_sorpresa'` cuando el pedido salió con el pack | para contar ventas con regalo sin cruzar datos |
| `generate_lead` | nada: mismo `lead_source: 'welcome_popup'` | para comparar la serie antes y después |
| `cupon_emitido` / `cupon_vencido` | dejan de dispararse desde el popup mientras el regalo esté prendido | la serie de la 017 se corta el día del deploy |

### Qué se quiere poder responder con estos datos
- ¿Qué parte de los que ganan el pack compra dentro de la ventana?
  (`purchase` con `regalo` / `regalo_emitido`)
- ¿Cuántos lo pierden **estando en el checkout**? (`regalo_vencido` con
  `donde: checkout`). Ese es el caso caro, y si es alto, 10 minutos es poco.
- ¿El pack convierte mejor que el 10 % OFF? (`generate_lead → purchase`, antes y
  después del deploy)

Sin mail ni ningún dato del lead en el `dataLayer`.

---

## 12. Preguntas abiertas

Cada una tiene una **propuesta por defecto**, que es la que usa el diseño.

✅ **Resueltas el 19/9/2026**: Mariano aceptó **las seis por defecto**
(*"dale, listame las P-1 a P-6 e implementá la spec"*). Se implementaron tal
como están escritas abajo.

- [x] **P-1 — ¿Qué trae el pack?** Cantidad y tamaño de calcos. Sirve para el
      copy y para calcular el costo.
      *Propuesta*: el copy dice "pack de stickers sorpresa", sin número, hasta
      que Mariano lo defina.
- [x] **P-2 — ¿Hay compra mínima?** El pedido dice "con tu compra".
      *Propuesta*: **ninguna**. Cualquier compra con algo físico lo gana, incluso
      un solo calco de $1.200. Si el costo del pack no lo banca, se agrega un
      mínimo como regla aparte.
- [x] **P-3 — ¿Se le manda un mail al lead?** Hoy le llega el código EPICA10.
      *Propuesta*: **no**. El regalo vive en el navegador donde dejó el mail. Un
      mail que se abre desde la app de Gmail abre **otro** navegador, sin el
      regalo, y le prometería algo que esa pantalla no muestra. Con 10 minutos
      de ventana, además, casi siempre se leería vencido.
- [x] **P-4 — Abuso: ¿un pack por persona?** Hoy nada impide ganarlo de nuevo
      desde una ventana privada.
      *Propuesta*: **aceptarlo**, como en la 017. Limitarlo exige guardar en el
      servidor quién ya lo recibió, y ese almacenamiento (Blobs) ya se cayó dos
      veces. El techo del abuso es un pack por pedido pagado.
- [x] **P-5 — ¿También en el carrito?** El contador solo se ve en el popup y el
      checkout.
      *Propuesta*: fuera de esta spec. Si `regalo_vencido` con `donde: popup`
      sale alto, es la primera palanca.
- [x] **P-6 — Estado del lead en Notion.** Hoy se llama "Lead 10% OFF".
      *Propuesta*: **dejarlo**. Renombrarlo crea una opción nueva en el select
      y parte los filtros y vistas que ya existen. Solo cambia el texto de
      Observaciones.
