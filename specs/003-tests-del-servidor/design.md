# Design — Tests de los módulos del servidor que fallan en silencio

| | |
|---|---|
| **Spec** | `003-tests-del-servidor` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 11/08/2026 |

---

## 0. Hallazgos del discovery

Código leído: `lib/mpSignature.js`, `lib/abandonedStore.js`, `lib/pricing.js`
(guardas), `lib/metaCapi.js`, `lib/crmWebhook.js`, `abandoned-cart.js`,
`frontend/src/lib/advancedMatching.js`, `carritoAbandonado.test.js`,
`promoPricing.test.js`, `entregaDigital.test.js`.

| Pregunta | Hallazgo |
|---|---|
| ¿`validateAndPriceOrder` se testea de rebote? | **No.** `promoPricing.test.js` lo importa y lo llama directo. Mi premisa era falsa. |
| ¿Qué guardas suyas quedan sin test? | `items_empty`, `too_many_lines`, `quantity_invalid`, `price_invalid`. Sí están cubiertos `item_invalid`, `price_mismatch` y `shipping_invalid`. |
| ¿`carritoAbandonado.test.js` testea el módulo? | **No**: reimplementa `decidir()` adentro del test. Solo importa `node:crypto`. |
| ¿Por qué se hizo así? | El propio comentario lo explica: *"las funciones de Blobs no se pueden importar acá"*. |
| ¿Sigue siendo cierto? | **No.** La spec 002 lo desmintió: `entregaDigital.test.js` importa el handler real y mockea Blobs con `vi.mock`. |
| ¿`metaCapi.js` duplica lógica del frontend? | **Sí**: `clean`, `cleanName`, `cleanToken`, `normalizePhone` y `splitName` están en los dos lados. Ningún test verifica el espejo. |
| ¿Se puede importar `mpSignature.js` sin Netlify? | **Sí**: solo usa `node:crypto` y `process.env`. Es una función pura de `event → veredicto`. |

### La deriva ya empezó

La copia de `decidir()` en el test **no** contempla dos ramas que el código real
sí tiene: el modo prueba (`ABANDONED_CART_TEST_EMAIL`) y el tope de mails por
corrida (`ABANDONED_CART_MAX_PER_RUN`). Es exactamente cómo un test-copia deja de
proteger: no falla, simplemente deja de saber.

### El patrón que dejó la spec 002

```js
vi.mock('../../../netlify/functions/lib/orderStore.js', () => ({ … }));
const { handler } = await import('../../../netlify/functions/entregar-digital.js');
```
Funciona porque Vitest resuelve el mock al mismo módulo absoluto que importa el
código bajo prueba. **Es la herramienta que faltaba** y ya está probada en el
repo: esta spec la aplica a los módulos que quedaron afuera.

---

## 1. Arquitectura propuesta

Un archivo de test por módulo, con el mismo criterio que ya usa el repo:
`frontend/src/lib/*.test.js` importando `../../../netlify/functions/...`.

```
frontend/src/lib/
├── promoPricing.test.js        (existe) + guardas anti-abuso        ← P4
├── carritoAbandonado.test.js   (existe) reescrito para importar     ← P3
├── entregaDigital.test.js      (existe, spec 002)
├── mpSignature.test.js         NUEVO                                ← P1
├── abandonedStore.test.js      NUEVO                                ← P2
└── metaMatching.test.js        NUEVO                                ← P5
```

**Por qué no una carpeta `netlify/**/*.test.js`**: Vitest está configurado con
`include: ['src/**/*.test.{js,jsx}']` y root en `frontend/`. Mover eso obliga a
tocar `vite.config.js` y el script de test — cambio de infraestructura para
ganar prolijidad. Se sigue la convención que ya existe.

### Decisiones y alternativas descartadas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Importar el módulo real y mockear Blobs | Seguir replicando la lógica en el test | Es el problema que esta spec viene a arreglar (P3). |
| Un archivo por módulo | Todo en un `servidor.test.js` | Los mocks de `vi.mock` son por archivo: mezclar módulos obliga a mockear de más. |
| Tests de las **decisiones** | Tests de los handlers completos | Los handlers son cableado; su valor ya está cubierto o se cubre acá. |
| Reescribir `carritoAbandonado.test.js` | Dejarlo y sumar otro archivo | Dos archivos sobre la misma regla, uno mintiendo. Peor que uno solo. |
| Secretos de juguete literales | Leer los reales de `.env` | Un test nunca puede depender de un secreto de producción (RNF-5). |

---

## 2. Componentes afectados

### Archivos nuevos

