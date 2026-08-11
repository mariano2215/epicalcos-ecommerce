# Acceptance — Tests de los módulos del servidor que fallan en silencio

| | |
|---|---|
| **Spec** | `003-tests-del-servidor` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | — |
| **Resultado** | ⬜ pendiente |

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
| **AC-1** *(RF-1)* | Hay un test que valida una firma con el `data.id` **solo en el body** | leer y correr `mpSignature.test.js` | ⬜ |
| **AC-2** *(RF-2)* | Están cubiertos los 5 estados: `no_secret`, `missing_signature`, `malformed`, `invalid`, `valid` | correr los tests | ⬜ |
| **AC-3** *(RF-2)* | Cada caso afirma sobre el **`mode`**, no solo sobre `ok` | lectura del código | ⬜ |
| **AC-4** *(RF-3)* | El modo estricto está cubierto | correr los tests | ⬜ |
| **AC-5** *(RF-4)* | Hay un test que exige `{ baja: false, error: true }` cuando el store falla | leer `abandonedStore.test.js` | ⬜ |
| **AC-6** *(RF-4)* | `estaDadoDeBaja` falla **cerrado** con el store roto | correr los tests | ⬜ |
| **AC-7** *(RF-5)* | Está cubierto que crear un pedido borra el carrito | correr los tests | ⬜ |
| **AC-8** *(RF-6)* | El token de baja de otro mail no valida | correr los tests | ⬜ |
| **AC-9** *(RF-7)* | `carritoAbandonado.test.js` **importa** `abandoned-cart.js` | `grep import` en el archivo | ⬜ |
| **AC-10** *(RF-7)* | Ya **no** existe la función `decidir()` duplicada en el test | `grep "function decidir"` → 0 resultados | ⬜ |
| **AC-11** *(RF-7)* | Están cubiertas las dos ramas que la copia había perdido (modo prueba y tope por corrida) | leer los tests | ⬜ |
| **AC-12** *(RF-8)* | Están cubiertos `items_empty`, `too_many_lines`, `quantity_invalid` y `price_invalid` | correr los tests | ⬜ |
| **AC-13** *(RF-9)* | El espejo de normalización de Meta está cubierto **o** descartado con motivo | leer el resultado | ⬜ |
| **AC-14** *(RF-10)* | Todo corre con `npm test --prefix frontend`, sin comandos nuevos | correr el comando | ⬜ |
| **AC-15** *(RF-11)* | Ningún test hace red real | `grep` de `fetch(` sin mockear | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **ANF-1** *(RNF-1)* | **`git diff --stat -- netlify/` está VACÍO** | comando | ⬜ |
| **ANF-2** *(RNF-1)* | `frontend/src/config/` sin tocar | comando | ⬜ |
| **ANF-3** *(RNF-2)* | Sin dependencias nuevas | `git diff package.json` | ⬜ |
| **ANF-4** *(RNF-3)* | La suite completa sigue por debajo de ~5 s | salida de vitest | ⬜ |
| **ANF-5** *(RNF-4)* | Deterministas: 3 corridas seguidas dan lo mismo | correr 3 veces | ⬜ |
| **ANF-6** *(RNF-5)* | Ningún secreto real en los tests | lectura + `grep` de `APP_USR`, `re_`, `ntn_` | ⬜ |
| **ANF-7** *(RNF-6)* | El nombre de cada test dice qué regla protege | lectura | ⬜ |
| **ANF-8** *(RNF-7)* | Sin PII real (solo `example.com`) | `grep` | ⬜ |

