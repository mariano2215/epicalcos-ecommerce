# Acceptance — Precios +10 % y 20 % OFF por transferencia

| | |
|---|---|
| **Spec** | `029-precios-mas-10-y-transferencia-20` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | — |
| **Resultado** | ⬜ pendiente de aprobación |

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* Todo precio de §9.1 es el nuevo, en cliente y servidor | tests de paridad | ⬜ |
| AC-2 | *(RF-2)* 1 calco de 6 cm por transferencia: $2.100 → $1.680 | test | ⬜ |
| AC-3 | *(RF-2)* Pack/Negocio/Polaroid/tatuajes/imprimibles/holográfico por transferencia: −20 % | test | ⬜ |
| AC-4 | *(RF-3)* El envío no se descuenta | test + recorrido | ⬜ |
| AC-5 | *(RF-4)* EPICA10 + transferencia: 30 %; con una N x M prendida, 30 % encima (tope) | test | ⬜ |
| AC-6 | *(RF-5)* EPI50 + transferencia: sin 20 % en ninguna línea | test | ⬜ |
| AC-7 | *(RF-6)* Ningún "15 %" del descuento por transferencia en el sitio | grep + recorrido | ⬜ |
| AC-8 | *(RF-7)* Paridad: lo que calcula el carrito con transferencia lo acepta el servidor | test + recorrido | ⬜ |
| AC-9 | *(RF-8)* Carrito guardado con precios viejos: se cobra al precio nuevo, sin `price_mismatch` | test + recorrido | ⬜ |
| AC-10 | *(RF-9)* Feed de Meta con los precios nuevos | diff del CSV | ⬜ |
| AC-11 | `npm test` en verde (4 combinaciones de interruptores), `vite build` OK | local | ⬜ |
| AC-12 | Mariano aprobó la tabla de §9.1 y P-2/P-3 | conversación | ⬜ |

## Definition of Done

Todos los AC en ✅, `docs/business-rules.md` al día y el commit en `main`.
