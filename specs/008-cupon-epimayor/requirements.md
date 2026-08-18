# Requirements — Cupón EPIMAYOR (pack mayorista de 100 a $47.500)

| | |
|---|---|
| **Spec** | `008-cupon-epimayor` |
| **Estado** | `READY FOR REVIEW` |
| **Fecha** | 18/08/2026 |
| **Autor** | Claude, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

La promo mayorista de **100 calcos a $39.999** venció el **14/8/2026**. Desde el
15/8, `/mayorista` volvió al pack de siempre: desde 100 calcos, 50 % off, sin
tope. Hoy un mayorista que quiere 100 diseños paga **$60.000** (4 cm) o
**$80.000** (6 cm).

Mariano necesita poder cerrar una venta mayorista a un precio mejor que ese
**sin volver a publicar una promo para todo el mundo**: el precio se negocia por
mensaje privado, como ya se hace con los cupones ocultos (`EPICA10`, y antes
`EMOJI50`). Hoy no existe ninguna forma de hacerlo: los cupones del sitio solo
saben aplicar un **porcentaje sobre calcos sueltos** o un **N×M**, y ninguno de
los dos toca las líneas de pack — los packs están explícitamente marcados como
no descontables porque "ya traen su precio final".

Resultado: la única salida hoy es cambiar el precio del pack para todos, o
publicar otra promo pública. Ninguna de las dos es lo que se quiere.

---

## 2. Objetivo

Que exista un código que Mariano pueda mandar por privado y que deje el **pack
mayorista de 100 calcos en $47.500 finales**, sin que ese precio aparezca en
ninguna pantalla del sitio para quien no tenga el código.

**Cómo se sabrá que funcionó**: un cliente con el código arma 100 calcos en
`/mayorista`, escribe `EPIMAYOR` en el checkout, y el pedido se cobra $47.500 +
envío — tanto por Mercado Pago como por transferencia, sin `price_mismatch`.

---

## 3. Scope

- [ ] Un cupón `EPIMAYOR` que fija en **$47.500** el pack mayorista de
      **exactamente 100 calcos**, en **4 cm y 6 cm**.
- [ ] El cupón se escribe en el **checkout**, igual que el resto de los cupones.
- [ ] El cupón es **oculto**: no se nombra en ninguna pantalla del sitio.
- [ ] El cupón es **reutilizable** (se le puede mandar a varios mayoristas), pero
      **aplica a un solo pack por pedido**.
- [ ] El servidor revalida el precio y rechaza el pedido si no coincide.
- [ ] Mensaje claro en el checkout cuando el carrito **no** califica.

## 4. Fuera de scope

- [ ] **La Promo Negocio no se toca**: sigue en $39.999 por 100 calcos de un solo
      diseño en 6 cm. `EPIMAYOR` no la afecta ni se acumula con ella.
- [ ] **Revivir la promo mayorista de $39.999.** Está vencida y se queda vencida.
- [ ] **Un solo canje global** (que el código se queme después del primer
      pedido). Decisión de Mariano el 18/8/2026: el código es reutilizable. Eso
      evita tener que llevar registro de canjes en el servidor.
- [ ] **9 cm.** Queda afuera, igual que en la promo de $39.999.
- [ ] Cambiar el armador de `/mayorista`, sus topes o su copy.
- [ ] Cambiar umbrales, costos o reglas de envío.
- [ ] Cupones por cliente, por mail, o con límite de usos.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente mayorista con el código | Paga $47.500 por 100 calcos en vez de $60.000 (4 cm) o $80.000 (6 cm) |
| Cliente que compra sin el código | **No afectado**: no ve el código ni el precio en ninguna pantalla |
| Cliente que vuelve (carrito guardado) | **No afectado**: la forma de las líneas del carrito no cambia |
| Mariano (operación) | Puede cerrar una venta mayorista por privado sin publicar una promo |
| Sistemas externos (CRM, Meta, MP) | El código viaja en el pedido como cualquier cupón; el `value` del `purchase` es lo realmente pagado |

---

## 6. User stories

- **US-1** — Como **mayorista al que Mariano le pasó el código**, quiero escribir
  `EPIMAYOR` en el checkout y ver que mis 100 calcos quedan en $47.500, para
  confirmar que el precio que me pasaron por privado es el que voy a pagar.
- **US-2** — Como **Mariano**, quiero poder ofrecer $47.500 por 100 calcos a un
  cliente puntual sin que ese precio quede publicado, para no romper el precio
  del pack mayorista para el resto.
