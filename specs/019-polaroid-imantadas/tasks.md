# Tasks — Polaroid imantadas y descuento por volumen

| | |
|---|---|
| **Spec** | `019-polaroid-imantadas` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 019"*.
Ver [`specs/README.md`](../README.md).

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación**
- [ ] Están contestadas las dos preguntas abiertas de `design.md` §11 (sobre
      todo el conteo por línea vs. por carrito: si cambia, **esta lista se
      reescribe antes de ejecutarla**)

---

## Cómo usar esta lista

- Los pasos van **en orden**. Cada uno deja el repo en un estado coherente.
- Cada task tiene un criterio de verificación que se responde con sí o no.
- **Sin refactors de oportunidad** (`CLAUDE.md` regla 8).
- Si una task resulta estar mal planteada, **se para y se avisa**.

---

## Fase 0 — Preparación

- [ ] **0.1** Releer los archivos que se van a modificar y sus tests
  - *Archivos*: `frontend/src/config/pricing.js` (bloque Polaroid y
    `precioVidrieraLinea`), `netlify/functions/lib/pricing.js` (`FIXED_PRICES` y
    `lineBase`), `frontend/src/components/FixedProductPage.jsx`,
    `frontend/src/routes/Polaroid.jsx`, `frontend/src/routes/Tatuajes.jsx`
  - *Verificación*: puedo decir por qué `precioVidrieraLinea()` no persiste su
    resultado y por qué el material va en el id
- [ ] **0.2** Correr la suite y confirmar que arranca en verde
  ```bash
  npm test
  ```
  - *Verificación*: 470 tests pasan
- [ ] **0.3** Confirmar la rama de trabajo
  - *Verificación*: `git branch --show-current` dice
    `claude/polaroid-imantadas-pricing-r45cq7` y **no** `main`

---

## Fase 1 — Precio en el frontend

- [ ] **1.1** Agregar `priceIman` a las tres entradas de `POLAROID_SIZES`
  - *Archivo*: `frontend/src/config/pricing.js`
  - *Valores*: 5x8 → 15000 · 7x10 → 18000 · 9x13 → 21000
  - *Verificación*: `priceIman − price === 6000` en las tres
- [ ] **1.2** Agregar las constantes de volumen e imantado
  - *Archivo*: `frontend/src/config/pricing.js`
  - *Constantes*: `POLAROID_FOTOS_POR_PACK`, `POLAROID_IMAN_POR_FOTO`,
    `POLAROID_VOLUMEN_MIN_PACKS`, `POLAROID_VOLUMEN_OFF_POR_FOTO`,
    `POLAROID_VOLUMEN_OFF_PACK`
  - *Verificación*: `POLAROID_VOLUMEN_OFF_PACK === POLAROID_VOLUMEN_OFF_POR_FOTO * POLAROID_FOTOS_POR_PACK`
- [ ] **1.3** Agregar `polaroidProductId()`, `esPolaroid()`,
      `descuentoPolaroidVolumen()` y `precioPolaroidPack()`
  - *Archivo*: `frontend/src/config/pricing.js`
  - *Verificación*: `precioPolaroidPack('7x10', true, 2) === 16000` y
    `precioPolaroidPack('7x10', true, 1) === 18000`
- [ ] **1.4** Extender `precioVidrieraLinea()` para restar el volumen en las
      líneas de Polaroid, **sin** tocar el camino de la promo de Argentina
  - *Archivo*: `frontend/src/config/pricing.js`
  - *Verificación*: con una línea que no es Polaroid, devuelve exactamente lo
    mismo que antes del cambio; el resultado **no** se persiste en `basePrice`
- [ ] **1.5** Comentar el **por qué** con la densidad del repo: por qué el
      material va en el id, por qué el descuento se deriva y no se guarda, y el
      ⚠️ del espejo
  - *Verificación*: alguien que lea el bloque en 6 meses no lo deshace

---

## Fase 2 — Ficha de producto

- [ ] **2.1** Agregar a `FixedProductPage` la prop **opcional** `variants`
      (selector de material) — sin ella, el componente renderiza igual que hoy
  - *Archivo*: `frontend/src/components/FixedProductPage.jsx`
  - *Verificación*: `/tatuajes` se ve y cobra idéntico a antes (comparar contra
    `git stash`)
- [ ] **2.2** Agregar la prop **opcional** `volumen` (precio por cantidad +
      aviso de RF-9) y que el precio mostrado y el del botón salgan de ahí
  - *Archivo*: `frontend/src/components/FixedProductPage.jsx`
  - *Verificación*: con 2 packs de 7×10 imantadas, el botón dice
    `Agregar · $32.000`
- [ ] **2.3** Accesibilidad del selector: `role`/`aria-pressed` o radios reales,
      foco visible, targets de 44 px, estado seleccionado que no dependa solo
      del color
  - *Verificación*: se opera con tab + enter y se entiende en blanco y negro
- [ ] **2.4** El id y el nombre de la línea que arma `onAdd` incluyen el
      material (`-iman` / *"· Imantadas"*)
  - *Verificación*: el carrito muestra
    *"Fotos Polaroid · x10 · 7 × 10 cm · Imantadas"*
- [ ] **2.5** Pasar `variants` y `volumen` desde `/polaroid` y actualizar los
      textos de la ficha (subtítulo, bullets, specs)
  - *Archivo*: `frontend/src/routes/Polaroid.jsx`
  - *Verificación*: la ficha dice, antes de elegir, que desde 20 fotos baja $200
    por foto
