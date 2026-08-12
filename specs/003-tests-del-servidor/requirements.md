# Requirements — Tests de los módulos del servidor que fallan en silencio

| | |
|---|---|
| **Spec** | `003-tests-del-servidor` |
| **Estado** | `DONE` (11/08/2026) |
| **Fecha** | 11/08/2026 |
| **Autor** | Claude (discovery sobre la cobertura del servidor) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 0. Corrección al plan original

En la auditoría propuse esta spec como *"llevar `validateAndPriceOrder` a tests
directos: hoy la función que revalida todos los checkouts se testea de rebote"*.

**Eso era falso.** `promoPricing.test.js` **importa y llama directamente** a
`validateAndPriceOrder` — no hay nada indirecto ahí. El camino de precios es, de
lejos, lo mejor cubierto del repo.

El discovery encontró tres cosas distintas y peores. De eso trata esta spec.

---

## 1. Problema

**Los módulos del servidor que ya rompieron producción en silencio siguen sin un
solo test.**

### Estado real de la cobertura

| Módulo | Tests | Qué pasa si falla |
|---|---|---|
| `lib/pricing.js` | ✅ directos | el checkout rechaza — **se nota enseguida** |
| `lib/digital.js` | ✅ desde la spec 002 | — |
| **`lib/mpSignature.js`** | ❌ **ninguno** | **se rechazan todos los pagos, sin aviso** |
| **`lib/abandonedStore.js`** | ❌ **ninguno** | no se guarda ni se manda nada, sin aviso |
| **`lib/metaCapi.js`** | ❌ ninguno | Meta deja de matchear compradores, sin aviso |
| `lib/crmWebhook.js` | ❌ ninguno | el CRM rechaza los pedidos |
| `_notion.js`, `lib/notify.js` | ❌ ninguno | — |
| Los 7 handlers | ❌ ninguno | — |

### Lo grave: dos de estos **ya rompieron**, y están documentados en el código

**a) `mpSignature.js` — la web estuvo ~2 semanas sin registrar conversiones.**

El `data.id` de las notificaciones reales de Mercado Pago viaja en el **body**,
no en el querystring. Al leerlo solo de la query, el manifest se armaba sin el
segmento `id:` y el HMAC **nunca** coincidía: **el 100 % de los pagos se
rechazaba con 401**. Los pagos se cobraban igual —el cliente pagaba— pero el
sitio no se enteraba: sin mail, sin CRM, sin Purchase a Meta.

Está arreglado y explicado en un comentario largo. **Pero no hay un solo test que
impida volver a romperlo.**

**b) `abandonedStore.js` — la recuperación de carritos no capturaba nada.**

`consultarBaja()` devolvía `true` desde el `catch`, así que un fallo de Blobs se
presentaba como una baja voluntaria: `track-cart` respondía `opted_out` a **todo
el mundo**, no se guardaba ningún carrito y no salía ningún recordatorio —
*"sin un solo error a la vista"*, dice el comentario.

También arreglado. También sin tests.

### Y una tercera cosa: un test que **no** testea el código

`carritoAbandonado.test.js` **no importa** `abandoned-cart.js`: reimplementa la
función `decidir()` dentro del propio test y verifica esa copia.

El comentario del archivo lo dice con honestidad y explica por qué:
*"Las funciones de Blobs no se pueden importar acá (los tests corren en node sin
el entorno de Netlify), así que se replica la decisión"*.

**Esa restricción ya no existe.** La spec 002 demostró que se puede importar un
módulo del servidor y mockear Blobs (`entregaDigital.test.js` lo hace con los 6
tests del endpoint). Hoy el test puede quedar en verde mientras el código real
está roto — y ya empezó a separarse: la copia no contempla el modo prueba
(`ABANDONED_CART_TEST_EMAIL`) ni el tope de mails por corrida.

### El patrón común

Los tres son **fallas silenciosas**: no tiran una excepción, no rompen la
pantalla, no dejan un pedido sin despachar. El sistema sigue andando y no hace lo
que tiene que hacer. Es exactamente la clase de error para la que existe un test,
y la clase que este repo ya sufrió dos veces.

---

## 2. Objetivo

Que los módulos del servidor cuya falla es **invisible** tengan un test que la
haga visible en el acto.

**Cómo se sabrá que funcionó**: reintroducir a mano cualquiera de los dos bugs
históricos (el del `data.id` y el del `catch` que devolvía `true`) pone la suite
en rojo.

