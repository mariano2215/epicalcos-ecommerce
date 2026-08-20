# Requirements — Cupón EPI50 (50 % off por menor, para mandar por privado)

| | |
|---|---|
| **Spec** | `009-cupon-epi50` |
| **Estado** | `READY FOR REVIEW` |
| **Fecha** | 20/08/2026 |
| **Autor** | Claude, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

Mariano necesita un código fuerte para mandarle **directo al cliente** —por
WhatsApp, por mail, respondiendo una historia— que le baje el precio a un pedido
por menor. Hoy el único cupón vivo es `EPICA10` (10 % off), que ya está tomado:
es el que entrega el popup de bienvenida a cambio del mail, se autocompleta en
el checkout y lo manda `capture-lead.js`. Usarlo para otra cosa mezcla dos
públicos y ensucia la única señal que hay para medir el popup.

No hay ningún código de descuento fuerte que se pueda mandar a mano sin
publicarlo. Las alternativas actuales son las dos malas de siempre: bajar el
precio para todo el mundo, o publicar una promo en el sitio.

Además, el motor de cupones de hoy tiene dos límites que chocan con lo que se
pide:

1. **Un cupón de % se SUMA al 10 % por transferencia** (`business-rules.md` §2).
   No existe forma de decir "este cupón no se combina con nada".
2. **Fuera de una promo N×M, el % solo toca calcos de catálogo** (`sticker`).
   Los personalizados del configurador (`custom`) quedan afuera.

---

## 2. Objetivo

Que exista un código `EPI50` que Mariano pueda mandar por privado y que deje el
pedido **por menor al 50 %**, sin que ese descuento aparezca en ninguna pantalla
del sitio para quien no tenga el código, y **sin combinarse con nada más**.

**Cómo se sabrá que funcionó**: un cliente con el código arma un carrito de
calcos de catálogo y/o personalizados, escribe `EPI50` en el checkout, y paga la
mitad — por Mercado Pago o por transferencia, sin `price_mismatch` y sin que el
10 % por transferencia le sume nada encima.

---

## 3. Scope

- [ ] Un cupón `EPI50` de **50 % off** sobre calcos de **catálogo** y
      **personalizados sueltos**.
- [ ] **Sin vencimiento** (decisión de Mariano: plazo indefinido).
- [ ] **No acumulable con nada**: ni con el 10 % por transferencia, ni con el
      10 % por volumen (+10 calcos), ni con otro cupón, ni con una promo por
      categoría o por fecha si alguna estuviera viva.
- [ ] El cupón es **oculto**: no se nombra ni se publicita en ninguna pantalla.
- [ ] El cupón es **reutilizable**: se le puede mandar a varios clientes.
- [ ] El servidor revalida el precio y rechaza el pedido si no coincide.
- [ ] Un **interruptor manual** para apagarlo sin tocar la fecha.

## 4. Fuera de scope

- [ ] **Mayorista y Negocio.** El pack mayorista (desde 100, 50 % off), la promo
      mayorista de 100 a precio fijo y la Promo Negocio (100 × 6 cm a $39.999)
      **no** los toca el cupón: ya tienen su descuento aplicado por defecto.
- [ ] **`pack:personalizados`** (el armador de mínimo 10 con 10 % off incluido):
      queda afuera por la misma razón. Ver la consecuencia en §9.2.
- [ ] **Productos de precio fijo** (tatuajes, polaroids) y **archivos
      imprimibles**: quedan afuera. Los digitales además tienen regla propia
      documentada — nunca participan de ningún descuento.
- [ ] **Tocar `EPICA10`**, el popup de bienvenida o `capture-lead.js`. El cupón
      del popup sigue siendo `EPICA10` y sigue siendo acumulable como hoy.
- [ ] **Límite de usos, un canje por cliente o cupones por mail.** El código es
      reutilizable y el servidor no lleva registro de canjes (mismo criterio que
      se tomó en la spec 008).
- [ ] **Regalar el envío.** Ver §9.1: el cupón hace *perder* envío gratis y eso
      **no** se arregla salteando el umbral.
