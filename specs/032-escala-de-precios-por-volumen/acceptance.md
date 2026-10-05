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
| AC-3 | *(RF-3)* El % sale del monto contra el escalón de 100: 10 / 20 / 30 %; el de 100 no tiene % (la web muestra MUESTRA GRATIS); cambiar un monto cambia el % | Test | ⬜ |
| AC-4 | *(RF-4)* 240 en 6 cm → escalón 250, se lleva 250; 300 → $142.799 | Test | ⬜ |
| AC-5 | *(RF-5)* Total no decreciente para toda cantidad 100–1.000 | Test que recorre el rango | ⬜ |
| AC-6 | *(RF-6/7)* DTF UV = vinilo blanco; holográfico con su fila, sin línea de recargo aparte; **ningún 9 cm** en la escala | Test | ⬜ |
| AC-7 | *(RF-9)* El servidor acepta cada línea emitida y rechaza 99, 1.001, 240, cualquier 9 cm, material inválido y `quantity ≠ 1` | Test con `validateAndPriceOrder()` | ⬜ |
| AC-8 | *(RF-10/11)* Transferencia −10 % sí; `EPICA10` no | Test | ⬜ |
| AC-9 | *(RF-12)* 250 calcos de 6 cm en `/mayorista` = $118.999, igual que el cotizador; `/mayorista` no ofrece 9 cm | Recorrido + checkout local | ⬜ |
| AC-10 | *(RF-13)* 3 diseños, 300 calcos en 6 cm en `/personalizados` → $142.799 (escala); 100+ en 9 cm sigue suelta con la sugerencia de 4 o 6 cm | Recorrido | ⬜ |
| AC-14 | La tabla del config es exactamente: 4 y 6 cm $52.999 / $118.999 / $211.999 / $370.999 · holográfico $72.999 / $163.999 / $291.999 / $510.999 | Test | ⬜ |
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
| REG-2 | Promo Negocio, promo x100 y pack holográfico se siguen comprando igual que hoy; un carrito guardado con `pack:mayorista:9cm` se puede pagar | ⬜ |
| REG-3 | Compra por MP y por transferencia de punta a punta | ⬜ |
| REG-4 | Ninguna línea existente cambió de precio | ⬜ |

## Definition of Done

- [ ] §1–§3 en ✅
- [ ] `docs/business-rules.md` actualizado (escala + espejo)
- [ ] Sin dependencias nuevas
- [ ] Estado `DONE` en `requirements.md`
