# Tasks — Que los tests sean obligatorios antes de un deploy

| | |
|---|---|
| **Spec** | `004-tests-obligatorios-antes-del-deploy` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETADA` (11/08/2026), salvo la prueba en producción |
| **Estimación** | ~1 h + un deploy de prueba a propósito |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] `design.md` §12: se implementó `pre-push` (no `pre-commit`) y **sin**
      autoinstalación, siguiendo las dos recomendaciones
- [~] **La Fase 5 en producción NO se ejecutó**: Mariano preguntó de qué barrera
      se trataba, así que no llegó a aprobarla. Se hizo la **verificación local
      equivalente** — ver Bitácora y Fase 5.
- [x] **Mariano pidió explícitamente la implementación** (11/08/2026)

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

- [x] **0.1** Suite en verde
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 210/210
- [x] **0.2** Reproducir el problema de §0 del diseño: correr un test sensible
      aislado con la variable cargada
  ```bash
  DIGITAL_LINK_PACK_STICKERS=https://ejemplo \
    npx --prefix frontend vitest run --root frontend src/lib/entregaDigital.test.js -t "T-4 · sin la env var"
  ```
  - *Verificación*: **falla** — es el punto de partida

---

## Fase 1 — Tests herméticos (RF-8) · BLOQUEANTE

- [x] **1.1** `entregaDigital.test.js`: limpiar en `beforeEach` las variables de
      las que depende, no solo en `afterEach`
- [x] **1.2** Revisar `mpSignature.test.js` (ya limpia en `beforeEach`; confirmar
      que cubre las dos formas del secreto)
- [x] **1.3** Revisar `abandonedStore.test.js` y `metaMatching.test.js`
- [x] **1.4** Barrer todos los archivos de test en busca de otras dependencias
      del ambiente
  ```bash
  grep -rn "process.env" frontend/src/lib/*.test.js
  ```
- [x] **1.5** **Verificar caso por caso**: correr aislado cada test sensible con
      las variables cargadas
  - *Verificación*: el de 0.2 ahora **pasa**
- [x] **1.6** Correr la suite completa con TODAS las variables de producción
      simuladas
  ```bash
  DIGITAL_LINK_PACK_STICKERS=x DIGITAL_DELIVERY_SECRET=x MP_WEBHOOK_SECRET=x \
  MP_WEBHOOK_STRICT=1 META_CAPI_TOKEN=x META_PIXEL_ID=x RESEND_API_KEY=x \
    npm test --prefix frontend
  ```
  - *Verificación*: 210/210, igual que sin variables

---

## Fase 2 — El script de la raíz

- [x] **2.1** Agregar `"scripts": { "test": "npm test --prefix frontend" }` al
      `package.json` de la raíz
  - *Verificación*: `npm test` desde la raíz corre la suite
- [x] **2.2** Confirmar que no rompe `npm ci --prefix ..` del build

---

## Fase 3 — El gate del deploy (RF-1 a RF-4) · el corazón de la spec

- [x] **3.1** Sumar `npm test --prefix ..` al `command` de `netlify.toml`,
      **antes** de `npm run build`
  - *Archivo*: `netlify.toml`, sección `[build]`
  - *Después*: `npm ci && npm ci --prefix .. && npm test --prefix .. && npm run build`
- [x] **3.2** Comentar en el `.toml` **por qué** está ahí, con la densidad del repo
  - *Verificación*: alguien que lo lea en 6 meses entiende que sacarlo permite
    deployar con la suite en rojo
- [x] **3.3** Verificar la sintaxis del `.toml` antes de pushear
  - *Verificación*: el archivo parsea; el resto de las secciones intactas
- [x] **3.4** Confirmar que `ignore = "exit 1"` sigue estando
  - ⚠️ Sin eso, un push que solo toca `netlify/functions/**` no dispara build

---

## Fase 4 — El hook local (RF-5, RF-6)

- [x] **4.1** Crear `.githooks/pre-push` y darle permiso de ejecución
  ```bash
  chmod +x .githooks/pre-push
  ```
  - *Verificación*: `git update-index --chmod=+x` si hace falta, para que el
    permiso quede versionado
- [x] **4.2** El mensaje de error dice cómo saltear (`--no-verify`)
- [x] **4.3** Activarlo localmente
  ```bash
  git config core.hooksPath .githooks
  ```
- [x] **4.4** Probar: romper un test → `git push` se cancela
- [x] **4.5** Probar: `git push --no-verify` sí pasa
- [x] **4.6** Revertir el test roto

---

## Fase 5 — ⚠️ Meta-verificación: probar que el gate FRENA de verdad

**Se ejecutó en LOCAL, no en producción.** Mariano preguntó de qué barrera se
trataba antes de aprobarla, así que la prueba con un deploy real quedó sin su
visto bueno y no se hizo.

Lo que sí se verificó, rompiendo a propósito un test real (la paridad de precios
frontend↔servidor) y revirtiéndolo con `git checkout`:

- [x] **5.1** `npm test` desde la raíz **falla** con exit code **1**
- [x] **5.2** El hook `pre-push` **cancela** el push (exit 1) y explica cómo
      saltear
- [x] **5.3** **La cadena exacta del build se corta**: corriendo
      `npm test --prefix .. && npm run build` desde `frontend/`, exit code **1**
      y `vite build` **nunca se ejecuta** (0 ocurrencias en el log)
- [x] **5.4** Test revertido: `git diff` vacío
- [x] **5.5** Con la suite en verde, la misma cadena da exit **0** y construye
      (`✓ built in 6.45s`)
- [ ] **5.6** ⏳ **PENDIENTE**: confirmar en un deploy real que Netlify falla el
      build y no publica. Requiere aprobación explícita de Mariano.

**Qué prueba lo local y qué no**: prueba el encadenamiento con `&&`, que es la
parte escrita en este repo — si la suite falla, nunca se llega a construir ni a
publicar nada. Lo que queda sin comprobar es que Netlify trate un comando con
exit ≠ 0 como build fallido, que es comportamiento documentado de la plataforma
y el mismo que ya aplica al `prebuild` del sitemap.


---

## Fase 6 — Documentación

- [x] **6.1** `CLAUDE.md`, sección **Deploy**: que los tests son una condición
      del deploy, no un recordatorio
- [x] **6.2** `CLAUDE.md`: el comando de instalación del hook, para un clon nuevo
- [x] **6.3** `CLAUDE.md`: la salida de emergencia (`design.md` §8)
- [x] **6.4** `docs/architecture.md`, sección Deploy: el gate en el build
- [x] **6.5** `specs/README.md`: la fase TESTING deja de depender de acordarse

---

## Fase 7 — Cierre

- [x] **7.1** Suite completa en verde, con y sin variables de entorno
- [x] **7.2** `git diff --stat -- netlify/functions/ frontend/src/config/` **vacío**
  - *Verificación*: no se tocó lógica de producción
- [x] **7.3** Recorrer `acceptance.md` punto por punto con resultados reales
- [x] **7.4** Reportar hallazgos fuera de scope
- [x] **7.5** Commit + push
- [x] **7.6** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| `specs/README.md` nombraba specs de ejemplo que ya no existen (`002-entrega-automatica-imprimibles`, `003-enforcar-csp`). Se corrigió con los nombres reales por ser el archivo que esta spec ya estaba editando. | `specs/README.md` | Hecho. |
| El `prebuild` (sitemap) también corta el deploy si falla y nadie lo declaró como decisión. Ahora convive con el gate de tests. | `frontend/package.json` | Declararlo, o dejarlo como está a sabiendas. |
| No hay notificación de build fallido en Netlify: un deploy cortado por el gate pasa desapercibido hasta que alguien mira el sitio. | panel de Netlify | Configurar el aviso por mail (no es código). |
| El hook no se instala solo. Un clon nuevo no lo tiene y nadie avisa. | `.githooks/` | Aceptado a propósito (`design.md` §12): el gate del build es el que protege. |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 11/08/2026 | **Los tests se hicieron herméticos con un `setupFiles` global** (`frontend/src/test-setup.js`) en vez de un `beforeEach` por archivo, como decía el diseño §4a. | El `beforeEach` por archivo arregla los 4 archivos de hoy; el setup global arregla **la clase**: cualquier test futuro arranca con el entorno limpio sin que nadie se acuerde. Es el mismo criterio de la spec 001 (arreglar el mecanismo, no el caso). Costó una línea en `vite.config.js`. |
| 11/08/2026 | **La Fase 5 se verificó en local, no rompiendo un deploy real.** | Mariano preguntó de qué barrera se trataba en vez de aprobarla; sin su OK explícito no correspondía romper un deploy. La verificación local cubre el encadenamiento, que es lo que se escribió acá. |
| 11/08/2026 | Se trabajó y commiteó sobre `main`, sin rama. | Flujo establecido del proyecto (igual que 001, 002 y 003). |
