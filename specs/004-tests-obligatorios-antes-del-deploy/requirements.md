# Requirements — Que los tests sean obligatorios antes de un deploy

| | |
|---|---|
| **Spec** | `004-tests-obligatorios-antes-del-deploy` |
| **Estado** | `READY FOR REVIEW` |
| **Fecha** | 11/08/2026 |
| **Autor** | Claude (pedido de Mariano al cerrar la spec 003) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

**El repo tiene 210 tests y nada obliga a correrlos.**

`main` deploya en cada push —`netlify.toml` fuerza el build con
`ignore = "exit 1"`— y el build **no ejecuta la suite**. Se puede pushear código
con los tests en rojo y sale a producción igual, en minutos.

No hay ninguna barrera: el discovery confirmó que **no hay un solo hook de git
instalado** (`.git/hooks` tiene únicamente los `.sample`), no hay
`core.hooksPath`, y no hay husky ni nada equivalente.

### Por qué importa más acá que en otro proyecto

Los tests de este repo no verifican detalles cosméticos. Verifican:

- que el precio que el cliente ve sea el que paga (spec 001)
- que no se le mande a un cliente un mail sin su archivo (spec 002)
- que no se vuelvan a rechazar el 100 % de los pagos (spec 003)
- que un fallo de lectura no apague la recuperación de carritos (spec 003)
- **la paridad de precios frontend ↔ servidor**, que si se rompe deja a todo el
  país sin poder comprar

Las tres specs anteriores terminaron con *"correr `npm test`"* como un paso
manual. Funcionó porque lo corrí en cada una. **Eso no es un sistema: es una
costumbre**, y la costumbre se pierde el día que hay apuro.

### El agujero es doble

1. **Nada corre los tests antes de pushear.**
2. **Nada corre los tests antes de deployar.** Aunque alguien los corriera en su
   máquina, el deploy no verifica nada.

---

## 2. Objetivo

Que **no se pueda poner en producción código con la suite en rojo**, sin depender
de que alguien se acuerde.

**Cómo se sabrá que funcionó**: romper un test a propósito y comprobar que el
deploy no llega a publicarse.

---

## 3. Scope

- [ ] El deploy **falla** si la suite está en rojo, y el sitio anterior queda vivo
- [ ] Quien pushea se entera **antes**, en su máquina, sin esperar al deploy
- [ ] Los tests dejan de depender del entorno donde corren (ver §10, es un
      requisito, no un detalle)
- [ ] Queda documentado cómo saltear la barrera en una urgencia, y qué cuesta
- [ ] Sin dependencias nuevas

---

## 4. Fuera de scope

- [ ] **CI en GitHub Actions.** El deploy ya es el punto de control natural y no
      hay repo de GitHub declarado como parte del flujo. Sumar un CI aparte
      duplica la verificación y agrega una plataforma más.
- [ ] **Cobertura mínima, linter, formateo, type-check.** Otra discusión.
- [ ] **Tests nuevos.** Esta spec no agrega ni cambia ninguna verificación:
      solo hace que las que ya existen sean obligatorias.
- [ ] **Deploy previews / staging.** Cambiar el modelo de deploy es otra spec.
- [ ] Tocar comportamiento de la tienda. **Esta spec no cambia lo que el sistema
      hace para un cliente.**

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| **Mariano** | Deja de cargar con acordarse. A cambio, un deploy puede fallar por un test —y ahí hay que arreglarlo o saltear a propósito—. |
| **Claude / quien programe acá** | El "corré `npm test`" deja de ser un recordatorio en un `tasks.md` y pasa a ser una condición. |
| **Cliente de la tienda** | No lo ve nunca. Es exactamente el punto: no llega a ver el bug que el test frena. |

---

## 6. User stories

- **US-1** — Como Mariano, quiero que un push con la suite en rojo **no llegue a
  producción**, para que la tienda no dependa de mi memoria.

- **US-2** — Como quien pushea, quiero enterarme en mi máquina y no cinco minutos
  después mirando por qué falló el deploy.

- **US-3** — Como Mariano, quiero poder saltear la barrera si tengo una urgencia
  real, sabiendo exactamente qué me estoy salteando.

- **US-4** — Como quien clona el repo por primera vez, quiero que la protección
  del deploy funcione **sin tener que configurar nada**.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| **RF-1** | Si la suite falla, el **deploy no se publica** | 🔴 must |
