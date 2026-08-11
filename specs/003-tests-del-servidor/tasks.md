# Tasks — Tests de los módulos del servidor que fallan en silencio

| | |
|---|---|
| **Spec** | `003-tests-del-servidor` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |
| **Estimación** | ~3 h (5 bloques de tests + la meta-verificación) |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] Mariano resolvió las preguntas abiertas de `design.md` §12
- [ ] **Mariano pidió explícitamente la implementación**
      (*"Implementá la spec 003"*)

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

- [ ] **0.1** Releer `lib/mpSignature.js` completo, sobre todo el comentario del
      `data.id`, y `lib/abandonedStore.js` (`consultarBaja` / `estaDadoDeBaja`)
  - *Verificación*: puedo explicar los dos bugs históricos sin mirar
- [ ] **0.2** Releer `entregaDigital.test.js` (spec 002) — es el molde de mocks
- [ ] **0.3** Suite en verde
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 131/131

---

## Fase 1 — P1 · Firma de Mercado Pago (RF-1, RF-2, RF-3)

El módulo es puro: **no hace falta ningún mock**.

- [ ] **1.1** Crear `frontend/src/lib/mpSignature.test.js` con el helper que
      arma la firma (`createHmac` sobre el manifest)
- [ ] **1.2** **EL test de la spec**: notificación real con `data.id` **solo en
      el body** → `mode: 'valid'`
  - *Verificación*: es el que atrapa el bug de las 2 semanas sin conversiones
- [ ] **1.3** `data.id` solo en el querystring → `valid`
- [ ] **1.4** IPN vieja sin `data.id` en ningún lado → `valid`
- [ ] **1.5** Firma de otro pago → `invalid`
- [ ] **1.6** `x-signature` sin `ts` o sin `v1` → `malformed`
- [ ] **1.7** Sin `MP_WEBHOOK_SECRET` → `ok: true`, `no_secret`
- [ ] **1.8** Sin header de firma y sin modo estricto → `ok: true`
- [ ] **1.9** Sin header con `MP_WEBHOOK_STRICT=1` → `ok: false`
- [ ] **1.10** Body que no es JSON → no explota
- [ ] **1.11** Cada caso comprueba el **`mode`**, no solo `ok`
  - *Verificación*: ningún test pasa "por el motivo equivocado" (`design.md` §6)

---

## Fase 2 — P2 · Opt-out y carritos (RF-4, RF-5, RF-6)

- [ ] **2.1** Crear `frontend/src/lib/abandonedStore.test.js` con el mock mínimo
      de `@netlify/blobs` (solo `setJSON`, `get`, `delete`, `list`)
  - *Verificación*: el mock está comentado como tal y no imita de más
- [ ] **2.2** **EL test de esta fase**: el store tira al leer el opt-out →
      `consultarBaja` devuelve `{ baja: false, error: true }`
  - *Verificación*: un fallo de lectura **no** puede volver a disfrazarse de baja
- [ ] **2.3** `estaDadoDeBaja` con el store roto → `true` (falla cerrado)
- [ ] **2.4** Alguien realmente dado de baja → `{ baja: true, error: false }`
- [ ] **2.5** `borrarCarrito` deja el registro sin rastro
- [ ] **2.6** Guardar dos veces el mismo mail → un solo registro
- [ ] **2.7** Guardar **no** arrastra `notifiedAt`
- [ ] **2.8** Mail con mayúsculas/espacios → misma clave
- [ ] **2.9** Token de baja de otro mail → inválido
- [ ] **2.10** Blobs roto al guardar → `false`, sin lanzar

---

## Fase 3 — P3 · Que el test verifique el código real (RF-7)

- [ ] **3.1** Reescribir `carritoAbandonado.test.js` para ejercitar
      `abandoned-cart.js` con `abandonedStore` y `notify` mockeados
      (ver `design.md` §8)
  - ⚠️ **Sin tocar `abandoned-cart.js`**
- [ ] **3.2** Conservar los casos que ya cubría: 4 h, 72 h, `notifiedAt`,
      opt-out, purga por retención, fecha corrupta, umbral configurable
