# Tasks — Precios +10 % y 20 % OFF por transferencia

| | |
|---|---|
| **Spec** | `029-precios-mas-10-y-transferencia-20` |
| **Design** | [`design.md`](design.md) |

- [ ] **0** Mariano aprueba la tabla §9.1 y P-2/P-3 → recién ahí se implementa
  - *Verificación*: respuesta en la conversación
- [ ] **1** Precios en `config/pricing.js`, `config/personalizados.js` y `netlify/functions/lib/pricing.js` (tabla §9.1)
  - *Verificación*: tests de paridad en verde
- [ ] **2** `TRANSFER_DISCOUNT` 0,20 en los dos lados
  - *Verificación*: tests de `validateAndPriceOrder` para cada caso de requirements §10
- [ ] **3** `percentCap` / `PROMO_PERCENT_CAP` 0,30 en los dos lados
  - *Verificación*: test con el 3x2 prendido + EPICA10 + transferencia = 30 % encima
- [ ] **4** Tests con montos o porcentajes fijos actualizados
  - *Verificación*: `npm test` en verde en las 4 combinaciones de interruptores 3x2/2x1
- [ ] **5** Carrito guardado con los precios de hoy
  - *Verificación*: test — se cobra al precio nuevo sin `price_mismatch`
- [ ] **6** Copy: ningún "15 %" de transferencia en el sitio
  - *Verificación*: `grep` en el código + recorrido
- [ ] **7** Feed de Meta regenerado y commiteado
  - *Verificación*: el CSV solo cambia `price` y descripciones con precio; SKUs idénticos
- [ ] **8** `docs/business-rules.md`
- [ ] **9** `npm test`, `vite build`, recorrido a 375 px (carrito, checkout con los dos medios de pago)
