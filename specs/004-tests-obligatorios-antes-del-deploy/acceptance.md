# Acceptance — Que los tests sean obligatorios antes de un deploy

| | |
|---|---|
| **Spec** | `004-tests-obligatorios-antes-del-deploy` |
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

Esta spec entrega una barrera. **Una barrera que nunca frenó nada no se sabe si
existe**, así que el criterio central es §4: romper un test a propósito y ver el
deploy fallar.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **AC-1** *(RF-1)* | Con la suite en rojo, el build de Netlify **falla** | deploy de prueba (§4) | ⬜ |
| **AC-2** *(RF-1)* | Ese deploy fallido **no publica**: la tienda sigue con la versión anterior | abrir el sitio | ⬜ |
| **AC-3** *(RF-2)* | La barrera actúa sin que nadie haya configurado nada en su máquina | está en `netlify.toml`, versionado | ⬜ |
| **AC-4** *(RF-3)* | El log del deploy dice **qué test** falló | leer el log de Netlify | ⬜ |
| **AC-5** *(RF-4)* | No se puede saltear desde git (`--no-verify` no afecta al build) | §4, paso 5.2 | ⬜ |
| **AC-6** *(RF-5)* | Con el hook instalado, `git push` se cancela si la suite está en rojo | probar en local | ⬜ |
| **AC-7** *(RF-6)* | El hook se instala con **un** comando documentado | `git config core.hooksPath .githooks` | ⬜ |
| **AC-8** *(RF-6)* | El hook queda versionado y con permiso de ejecución | clonar y revisar | ⬜ |
| **AC-9** *(RF-7)* | La salida de emergencia está documentada en `CLAUDE.md` | leer | ⬜ |
| **AC-10** *(RF-8)* | **La suite da 210/210 con y sin variables de entorno cargadas** | correr las dos veces | ⬜ |
| **AC-11** *(RF-8)* | Cada test sensible pasa **corriendo aislado** con las variables cargadas | `vitest -t` | ⬜ |
| **AC-12** *(RF-9)* | El deploy no se vuelve notablemente más lento | comparar duración | ⬜ |
| **AC-13** | `npm test` funciona desde la raíz | correr el comando | ⬜ |

> **AC-10 y AC-11 son bloqueantes.** Sin tests herméticos, la barrera empieza a
> fallar builds por motivos ajenos al código subido — y la primera vez que pase,
> nadie va a entender por qué.

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **ANF-1** *(RNF-1)* | Sin dependencias nuevas | `git diff package.json frontend/package.json` | ⬜ |
| **ANF-2** *(RNF-2)* | La tienda hace exactamente lo mismo | `git diff` de `netlify/functions/` y `frontend/src/config/` vacío | ⬜ |
| **ANF-3** *(RNF-3)* | Revertible en un commit, sin tocar el panel de Netlify | leer el cambio | ⬜ |
| **ANF-4** *(RNF-4)* | La suite sigue tardando ~1 s | salida de vitest | ⬜ |
| **ANF-5** *(RNF-5)* | Sin variables de entorno nuevas | leer el cambio | ⬜ |
| **ANF-6** *(RNF-6)* | El `netlify.toml` explica **por qué** está el gate | leer el comentario | ⬜ |
| **ANF-7** | Ningún test imprime un secreto en el log del build | leer el log del deploy | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Suite en rojo | build cortado, sitio anterior vivo | ⬜ |
| Push de solo documentación | los tests corren igual (~1 s) | ⬜ |
| Push que solo toca `netlify/functions/**` | el build igual se dispara y corre los tests | ⬜ |
| `git push --no-verify` | el push sale, pero el gate del build actúa igual | ⬜ |
| Clon nuevo sin instalar el hook | el gate del build igual protege | ⬜ |
| Variables de producción cargadas en el build | la suite pasa igual | ⬜ |
| `ignore = "exit 1"` sigue vigente | un cambio function-only no queda "Canceled" | ⬜ |

---

## 4. ⚠️ Meta-verificación: la barrera frena de verdad

**El criterio más importante.** Requiere romper un deploy a propósito, con la
tienda funcionando.

| ID | Paso | Resultado esperado | Resultado |
|---|---|---|---|
| **MV-1** | Romper un test y pushear con `--no-verify` | el build de Netlify **falla** | ⬜ |
| **MV-2** | Mirar el sitio durante el build fallido | la tienda **sigue funcionando** con la versión anterior | ⬜ |
| **MV-3** | Leer el log del deploy | dice qué test falló | ⬜ |
| **MV-4** | Revertir el test y pushear | el deploy **vuelve a publicar** | ⬜ |
| **MV-5** | `git log` | queda claro que fue una prueba deliberada | ⬜ |

> Si MV-1 no falla el build, **la spec no está terminada** por más que todo lo
> demás esté en verde: significa que la barrera no existe.

---

## 5. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| **REG-1** | Los 210 tests siguen pasando | ⬜ |
| **REG-2** | El build de producción sigue funcionando | ⬜ |
| **REG-3** | El sitemap se sigue generando en el `prebuild` | ⬜ |
| **REG-4** | Las Functions se siguen desplegando (`directory` intacto) | ⬜ |
| **REG-5** | Los redirects y los headers de `netlify.toml` sin cambios | ⬜ |
| **REG-6** | Un recorrido de compra completo sigue funcionando | ⬜ |

> **REG-4 y REG-5 son el riesgo real**: `netlify.toml` gobierna el deploy entero.
> Un cambio mal hecho ahí no rompe un test, deja el sitio sin actualizarse.

---

## 6. Analytics

⏭️ **No aplica.** Nada de esto ocurre en el navegador de un cliente.

- [ ] Verificar que no se agregó ningún evento

---

## 7. ⚠️ Paridad de precios

⏭️ **No aplica**: esta spec no toca ninguna regla de precio. De hecho, **protege**
los tests que la verifican.

- [ ] `netlify/functions/lib/pricing.js` sin tocar
- [ ] `frontend/src/config/` sin tocar

---

## Definition of Done

### La barrera
- [ ] AC-1 a AC-13 en ✅
- [ ] Todos los edge cases de §3 en ✅
- [ ] **MV-1 a MV-5 en ✅** — sin esto la spec no está terminada
- [ ] REG-1 a REG-6 en ✅

### Las restricciones
- [ ] Sin dependencias nuevas
- [ ] `git diff` de `netlify/functions/` y `frontend/src/config/` vacío
- [ ] Ningún secreto en el log del build

### Documentación
- [ ] `CLAUDE.md` — deploy, instalación del hook y salida de emergencia
- [ ] `docs/architecture.md` — el gate en la sección de Deploy
- [ ] `specs/README.md` — la fase TESTING ya no depende de acordarse

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope anotados
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

### El deploy de prueba
| | |
|---|---|
| Commit que rompió el test | |
| Estado del deploy | |
| ¿La tienda siguió funcionando? | |
| Commit que revirtió | |

### Criterios no cumplidos
| ID | Qué pasó | Decisión |
|---|---|---|

### Notas