---

## 3. Scope

Por orden de valor, medido en *"esto ya rompió"* o *"esto rompería sin que nadie
se entere"*:

- [ ] **P1 — Verificación de la firma de Mercado Pago**: que un manifest armado
      solo desde el querystring quede en rojo
- [ ] **P2 — Opt-out y persistencia del carrito abandonado**: que confundir un
      fallo de lectura con una baja voluntaria quede en rojo
- [ ] **P3 — `carritoAbandonado.test.js` importa el código real** en vez de
      replicarlo
- [ ] **P4 — Guardas anti-abuso del checkout**: los límites que hoy no verifica
      nadie (carrito vacío, demasiadas líneas, cantidades y precios inválidos)
- [ ] **P5 — El espejo de normalización de Meta**: que frontend y servidor
      hasheen exactamente lo mismo
- [ ] Los tests nuevos corren en la misma suite, sin herramientas nuevas

---

## 4. Fuera de scope

- [ ] **Tests de los 7 handlers completos** (`create-preference`,
      `mercadopago-webhook`, etc.). Son orquestadores: su lógica de valor ya está
      cubierta (precios) o se cubre acá (firma). Testearlos enteros exige mockear
      media docena de servicios por archivo, para verificar sobre todo cableado.
      Si aparece un bug ahí, se testea **ese** camino.
- [ ] **Herramientas nuevas**: cobertura, CI, mutation testing, un runner aparte.
- [ ] **Refactorizar el código de producción** para hacerlo más testeable. Si un
      módulo se resiste, se anota como hallazgo y se propone aparte.
- [ ] **Tests de componentes o E2E del frontend.** Otra spec, otro problema.
- [ ] Tocar cualquier comportamiento de producción. **Esta spec no cambia lo que
      el sistema hace.**

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| **Mariano** | Es el destinatario real: hoy se entera de estas fallas por lo que **deja** de pasar (no llegan conversiones, no salen mails), a veces semanas después. |
| **Cliente que paga** | Indirecto y grave: el bug de la firma ya hizo que pagos reales no se registraran. |
| **Quien toque estos módulos después** | Hoy no tiene red. Los comentarios explican los bugs viejos, pero un comentario no falla cuando alguien lo ignora. |
| Campañas de Meta | El espejo de normalización roto degrada el matching sin ningún síntoma. |

---

## 6. User stories

- **US-1** — Como Mariano, quiero que si alguien vuelve a romper la verificación
  de la firma de Mercado Pago la suite se ponga en rojo, para no descubrirlo dos
  semanas después mirando por qué no hay conversiones.

- **US-2** — Como Mariano, quiero que un fallo de lectura no se pueda volver a
  disfrazar de "el cliente pidió no recibir más", para no apagar la recuperación
  de carritos sin enterarme.

- **US-3** — Como quien toca `abandoned-cart.js`, quiero que el test verifique
  **el código que corre en producción** y no una copia, para que estar en verde
  signifique algo.

- **US-4** — Como quien cambia un límite del checkout, quiero que las guardas
  anti-abuso estén verificadas, para no dejar pasar un payload que hoy se
  rechaza.

- **US-5** — Como Mariano, quiero saber que el Píxel y la API de conversiones
  hashean lo mismo, para que Meta no deje de reconocer a mis compradores en
  silencio.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| **RF-1** | Existe un test que falla si la firma de MP se verifica **solo** con el `data.id` del querystring | 🔴 must |