- **US-3** — Como **Mariano**, quiero que el precio de la Promo Negocio siga
  siendo $39.999, para que el cliente que compra 100 calcos de su propio logo
  siga teniendo el precio más bajo de la tienda.
- **US-4** — Como **cliente que escribe el código sin tener el pack armado**,
  quiero que el checkout me diga por qué no se aplicó, para no quedarme
  esperando un descuento que no va a llegar.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Con `EPIMAYOR` aplicado, un pack mayorista de **exactamente 100** calcos en **4 cm** cuesta **$47.500** en total | 🔴 must |
| RF-2 | Lo mismo en **6 cm**: **$47.500** | 🔴 must |
| RF-3 | En **9 cm** el cupón **no** aplica: el pack sigue costando $100.000 (100 × 50 % off) | 🔴 must |
| RF-4 | Si el pack tiene una cantidad **distinta de 100**, el cupón **no** aplica | 🔴 must |
| RF-5 | El cupón aplica a **un solo pack por pedido**: con dos packs de 100 en el carrito, el segundo paga el precio normal | 🔴 must |
| RF-6 | El cupón **no** toca las líneas de Promo Negocio: siguen en $39.999 | 🔴 must |
| RF-7 | El cupón **no** aplica ningún porcentaje a calcos sueltos ni a personalizados | 🔴 must |
| RF-8 | El **servidor** recalcula el precio del pack y rechaza el pedido si no coincide, igual que con cualquier otra línea | 🔴 must |
| RF-9 | El código es **oculto**: no aparece en banners, carrito, checkout ni popups | 🔴 must |
| RF-10 | Funciona en los **dos** caminos de pago: Mercado Pago y transferencia | 🔴 must |
| RF-11 | El checkout muestra el descuento con el nombre del cupón y el precio de lista tachado, como con el resto de los cupones | 🔴 must |
| RF-12 | Si el carrito **no** califica, el checkout dice **por qué** en vez de decir "cupón aplicado" y no descontar nada | 🟡 should |
| RF-13 | El cupón se puede prellenar por URL (`/checkout?cupon=EPIMAYOR`), como los demás | 🟢 could |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | el aviso del cupón se lee a 375 px sin scroll horizontal |
| RNF-2 | **Performance** | no agrega red ni scripts; es config + cálculo |
| RNF-3 | **Accesibilidad** | el mensaje de error del cupón se anuncia junto al input, con el mismo tratamiento que "Ese cupón no existe o venció" |
| RNF-4 | **Compatibilidad** | los carritos ya guardados en `epicalcos.cart.v2` siguen funcionando: la forma de las líneas **no cambia** |
| RNF-5 | **Seguridad** | el precio final lo decide el servidor a partir del id y la cantidad de la línea, nunca del payload |
| RNF-6 | **Sin dependencias nuevas** | ninguna |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Cupones: solo % sobre calcos sueltos, o N×M | `business-rules.md` §2 | **sí** — se suma un tercer tipo de cupón, que fija el precio de un pack |
| Pack mayorista: desde 100, 50 % off | `business-rules.md` §4 | no — sigue igual sin el cupón |
| Promo Negocio: 100 × 6 cm a $39.999 | `business-rules.md` §4 | **no** |
| Envío gratis solo por umbral de zona | `business-rules.md` §5 | **no** — ver §9.1 |
| Orden de aplicación de descuentos | `business-rules.md` §9 | **sí** — el precio de pack por cupón entra en el paso 1 |
| Espejo de precios frontend ↔ servidor | `business-rules.md` §8 | no — se respeta |

- [x] Requiere cambio espejado en `frontend/src/config/pricing.js` **y** `netlify/functions/lib/pricing.js`
- [ ] Requiere cambio espejado en `frontend/src/config/site.js` **y** el bloque de envío del servidor
- [x] Requiere test de paridad nuevo

### 9.1 ⚠️ El cupón hace PERDER el envío gratis — y hay que decidirlo con esto a la vista

El envío gratis se gana **solo** cruzando el umbral de la zona: $50.000 en
Rosario, $75.000 en el resto del país (`business-rules.md` §5). Bajar el pack a
$47.500 lo deja **por debajo de los dos umbrales**.

| Tamaño | Hoy sin cupón | Envío hoy | Con EPIMAYOR | Envío con cupón | Ahorro real |
|---|---|---|---|---|---|
| 4 cm | $60.000 | **gratis** en Rosario · $6.500/$8.500 afuera | $47.500 | $4.500 / $6.500 / $8.500 | **$8.000** en Rosario · $12.500 afuera |
| 6 cm | $80.000 | **gratis en todo el país** | $47.500 | $4.500 / $6.500 / $8.500 | $28.000 Rosario · $26.000 próxima · **$24.000** interior |

