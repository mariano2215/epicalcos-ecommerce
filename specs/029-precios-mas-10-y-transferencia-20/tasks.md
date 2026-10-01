# Tasks — Precios +10 % y 20 % OFF por transferencia

| | |
|---|---|
| **Spec** | `029-precios-mas-10-y-transferencia-20` |
| **Design** | [`design.md`](design.md) |

- [x] **0** Mariano aprueba la tabla §9.1 y P-2/P-3 → recién ahí se implementa
  - *Verificación*: 01/10/2026, "Aprobado, implementá la spec 029"
- [x] **1** Precios en `config/pricing.js`, `config/personalizados.js` y `netlify/functions/lib/pricing.js` (tabla §9.1)
  - *Verificación*: tests de paridad en verde (`transferencia.test.js` verifica la tabla §9.1 entera, más que el recargo imantado sea igual en los tres tamaños)
- [x] **2** `TRANSFER_DISCOUNT` 0,20 en los dos lados
  - *Verificación*: tests de `validateAndPriceOrder` para cada caso de requirements §10
- [x] **3** `percentCap` / `PROMO_PERCENT_CAP` 0,30 en los dos lados
  - *Verificación*: `con3x2` AC-5b (3x2 + EPICA10 + transferencia = 30 % encima) en verde con el 3x2 prendido; test nuevo de que el tope siempre deja entrar transferencia + EPICA10
- [x] **4** Tests con montos o porcentajes fijos actualizados
  - *Verificación*: `npm test` en verde en las 4 combinaciones de interruptores 3x2/2x1 (763 + 17 / 775 + 5 / 763 + 17 / 776 + 4). La combinación 3x2 prendido encontró un caso escondido con el 25 % a mano; dos casos con `0.75` a mano pasaron a derivarse de las constantes
  - ⚠️ *Hallazgo*: tres tests de `envio.test.js` suponían que la promo de 100 calcos no llega al umbral nacional. Con $52.999 eso solo sigue siendo cierto por transferencia: pasaron a transferencia, y se sumó el caso con Mercado Pago (viaja gratis). Ver requirements §13
- [x] **5** Carrito guardado con los precios de hoy
  - *Verificación*: test AC-9 con un carrito de precios de la 027 + recorrido (calco $1.900 → $2.100, tatuajes $14.500 → $16.000, solos al recargar)
- [x] **6** Copy: ningún "15 %" de transferencia en el sitio
  - *Verificación*: `grep` — todo el copy sale de `TRANSFER_PCT`; quedaban 17 comentarios con el 15 % / 25 % como vigentes, actualizados. Recorrido: marquesina, carrito, checkout y opción de pago dicen 20 %
- [x] **7** Feed de Meta regenerado y commiteado
  - *Verificación*: 6.680 filas, mismos ids en el mismo orden; cambian solo `price` (calco $1.900 → $2.100, mayorista $95.000 → $105.000, promo 100 $52.999, tatuajes y Polaroid $16.000) y las 5 descripciones con precio; `skus.json` solo cambia la fecha
- [x] **8** `docs/business-rules.md` (+ nota en `docs/analytics.md`: los `value` suben ~10 % desde el 1/10)
- [x] **9** `npm test`, `vite build`, recorrido a 375 px (carrito, checkout con los dos medios de pago)
  - *Verificación*: `npm test` → 763 ✅ + 17 saltados (los del 3x2/2x1 apagados), `vite build` ✅. Recorrido con `vite dev` a 375 px: Home con banner "100 CALCOS A $52.999", marquesina "20% OFF pagando por transferencia", sin scroll horizontal; /carrito con 3 calcos + tatuajes: $22.300, "Con transferencia $17.840 · ahorrás $4.460 (20% off)"; checkout: MP $26.800 (con $4.500 de envío), transferencia $22.340 (el envío no se descuenta; "Sumá $17.160" se mide sobre el subtotal descontado). Sin errores de la app en consola
  - *Nota*: el build regenera `frontend/public/sitemap.xml` (le agrega categorías que faltan en la versión commiteada). No se commiteó: es ajeno a esta spec y Netlify lo regenera en cada deploy
