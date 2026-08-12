# Tasks — Que los tests sean obligatorios antes de un deploy

| | |
|---|---|
| **Spec** | `004-tests-obligatorios-antes-del-deploy` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |
| **Estimación** | ~1 h + un deploy de prueba a propósito |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] Mariano resolvió las preguntas abiertas de `design.md` §12
- [ ] **Mariano sabe que la Fase 5 rompe un deploy a propósito** y está de acuerdo
- [ ] **Mariano pidió explícitamente la implementación**
      (*"Implementá la spec 004"*)

---

## Reglas de esta implementación

1. **El orden importa**: los tests herméticos van **primero**. Activar el gate
   antes rompería deploys por un motivo ajeno al cambio subido.
2. **`netlify.toml` es el archivo de mayor radio del repo.** Un error de sintaxis
   ahí deja el sitio sin poder actualizarse. Cambio mínimo y aditivo.
3. **No se agregan ni se modifican tests**, más allá de hacerlos herméticos.
4. Sin dependencias nuevas.
5. La spec no se cierra sin el deploy de prueba de la Fase 5.

---

## Fase 0 — Preparación

- [ ] **0.1** Suite en verde
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 210/210
- [ ] **0.2** Reproducir el problema de §0 del diseño: correr un test sensible
      aislado con la variable cargada
  ```bash
  DIGITAL_LINK_PACK_STICKERS=https://ejemplo \
    npx --prefix frontend vitest run --root frontend src/lib/entregaDigital.test.js -t "T-4 · sin la env var"
  ```
  - *Verificación*: **falla** — es el punto de partida

---

## Fase 1 — Tests herméticos (RF-8) · BLOQUEANTE

- [ ] **1.1** `entregaDigital.test.js`: limpiar en `beforeEach` las variables de
      las que depende, no solo en `afterEach`
- [ ] **1.2** Revisar `mpSignature.test.js` (ya limpia en `beforeEach`; confirmar
      que cubre las dos formas del secreto)
- [ ] **1.3** Revisar `abandonedStore.test.js` y `metaMatching.test.js`
- [ ] **1.4** Barrer todos los archivos de test en busca de otras dependencias
      del ambiente
  ```bash
  grep -rn "process.env" frontend/src/lib/*.test.js
  ```
- [ ] **1.5** **Verificar caso por caso**: correr aislado cada test sensible con
      las variables cargadas
  - *Verificación*: el de 0.2 ahora **pasa**
- [ ] **1.6** Correr la suite completa con TODAS las variables de producción
      simuladas
  ```bash
  DIGITAL_LINK_PACK_STICKERS=x DIGITAL_DELIVERY_SECRET=x MP_WEBHOOK_SECRET=x \
  MP_WEBHOOK_STRICT=1 META_CAPI_TOKEN=x META_PIXEL_ID=x RESEND_API_KEY=x \
    npm test --prefix frontend
  ```
  - *Verificación*: 210/210, igual que sin variables

---

## Fase 2 — El script de la raíz

- [ ] **2.1** Agregar `"scripts": { "test": "npm test --prefix frontend" }` al
      `package.json` de la raíz
  - *Verificación*: `npm test` desde la raíz corre la suite
- [ ] **2.2** Confirmar que no rompe `npm ci --prefix ..` del build

---

## Fase 3 — El gate del deploy (RF-1 a RF-4) · el corazón de la spec

- [ ] **3.1** Sumar `npm test --prefix ..` al `command` de `netlify.toml`,
      **antes** de `npm run build`
  - *Archivo*: `netlify.toml`, sección `[build]`
  - *Después*: `npm ci && npm ci --prefix .. && npm test --prefix .. && npm run build`
- [ ] **3.2** Comentar en el `.toml` **por qué** está ahí, con la densidad del repo
  - *Verificación*: alguien que lo lea en 6 meses entiende que sacarlo permite
    deployar con la suite en rojo
- [ ] **3.3** Verificar la sintaxis del `.toml` antes de pushear
  - *Verificación*: el archivo parsea; el resto de las secciones intactas
- [ ] **3.4** Confirmar que `ignore = "exit 1"` sigue estando
  - ⚠️ Sin eso, un push que solo toca `netlify/functions/**` no dispara build

---

## Fase 4 — El hook local (RF-5, RF-6)

- [ ] **4.1** Crear `.githooks/pre-push` y darle permiso de ejecución
  ```bash
  chmod +x .githooks/pre-push
  ```
  - *Verificación*: `git update-index --chmod=+x` si hace falta, para que el
    permiso quede versionado
- [ ] **4.2** El mensaje de error dice cómo saltear (`--no-verify`)
- [ ] **4.3** Activarlo localmente
  ```bash
  git config core.hooksPath .githooks
  ```
- [ ] **4.4** Probar: romper un test → `git push` se cancela
- [ ] **4.5** Probar: `git push --no-verify` sí pasa
- [ ] **4.6** Revertir el test roto

---

## Fase 5 — ⚠️ Meta-verificación: probar que el gate FRENA de verdad

**Sin esta fase no se sabe si la barrera existe.** Requiere romper un deploy a
propósito, con Mariano al tanto.

> El sitio **no se cae**: si el build falla, Netlify no publica y la versión
> anterior sigue en línea. Ese es exactamente el comportamiento a comprobar.

- [ ] **5.1** Romper un test a propósito con un commit claramente marcado
      (ej. `test: romper a propósito para verificar el gate — SE REVIERTE`)
- [ ] **5.2** Pushear con `--no-verify` (saltear el hook para llegar al gate)
- [ ] **5.3** **Verificar en Netlify que el build FALLA** y que dice qué test
      - *Verificación*: el deploy queda en "Failed", no en "Published"
- [ ] **5.4** **Verificar que la tienda sigue funcionando** con la versión anterior
      - *Verificación*: abrir el sitio y completar un recorrido de compra
- [ ] **5.5** Revertir el test roto y pushear
- [ ] **5.6** **Verificar que el deploy vuelve a publicar**
- [ ] **5.7** Confirmar con `git log` que quedó claro qué fue la prueba

---

## Fase 6 — Documentación

- [ ] **6.1** `CLAUDE.md`, sección **Deploy**: que los tests son una condición
      del deploy, no un recordatorio
- [ ] **6.2** `CLAUDE.md`: el comando de instalación del hook, para un clon nuevo
- [ ] **6.3** `CLAUDE.md`: la salida de emergencia (`design.md` §8)
- [ ] **6.4** `docs/architecture.md`, sección Deploy: el gate en el build
- [ ] **6.5** `specs/README.md`: la fase TESTING deja de depender de acordarse

---

## Fase 7 — Cierre

- [ ] **7.1** Suite completa en verde, con y sin variables de entorno
- [ ] **7.2** `git diff --stat -- netlify/functions/ frontend/src/config/` **vacío**
  - *Verificación*: no se tocó lógica de producción
- [ ] **7.3** Recorrer `acceptance.md` punto por punto con resultados reales
- [ ] **7.4** Reportar hallazgos fuera de scope
- [ ] **7.5** Commit + push
- [ ] **7.6** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| | | |

Candidatos del discovery:

- El `prebuild` (sitemap) también corta el deploy si falla, y nadie lo declaró
  como decisión (`requirements.md` §13)
- No hay notificación de build fallido configurada en Netlify

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