- [ ] **3.3** Sumar las dos ramas que la copia **había perdido**:
      modo prueba (`ABANDONED_CART_TEST_EMAIL`) y tope por corrida
      (`ABANDONED_CART_MAX_PER_RUN`)
  - *Verificación*: en modo prueba, a los demás **no** se los marca notificado
- [ ] **3.4** Verificar que se afirma sobre **efectos reales**
      (`sendAbandonedCartEmail.mock.calls`), no sobre un valor de retorno copiado
- [ ] **3.5** Borrar la función `decidir()` duplicada del test
  - *Verificación*: el archivo ya no reimplementa nada de producción

---

## Fase 4 — P4 · Guardas anti-abuso del checkout (RF-8)

- [ ] **4.1** Bloque nuevo en `promoPricing.test.js`: *"las guardas del payload"*
- [ ] **4.2** `items: []` → `items_empty`
- [ ] **4.3** 131 líneas → `too_many_lines`
- [ ] **4.4** `quantity` 0, 1001 y 2.5 → `quantity_invalid`
- [ ] **4.5** `unit_price` `NaN` y `'abc'` → `price_invalid`
- [ ] **4.6** Item sin `id` o sin `title` → `item_invalid`
- [ ] **4.7** Título de 200 chars → se recorta a 150 y **no** falla

---

## Fase 5 — P5 · Espejo de normalización de Meta (RF-9)

⚠️ **Fase opcional.** Si no se puede sin tocar `metaCapi.js`, se descarta y se
anota como hallazgo (`design.md` §4, P5).

- [ ] **5.1** Evaluar si se puede comparar el resultado observable sin exportar
      los helpers privados del servidor
- [ ] **5.2** Si se puede: `frontend/src/lib/metaMatching.test.js` comparando los
      hashes de los dos lados para el mismo comprador
- [ ] **5.3** Casos: acentos, teléfono con 0 y sin prefijo, CP con espacios,
      nombre compuesto, mail con mayúsculas
- [ ] **5.4** Si **no** se puede: descartar y anotar en *Hallazgos*
  - *Verificación*: no se tocó producción para lograrlo

---

## Fase 6 — ⚠️ Meta-verificación: que los tests atrapen los bugs

**Esta fase es la que le da sentido a la spec.** Sin ella no se sabe si los tests
protegen algo. Los cambios son temporales y se revierten.

- [ ] **6.1** Reintroducir el bug del `data.id`: leerlo **solo** del querystring
      en `mpSignature.js`
  - *Verificación*: el test 1.2 **falla**
- [ ] **6.2** Revertir → verde otra vez
- [ ] **6.3** Reintroducir el bug del opt-out: `catch { return true }` en
      `consultarBaja`
  - *Verificación*: el test 2.2 **falla**
- [ ] **6.4** Revertir → verde otra vez
- [ ] **6.5** Confirmar con `git diff` que **no quedó nada** de los dos cambios
  - *Verificación*: `git diff -- netlify/` vacío

---

## Fase 7 — Cierre

- [ ] **7.1** Suite completa en verde
  ```bash
  npm test --prefix frontend
  ```
- [ ] **7.2** Confirmar `git diff --stat -- netlify/ frontend/src/config/` **vacío**
  - *Verificación*: RNF-1 — no se tocó producción
- [ ] **7.3** Confirmar que la suite sigue por debajo de ~5 s (RNF-3)
- [ ] **7.4** Actualizar `docs/architecture.md` §9 con la cobertura nueva
- [ ] **7.5** Recorrer `acceptance.md` punto por punto con resultados reales
- [ ] **7.6** Reportar hallazgos fuera de scope
- [ ] **7.7** Commit + push (⚠️ **push a `main` = deploy a producción**, aunque
      esta spec no cambie comportamiento)
- [ ] **7.8** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| | | |

Candidatos ya identificados en el discovery, a confirmar al implementar:

- Extraer `decidir()` de `abandoned-cart.js` a una función exportada
- Exportar los helpers de normalización de `metaCapi.js` para poder compararlos
- Nada obliga a correr la suite antes de un push (`requirements.md` §12)

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