- [ ] Cambiar umbrales, costos o reglas de envío.
- [ ] Mostrar el cupón en banners, home, carrito o popups.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente al que Mariano le pasó el código | Paga la mitad en calcos de catálogo y personalizados sueltos |
| Cliente que compra sin el código | **No afectado**: no ve el código ni el descuento en ninguna pantalla |
| Cliente que iba a pagar por transferencia | Con `EPI50` **pierde** el 10 % por transferencia: gana 50 % en vez de 20 % |
| Cliente que vuelve (carrito guardado) | **No afectado**: la forma de las líneas del carrito no cambia |
| Cliente mayorista / de Negocio | **No afectado**: esas líneas siguen a su precio |
| Mariano (operación) | Puede cerrar una venta por privado con un descuento fuerte sin publicarlo |
| Sistemas externos (CRM, Meta, MP) | El código viaja en el pedido como cualquier cupón; el `value` del `purchase` es lo realmente pagado |

---

## 6. User stories

- **US-1** — Como **cliente al que Mariano le pasó el código**, quiero escribir
  `EPI50` en el checkout y ver que mis calcos quedan a mitad de precio, para
  confirmar que el descuento que me prometieron es el que voy a pagar.
- **US-2** — Como **Mariano**, quiero mandar un 50 % off por privado sin que
  quede publicado en el sitio, para no romper el precio de vidriera ni el ancla
  del calco suelto.
- **US-3** — Como **Mariano**, quiero que `EPI50` **reemplace** y no se sume al
  10 % por transferencia, para saber exactamente cuánto estoy resignando: 50 % y
  no 60 %.
- **US-4** — Como **cliente que aplica el cupón y paga por transferencia**,
  quiero que el checkout me diga que el 10 % no se suma, para no pensar que me
  faltó un descuento.
- **US-5** — Como **Mariano**, quiero poder apagar el cupón el día que se filtre,
  sin esperar una fecha de vencimiento que nunca puse.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Con `EPI50` aplicado, un calco de **catálogo** cuesta la **mitad** de su precio de lista, en los tres tamaños | 🔴 must |
| RF-2 | Con `EPI50` aplicado, un calco **personalizado suelto** (`custom`) cuesta la **mitad** | 🔴 must |
| RF-3 | Con `EPI50` aplicado, el **10 % por transferencia / por volumen no corre**: el descuento total es 50 %, nunca 60 % | 🔴 must |
| RF-4 | `EPI50` **no toca** líneas de pack (mayorista, mayorista100, personalizados), `negocio`, precio fijo ni digitales: quedan a su precio | 🔴 must |
| RF-5 | El **servidor** recalcula cada línea con la misma regla y rechaza el pedido si no coincide (`price_mismatch`) | 🔴 must |
| RF-6 | Funciona en los **dos** caminos de pago: Mercado Pago y transferencia | 🔴 must |
| RF-7 | El código es **oculto**: no aparece en banners, home, carrito ni popups | 🔴 must |
| RF-8 | El cupón **no vence** por fecha | 🔴 must |
| RF-9 | Existe un **interruptor manual** para apagarlo, espejado en los dos lados | 🔴 must |
| RF-10 | Aplicado el cupón, el checkout **deja de prometer** el 10 % por transferencia y dice que el cupón no se combina | 🔴 must |
| RF-11 | El checkout muestra el cupón aplicado con su código, como con el resto de los cupones | 🟡 should |
| RF-12 | Si una promo por fecha o por categoría estuviera viva, `EPI50` **la reemplaza**: corre el 50 % del cupón y nada más | 🟡 should |
| RF-13 | El cupón se puede prellenar por URL (`/checkout?cupon=EPI50`), como los demás | 🟢 could |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | el aviso del cupón se lee a 375 px sin scroll horizontal |
| RNF-2 | **Performance** | no agrega red ni scripts; es config + cálculo |
| RNF-3 | **Accesibilidad** | el mensaje del cupón se anuncia junto al input, con el mismo tratamiento que "Ese cupón no existe o venció" |
| RNF-4 | **Compatibilidad** | los carritos ya guardados en `epicalcos.cart.v2` siguen funcionando: la forma de las líneas **no cambia** |
| RNF-5 | **Seguridad** | el precio final lo decide el servidor a partir del id de la línea, nunca del payload |
| RNF-6 | **Sin dependencias nuevas** | ninguna |
| RNF-7 | **Espejo** | ningún checkout puede romperse por desincronización: la paridad se verifica con test |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Cupones de %: acumulables con el 10 % por transferencia | `business-rules.md` §2 | **sí** — se suma un cupón **no acumulable** (exclusivo) |
| Alcance de los cupones de %: solo `sticker` fuera de promo | `business-rules.md` §2 | **sí** — este cupón alcanza también a `custom` |
| Descuento por volumen (10 % desde 10, transferencia) | `business-rules.md` §2 | no — sigue igual sin el cupón |
| Pack mayorista / Promo Negocio | `business-rules.md` §4 | **no** |
| Envío gratis solo por umbral de zona | `business-rules.md` §5 | **no** — ver §9.1 |
| Orden de aplicación de descuentos | `business-rules.md` §9 | **sí** — entra el caso "cupón exclusivo" |
| Espejo de precios frontend ↔ servidor | `business-rules.md` §8 | no — se respeta |

