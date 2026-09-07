# Tasks — Todas las ofertas juntas + cupón con vencimiento por usuario

| | |
|---|---|
| **Spec** | `017-todas-las-ofertas` |
| **Estado** | `DRAFT` — esperando "Implementá la spec 017" |
| **Design** | [`design.md`](design.md) |

---

## ⛔ Antes de tocar una sola línea

- [ ] Mariano dijo explícitamente **"Implementá la spec 017"**
- [ ] Está resuelta la pregunta abierta **P-1** (qué oferta se queda con el banner)
- [ ] `npm test` en verde **antes** de empezar (para saber qué se rompió por esto)
- [ ] Leídos los **dos** lados del espejo (regla 11)
- [ ] `git config core.hooksPath .githooks` activo en este clon

---

## Cómo usar esta lista

Un paso por commit lógico. Cada paso se puede verificar sin ambigüedad. Las
fases **1 y 2 no se pueden separar en dos pushes**: el espejo tiene que salir
completo o el checkout se rechaza (design §8).

---

## Fase 0 — Preparación

- [ ] 0.1 Listar quién importa `config/pricing.js`:
      `grep -rn "config/pricing" frontend/src | wc -l` — anotar el número en la bitácora
- [ ] 0.2 Correr `npm test` y anotar cuántos pasan (hoy: 210)
- [ ] 0.3 Anotar los tests que **van a** fallar por RF-8 (bordes de la ventana del 3x2)

---

## Fase 1 — El motor de precios (frontend)

- [ ] 1.1 `CATEGORIAS_2X1` y `PROMO_2X1_CATEGORIAS` en `config/pricing.js`
- [ ] 1.2 Cambiar `isPromoActive()`, `isMayoristaPromoActive()` y la nueva de 2x1
      para que funcionen **sin `endsAt`** (H-6: hoy `NaN` las deja apagadas para siempre)
- [ ] 1.3 `repartoPromos()` — la **regla E** de design §1, copiada tal cual, con
      el JSDoc que explica por qué NO es "2x1 primero y el sobrante al 3x2"
      (esa regla deja que agregar un calco baje el total hasta $800)
- [ ] 1.4 `percentCap: 0.10` → `0.20`
- [ ] 1.5 Sacar `cuponAnuladoPorPromo` de `CartContext.pricedItems`
- [ ] 1.6 **Actualizar** (no borrar) el comentario de la decisión del 20/8/2026:
      tiene que decir que se revirtió el 7/9/2026 y por qué
- [ ] 1.7 `CartContext.pricedItems` usa `repartoPromos()` en vez del `grouping` único
- [ ] 1.8 `derived` expone lo que la UI necesita para los nudges
      (`unidadesA2x1`, `unidadesA3x2`, `paraProximoGratis`)

**Verificación de la fase**: con 3 Disney + 2 otras de 6 cm en el carrito, el
total es **$4.800** ($8.000 − $3.200).

---

## Fase 2 — ⚠️ Espejo de precios *(no se puede saltear)*

> **La regla más importante del repo.** Si algo de la fase 1 no está acá, todo
> checkout que toque esa regla se rechaza con `price_mismatch`.

- [ ] 2.1 `CATEGORIAS_2X1` en `netlify/functions/lib/pricing.js` — **valor idéntico**
- [ ] 2.2 Predicados sin `endsAt`, espejados
- [ ] 2.3 `repartoPromos()` espejado — **misma función, mismo orden de recorrido
      de `k`, mismo criterio de desempate (`>` y no `>=`), mismo redondeo**.
      Copiar, no reescribir "equivalente": dos óptimos empatados que se resuelvan
      distinto de cada lado dan `price_mismatch`
- [ ] 2.4 `PROMO_PERCENT_CAP` → `0.20`
- [ ] 2.5 Sacar `cuponAnuladoPorPromo` del server
- [ ] 2.6 `couponIssuedAt` en el contrato de `validateAndPriceOrder()`
- [ ] 2.7 Validación de la ventana con tolerancia de 60 s + rechazo de `issuedAt` futuro
- [ ] 2.8 Cupón vencido → **se ignora, no se rechaza el pedido** (design §7)

**Verificación de la fase**: `npm test` — los tests de paridad de
`promoPricing.test.js` comparan las dos tablas campo por campo.

---

## Fase 3 — La ventana del cupón

- [ ] 3.1 `lib/cuponVentana.js`: emitir, leer, ¿venció?, ms restantes
- [ ] 3.2 Manejo del **formato viejo** (string suelto en `localStorage`) — design §3.
      Sin esto, todo el que ya tiene el cupón guardado ve un error
- [ ] 3.3 `components/CuponCountdown.jsx` — un solo componente para popup y checkout
- [ ] 3.4 `aria-live` que anuncia **una vez**, no en cada tick (RNF-5)
- [ ] 3.5 Estado de "último minuto" (color + aviso)

