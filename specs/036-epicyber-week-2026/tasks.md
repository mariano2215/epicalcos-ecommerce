# Tasks — EPICYBER WEEK 2026

| | |
|---|---|
| **Spec** | `036-epicyber-week-2026` |
| **Estado** | `IN PROGRESS` |

## Fase 1 — Precios

- [x] `CYBER`, `packCyberDeLinea`, `precioHabitualPack`, `precioPackCyber`, `isCyberActive` y `packsCyberVigentes` en `config/pricing.js`.
- [x] `precioVidrieraLinea` resuelve `pack:cyber:`.
- [x] El mismo `CYBER` y la rama `cyber` de `lineBase` en el servidor.
- [x] `precioVigente` y `plazoProduccion` (dos lados) conocen la línea.
- [x] `CartContext` recalcula `derived` cuando cambia `useCyberActive`.
- [x] `epicyber.test.js`: paridad, ventana en los cuatro bordes, flujo completo contra el servidor.

## Fase 2 — Interfaz

- [x] `config/epicyber.js` y `lib/cyberPreview.js`.
- [x] `PackBuilder`: `promo.tipo`, `habitualDe`, `nota`, `soloTamanos`, `semilla`, completar al azar.
- [x] Barra en `Header`; contador real en el banner.
- [x] Banner, packs chicos, mayoristas y pendientes en el Home.
- [x] Ruta `/epicyber` con armador y selector de packs.
- [x] `/mayorista` vende el pack Cyber aprobado; `/negocio` y `/personalizados` avisan.
- [x] Upsell en carrito, drawer y ficha de producto.
- [x] `Checkout` corta el pago en vista previa.

## Fase 3 — Tracking

- [x] `trackViewPromotion` y `trackSelectPromotion`.
- [x] `toItems` suma los campos de campaña.
- [x] Test del tracking sin duplicados.

## Fase 4 — Cierre

- [x] `npm test` en verde con la campaña apagada y prendida.
- [x] Build de producción.
- [x] Verificación en navegador a 375 px y en desktop.
- [x] `docs/business-rules.md` y `docs/analytics.md`.
- [x] Recorrer `acceptance.md` punto por punto.
- [x] Commits en `feat/036-epicyber-week-2026`, sin push.
- [x] Opción B cargada en los dos lados del espejo.
- [ ] Aprobación de mayoristas y orden de publicar (Mariano).

## Hallazgos fuera de scope

- Con la fórmula de costo, los pedidos de 1 a 3 calcos en 4 cm no cubren el fijo. Sin mínimo desde la spec 023.
- El popup entrega EPICA10, que no toca los packs (pasa igual con el mayorista hoy).
- `CLAUDE.md` dice 682 tests: esta rama tiene 923.
- Un x10 a $9.990 paga $8.500 de envío al interior: $18.490 en total. La decisión del 11/8/2026 de no tocar tarifas sigue vigente; se anota porque pesa más en esta campaña que en ninguna otra.
- `pack_units` necesita registrarse como dimensión personalizada en GA4.
- La rama 034 toca `PackBuilder` y `Mayorista`: habrá conflicto si se mergea después.
- GA4 y Clarity reales cargan en localhost: las pruebas locales mandan eventos a la propiedad de producción. Se filtran por hostname.