- [x] Requiere cambio espejado en `frontend/src/config/pricing.js` **y** `netlify/functions/lib/pricing.js`
- [ ] Requiere cambio espejado en `frontend/src/config/site.js` **y** el bloque de envío del servidor
- [x] Requiere test de paridad nuevo

### 9.1 ⚠️ El cupón hace PERDER el envío gratis

El envío gratis se gana **solo** cruzando el umbral de la zona: **$50.000** en
Rosario, **$75.000** en el resto del país (`business-rules.md` §5). El umbral se
mide sobre el subtotal **ya descontado** — es el mismo `physicalTotal` que
calcula el servidor.

Con 50 % off, **el precio de lista que hace falta para el envío gratis se
duplica**:

| Zona | Umbral | Lista necesaria HOY | Lista necesaria con `EPI50` |
|---|---|---|---|
| Rosario | $50.000 | $50.000 (≈ 32 calcos de 6 cm) | **$100.000** (≈ 63 calcos de 6 cm) |
| Resto del país | $75.000 | $75.000 (≈ 47 calcos de 6 cm) | **$150.000** (≈ 94 calcos de 6 cm) |

Consecuencia a aprobar explícitamente: **un cliente puede ver el envío subir en
la misma pantalla en que aplica el cupón.** Un carrito de $80.000 en 6 cm viaja
gratis a todo el país; con `EPI50` pasa a $40.000 y paga $4.500 / $6.500 /
$8.500 de envío. Es correcto según la regla, y es contraintuitivo justo antes de
pagar.

Esto **no** se arregla regalando el envío. Existe el precedente documentado en
`config/pricing.js`: un pack de $39.999 que viajó gratis a Buenos Aires y se
comió $8.500 de margen. Si hiciera falta un código "con envío incluido", se
declara como regla propia con su spec.

### 9.2 ⚠️ El 50 % da vuelta la escalera de precios

Con `EPI50` el precio por unidad del calco suelto **iguala o mejora** al de los
caminos que hoy son "el mejor precio". Los números, en 6 cm:

| Camino | Precio por unidad | Con `EPI50` |
|---|---|---|
| Calco suelto de catálogo | $1.600 | **$800** |
| Personalizado suelto (configurador) | $1.600 | **$800** |
| +10 calcos por transferencia | $1.440 | **$800** |
| Pack de personalizados (mín. 10, armador) | $1.440 | $1.440 — el cupón no lo toca |
| Pack mayorista (desde 100) | $800 | $800 — el cupón no lo toca |

Dos cosas que Mariano tiene que ver antes de aprobar:

1. **Un solo calco con `EPI50` sale lo mismo por unidad que comprando 100.** El
   cupón no rompe ningún precio publicado, pero sí borra el argumento del
   mayorista para quien tenga el código.
2. **El armador de personalizados queda peor que el configurador.** Diez
   personalizados por el armador (`pack:personalizados`, 10 % off) salen
   $1.440/u; los mismos diez cargados en el configurador (líneas `custom`) salen
   $800/u con el cupón. Es consecuencia directa de excluir los packs — el
   criterio que pidió Mariano — pero deja dos caminos para el mismo producto a
   precios distintos. **Queda como pregunta abierta (§12).**

### 9.3 Por qué "exclusivo" y no "que se sume y se tope"