---

## Fase 4 — Las pantallas

- [ ] 4.1 `WelcomePopup`: guarda `emitidoEn` y muestra el contador tras entregar el código
- [ ] 4.2 `Checkout`: contador visible **desde que se entra**, no como sorpresa
- [ ] 4.3 `Checkout`: al llegar a cero, saca el cupón, recalcula y avisa —
      **sin borrar nada de lo ya tipeado** (design §7)
- [ ] 4.4 `Checkout`: manda `couponIssuedAt` en el payload
- [ ] 4.5 `Header` / `PromoBanner`: camino sin `endMs` (sin countdown, RF-8)
- [ ] 4.6 `Header`: resolver P-1 según lo que haya decidido Mariano
- [ ] 4.7 `FeaturedStickers`: importar las 4 categorías de `config/pricing.js` (H-3)
- [ ] 4.8 Copy del 2x1 en las 4 páginas de categoría
- [ ] 4.9 `CartDrawer` y `Cart`: hoy dicen "Promo 3x2" a secas — tienen que
      distinguir qué promo dio cada calco gratis
- [ ] 4.10 Nudge "sumá 1 y llevás otra gratis" distinguiendo 2x1 de 3x2

---

## Fase 5 — Analytics *(regla 13)*

- [ ] 5.1 `cupon_emitido`, `cupon_vencido`, `cupon_aplicado_en_promo` en `lib/analytics.js`
- [ ] 5.2 `promo_unlock` distingue `2x1` de `3x2` (se reusa, no se duplica)
- [ ] 5.3 Todo en `try/catch` — el tracking no puede romper la compra
- [ ] 5.4 Verificar que no se llame a `gtag`/`fbq` desde ningún componente

---

## Fase 6 — Tests

- [ ] 6.1 `lib/reparto.test.js` — 0/1/2/3 unidades de categoría, sobrantes,
      bolsas vacías, tamaños mezclados, el ejemplo aprobado
- [ ] 6.2 `lib/cuponVentana.test.js` — emisión, vencimiento, formato viejo,
      `localStorage` bloqueado, reloj adelantado
- [ ] 6.3 Ampliar `promoPricing.test.js`: paridad de `CATEGORIAS_2X1`,
      `percentCap` y **mismo carrito → mismo `keepFraction`**
- [ ] 6.4 **Reescribir** los tests de los bordes de la ventana del 3x2 contra el
      nuevo predicado (`activa` + `startsAt`). No borrarlos
- [ ] 6.5 `npm test` en verde — **es condición del deploy, no un recordatorio**

---

## Fase 7 — Documentación

- [ ] 7.1 `docs/business-rules.md`: las tres promos, el reparto y **dónde está el interruptor**
- [ ] 7.2 `docs/analytics.md`: los eventos nuevos
- [ ] 7.3 `CRO-EXPERIMENTS.md`: anotar que el `percentCap` cambió (afecta cualquier lectura de test en curso)
- [ ] 7.4 Comentarios en `pricing.js` con la densidad del repo: **por qué**, no qué

---

## Fase 8 — Cierre

- [ ] 8.1 Recorrer `acceptance.md` punto por punto y **reportar el resultado real** (regla 15)
- [ ] 8.2 Verificación manual de los 6 casos de design §9
- [ ] 8.3 Confirmar que las dos mitades del espejo salen en el **mismo push**
- [ ] 8.4 Avisar a Mariano que un push a `main` es un deploy a producción

---

## Hallazgos fuera de scope

Se anotan acá y **no se arreglan en este cambio** (regla 8):

- **H-3** — "Los más elegidos" no sale de ventas reales: son 4 categorías
  hardcodeadas con un diseño al azar. Ya estaba declarado en el componente.
  Con esta spec la lista pasa a ser también la de la promo, así que la promesa
  "más elegidas" queda apoyada en un dato que no existe. Merece spec propia.
- **H-4** — El banner del header no escala a más de una promo simultánea.
- Los 3.397 diseños sin nombre, el cero video y el píxel de Meta bloqueando el
  LCP: análisis del 7/9/2026, specs aparte.

---

## Bitácora

| Fecha | Qué pasó |
|---|---|
| 07/09/2026 | Spec redactada. 4 decisiones tomadas por Mariano vía preguntas. |
| 07/09/2026 | ⚠️ Verificando el algoritmo por fuerza bruta se encontró que la regla aprobada ("2x1 primero, sobrante al 3x2") deja que agregar un calco baje el total hasta $800 en el 1,2 % de los carritos. Se le reportó a Mariano con los números y **decidió pasar a la regla E** (mejor reparto). `requirements.md` RF-3, `design.md` §1 y §11 actualizados. |
| 07/09/2026 | Esperando autorización de implementación. |