| Archivo | Qué cubre |
|---|---|
| `frontend/src/lib/mpSignature.test.js` | RF-1, RF-2, RF-3 |
| `frontend/src/lib/abandonedStore.test.js` | RF-4, RF-5, RF-6 |
| `frontend/src/lib/metaMatching.test.js` | RF-9 |

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/lib/carritoAbandonado.test.js` | reescrito para importar el módulo real | 🟢 es un test |
| `frontend/src/lib/promoPricing.test.js` | bloque nuevo con las guardas anti-abuso | 🟢 aditivo |

### Archivos de producción que se modifican

**Ninguno.** Es el requisito RNF-1 y el criterio que separa esta spec de un
refactor. Si un módulo resulta intestable sin tocarlo, se anota como hallazgo.

⚠️ **Riesgo conocido**: `abandoned-cart.js` tiene la decisión (`decidir`) inline
dentro del bucle del `export default`, no en una función aparte. Ver §8.

---

## 3. Datos

Sin cambios de datos. Los tests usan objetos armados a mano:

```js
// evento de Netlify tal como lo recibe mpSignature
const evento = (headers, query, body) => ({ headers, queryStringParameters: query, body });

// carrito guardado
const carrito = { email: 'x@y.com', items: [], total: 0, updatedAt: '…' };
```

**Secretos de juguete**, nunca los reales:
```js
const SECRETO = 'secreto-de-prueba-no-usar-en-produccion';
```

---

## 4. Cómo se testea cada módulo

### P1 — `mpSignature.js` (sin mocks: es una función pura)

Se arma la firma con el mismo HMAC que usa Mercado Pago y se comprueba el
veredicto:

```js
const firmar = (manifest, secret) =>
  createHmac('sha256', secret).update(manifest).digest('hex');