Se podría dejar que los % se sumen y bajar el tope. No se hace: el tope
(`MAX_STICKER_DISCOUNT`) es una **red de seguridad**, no una regla de negocio, y
usarlo como regla haría que el descuento real dependa del medio de pago y de la
cantidad. Mariano pidió 50 % y punto: el cupón tiene que dar 50 % siempre.

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Carrito vacío y se escribe `EPI50` | El cupón se acepta y queda aplicado; no hay nada que descontar |
| Carrito **solo de packs / negocio** + `EPI50` | El cupón queda aplicado y **no descuenta nada**; el checkout no promete un descuento que no va a pasar |
| Carrito **solo digital** + `EPI50` | No descuenta nada (ya hay tratamiento propio para pedidos 100 % digitales) |
| Carrito mixto (catálogo + pack mayorista) | Los calcos de catálogo al 50 %; la línea del pack intacta |
| Cliente con **+10 calcos** que paga por **transferencia** y aplica `EPI50` | 50 % off, **no** 60 %. El checkout lo dice |
| Cliente aplica `EPI50` y **cambia a Mercado Pago** | Mismo precio: el cupón no depende del medio de pago |
| `EPI50` + promo por categoría viva (Argentina) | Corre **solo** el 50 % del cupón, no 90 % |
| `EPI50` + promo N×M por fecha viva (3x2) | Corre **solo** el 50 % del cupón; la agrupación N×M no se aplica |
| Se escribe `epi50` en minúscula, o con espacios | Se normaliza a mayúsculas y se aplica (comportamiento actual) |
| Carrito guardado con formato viejo | No aplica: la forma de las líneas no cambia |
| El cliente manipula el payload y manda $800/u **sin** cupón | El servidor responde `price_mismatch` y no crea la preferencia |
| El cliente manda `EPI50` con una línea que no califica a $800 | El servidor espera el precio normal de esa línea y rechaza con `price_mismatch` |
| El cupón se apaga con el interruptor y alguien lo escribe | Se trata como inexistente: "Ese cupón no existe o venció" |
| El cupón se apaga y llega un pedido con precios de cupón | El servidor rechaza con `price_mismatch` |
| Falla Notion / Resend / Blobs | Sin cambios: ninguna integración bloquea la venta |
| Cantidad máxima (1.000/línea, 130 líneas) | Sin cambios |

---

## 11. Analytics necesarios

### Eventos nuevos
Ninguno.

### Eventos existentes que cambian
| Evento | Qué cambia | Por qué |
|---|---|---|
| `add_payment_info` | Viaja `EPI50` en el campo de cupón que ya existe | Es el mismo campo que usa `EPICA10`; sin esto no se puede separar el funnel del código privado del resto |
| `purchase` | El `value` es lo realmente pagado (mitad + envío) | El evento ya reporta lo pagado; no hay cambio de código, sí un criterio a verificar |

### Qué se quiere poder responder con estos datos
- Cuántos pedidos entraron con `EPI50` y por cuánta plata.
- Si el código se está filtrando: un salto de volumen sin campaña detrás es la
  señal para usar el interruptor de RF-9.
- Ticket promedio con `EPI50` vs. sin cupón.

**Recordatorios**: todo sale por `lib/analytics.js`, en `try/catch`, sin PII.

---

## 12. Preguntas abiertas

- [ ] `REQUIRES CONFIRMATION` — **§9.2: ¿el armador de personalizados
      (`pack:personalizados`, 10 % off) queda afuera a propósito?** Tal como está
      pedido, sí — es un pack y los packs no entran. La consecuencia es que diez
      personalizados salen $1.440/u por el armador y $800/u por el configurador.
      **Recomendación: dejarlo afuera** (es lo pedido y no toca el espejo de los
      packs), y si molesta, resolverlo bajando el armador en otra spec.
- [ ] `REQUIRES CONFIRMATION` — **§9.1: ¿se acepta que el cupón haga perder el
      envío gratis?** Se diseña que sí, porque la alternativa es el atajo que ya
      costó plata. Si el código se manda a clientes de otras provincias, conviene
      avisarlo en el mensaje que manda Mariano.
- [ ] `REQUIRES CONFIRMATION` — **¿Interruptor sí o sí?** Mariano pidió plazo
      indefinido, así que no lleva `endsAt`. Un 50 % reutilizable y sin fecha no
      se apaga solo si se filtra, así que se diseña **con interruptor manual**
      (`activa`, mismo patrón que las promos). **Recomendación: dejarlo.**
