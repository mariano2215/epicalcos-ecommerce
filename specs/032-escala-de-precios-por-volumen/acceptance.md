# Acceptance — Escala de precios por volumen

| | |
|---|---|
| **Spec** | `032-escala-de-precios-por-volumen` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

Se reporta el resultado **real** de cada punto (`CLAUDE.md` regla 15).

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* `ESCALA_VOLUMEN` tiene exactamente la tabla aprobada en §9.1 | Comparar contra el documento | ⬜ |
| AC-2 | *(RF-2)* Precio por calco estrictamente decreciente 100 → 250 → 500 → 1.000 en cada fila | Test | ⬜ |
| AC-3 | *(RF-3)* El % de cada escalón sale del monto con la referencia de P-2; cambiar un monto cambia el % | Test | ⬜ |
| AC-4 | *(RF-4)* 240 en 6 cm → escalón 250, se lleva 250; 300 → $142.799 (opción A) | Test | ⬜ |
| AC-5 | *(RF-5)* Total no decreciente para toda cantidad 100–1.000 | Test que recorre el rango | ⬜ |
| AC-6 | *(RF-6/7)* DTF UV = vinilo blanco; holográfico solo 4 y 6 cm, sin línea de recargo aparte | Test | ⬜ |
| AC-7 | *(RF-9)* El servidor acepta cada línea emitida y rechaza 99, 1.001, 240, holo 9 cm, material inválido y `quantity ≠ 1` | Test con `validateAndPriceOrder()` | ⬜ |
| AC-8 | *(RF-10/11)* Transferencia −20 % sí; `EPICA10` no | Test | ⬜ |
| AC-9 | *(RF-12)* 250 calcos de 9 cm en `/mayorista` = mismo total que el cotizador | Recorrido + checkout local | ⬜ |
| AC-10 | *(RF-13)* 3 diseños × 100 en 6 cm en `/personalizados` cotizan con la escala | Recorrido | ⬜ |
| AC-11 | *(RF-14)* Carrito guardado con una línea de escala vieja → se re-precia y el checkout pasa | `localStorage` armado a mano | ⬜ |
| AC-12 | *(RF-15)* Escalón de 100 < umbral nacional | `envio.test.js` | ⬜ |
| AC-13 | *(RF-16)* Mail y CRM muestran escalón, cantidad, tamaño, material y diseños | Pedido de prueba | ⬜ |

## 2. Paridad de precios

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | La tabla y la función están en `frontend/src/config/pricing.js` | ⬜ |
| PAR-2 | Las **mismas** en `netlify/functions/lib/pricing.js` | ⬜ |
| PAR-3 | `promoPricing`, `envio`, `precioPersonalizados` y el test nuevo en verde | ⬜ |
| PAR-4 | Un pedido real con una línea de escala no se rechaza con `price_mismatch` | ⬜ |
| PAR-5 | Mismo precio en cotizador, armador, configurador, carrito y checkout | ⬜ |

## 3. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Suite completa en verde, con las 4 combinaciones de 3x2/2x1 | ⬜ |
| REG-2 | Promo Negocio, promo x100, pack mayorista y pack holográfico se siguen comprando igual que hoy | ⬜ |
| REG-3 | Compra por MP y por transferencia de punta a punta | ⬜ |
| REG-4 | Ninguna línea existente cambió de precio | ⬜ |

## Definition of Done

- [ ] §1–§3 en ✅
- [ ] `docs/business-rules.md` actualizado (escala + espejo)
- [ ] Sin dependencias nuevas
- [ ] Estado `DONE` en `requirements.md`
