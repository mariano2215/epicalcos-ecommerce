# Acceptance — Precios +10 % y 20 % OFF por transferencia

| | |
|---|---|
| **Spec** | `029-precios-mas-10-y-transferencia-20` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 01/10/2026 |
| **Resultado** | ✅ aceptada — Mariano aprobó la tabla el 01/10/2026 |

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* Todo precio de §9.1 es el nuevo, en cliente y servidor | tests de paridad | ✅ `transferencia.test.js` (tabla §9.1) + paridad en `promoPricing.test.js` |
| AC-2 | *(RF-2)* 1 calco de 6 cm por transferencia: $2.100 → $1.680 | test | ✅ test ($1.680, aceptado por el servidor) |
| AC-3 | *(RF-2)* Pack/Negocio/Polaroid/tatuajes/imprimibles/holográfico por transferencia: −20 % | test | ✅ test (todos los tipos de línea + solo digital) |
| AC-4 | *(RF-3)* El envío no se descuenta | test + recorrido | ✅ test + recorrido ($4.500 entero en el checkout por transferencia) |
| AC-5 | *(RF-4)* EPICA10 + transferencia: 30 %; con una N x M prendida, 30 % encima (tope) | test | ✅ AC-5 (30 %) + AC-5b con el 3x2 prendido (corrido en las 4 combinaciones) |
| AC-6 | *(RF-5)* EPI50 + transferencia: sin 20 % en ninguna línea | test | ✅ test |
| AC-7 | *(RF-6)* Ningún "15 %" del descuento por transferencia en el sitio | grep + recorrido | ✅ grep (solo comentarios históricos) + recorrido |
| AC-8 | *(RF-7)* Paridad: lo que calcula el carrito con transferencia lo acepta el servidor | test + recorrido | ✅ `clientItems` ↔ servidor en `promoPricing.test.js` + recorrido |
| AC-9 | *(RF-8)* Carrito guardado con precios viejos: se cobra al precio nuevo, sin `price_mismatch` | test + recorrido | ✅ test (carrito con precios de la 027) + recorrido (refrescado solo) |
| AC-10 | *(RF-9)* Feed de Meta con los precios nuevos | diff del CSV | ✅ 6.680 filas, mismos SKUs, solo `price` y 5 descripciones |
| AC-11 | `npm test` en verde (4 combinaciones de interruptores), `vite build` OK | local | ✅ las 4 combinaciones en verde, build OK |
| AC-12 | Mariano aprobó la tabla de §9.1 y P-2/P-3 | conversación | ✅ 01/10/2026: "Aprobado, implementá la spec 029" |
| AC-13 | *(RF-10, enmienda)* Envío gratis al resto del país desde $55.000, en cliente y servidor | tests + recorrido | ✅ candado y paridad en `envio.test.js` + recorrido (marquesina y /politicas/envios dicen $55.000) |
| AC-14 | *(RF-11, enmienda)* La promo de 100 calcos con Mercado Pago a Buenos Aires paga $8.500 de envío | test | ✅ REGRESIÓN de `envio.test.js` (otra vez con MP) + test que frena el deploy si la promo de 100 o Negocio cruzan el umbral |

## Definition of Done

Todos los AC en ✅, `docs/business-rules.md` al día y el commit en `main`.
