# Acceptance — Tests de los módulos del servidor que fallan en silencio

| | |
|---|---|
| **Spec** | `003-tests-del-servidor` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 11/08/2026 |
| **Resultado** | ✅ **aceptada** |

> **Este documento determina cuándo la feature está terminada.**

---

## Cómo se valida

Recorrer punto por punto y reportar el resultado **real**.
✅ cumple (verificado) · ❌ no cumple (con detalle) · ⏭️ no aplica (con motivo).

**No se marca ✅ nada que no se haya verificado.**

### La prueba que manda

Esta spec entrega tests. **Un test que nunca falla no vale nada**, así que el
criterio central no es "los tests pasan" sino **"los tests fallan cuando tienen
que fallar"** (§4).

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **AC-1** *(RF-1)* | Hay un test que valida una firma con el `data.id` **solo en el body** | leer y correr `mpSignature.test.js` | ✅ "notificación REAL: el data.id viaja solo en el BODY" |
| **AC-2** *(RF-2)* | Están cubiertos los 5 estados: `no_secret`, `missing_signature`, `malformed`, `invalid`, `valid` | correr los tests | ✅ los 5 modos cubiertos |
| **AC-3** *(RF-2)* | Cada caso afirma sobre el **`mode`**, no solo sobre `ok` | lectura del código | ✅ los casos afirman `toEqual({ ok, mode })` |
| **AC-4** *(RF-3)* | El modo estricto está cubierto | correr los tests | ✅ 1/true/TRUE activan el estricto; "no" no |
| **AC-5** *(RF-4)* | Hay un test que exige `{ baja: false, error: true }` cuando el store falla | leer `abandonedStore.test.js` | ✅ "si el store falla al leer, devuelve error:true y baja:false" |
| **AC-6** *(RF-4)* | `estaDadoDeBaja` falla **cerrado** con el store roto | correr los tests | ✅ con el store roto devuelve true (no escribir) |
| **AC-7** *(RF-5)* | Está cubierto que crear un pedido borra el carrito | correr los tests | ✅ `borrarCarrito` deja el store vacío |
| **AC-8** *(RF-6)* | El token de baja de otro mail no valida | correr los tests | ✅ token de otro mail y de otro secreto: false |
| **AC-9** *(RF-7)* | `carritoAbandonado.test.js` **importa** `abandoned-cart.js` | `grep import` en el archivo | ✅ `await import(F + 'abandoned-cart.js')` |
| **AC-10** *(RF-7)* | Ya **no** existe la función `decidir()` duplicada en el test | `grep "function decidir"` → 0 resultados | ✅ `grep "function decidir"` → **0** |
| **AC-11** *(RF-7)* | Están cubiertas las dos ramas que la copia había perdido (modo prueba y tope por corrida) | leer los tests | ✅ 4 tests de modo prueba + 3 de tope por corrida |
| **AC-12** *(RF-8)* | Están cubiertos `items_empty`, `too_many_lines`, `quantity_invalid` y `price_invalid` | correr los tests | ✅ los 4 errores cubiertos |
| **AC-13** *(RF-9)* | El espejo de normalización de Meta está cubierto **o** descartado con motivo | leer el resultado | ✅ **implementado** (era opcional): `metaMatching.test.js`, 15 tests |
| **AC-14** *(RF-10)* | Todo corre con `npm test --prefix frontend`, sin comandos nuevos | correr el comando | ✅ `npm test --prefix frontend`, sin comandos nuevos |
| **AC-15** *(RF-11)* | Ningún test hace red real | `grep` de `fetch(` sin mockear | ✅ Blobs mockeado; `fetch` stubeado en metaMatching; el resto es puro |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **ANF-1** *(RNF-1)* | **`git diff --stat -- netlify/` está VACÍO** | comando | ✅ **`git diff --stat -- netlify/` VACÍO** |
| **ANF-2** *(RNF-1)* | `frontend/src/config/` sin tocar | comando | ✅ vacío |
| **ANF-3** *(RNF-2)* | Sin dependencias nuevas | `git diff package.json` | ✅ `package.json` sin cambios |
| **ANF-4** *(RNF-3)* | La suite completa sigue por debajo de ~5 s | salida de vitest | ✅ **1,08 s** las 12 suites |
| **ANF-5** *(RNF-4)* | Deterministas: 3 corridas seguidas dan lo mismo | correr 3 veces | ✅ 3 corridas seguidas: 210, 210, 210 |
| **ANF-6** *(RNF-5)* | Ningún secreto real en los tests | lectura + `grep` de `APP_USR`, `re_`, `ntn_` | ✅ solo secretos de juguete; `grep` de APP_USR/re_/ntn_ sin resultados |
| **ANF-7** *(RNF-6)* | El nombre de cada test dice qué regla protege | lectura | ✅ cada `it()` nombra la regla que protege |
| **ANF-8** *(RNF-7)* | Sin PII real (solo `example.com`) | `grep` | ✅ todos los mails son `@example.com` |