| **RF-2** | Esa barrera funciona **sin configuración previa** en la máquina de nadie | 🔴 must |
| **RF-3** | Si la suite falla, se ve **cuál** test falló en el log del deploy | 🔴 must |
| **RF-4** | La barrera del deploy **no se puede saltear por accidente** | 🔴 must |
| **RF-5** | Quien pushea recibe el aviso **antes** de pushear | 🟡 should |
| **RF-6** | Esa segunda barrera se instala con **un solo comando**, documentado | 🟡 should |
| **RF-7** | Existe una forma **explícita y documentada** de saltear en una urgencia | 🟡 should |
| **RF-8** | Los tests dan el mismo resultado con o sin variables de entorno cargadas | 🔴 must |
| **RF-9** | El deploy no se vuelve notablemente más lento | 🟡 should |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| **RNF-1** | **Sin dependencias nuevas** | ni husky, ni lint-staged, ni un runner extra |
| **RNF-2** | **Sin cambios de comportamiento** | la tienda hace exactamente lo mismo |
| **RNF-3** | **Reversible en un commit** | volver atrás no puede requerir tocar el panel de Netlify |
| **RNF-4** | **Rápido** | la suite tarda ~1 s; el deploy no debería notar la diferencia |
| **RNF-5** | **Sin secretos** | la barrera no necesita ninguna variable nueva |
| **RNF-6** | **Diagnosticable** | un deploy fallado tiene que decir *por qué* sin entrar a investigar |

---

## 9. Reglas de negocio

Esta spec **no toca ninguna regla comercial**. Protege las que ya están
verificadas.

- [x] **NO** toca `pricing.js` de ningún lado
- [x] **NO** toca `config/`
- [x] **NO** agrega ni modifica tests

---

## 10. ⚠️ El obstáculo que hay que resolver antes

**Los tests de hoy no son herméticos: dependen de qué variables de entorno haya
cargadas.** Y las variables de Netlify **están disponibles durante el build**.

Verificado el 11/08/2026: corriendo el test *"T-4 · sin la env var del link…"* de
forma aislada, con `DIGITAL_LINK_PACK_STICKERS` presente:

```
AssertionError: expected 'https://drive.google.com/drive/folder…' to be null
Tests  1 failed | 21 skipped
```

La suite completa pasa igual — pero **por casualidad**: un `afterEach` de un test
anterior borra la variable antes de que ese test corra. Cambiar el orden, aislar
un test o agregar uno arriba rompe la ilusión.

**Consecuencia directa**: en cuanto se carguen `DIGITAL_LINK_PACK_STICKERS` y
`DIGITAL_DELIVERY_SECRET` en Netlify (que es inminente — spec 002), activar la
barrera del deploy podría empezar a fallar builds por una razón que no tiene nada
que ver con el código que se está subiendo.

Por eso **RF-8 es un requisito bloqueante**: los tests tienen que ser herméticos
*antes* de que la barrera se active, o la primera vez que falle nadie va a
entender por qué.

---

## 11. Edge cases

| Caso | Qué se espera |
|---|---|
| La suite falla | el deploy se corta y **el sitio anterior sigue vivo** |
| Un test falla solo en el entorno del deploy | no debería poder pasar (RF-8); si pasa, el log tiene que decir cuál |
| Urgencia real con un test roto ajeno al fix | hay una salida documentada (RF-7) |
| Alguien clona el repo y pushea sin configurar nada | la barrera del deploy igual actúa (RF-2) |
| Se pushea solo documentación | los tests corren igual; tardan ~1 s |
| Se pushea solo `netlify/functions/**` | los tests corren igual (el build ya se fuerza con `ignore = "exit 1"`) |
| La barrera local se saltea con `--no-verify` | el deploy la vuelve a aplicar |

---

## 12. Analytics necesarios

**Ninguno.** Nada de esto ocurre en el navegador de un cliente.

---

## 13. Preguntas abiertas

- [ ] **¿Se quiere también que un deploy fallado avise por mail?** Netlify puede
      notificar builds fallidos. **Recomendación**: sí, pero se configura en el
      panel (no es código) y conviene decidirlo después de ver cuántas veces
      salta de verdad.

- [ ] **¿Qué hacer si el `prebuild` (sitemap) falla?** Hoy también corta el
      deploy y nadie lo declaró como decisión. Queda anotado; no se cambia acá.
