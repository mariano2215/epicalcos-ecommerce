# Tasks — Escala de precios por volumen

| | |
|---|---|
| **Spec** | `032-escala-de-precios-por-volumen` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

- [x] Requirements y design completos
- [ ] **Mariano aprobó la tabla de §9.1** (A, B u otros %) y respondió P-2…P-5
- [ ] **Mariano dijo "Implementá la spec 032"**

⚠️ Push a `main` = deploy. Commit con `-- rutas`, sin cambiar de rama, y el WIP
ajeno queda sin publicar.

---

## Fase 1 — Tabla, función y servidor (nada la emite todavía)

- [ ] **1.1** Pasar la tabla aprobada a `requirements.md` §9.1 con fecha y a `ESCALA_VOLUMEN` en `config/pricing.js`
- [ ] **1.2** `precioVolumen()` y `pctEscalon()` en `config/pricing.js` con el comentario del espejo
- [ ] **1.3** Espejo en `netlify/functions/lib/pricing.js` + rama `volumen` en `lineBase()`
- [ ] **1.4** Tests de `design.md` §5 (paridad 100–1.000, monotonía, servidor acepta/rechaza, cupón no, transferencia sí, umbral)
  - *Verificación*: cambiar un monto en un solo lado hace fallar la suite
- [ ] **1.5** `lib/precioVigente.js` re-precia `volumen:` + test
- [ ] **1.6** Suite completa en verde, con las 4 combinaciones de interruptores 3x2/2x1 (memoria de precios)
- [ ] **1.7** `docs/business-rules.md`: sección de la escala + fila en la tabla del espejo (§8)
- [ ] **1.8** Commit + push

## Fase 2 — Caminos que la usan

- [ ] **2.1** Cotizador de la spec 031 (su Fase 2) emite `volumen:`
- [ ] **2.2** `PackBuilder`: con 100+ emite `volumen:` con los diseños del catálogo en `meta.items`
  - *Verificación*: 250 calcos de 9 cm en `/mayorista` cobran lo mismo que en el cotizador
- [ ] **2.3** Configurador: 100+ unidades (uno o varios diseños) → `volumen:` (coordinado con la spec 023)
  - *Verificación*: 3 diseños × 100 en 6 cm ya no se cotizan como sueltas
- [ ] **2.4** `resumenPedido.js`: rótulo de la línea + test
- [ ] **2.5** Validar contra `acceptance.md` · commit + push

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
