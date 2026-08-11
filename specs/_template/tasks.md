# Tasks — [NOMBRE DE LA FEATURE]

| | |
|---|---|
| **Spec** | `NNN-nombre-corto` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec NNN"*.
Ver [`specs/README.md`](../README.md).

- [ ] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación**

---

## Cómo usar esta lista

- Los pasos van **en orden**. Cada uno deja el repo en un estado coherente.
- Cada task tiene un criterio de verificación que se puede responder con sí o no.
- **Sin refactors de oportunidad** (`CLAUDE.md` regla 8): lo que aparezca fuera
  de scope se anota en *Hallazgos*, no se arregla.
- Si una task resulta estar mal planteada, **se para y se avisa** en vez de
  improvisar.

---

## Fase 0 — Preparación

- [ ] **0.1** Releer los archivos que se van a modificar y sus tests
  - *Verificación*: sé qué hace cada uno hoy y por qué
- [ ] **0.2** Correr la suite y confirmar que arranca en verde
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 100 tests pasan (o el número vigente)
- [ ] **0.3** Crear rama de trabajo
  ```bash
  git checkout -b feat/NNN-nombre-corto
  ```
  - *Verificación*: `git branch --show-current` no dice `main`

---

## Fase 1 — [Nombre de la fase]

- [ ] **1.1**
  - *Archivo*: `ruta/al/archivo.js`
  - *Verificación*:
- [ ] **1.2**
  - *Archivo*:
  - *Verificación*:

---

## Fase 2 — [Nombre de la fase]

- [ ] **2.1**
  - *Archivo*:
  - *Verificación*:

---

## Fase 3 — Espejo de precios *(solo si aplica)*

⚠️ **Saltear esta fase si la feature no toca precios, promos, cupones ni envíos.**
Si los toca, es obligatoria: ver `CLAUDE.md` regla 11.

- [ ] **3.1** Aplicar el cambio en `frontend/src/config/pricing.js`
- [ ] **3.2** Aplicar el **mismo** cambio en `netlify/functions/lib/pricing.js`
  - *Verificación*: los valores coinciden exactamente en los dos archivos
- [ ] **3.3** Actualizar el test de paridad correspondiente
  - `promoPricing.test.js` / `envio.test.js` / `precioPersonalizados.test.js`
- [ ] **3.4** Correr los tests y confirmar que la paridad da verde
  - *Verificación*: ningún checkout se rechazaría con `price_mismatch`

---

## Fase 4 — Analytics *(solo si aplica)*

- [ ] **4.1** Agregar los eventos declarados en `requirements.md` §11
  - *Archivo*: `frontend/src/lib/analytics.js`
  - *Verificación*: todo pasa por ese módulo; ningún componente llama a
    `gtag`/`fbq`/`dataLayer` directo
- [ ] **4.2** Envolver en `try/catch`
  - *Verificación*: un fallo de tracking no rompe el flujo
- [ ] **4.3** Confirmar que no viaja PII
  - *Verificación*: sin mail, teléfono, nombre ni dirección en el `dataLayer`
- [ ] **4.4** Actualizar `docs/analytics.md`

---

## Fase 5 — Tests

- [ ] **5.1** Agregar los tests declarados en `design.md` §9
- [ ] **5.2** Suite completa en verde
  ```bash
  npm test --prefix frontend
  ```
- [ ] **5.3** Verificación manual de lo que no cubren los tests
  - *Verificación*: recorrido de compra completo en mobile (375 px)

---

## Fase 6 — Documentación

- [ ] **6.1** Actualizar `docs/business-rules.md` si cambió una regla comercial
- [ ] **6.2** Actualizar `docs/architecture.md` si cambió la arquitectura
- [ ] **6.3** Actualizar `docs/integrations.md` si hay integración o env var nueva
- [ ] **6.4** Comentar el **por qué** en el código, con la densidad del repo
  - *Verificación*: alguien que lea el archivo en 6 meses entiende la decisión

---

## Fase 7 — Cierre

- [ ] **7.1** Validar contra `acceptance.md`, punto por punto
  - *Verificación*: cada criterio tiene un resultado real reportado
- [ ] **7.2** Reportar lo que quedó fuera de scope y los hallazgos
- [ ] **7.3** Commit + push
  - ⚠️ **push a `main` = deploy a producción**
- [ ] **7.4** Marcar esta spec como `DONE`

---

## Hallazgos fuera de scope

Lo que apareció durante la implementación y **no se tocó**:

| Hallazgo | Archivo | Propuesta |
|---|---|---|

---

## Bitácora

Decisiones tomadas en el camino que se apartaron del diseño, y por qué:

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
