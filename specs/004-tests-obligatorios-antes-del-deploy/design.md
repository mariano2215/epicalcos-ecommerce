# Design — Que los tests sean obligatorios antes de un deploy

| | |
|---|---|
| **Spec** | `004-tests-obligatorios-antes-del-deploy` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 11/08/2026 |

---

## 0. Hallazgos del discovery

Verificado: `.git/hooks`, `git config core.hooksPath`, ambos `package.json`,
`netlify.toml`, `.claude/settings.local.json`, y la resolución de dependencias.

| Pregunta | Hallazgo |
|---|---|
| ¿Hay hooks de git? | **Ninguno.** Solo los `.sample` que trae git. Sin `core.hooksPath`, sin husky, sin lint-staged. |
| ¿El build corre los tests? | **No.** `npm ci && npm ci --prefix .. && npm run build`. |
| ¿El `package.json` de la raíz tiene scripts? | **No, está vacío.** No existe `npm test` en la raíz. |
| ¿Netlify instala devDependencies? | **Sí.** `vite` es devDependency y el build funciona ⇒ `vitest` también va a estar. |
| ¿Los tests resuelven `@netlify/blobs` en el build? | **Sí.** `npm ci --prefix ..` lo instala en la raíz y Node resuelve hacia arriba. |
| ¿Los tests son herméticos? | **NO.** Ver abajo. Es el hallazgo que ordena esta spec. |

### El hallazgo que cambia el orden de las cosas

Los tests leen `process.env`, y **las variables de Netlify están disponibles
durante el build**. Corriendo un test aislado con la variable presente:

```
$ DIGITAL_LINK_PACK_STICKERS=… vitest run entregaDigital.test.js -t "T-4 · sin la env var"
AssertionError: expected 'https://drive.google.com/drive/folder…' to be null
```

La suite completa pasa **por casualidad**: el `afterEach` de un test anterior
borra la variable. Es la misma clase de fragilidad que la spec 003 vino a
eliminar — un test que está en verde por un motivo que no es el suyo.

⇒ **Hacer los tests herméticos es el paso 1, no un detalle.** Activar la barrera
antes sería instalar una alarma que suena sola.

---

## 1. Arquitectura propuesta

**Dos barreras, con roles distintos.** Ninguna sola alcanza.

```
   git push
      │
      ├─ [1] hook local pre-push  ──► rápido, avisa antes
      │        · se saltea con --no-verify
      │        · requiere un comando de instalación por clon
      │        ⇒ ayuda, NO protege
      ▼
   main en el remoto
      │
      ▼
   build de Netlify
      │
      ├─ [2] npm test ANTES de npm run build  ──► la barrera real
      │        · no se puede saltear desde git
      │        · funciona en cualquier clon, sin configurar nada
      │        · si falla: no hay publish, el sitio anterior sigue vivo
      ▼
   deploy publicado
```

| | Hook local | Gate en el build |
|---|---|---|
| Velocidad del aviso | inmediata | ~1 min |
| ¿Se puede saltear? | sí (`--no-verify`) | no desde git |
| ¿Funciona en un clon nuevo? | **no** (hay que instalarlo) | **sí** |
| ¿Protege producción? | **no** | **sí** |

El hook es **comodidad**; el gate es **la garantía**. Por eso el gate es `must`
(RF-1, RF-2) y el hook es `should` (RF-5, RF-6).

