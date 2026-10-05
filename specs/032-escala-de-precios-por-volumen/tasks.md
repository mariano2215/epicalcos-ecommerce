# Tasks — Escala de precios por volumen

| | |
|---|---|
| **Spec** | `032-escala-de-precios-por-volumen` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `EN CURSO` — Fase 1 publicada el 05/10/2026; Fase 2 sin empezar |

---

## ⛔ Antes de tocar una sola línea

- [x] Requirements y design completos
- [x] **Mariano aprobó la tabla de §9.1** (opción B, sin 9 cm) y respondió P-1…P-4 y P-6 (05/10/2026)
- [ ] **Mariano dijo "Implementá la spec 032"**

⚠️ Push a `main` = deploy. Commit con `-- rutas`, sin cambiar de rama, y el WIP
ajeno queda sin publicar.

---

## Fase 1 — Tabla, función y servidor (nada la emite todavía)

- [x] **1.1** `ESCALA_VOLUMEN` en `config/pricing.js` con la tabla de `requirements.md` §9.1 (opción B, 4 y 6 cm + holográfico)
- [x] **1.2** `precioVolumen()` y `pctEscalon()` en `config/pricing.js` con el comentario del espejo
- [x] **1.3** Espejo en `netlify/functions/lib/pricing.js` + rama `volumen` en `lineBase()`
- [x] **1.4** Tests de `design.md` §5 (paridad 100–1.000, monotonía, servidor acepta/rechaza, cupón no, transferencia sí, umbral)
  - *Verificación*: cambiar un monto en un solo lado hace fallar la suite
- [x] **1.5** `lib/precioVigente.js` re-precia `volumen:` + test
- [x] **1.6** Suite completa en verde, con las 4 combinaciones de interruptores 3x2/2x1 (memoria de precios)
- [ ] **1.7** `docs/business-rules.md`: sección de la escala + fila en la tabla del espejo (§8)
- [ ] **1.8** Commit + push

## Fase 2 — Caminos que la usan

- [ ] **2.1** Cotizador de la spec 031 (su Fase 2) emite `volumen:`
- [ ] **2.2** `PackBuilder`: con 100+ emite `volumen:` con los diseños del catálogo en `meta.items`; en `/mayorista` sin opción de 9 cm
  - *Verificación*: 250 calcos de 6 cm en `/mayorista` cobran lo mismo que en el cotizador ($118.999); el selector de tamaño de `/mayorista` no muestra 9 cm
- [ ] **2.3** Configurador: 100+ unidades en 4 o 6 cm (uno o varios diseños) → `volumen:`; en 9 cm sigue suelta con la sugerencia de 4 o 6 cm (coordinado con la spec 023)
  - *Verificación*: 3 diseños × 100 en 6 cm ya no se cotizan como sueltas
- [ ] **2.4** `resumenPedido.js`: rótulo de la línea + test
- [ ] **2.5** Validar contra `acceptance.md` · commit + push

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 05/10/2026 | Fase 1 publicada sin la 1.7 (business-rules.md) | Se cortó por límite de uso. Ningún camino emite todavía líneas `volumen:`: el servidor ya las acepta, el sitio sigue cobrando como antes |
| 05/10/2026 | Pendiente para la Fase 2 (configurador): `repartoVolumen()` en `lib/precioPersonalizados.js` — 100 a 1.000 en una línea; menos de 100, escalón de 100 si las sueltas ya cuestan eso; más de 1.000, de a 1.000; holográfico siempre escala desde 100; sin "ahorrás %" contra la suelta (se muestra el % de la escala y MUESTRA GRATIS en 100) | Diseño cerrado en la sesión, código no publicado |