> **ANF-1 es el criterio que define esta spec.** Si `netlify/` aparece en el
> diff, se cambió producción para hacerla testeable: eso es otra spec.

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| `data.id` solo en el body | firma válida | ⬜ |
| `data.id` solo en el querystring | firma válida | ⬜ |
| IPN vieja sin `data.id` | firma válida | ⬜ |
| `x-signature` sin `ts` o sin `v1` | `malformed` | ⬜ |
| Sin `MP_WEBHOOK_SECRET` | se procesa (`no_secret`) | ⬜ |
| Sin header, sin estricto | se procesa | ⬜ |
| Sin header, con estricto | rechazo | ⬜ |
| Body no-JSON | no explota | ⬜ |
| Opt-out: el store tira excepción | **no** es baja | ⬜ |
| Mail con mayúsculas y espacios | misma clave | ⬜ |
| Carrito guardado dos veces | se pisa | ⬜ |
| Guardar no arrastra `notifiedAt` | puede recibir su mail | ⬜ |
| Checkout: 0 líneas | `items_empty` | ⬜ |
| Checkout: 131 líneas | `too_many_lines` | ⬜ |
| Checkout: cantidad 0 / 1001 / 2.5 | `quantity_invalid` | ⬜ |
| Checkout: precio `NaN` / `'abc'` | `price_invalid` | ⬜ |
| Checkout: título de 200 chars | se recorta, no falla | ⬜ |

---

## 4. ⚠️ Meta-verificación: los tests atrapan los bugs

**El criterio más importante de esta spec.** Se reintroduce cada bug histórico y
se confirma que la suite se pone en rojo.

| ID | Bug reintroducido | Test que debe fallar | Resultado |
|---|---|---|---|
| **MV-1** | `data.id` leído **solo** del querystring (`mpSignature.js`) | el de "firma con id en el body" | ⬜ |
| **MV-2** | `catch { return true }` en `consultarBaja` (`abandonedStore.js`) | el de "un fallo de lectura no es una baja" | ⬜ |
| **MV-3** | Ambos revertidos → suite en verde | toda la suite | ⬜ |
| **MV-4** | `git diff -- netlify/` vacío al terminar | — | ⬜ |

> Si MV-1 o MV-2 **no** ponen la suite en rojo, el test correspondiente **no
> sirve** y hay que rehacerlo, por más que esté en verde.

---

## 5. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| **REG-1** | Los 131 tests existentes siguen pasando | ⬜ |
| **REG-2** | De `carritoAbandonado.test.js` no se perdió ningún caso que ya cubría | ⬜ |
| **REG-3** | `promoPricing.test.js` sigue verde con el bloque nuevo | ⬜ |
| **REG-4** | Ningún comportamiento de producción cambió | ⬜ |
| **REG-5** | El build de producción sigue funcionando | ⬜ |

---

## 6. Analytics

⏭️ **No aplica.** Los tests no corren en producción ni tocan el funnel.

- [ ] Verificar que no se agregó ningún evento

---

## 7. ⚠️ Paridad de precios

⏭️ **No aplica**: esta spec no modifica ninguna regla de precio, solo **agrega**
tests sobre las existentes.

- [ ] `netlify/functions/lib/pricing.js` sin tocar
- [ ] `frontend/src/config/` sin tocar
- [ ] `promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js` en verde

---

## Definition of Done

### Los tests
- [ ] AC-1 a AC-15 en ✅ (o AC-13 descartado con motivo)
- [ ] Todos los edge cases de §3 en ✅
- [ ] **MV-1 a MV-4 en ✅** — sin esto la spec no está terminada
- [ ] REG-1 a REG-5 en ✅
- [ ] `npm test --prefix frontend` en verde

### Las restricciones
- [ ] **`git diff --stat -- netlify/` vacío**
- [ ] Sin dependencias nuevas
- [ ] Sin secretos ni PII reales
- [ ] Suite por debajo de ~5 s

### Documentación
- [ ] `docs/architecture.md` §9 con la cobertura nueva y los números reales

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope anotados (incluidos los tres ya identificados)
- [ ] Este documento recorrido con resultados reales
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**:
**Ejecutada por**:

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | |
| ❌ No cumple | |
| ⏭️ No aplica | |

### Tests agregados
| Archivo | Tests | Qué protege |
|---|---|---|
| | | |

### Criterios no cumplidos
| ID | Qué pasó | Decisión |
|---|---|---|

### Notas