### Decisiones y alternativas descartadas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Gate en el build de Netlify | Solo un hook local | Un hook no protege: `--no-verify` lo saltea y un clon nuevo no lo tiene. Sería seguridad de mentira. |
| `core.hooksPath` + script versionado | **husky** | Husky es una dependencia nueva para algo que git ya resuelve con una línea de config (regla 10). |
| `npm test` **antes** de `npm run build` | después | Falla en ~1 s en vez de después de 7 s de build. Y no tiene sentido construir algo que no se va a publicar. |
| Script `test` en el `package.json` de la raíz | repetir `--prefix frontend` en cada lugar | Hoy la raíz no tiene scripts y `npm test` desde la raíz falla. Un solo lugar que defina "correr los tests" evita que el hook y el build se desincronicen. |
| Tests herméticos primero | activar el gate y ver qué pasa | Ya sabemos qué pasa (§0). Activarlo antes rompería deploys por un motivo no relacionado con el cambio subido. |
| Documentar el escape | no dejar salida | Una barrera sin salida documentada se saltea a lo bruto en la primera urgencia, y esa improvisación es peor. |

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/lib/entregaDigital.test.js` | limpiar env en `beforeEach`, no solo en `afterEach` | 🟢 es un test |
| `frontend/src/lib/mpSignature.test.js` | ídem, revisar que no dependa del ambiente | 🟢 |
| `frontend/src/lib/abandonedStore.test.js` | ídem | 🟢 |
| `frontend/src/lib/metaMatching.test.js` | ídem | 🟢 |
| `package.json` (raíz) | agregar `scripts.test` | 🟢 aditivo |
| `netlify.toml` | sumar `npm test` al `command` | 🔴 **toca TODOS los deploys** |
| `CLAUDE.md` | la sección de deploy deja de ser "acordate de correr los tests" | 🟢 |

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `.githooks/pre-push` | corre la suite antes de un push (script `sh`, ejecutable) |

### Archivos que NO se modifican

Todo `netlify/functions/**`, todo `frontend/src/` salvo los 4 tests, y
`frontend/package.json` (ya tiene su `test`).

### ⚠️ El módulo compartido de esta spec es `netlify.toml`

No es un módulo de código, pero **su radio es el mayor del repo**: el `command`
gobierna todos los deploys. Un error de sintaxis ahí no rompe un test — deja el
sitio sin poder actualizarse.

Mitigación: el cambio es **aditivo y de una sola cláusula**, y se verifica con un
deploy real antes de dar la spec por cerrada.

---

## 3. Datos

Sin cambios de datos, ni de esquema, ni de persistencia.

---

## 4. El cambio concreto

### a) Tests herméticos (RF-8) — primero

Cada archivo que dependa de una variable de entorno la **limpia al empezar cada
test**, no solo al terminar:

```js
beforeEach(() => {
  delete process.env.DIGITAL_LINK_PACK_STICKERS;
  delete process.env.DIGITAL_DELIVERY_SECRET;
});
```

Criterio: **un test tiene que dar lo mismo corriendo solo que corriendo último**.
Se verifica con `-t` sobre los casos sensibles, con las variables cargadas.

### b) Script en la raíz

```json
"scripts": { "test": "npm test --prefix frontend" }
```
Un solo lugar define qué significa "correr los tests". El hook y el build lo
usan; si mañana cambia el runner, cambia acá.

### c) Gate en el build

```toml
command = "npm ci && npm ci --prefix .. && npm test --prefix .. && npm run build"
```

`--prefix ..` porque el build corre con `base = "frontend"` y el script vive en
la raíz. Si la suite falla, `npm` devuelve ≠ 0, Netlify corta el build y
**no publica**: el sitio anterior sigue en línea.

### d) Hook local

`.githooks/pre-push`:
```sh
#!/bin/sh
npm test --prefix "$(git rev-parse --show-toplevel)" || {
  echo "Tests en rojo: el push se cancela. Para saltear: git push --no-verify"
  exit 1
}
```

Se activa una vez por clon:
```bash
git config core.hooksPath .githooks
```

⚠️ **No se activa solo.** Es la limitación conocida de los hooks sin
dependencias, y la razón por la que no se puede confiar en él (RF-2 lo cubre el
gate del build). Va documentado en `CLAUDE.md`.

---

## 5. APIs e integraciones

**Ninguna.** No hay endpoints, ni servicios externos, ni variables nuevas.

---

## 6. Seguridad

- [x] Sin variables nuevas y sin secretos (RNF-5)
- [x] El hook no lee ni imprime ninguna variable
- [x] El log del build muestra nombres de tests, no valores de entorno

⚠️ **Un riesgo que sí existe**: si un test imprimiera un secreto, ahora ese valor
quedaría en el log de deploy de Netlify. La spec 003 verificó que ningún test usa
secretos reales (solo de juguete) — hay que mantenerlo así.

---

## 7. Manejo de errores

| Escenario | Qué pasa | Qué se ve |
|---|---|---|
| Suite en rojo en el build | build cortado, **sin publicar** | el log dice qué test falló |
| Suite en rojo en el push | push cancelado | la salida de vitest en la terminal |
| El hook no está instalado | el push sale | el gate del build igual actúa |
| Urgencia con un test ajeno roto | ver §8 | — |
| `npm test` no existe en la raíz | el build falla siempre | por eso el script de la raíz es parte del cambio |

---

## 8. La salida de emergencia (RF-7)

Una barrera sin salida documentada se saltea improvisando, y eso es peor.

**Saltear el hook local** (no toca producción):
```bash
git push --no-verify
```

**Saltear el gate del deploy** — hay que ser explícito, y queda en el historial:
1. Sacar `npm test --prefix ..` del `command` en `netlify.toml`
2. Commitear con un mensaje que diga **por qué**
3. Volver a ponerlo en cuanto se arregle el test

No se ofrece una variable de entorno para desactivarlo: un interruptor cómodo
termina quedando apagado. Que cueste un commit es la idea.

---

## 9. Estrategia de migración

**No aplica**: no hay datos ni comportamiento previo.

- **Rollback**: revertir el commit. `netlify.toml` vuelve al `command` anterior y
  el deploy siguiente ya no corre los tests (RNF-3: no hace falta tocar el panel).
- El hook local se desactiva con `git config --unset core.hooksPath`.

---

## 10. Testing (de esta spec)

Meta-verificación, igual que en la spec 003: **una barrera que nunca frena nada
no sirve**.

- [ ] Romper un test a propósito y confirmar que `npm test` desde la raíz falla
- [ ] Con el hook instalado, confirmar que `git push` se cancela
- [ ] Confirmar que `git push --no-verify` sí pasa
- [ ] **Confirmar en un deploy real que un test roto corta el build y el sitio
      anterior sigue en línea** — es el único criterio que prueba RF-1
- [ ] Revertir y confirmar que el deploy vuelve a publicar

⚠️ El punto 4 exige **pushear a propósito un test roto a producción**. Se hace
con la tienda funcionando (el sitio anterior no se cae) y se revierte enseguida.
Es la única forma de saber que la barrera existe de verdad.

---

## 11. Dependencias nuevas

**Ninguna.** `core.hooksPath` es de git; el gate es una cláusula más del
`command` que ya existe.

---

## 12. Preguntas abiertas del diseño

- [ ] **¿El hook corre en `pre-push` o en `pre-commit`?**
      **Recomendación**: `pre-push`. Un commit local roto no le hace daño a
      nadie y bloquear cada commit con la suite entera molesta más de lo que
      protege. El push es el momento en que el código sale de la máquina.

- [ ] **¿Se activa el hook automáticamente con un `prepare` en el `package.json`
      de la raíz?** Correría en `npm install` de la raíz.
      **Recomendación**: no. Ese `npm install` casi no se corre, así que daría
      una falsa sensación de automatismo. Mejor un comando explícito y
      documentado.
