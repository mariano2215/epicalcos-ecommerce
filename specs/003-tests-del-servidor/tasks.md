# Tasks — Tests de los módulos del servidor que fallan en silencio

| | |
|---|---|
| **Spec** | `003-tests-del-servidor` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETADA` (11/08/2026) |
| **Estimación** | ~3 h (5 bloques de tests + la meta-verificación) |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] Mariano resolvió las preguntas abiertas → mocks de Blobs **sí**; hook de pre-push **sí, como spec 004**
- [x] **Mariano pidió explícitamente la implementación** (11/08/2026)

---

## Reglas de esta implementación

1. **No se toca código de producción.** Ni una línea. Si un módulo se resiste al
   test, va a *Hallazgos* y se propone aparte (RNF-1).
2. **Ningún test hace red.** Blobs mockeado; el resto son funciones puras.
3. **Secretos de juguete**, nunca los de producción.
4. **Cada test de un bug histórico se verifica reintroduciendo el bug.** Un test
   que nunca falla no protege nada (ver Fase 6).
5. Sin dependencias ni herramientas nuevas.

---

## Fase 0 — Preparación

- [x] **0.1** Releer `lib/mpSignature.js` completo, sobre todo el comentario del
      `data.id`, y `lib/abandonedStore.js` (`consultarBaja` / `estaDadoDeBaja`)
  - *Verificación*: puedo explicar los dos bugs históricos sin mirar
- [x] **0.2** Releer `entregaDigital.test.js` (spec 002) — es el molde de mocks
- [x] **0.3** Suite en verde
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 131/131

---

## Fase 1 — P1 · Firma de Mercado Pago (RF-1, RF-2, RF-3)

El módulo es puro: **no hace falta ningún mock**.

- [x] **1.1** Crear `frontend/src/lib/mpSignature.test.js` con el helper que
      arma la firma (`createHmac` sobre el manifest)
- [x] **1.2** **EL test de la spec**: notificación real con `data.id` **solo en
      el body** → `mode: 'valid'`
  - *Verificación*: es el que atrapa el bug de las 2 semanas sin conversiones
- [x] **1.3** `data.id` solo en el querystring → `valid`
- [x] **1.4** IPN vieja sin `data.id` en ningún lado → `valid`
- [x] **1.5** Firma de otro pago → `invalid`
- [x] **1.6** `x-signature` sin `ts` o sin `v1` → `malformed`
- [x] **1.7** Sin `MP_WEBHOOK_SECRET` → `ok: true`, `no_secret`
- [x] **1.8** Sin header de firma y sin modo estricto → `ok: true`
- [x] **1.9** Sin header con `MP_WEBHOOK_STRICT=1` → `ok: false`
- [x] **1.10** Body que no es JSON → no explota
- [x] **1.11** Cada caso comprueba el **`mode`**, no solo `ok`
  - *Verificación*: ningún test pasa "por el motivo equivocado" (`design.md` §6)

---

## Fase 2 — P2 · Opt-out y carritos (RF-4, RF-5, RF-6)

- [x] **2.1** Crear `frontend/src/lib/abandonedStore.test.js` con el mock mínimo
      de `@netlify/blobs` (solo `setJSON`, `get`, `delete`, `list`)
  - *Verificación*: el mock está comentado como tal y no imita de más
- [x] **2.2** **EL test de esta fase**: el store tira al leer el opt-out →
      `consultarBaja` devuelve `{ baja: false, error: true }`
  - *Verificación*: un fallo de lectura **no** puede volver a disfrazarse de baja
- [x] **2.3** `estaDadoDeBaja` con el store roto → `true` (falla cerrado)
- [x] **2.4** Alguien realmente dado de baja → `{ baja: true, error: false }`
- [x] **2.5** `borrarCarrito` deja el registro sin rastro
- [x] **2.6** Guardar dos veces el mismo mail → un solo registro
- [x] **2.7** Guardar **no** arrastra `notifiedAt`
- [x] **2.8** Mail con mayúsculas/espacios → misma clave
- [x] **2.9** Token de baja de otro mail → inválido
- [x] **2.10** Blobs roto al guardar → `false`, sin lanzar

---

## Fase 3 — P3 · Que el test verifique el código real (RF-7)

- [x] **3.1** Reescribir `carritoAbandonado.test.js` para ejercitar
      `abandoned-cart.js` con `abandonedStore` y `notify` mockeados
      (ver `design.md` §8)
  - ⚠️ **Sin tocar `abandoned-cart.js`**
- [x] **3.2** Conservar los casos que ya cubría: 4 h, 72 h, `notifiedAt`,
      opt-out, purga por retención, fecha corrupta, umbral configurable
- [x] **3.3** Sumar las dos ramas que la copia **había perdido**:
      modo prueba (`ABANDONED_CART_TEST_EMAIL`) y tope por corrida
      (`ABANDONED_CART_MAX_PER_RUN`)
  - *Verificación*: en modo prueba, a los demás **no** se los marca notificado
- [x] **3.4** Verificar que se afirma sobre **efectos reales**
      (`sendAbandonedCartEmail.mock.calls`), no sobre un valor de retorno copiado
- [x] **3.5** Borrar la función `decidir()` duplicada del test
  - *Verificación*: el archivo ya no reimplementa nada de producción

---

## Fase 4 — P4 · Guardas anti-abuso del checkout (RF-8)

- [x] **4.1** Bloque nuevo en `promoPricing.test.js`: *"las guardas del payload"*
- [x] **4.2** `items: []` → `items_empty`
- [x] **4.3** 131 líneas → `too_many_lines`
- [x] **4.4** `quantity` 0, 1001 y 2.5 → `quantity_invalid`
- [x] **4.5** `unit_price` `NaN` y `'abc'` → `price_invalid`
- [x] **4.6** Item sin `id` o sin `title` → `item_invalid`
- [x] **4.7** Título de 200 chars → se recorta a 150 y **no** falla

---

## Fase 5 — P5 · Espejo de normalización de Meta (RF-9)

⚠️ **Fase opcional.** Si no se puede sin tocar `metaCapi.js`, se descarta y se
anota como hallazgo (`design.md` §4, P5).

- [x] **5.1** Evaluar si se puede comparar el resultado observable sin exportar
      los helpers privados del servidor
- [x] **5.2** Si se puede: `frontend/src/lib/metaMatching.test.js` comparando los
      hashes de los dos lados para el mismo comprador
- [x] **5.3** Casos: acentos, teléfono con 0 y sin prefijo, CP con espacios,
      nombre compuesto, mail con mayúsculas
- [x] **5.4** Si **no** se puede: descartar y anotar en *Hallazgos*
  - *Verificación*: no se tocó producción para lograrlo

---

## Fase 6 — ⚠️ Meta-verificación: que los tests atrapen los bugs

**Esta fase es la que le da sentido a la spec.** Sin ella no se sabe si los tests
protegen algo. Los cambios son temporales y se revierten.

- [x] **6.1** Reintroducir el bug del `data.id`: leerlo **solo** del querystring
      en `mpSignature.js`
  - *Verificación*: el test 1.2 **falla**
- [x] **6.2** Revertir → verde otra vez
- [x] **6.3** Reintroducir el bug del opt-out: `catch { return true }` en
      `consultarBaja`
  - *Verificación*: el test 2.2 **falla**
- [x] **6.4** Revertir → verde otra vez
- [x] **6.5** Confirmar con `git diff` que **no quedó nada** de los dos cambios
  - *Verificación*: `git diff -- netlify/` vacío

---

## Fase 7 — Cierre

- [x] **7.1** Suite completa en verde
  ```bash
  npm test --prefix frontend
  ```
- [x] **7.2** Confirmar `git diff --stat -- netlify/ frontend/src/config/` **vacío**
  - *Verificación*: RNF-1 — no se tocó producción
- [x] **7.3** Confirmar que la suite sigue por debajo de ~5 s (RNF-3)
- [x] **7.4** Actualizar `docs/architecture.md` §9 con la cobertura nueva
- [x] **7.5** Recorrer `acceptance.md` punto por punto con resultados reales
- [x] **7.6** Reportar hallazgos fuera de scope
- [x] **7.7** Commit + push (⚠️ **push a `main` = deploy a producción**, aunque
      esta spec no cambie comportamiento)
- [x] **7.8** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| **`Number(null)` es 0**, así que un `unit_price: null` pasa la guarda de forma y lo frena recién el reprecio (`price_mismatch` en vez de `price_invalid`). El pedido igual se rechaza —ningún ítem puede valer 0, el tope de descuento es 90 %—, así que es cosmético. | `lib/pricing.js` | Dejar como está. Queda documentado en un test. |
| **Las cantidades numéricas en string se aceptan** (`Number('3')` → 3). No abre ningún agujero: se sigue validando entero y rango. | `lib/pricing.js` | Dejar como está. Documentado en un test. |
| `decidir()` sigue inline dentro del bucle de `abandoned-cart.js`. El test lo cubre ejercitando el handler completo, pero extraerla lo haría más legible. | `abandoned-cart.js` | Refactor aparte — cambia producción. |
| Los helpers de normalización de `metaCapi.js` siguen privados. No hizo falta exportarlos: se comparó el resultado observable. | `lib/metaCapi.js` | Sin acción. |
| Nada obliga a correr la suite antes de un push. | — | **Spec 004** (Mariano ya dijo que sí). |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 11/08/2026 | **P5 se implementó** (era opcional). El diseño preveía descartarla si exigía tocar `metaCapi.js`; se pudo comparar el resultado observable mockeando `fetch`, sin exportar nada. | Se cumplió sin romper RNF-1. |
| 11/08/2026 | Dos tests de la Fase 4 fallaron al escribirlos y **el código tenía razón**: `Number('3')` se coacciona y `Number(null)` es 0. Se corrigieron las expectativas y se documentó el comportamiento real. | Un test que impone una expectativa equivocada es peor que no tenerlo. |
| 11/08/2026 | El hook de pre-push **no** se implementó pese al "sí" de Mariano. | Está fuera del scope declarado; va como spec 004. Meterlo acá sería el refactor de oportunidad que la regla 8 prohíbe. |
| 11/08/2026 | Se trabajó y commiteó sobre `main`, sin rama. | Flujo establecido del proyecto (igual que 001 y 002). |
