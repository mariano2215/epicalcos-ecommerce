# Acceptance — Precios +20 % y 15 % OFF por transferencia

| | |
|---|---|
| **Spec** | `027-precios-mas-20-y-transferencia-15` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 26/09/2026 |
| **Resultado** | ⬜ pendiente del OK de Mariano a la tabla de precios (AC-13) — todo lo demás ✅ |

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* Todo precio de §9.1 es el nuevo, en cliente y servidor | tests de paridad | ✅ `transferencia.test.js` (tabla §9.1) + paridad en `promoPricing.test.js` |
| AC-2 | *(RF-2)* 1 calco de 6 cm por transferencia: $1.900 → $1.615 | test | ✅ test ($1.615) |
| AC-3 | *(RF-2)* Pack/Negocio/Polaroid/tatuajes/imprimibles/holográfico por transferencia: −15 % | test | ✅ test (todos los tipos de línea + solo digital) |
| AC-4 | *(RF-3)* El envío no se descuenta | test | ✅ test + recorrido ($4.500 sin descuento) |
| AC-5 | *(RF-4)* 3x2 + EPICA10 + transferencia: 25 % encima del 3x2 | test | ✅ test |
| AC-6 | *(RF-5)* EPI50 + transferencia: sin 15 % en ninguna línea | test | ✅ test |
| AC-7 | *(RF-6)* Argentina + transferencia: 65 % | test | ✅ test |
| AC-8 | *(RF-7)* Ningún "10 %"/"desde 10 calcos" del descuento por transferencia en el sitio | grep | ✅ grep: solo quedan comentarios históricos |
| AC-9 | *(RF-8)* Carrito y checkout muestran el ahorro por transferencia con 1 calco | recorrido | ✅ recorrido (carrito y checkout con 2 líneas) |
| AC-10 | *(RF-9)* Paridad: lo que calcula el carrito con transferencia lo acepta el servidor | test | ✅ `promoPricing.test.js` (`clientItems` ↔ servidor) + recorrido |
| AC-11 | *(RF-10)* Carrito guardado con precios viejos: se cobra al precio nuevo, sin `price_mismatch` | test | ✅ test + recorrido (carrito viejo refrescado solo) |
| AC-12 | `npm test` en verde, `vite build` OK | CI local | ✅ 731/731, build OK |
| AC-13 | Mariano aprobó la tabla de §9.1 | conversación | ⬜ esperando a Mariano |