Dos consecuencias que Mariano tiene que aprobar explícitamente:

1. **El cliente ve el envío subir mientras aplica un cupón.** En 6 cm pasa de
   $0 a $8.500 en la misma pantalla en que el subtotal baja $32.500. Es correcto
   según la regla, pero es contraintuitivo justo antes de pagar.
2. **En 4 cm a Rosario el cupón vale $8.000 netos**, no $12.500.

Esto **no** se arregla regalando el envío: existe el precedente documentado en
`config/pricing.js` (un pack de $39.999 que viajó gratis a Buenos Aires y se
comió $8.500 de margen). Si Mariano quiere que el cliente termine pagando
$47.500 **con envío incluido**, el camino correcto es fijar el pack en un precio
por encima del umbral, no reponer el atajo. **Queda como pregunta abierta (§12).**

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Carrito vacío y se escribe `EPIMAYOR` | El checkout dice que el cupón aplica solo al pack mayorista de 100 calcos; no se marca como aplicado |
| Pack mayorista de **103** calcos | El cupón no aplica; el checkout lo dice con la cantidad real ("tu pack tiene 103") |
| Pack mayorista de 100 en **9 cm** | El cupón no aplica; el checkout dice que es solo para 4 y 6 cm |
| **Dos** packs de 100 (4 cm y 6 cm) | Solo el primero queda en $47.500; el segundo paga $80.000 |
| Pack de 100 **+ calcos sueltos** | El pack a $47.500; los sueltos sin porcentaje del cupón (sí conservan el 10 % por transferencia si corresponde) |
| Pack de 100 **+ Promo Negocio** | El pack a $47.500; la línea de negocio intacta en $39.999 |
| El cliente aplica el cupón y **después edita la cantidad** del pack en el carrito | El precio vuelve solo al normal en el mismo render; **no** puede llegar un pedido a $475/u con 103 unidades |
| Carrito guardado con formato viejo | No aplica: la forma de las líneas no cambia |
| El cliente manipula el payload y manda $475/u sin cupón | El servidor responde `price_mismatch` y no crea la preferencia |
| El cliente manda `EPIMAYOR` con una línea que no califica | El servidor cobra el precio normal de esa línea; si el cliente mandó $475 se rechaza con `price_mismatch` |
| Falla Notion / Resend / Blobs | Sin cambios: ninguna integración bloquea la venta |
| Cantidad máxima (1.000/línea, 130 líneas) | Sin cambios |

---

## 11. Analytics necesarios

### Eventos nuevos
Ninguno.

### Eventos existentes que cambian
| Evento | Qué cambia | Por qué |
|---|---|---|
| `add_payment_info` | Viaja `EPIMAYOR` en el campo de cupón que ya existe | Es el mismo campo que ya usa `EPICA10`; sin esto no se puede separar el funnel mayorista del resto |
| `purchase` | El `value` es $47.500 + envío | El evento ya reporta lo realmente pagado; no hay cambio de código, sí de criterio a verificar |

### Qué se quiere poder responder con estos datos
- Cuántos pedidos se cerraron con `EPIMAYOR` y por cuánta plata.
- Qué tamaño eligen los mayoristas con el código (4 o 6 cm).

**Recordatorios**: todo sale por `lib/analytics.js`, en `try/catch`, sin PII.

---

## 12. Preguntas abiertas

- [ ] `REQUIRES CONFIRMATION` — **¿El cupón vence?** Mariano no dio fecha, así que
      se diseña **sin vencimiento** (igual que `EPICA10`). Riesgo: un código
      reutilizable y sin fecha que vende $80.000 de producto a $47.500 no se apaga
      solo si se filtra. El motor ya soporta `endsAt`: ponerle fecha es una línea
      de cada lado del espejo. **Recomendación: ponerle una.**
- [ ] `REQUIRES CONFIRMATION` — **¿$47.500 es con envío o sin envío?** Se diseña
      **sin envío** (§9.1). Si tiene que ser con envío incluido, cambia el número,
      no el mecanismo.
- [ ] `REQUIRES CONFIRMATION` — El armador de `/mayorista` **no tiene tope en
      100**: deja seguir hasta cualquier cantidad. Un cliente que arme 105 no va a
      poder usar el cupón. ¿Se acepta y se resuelve con el mensaje del checkout
      (RF-12), o hay que tocar el armador? **Se diseña con el mensaje; tocar el
      armador queda fuera de scope.**
