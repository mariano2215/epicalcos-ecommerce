# Tasks — Carrito y checkout sin sorpresas

## ⛔ Antes de tocar una sola línea
La implementación arranca solo cuando Mariano dice *"Implementá la spec 039"*.
- [ ] P-1, P-2 y P-3 respondidas

## Fase 0
- [ ] **0.1** `npm test` en verde, anotar el número
- [ ] **0.2** Leer los dos lados del espejo de transferencia

## Fase 1 — Precio con transferencia
- [ ] **1.1** `precioConTransferencia` en los dos `pricing.js` + test de paridad
- [ ] **1.2** Ficha: segunda línea con el número
- [ ] **1.3** Grilla: segunda línea chica

## Fase 2 — Carrito
- [ ] **2.1** Línea de envío estimado debajo del subtotal
- [ ] **2.2** `carrito_primer_add` en experiments + `addSticker`

## Fase 3 — Checkout
- [ ] **3.1** Ciudad y provincia vacías, provincia en select
- [ ] **3.2** Resumen plegable arriba en celular, mismo cálculo que el aside
- [ ] **3.3** Texto de Mercado Pago según P-2

## Fase 4 — Cierre
- [ ] **4.1** `npm test` en verde
- [ ] **4.2** Vista previa a 375 px: Rosario, Funes, Córdoba, retiro
- [ ] **4.3** `docs/analytics.md` con `resumen_checkout_abierto`
- [ ] **4.4** Recorrer `acceptance.md`

## Hallazgos fuera de scope
- Tachado de $127.999 en Promo Negocio ("solo para mostrar"): un precio de
  referencia tiene que haber existido (DNU 274/2019). Decisión aparte.