> **ANF-1 es el criterio que define esta spec.** Si `netlify/` aparece en el
> diff, se cambió producción para hacerla testeable: eso es otra spec.

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| `data.id` solo en el body | firma válida | ✅ |
| `data.id` solo en el querystring | firma válida | ✅ |
| IPN vieja sin `data.id` | firma válida | ✅ |
| `x-signature` sin `ts` o sin `v1` | `malformed` | ✅ |
| Sin `MP_WEBHOOK_SECRET` | se procesa (`no_secret`) | ✅ |
| Sin header, sin estricto | se procesa | ✅ |
| Sin header, con estricto | rechazo | ✅ |
| Body no-JSON | no explota | ✅ |
| Opt-out: el store tira excepción | **no** es baja | ✅ |
| Mail con mayúsculas y espacios | misma clave | ✅ |
| Carrito guardado dos veces | se pisa | ✅ |
| Guardar no arrastra `notifiedAt` | puede recibir su mail | ✅ |
| Checkout: 0 líneas | `items_empty` | ✅ |
| Checkout: 131 líneas | `too_many_lines` | ✅ |
| Checkout: cantidad 0 / 1001 / 2.5 | `quantity_invalid` | ✅ |
| Checkout: precio `NaN` / `'abc'` | `price_invalid` | ✅ (⚠️ `null` da price_mismatch — ver Notas) |
| Checkout: título de 200 chars | se recorta, no falla | ✅ |

---

## 4. ⚠️ Meta-verificación: los tests atrapan los bugs

**El criterio más importante de esta spec.** Se reintroduce cada bug histórico y
se confirma que la suite se pone en rojo.

| ID | Bug reintroducido | Test que debe fallar | Resultado |
|---|---|---|---|
| **MV-1** | `data.id` leído **solo** del querystring (`mpSignature.js`) | el de "firma con id en el body" | ✅ **4 tests en rojo**, encabezados por el del `data.id` en el body |
| **MV-2** | `catch { return true }` en `consultarBaja` (`abandonedStore.js`) | el de "un fallo de lectura no es una baja" | ✅ **1 test en rojo**: "un fallo de lectura no es una baja" |
| **MV-3** | Ambos revertidos → suite en verde | toda la suite | ✅ 210/210 tras revertir |
| **MV-4** | `git diff -- netlify/` vacío al terminar | — | ✅ vacío |

> Si MV-1 o MV-2 **no** ponen la suite en rojo, el test correspondiente **no
> sirve** y hay que rehacerlo, por más que esté en verde.

---

## 5. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| **REG-1** | Los 131 tests existentes siguen pasando | ✅ 131 → 210, ninguno de los previos modificado |
| **REG-2** | De `carritoAbandonado.test.js` no se perdió ningún caso que ya cubría | ✅ los 8 casos siguen; el token pasó a `abandonedStore.test.js` |
| **REG-3** | `promoPricing.test.js` sigue verde con el bloque nuevo | ✅ 47 → 57 tests |
| **REG-4** | Ningún comportamiento de producción cambió | ✅ `git diff -- netlify/` vacío |
| **REG-5** | El build de producción sigue funcionando | ✅ `npm run build` OK |

