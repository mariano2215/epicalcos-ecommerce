# Tasks — Precios +20 % y 15 % OFF por transferencia

| | |
|---|---|
| **Spec** | `027-precios-mas-20-y-transferencia-15` |
| **Design** | [`design.md`](design.md) |

- [x] **1** Precios en `config/pricing.js`, `config/personalizados.js` y `netlify/functions/lib/pricing.js` (tabla §9.1)
  - *Verificación*: tests de paridad en verde
- [x] **2** Transferencia 15 % en el servidor: sin umbral, a todo producto, tope 25 %, no con cupón exclusivo/bundle
  - *Verificación*: tests de `validateAndPriceOrder` para cada caso de requirements §10
- [x] **3** Espejo en `CartContext.pricedItems` + `transferSavings`
  - *Verificación*: test de paridad cliente ↔ servidor con transferencia
- [x] **4** `precioBaseVigente()` al hidratar el carrito
  - *Verificación*: test — un carrito con los precios viejos se cobra sin `price_mismatch`
- [x] **5** Copy y UI del 15 % (16 archivos), sin "desde 10 calcos"
  - *Verificación*: `grep` sin "10% off/10 % por transferencia" ni "desde 10 calcos" en el copy del descuento
- [x] **6** SEO de Negocio, Polaroid y Tatuajes con la constante
- [x] **7** `docs/business-rules.md`, `docs/analytics.md`
- [x] **8** `npm test`, `vite build`, recorrido a 375 px (carrito, checkout con los dos medios de pago)
  - *Verificación*: `npm test` → 731/731 ✅, `vite build` ✅ (26/9/2026). Recorrido con Playwright contra `vite preview` a 375 px ✅: un carrito guardado con los precios viejos (calco 6 cm $1.600, tatuajes $12.000) se refrescó solo a $1.900 / $14.500; /carrito: $16.400, "Con transferencia $13.940 · ahorrás $2.460 (15% off)", aviso "15% OFF pagando por transferencia · ahorrás $2.460"; checkout: MP $20.900 (con $4.500 de envío), transferencia $18.440 (el envío no se descuenta), "Tu pedido tiene 15% off por transferencia"; ticker "15% OFF pagando por transferencia, en cualquier compra". Sin errores de la app en consola
  - ⚠️ *Hallazgo, fuera de scope*: la línea de descuento del checkout dice "3x2 + …" siempre que la promo está vigente, aunque el carrito no tenga 3 calcos (ya pasaba antes)
- [ ] **9** Tabla de precios aprobada por Mariano → recién ahí merge a `main`
- [ ] **10** Mariano: regenerar el feed de Meta (`scripts/build-meta-feed.mjs`)