```

| Test | Manifest | Espera |
|---|---|---|
| **el bug histórico** | `id:{del BODY};request-id:…;ts:…;` | `valid` |
| id en el querystring | `id:{de la query};…` | `valid` |
| IPN vieja sin id | `request-id:…;ts:…;` | `valid` |
| firma de otro pago | — | `invalid` |
| `ts` o `v1` ausentes | — | `malformed` |
| sin `MP_WEBHOOK_SECRET` | — | `ok:true`, `no_secret` |
| sin header, sin estricto | — | `ok:true`, `missing_signature` |
| sin header, con `MP_WEBHOOK_STRICT=1` | — | `ok:false` |
| body no-JSON | — | no explota |

> **El primero es EL test de esta spec.** Es el que se pone en rojo si alguien
> vuelve a leer el `data.id` solo del querystring — el bug que dejó la web dos
> semanas sin conversiones.

### P2 — `abandonedStore.js` (con Blobs mockeado)

```js
vi.mock('@netlify/blobs', () => ({ getStore: () => storeFalso }));
```
`storeFalso` es un `Map` con `setJSON`/`get`/`delete`/`list`, y se le puede pedir
que **tire una excepción** para probar el camino de error.

| Test | Espera |
|---|---|
| **el bug histórico**: el store tira al leer el opt-out | `{ baja: false, error: true }` — **no** una baja |
| `estaDadoDeBaja` con el store roto | `true` (falla **cerrado**: no escribir) |
| `consultarBaja` de alguien dado de baja | `{ baja: true, error: false }` |
| `borrarCarrito` tras crear un pedido | el registro desaparece |
| guardar dos veces el mismo mail | un solo registro, pisado |
| guardar no arrastra `notifiedAt` | un abandono nuevo puede recibir su mail |
| mail con mayúsculas/espacios | misma clave que en minúsculas |
| token de baja de otro mail | inválido |
| Blobs roto al guardar | `false`, sin lanzar |

> El primero es el que impide volver al `catch { return true }` que apagó la
> recuperación de carritos sin un solo error a la vista.

### P3 — `carritoAbandonado.test.js` reescrito

Hoy verifica una copia. Debe verificar `abandoned-cart.js`. Ver §8: la decisión
está inline y hay que resolverlo **sin tocar producción**.

### P4 — Guardas del checkout (bloque nuevo en `promoPricing.test.js`)

| Payload | Error esperado |
|---|---|
| `items: []` | `items_empty` |
| 131 líneas | `too_many_lines` |
| `quantity: 0` / `1001` / `2.5` | `quantity_invalid` |
| `unit_price: NaN` / `'abc'` | `price_invalid` |
| item sin `id` o sin `title` | `item_invalid` |
| título de 200 chars | se recorta a 150, no falla |

### P5 — El espejo de normalización de Meta

`metaCapi.js` (servidor) y `advancedMatching.js` (frontend) normalizan igual. El
problema: **el servidor no exporta** sus helpers (`clean`, `normalizePhone`…),
son privados del módulo.

Opciones, en orden de preferencia:
1. **Comparar el resultado observable**: `buildAdvancedMatching()` del frontend
   produce los mismos hashes que el `user_data` del servidor para el mismo
   comprador. Es lo que realmente importa y no exige tocar producción.
2. Exportar los helpers del servidor → **toca producción**, va como hallazgo.

Se implementa la 1. Si resulta imposible sin tocar `metaCapi.js`, **P5 se
descarta y se anota** — es `should`, no `must`, y no vale romper RNF-1 por él.

---

## 5. APIs e integraciones

**Ninguna.** RF-11: ningún test hace red. Blobs se mockea, y `mpSignature`,
`pricing` y la normalización son puros.

---

## 6. Seguridad

- [x] Secretos de juguete, jamás los de producción (RNF-5)
- [x] Sin PII real: mails de ejemplo (`ana@example.com`)
- [x] Los tests **no** debilitan ninguna verificación: comprueban que rechaza
- [x] Ningún test imprime un token ni un secreto

⚠️ **El riesgo de un test de seguridad es que "pase" por el motivo equivocado.**
Un test de firma inválida que pasa porque el módulo tira una excepción antes de
verificar no prueba nada. Por eso cada caso comprueba **el `mode` devuelto**, no
solo `ok: false`.

---

## 7. Manejo de errores

No aplica a producción. En los tests:

| Escenario | Criterio |
|---|---|
| El módulo cambia de forma | el test falla **con un mensaje que explica qué regla se rompió** |
| Un mock se desincroniza del módulo real | preferible un mock mínimo que uno completo y desactualizado |
| Un test depende del reloj | `vi.setSystemTime`, nunca `Date.now()` real (RNF-4) |

---

## 8. ⚠️ El obstáculo de P3, y cómo se resuelve

`abandoned-cart.js` no exporta la decisión: está **inline** dentro del `for` del
`export default`, mezclada con los efectos (`purgar`, `marcarNotificado`,
`sendAbandonedCartEmail`).

Para verificar el código real **sin tocar producción** (RNF-1), se ejercita el
handler completo con todo mockeado:

```js
vi.mock('../../../netlify/functions/lib/abandonedStore.js', () => ({ … }));
vi.mock('../../../netlify/functions/lib/notify.js', () => ({ sendAbandonedCartEmail: vi.fn() }));
const handler = (await import('../../../netlify/functions/abandoned-cart.js')).default;
```

Se le pasan carritos con distintas edades y se verifica **a quién se le escribió**
(`sendAbandonedCartEmail.mock.calls`) y **a quién se purgó**. Eso testea la
decisión real, incluidas las dos ramas que la copia perdió (modo prueba y tope
por corrida).

**Alternativa descartada**: extraer `decidir()` a una función exportada. Es más
limpio y es lo que haría en un refactor, pero **cambia código de producción** y
esta spec no lo hace. Queda como hallazgo propuesto.

---

## 9. Estrategia de migración

**No aplica**: no hay datos ni comportamiento que migrar.

- **Rollback**: borrar los archivos de test. Cero impacto en producción.
- El único archivo que se **reescribe** es `carritoAbandonado.test.js`; su
  contenido viejo queda en el historial de git si hiciera falta.

---

## 10. Testing (de esta spec)

Meta-verificación: **un test que nunca falla no sirve**. Para cada test de un bug
histórico hay que comprobar que efectivamente atrapa el bug:

- [ ] Reintroducir a mano el bug del `data.id` (leerlo solo de la query) →
      el test de P1 **tiene que ponerse rojo**
- [ ] Reintroducir el `catch { return true }` de `consultarBaja` →
      el test de P2 **tiene que ponerse rojo**
- [ ] Revertir los dos cambios y confirmar que vuelve a verde

Sin este paso, la spec entrega tests que no se sabe si protegen algo.

---

## 11. Dependencias nuevas

**Ninguna.** Vitest ya está, `vi.mock` ya se usa y `node:crypto` es del runtime.

---

## 12. Preguntas abiertas del diseño

- [ ] **¿Se aceptan los mocks de `@netlify/blobs`?** Mockear una librería de
      terceros ata el test a su API. Si Netlify la cambia, el mock miente.
      **Recomendación**: sí, pero con el mock **más chico posible** (solo los 4
      métodos que se usan), y anotado en el propio archivo.
- [ ] **¿Extraer `decidir()` de `abandoned-cart.js`?** Haría el test directo y
      más legible, pero cambia producción. **Recomendación**: no en esta spec;
      proponerlo como hallazgo y decidirlo aparte.