- [ ] **2.6** Sumar los tres ids imantados a `FIXED_SKU`, apuntando al mismo
      SKU de Polaroid
  - *Archivo*: `frontend/src/config/metaCatalog.js`
  - *Verificación*: `FIXED_SKU['polaroid-x10-7x10-iman'] === META_LINE_SKU.polaroid`

---

## Fase 3 — Espejo de precios ⚠️ **obligatoria**

`CLAUDE.md` regla 11.

- [ ] **3.1** Aplicar el cambio en `frontend/src/config/pricing.js`
      *(ya hecho en la Fase 1 — este paso es el control cruzado)*
- [ ] **3.2** Aplicar el **mismo** cambio en `netlify/functions/lib/pricing.js`
  - Tres claves nuevas en `FIXED_PRICES` (15000 / 18000 / 21000)
  - `POLAROID_VOLUMEN_MIN_PACKS` y `POLAROID_VOLUMEN_OFF_PACK`
  - La rama `fixed` de `lineBase()` resta el volumen cuando el id empieza con
    `polaroid-x10` y `quantity >= 2`
  - *Verificación*: los seis precios y los dos umbrales coinciden **exactamente**
    con los del frontend, leídos uno al lado del otro
- [ ] **3.3** Escribir los tests de paridad P-1 a P-8 de `design.md` §9
  - *Archivo*: `frontend/src/lib/promoPricing.test.js`
  - *Verificación*: P-4 da $32.000 calculado por los **dos** lados
- [ ] **3.4** Correr los tests y confirmar que la paridad da verde
  ```bash
  npm test
  ```
  - *Verificación*: ningún checkout de Polaroid se rechazaría con
    `price_mismatch`

---

## Fase 4 — Analytics

- [ ] **4.1** Agregar `trackPolaroidMaterial({ material, tamano })`
  - *Archivo*: `frontend/src/lib/analytics.js`
  - *Verificación*: ningún componente llama a `gtag`/`fbq`/`dataLayer` directo
- [ ] **4.2** Llamarlo desde el selector de material de la ficha
  - *Archivo*: `frontend/src/components/FixedProductPage.jsx`
  - *Verificación*: cambiar de material emite un evento y solo uno
- [ ] **4.3** Que `view_item` y `add_to_cart` reporten el precio y el nombre de
      la variante elegida
  - *Verificación*: con imantadas de 7×10 y 2 packs, el `add_to_cart` reporta
    16000 de unitario, no 12000
- [ ] **4.4** Confirmar `try/catch` y ausencia de PII
  - *Verificación*: un throw dentro del tracking no impide agregar al carrito
- [ ] **4.5** Actualizar `docs/analytics.md` con `polaroid_material`

---

## Fase 5 — Tests

- [ ] **5.1** Tests P-1 a P-8 escritos (Fase 3.3) y pasando
- [ ] **5.2** Suite completa en verde
  ```bash
  npm test
  ```
  - *Verificación*: 470 + los nuevos, sin regresiones
- [ ] **5.3** Verificación manual de `design.md` §9
  - Recorrido de compra completo en mobile (375 px)
  - `/tatuajes` sin cambios
  - Teclado en el selector de material

---

## Fase 6 — Documentación

- [ ] **6.1** `docs/business-rules.md`: tabla de productos de precio fijo con
      los seis ids de Polaroid + la regla nueva de volumen desde 20 fotos
- [ ] **6.2** `docs/architecture.md`: sin cambios (no cambia la arquitectura)
- [ ] **6.3** `docs/integrations.md`: sin cambios (sin env vars ni integraciones
      nuevas). Anotar que las imantadas comparten el SKU de Polaroid en Meta
- [ ] **6.4** Comentarios del **por qué** en los dos lados del espejo
  - *Verificación*: el bloque de Polaroid del servidor dice ⚠️ que está
    espejado y qué test lo verifica

---

## Fase 7 — Cierre

- [ ] **7.1** Validar contra `acceptance.md`, punto por punto
  - *Verificación*: cada criterio tiene un resultado **real** reportado
- [ ] **7.2** Reportar lo que quedó fuera de scope y los hallazgos
- [ ] **7.3** Commit + push a `claude/polaroid-imantadas-pricing-r45cq7`
  - ⚠️ **push a `main` = deploy a producción**. Esta rama no es `main`: el
    merge lo decide Mariano
- [ ] **7.4** Marcar esta spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| No hay **ni un** test que cubra los precios de Polaroid: `promoPricing.test.js` solo prueba `fixed:` con `tatuajes-hoja` | `frontend/src/lib/promoPricing.test.js` | Esta spec lo cierra para Polaroid (P-1 a P-8). `tatuajes-hoja` sigue sin test de paridad de su precio contra `FIXED_PRICES`: se propone aparte |
| `CLAUDE.md` dice "210 tests" y `specs/_template/tasks.md` dice "100 tests"; la suite real tiene **470** | `CLAUDE.md`, `specs/_template/tasks.md` | Actualizar los números en un cambio propio de documentación |
| `docs/business-rules.md` dice `disenos: 7000` para el pack de imprimibles, pero `pricing.js` tiene `disenos: 5000` | `docs/business-rules.md` | Verificar cuál es el número real y corregir el que esté mal, aparte |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