| **RF-2** | Están cubiertos los estados de la verificación: sin secreto, sin firma, firma malformada, firma inválida y firma válida | 🔴 must |
| **RF-3** | Está cubierto el modo estricto (rechazar las notificaciones sin firma) | 🟡 should |
| **RF-4** | Existe un test que falla si un **error de lectura** del opt-out se trata como una baja voluntaria | 🔴 must |
| **RF-5** | Está cubierto que al crear un pedido se **borra** el carrito abandonado | 🔴 must |
| **RF-6** | Está cubierto que el token de baja no permite dar de baja a otra persona | 🟡 should |
| **RF-7** | `carritoAbandonado.test.js` verifica el módulo real, no una copia | 🔴 must |
| **RF-8** | Están cubiertas las guardas del checkout hoy sin test: `items_empty`, `too_many_lines`, `quantity_invalid`, `price_invalid` | 🔴 must |
| **RF-9** | Existe un test que falla si la normalización de PII del servidor deja de coincidir con la del frontend | 🟡 should |
| **RF-10** | Los tests corren con `npm test --prefix frontend`, sin comandos ni dependencias nuevas | 🔴 must |
| **RF-11** | Ningún test hace red de verdad (ni Blobs, ni Resend, ni Mercado Pago, ni Meta) | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| **RNF-1** | **Sin cambios de comportamiento** | el código de producción no cambia; si hay que tocarlo, va como hallazgo |
| **RNF-2** | **Sin dependencias nuevas** | ninguna |
| **RNF-3** | **Rápidos** | la suite completa sigue por debajo de ~5 s |
| **RNF-4** | **Deterministas** | sin depender del reloj real, de la red ni del orden de ejecución |
| **RNF-5** | **Sin secretos reales** | los tests usan secretos de juguete, nunca los de producción |
| **RNF-6** | **Legibles como especificación** | el nombre de cada test dice qué regla protege |
| **RNF-7** | **Sin PII real** | nada de mails ni teléfonos de clientes reales |

---

## 9. Reglas de negocio

Esta spec **no crea ni modifica ninguna regla**. Verifica las que ya existen:

| Regla verificada | Ref. |
|---|---|
| Solo se procesan notificaciones de MP con firma válida | `integrations.md` §1 |
| Un fallo de lectura del opt-out **no** es una baja voluntaria | `database.md` §1.3 |
| Al crear un pedido se borra el carrito abandonado | `database.md` §1.2 |
| Un mail por carrito, entre las 4 h y las 72 h | `business-rules.md` §7 |
| Límites anti-abuso del checkout | `architecture.md` §6 |
| La PII a Meta va normalizada igual en cliente y servidor | `integrations.md` §6 |

### Espejo de precios
- [x] **NO** toca `pricing.js` de ningún lado — solo **agrega** tests sobre él

---

## 10. Edge cases

Los que los tests tienen que contemplar:

| Caso | Qué se espera |
|---|---|
| Notificación de MP con `data.id` solo en el body | firma válida |
| Notificación con `data.id` solo en el querystring | firma válida |
| IPN vieja sin `data.id` en ningún lado | firma válida |
| `x-signature` presente pero sin `ts` o sin `v1` | rechazo (`malformed`) |
| Sin `MP_WEBHOOK_SECRET` | se procesa igual (comportamiento actual) |
| Sin header de firma y sin modo estricto | se procesa igual |
| Sin header de firma **con** modo estricto | rechazo |
| Body que no es JSON válido | no explota |
| Opt-out: el store tira excepción | **no** se trata como baja |
| Opt-out: mail con mayúsculas y espacios | mismo registro que en minúsculas |
| Carrito guardado dos veces | se pisa, no se acumula |
| Token de baja de otro mail | inválido |
| Checkout: 0 líneas / 131 líneas / cantidad 0 / cantidad 1001 / precio `NaN` | cada uno con su error |
| Meta: nombre con acentos, teléfono con 0 y sin prefijo, CP con espacios | igual hash en los dos lados |

---

## 11. Analytics necesarios

**Ninguno.** Los tests no corren en producción y no tocan el funnel.

---

## 12. Preguntas abiertas

- [x] ✅ **¿Se aceptan los mocks de `@netlify/blobs`?** — **SÍ** (Mariano,
      11/08/2026). Se usó el mock mínimo: solo `setJSON`, `get`, `delete` y
      `list`, documentado como tal en `abandonedStore.test.js`.

- [x] ✅ **¿Que la suite corra sola antes de cada push?** — **SÍ**, Mariano lo
      quiere. **NO se implementó acá**: es tocar el harness, no los tests, y
      meterlo en esta spec sería el refactor de oportunidad que la regla 8
      prohíbe. Queda propuesto como **spec 004**.

- [ ] ~~**¿Se quiere además que la suite corra sola antes de cada push?**~~ Hoy nada
      obliga a correr los tests: `main` deploya igual con la suite en rojo.
      **Recomendación**: sí, pero como spec aparte — es tocar el harness, no los
      tests. Sin eso, esta spec depende de que alguien se acuerde de correrlos.

- [ ] **¿Vale la pena testear los handlers completos más adelante?**
      **Recomendación**: solo cuando uno falle. Testear cableado tiene mal
      retorno comparado con testear decisiones.