---

## 6. Analytics

⏭️ **No aplica.** Los tests no corren en producción ni tocan el funnel.

- [x] Verificar que no se agregó ningún evento

---

## 7. ⚠️ Paridad de precios

⏭️ **No aplica**: esta spec no modifica ninguna regla de precio, solo **agrega**
tests sobre las existentes.

- [x] `netlify/functions/lib/pricing.js` sin tocar
- [x] `frontend/src/config/` sin tocar
- [x] `promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js` en verde

---

## Definition of Done

### Los tests
- [x] AC-1 a AC-15 en ✅ (o AC-13 descartado con motivo)
- [x] Todos los edge cases de §3 en ✅
- [x] **MV-1 a MV-4 en ✅** — sin esto la spec no está terminada
- [x] REG-1 a REG-5 en ✅
- [x] `npm test --prefix frontend` en verde

### Las restricciones
- [x] **`git diff --stat -- netlify/` vacío**
- [x] Sin dependencias nuevas
- [x] Sin secretos ni PII reales
- [x] Suite por debajo de ~5 s

### Documentación
- [x] `docs/architecture.md` §9 con la cobertura nueva y los números reales

### Proceso
- [x] `tasks.md` con todos los pasos marcados
- [x] Hallazgos fuera de scope anotados (incluidos los tres ya identificados)
- [x] Este documento recorrido con resultados reales
- [x] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: 11/08/2026
**Ejecutada por**: Claude, con autorización explícita de Mariano

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | 56 |
| ❌ No cumple | 0 |
| ⏭️ No aplica | 0 |

**131 → 210 tests.** Suite completa en **1,08 s**.

### Tests agregados
| Archivo | Tests | Qué protege |
|---|---|---|
| `mpSignature.test.js` | **20** (nuevo) | que no se vuelva a rechazar el 100 % de los pagos |
| `abandonedStore.test.js` | **21** (nuevo) | que un fallo de lectura no se disfrace de baja |
| `metaMatching.test.js` | **15** (nuevo) | que el Píxel y la CAPI hasheen lo mismo |
| `carritoAbandonado.test.js` | 12 → **24** (reescrito) | el cron REAL, no una copia |
| `promoPricing.test.js` | 47 → **57** | las guardas anti-abuso del payload |

### Criterios no cumplidos
Ninguno.

### La meta-verificación, en detalle
Es lo que distingue "tests que pasan" de "tests que protegen".

| Bug reintroducido | Resultado |
|---|---|
| `[query['data.id'], bodyDataId]` → `[query['data.id']]` | **4 tests en rojo**, el primero *"notificación REAL: el data.id viaja solo en el BODY"* |
| `return { baja: false, error: true }` → `{ baja: true, error: false }` | **1 test en rojo**: *"si el store falla al leer…"* |
| Ambos revertidos | 210/210 y `git diff -- netlify/` vacío |

### Notas
- **Dos tests fallaron al escribirlos y el código tenía razón**, no el test:
  `Number('3')` se coacciona a 3 (una cantidad en string se acepta, y sigue
  validándose entero y rango), y `Number(null)` es **0**, que pasa la guarda de
  forma y cae en `price_mismatch` en vez de `price_invalid`. El pedido se
  rechaza igual —ningún ítem puede valer 0—, así que es cosmético. Se corrigieron
  las expectativas y ambos comportamientos quedaron **documentados en un test**.
- **P5 era opcional** y se implementó: se pudo comparar el resultado observable
  mockeando `fetch`, sin exportar los helpers privados de `metaCapi.js`. El
  espejo está sincronizado hoy.
- **El hook de pre-push no se implementó** pese al "sí" de Mariano: está fuera
  del scope declarado y va como **spec 004**. Sin él, esta spec depende de que
  alguien se acuerde de correr `npm test`.
