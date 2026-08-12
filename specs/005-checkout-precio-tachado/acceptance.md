# Acceptance — Precio tachado y % de descuento en el checkout

| | |
|---|---|
| **Spec** | `005-checkout-precio-tachado` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | — |
| **Resultado** | — |

> **Este documento determina cuándo la feature está terminada.**

---

## Cómo se valida

Recorrer punto por punto y reportar el resultado **real**.
✅ cumple (verificado) · ❌ no cumple (con detalle) · ⏭️ no aplica (con motivo).

**No se marca ✅ nada que no se haya verificado.**

### Escenario de referencia

Carrito con **2 calcos de la categoría Argentina de 6 cm** ($1.600 c/u de lista)
con la promo **ARGENTINA 50 %** activa, pagando por **transferencia**, más **1
pack de stickers imprimibles** ($5.999).

Números esperados: los calcos a $720 c/u (50 % + 10 %, topeado), el imprimible a
$5.999 sin descuento.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **AC-1** *(RF-1)* | La línea con descuento muestra el precio de lista tachado y el real destacado | mirar el checkout | |
| **AC-2** *(RF-2)* | Esa línea muestra el porcentaje aplicado, entero | mirar el checkout | |
| **AC-3** *(RF-3)* | La línea del imprimible muestra **una sola** cifra | mirar el checkout | |
| **AC-4** *(RF-4)* | El unitario que se muestra es el real ($720), no el de lista | mirar el checkout | |
| **AC-5** *(RF-5)* | **La suma de los totales de línea da exactamente el Subtotal** | sumar a mano lo que se ve | |
| **AC-6** *(RF-6)* | La línea de ahorro sigue nombrando la promo (`ARGENTINA 50%`) | mirar el checkout | |
| **AC-7** *(RF-7)* | Cambiar a Mercado Pago actualiza todas las líneas al instante | click en el medio de pago | |
| **AC-8** *(RF-7)* | Aplicar y quitar un cupón actualiza todas las líneas | aplicar `EPICA10` | |
| **AC-9** *(RF-8)* | **El total a pagar es idéntico al de antes del cambio** | anotar el total antes y después | |
| **AC-10** | La cifra por línea del carrito y la del checkout coinciden | comparar las dos pantallas | |

> **AC-9 es el criterio que no se negocia.** Esta spec no puede mover un peso
> del total. Si lo mueve, se revierte.

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **ANF-1** *(RNF-1)* | El payload de `create-order-transfer` no cambió en ningún campo | inspector de red, antes vs. después | |
| **ANF-2** *(RNF-2)* | Ningún cálculo de precio se modificó | `git diff` de `pricing.js`, `CartContext.jsx`, `paymentService.js` — **vacío** | |
| **ANF-3** *(RNF-3)* | En 375 px las dos cifras entran y el botón de pagar no se corre | DevTools a 375 px | |
| **ANF-4** *(RNF-4)* | El lector de pantalla lee el precio vigente, no los dos | `aria-hidden` en el tachado | |
| **ANF-5** *(RNF-5)* | Sin dependencias nuevas | `git diff package.json` vacío | |
| **ANF-6** *(RNF-6)* | Sin pasos, campos ni clicks nuevos en el camino de compra | recorrer el checkout | |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Promo 3x2 activa | Tachado con ≈33 % en las líneas elegibles; total sin cambios | |
| Cupón 2x1 (bundle) | Tachado con ≈50 %; total sin cambios | |
| ARGENTINA 50 % + transferencia | Un solo porcentaje final, no "50 % + 10 %" | |
| Descuento que redondea a $0 | Sin tachado | |
| Descuento < 1 % | Sin porcentaje; tachado sí, si el precio bajó | |
| Línea con cantidad > 1 | El tachado es el del total de la línea | |
| Carrito solo de imprimibles | Sin tachado y sin línea de ahorro | |
| Pack con envío incluido | Sin tachado, como hoy | |
| Carrito viejo de `localStorage` sin `basePrice` | Se ve como hoy, sin romperse | |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| **REG-1** | Los 210 tests existentes pasan **sin modificarse** | |
| **REG-2** | El carrito y el drawer siguen viéndose igual | |
| **REG-3** | Un checkout sin ninguna promo se ve exactamente como antes | |
| **REG-4** | El envío, el umbral de envío gratis y su barra de progreso no cambiaron | |
| **REG-5** | El mail al cliente y el aviso interno no cambiaron | |
| **REG-6** | Ningún checkout se rechaza con `price_mismatch` | |
| **REG-7** | El resumen que viaja al CRM no cambió | |

---

## 5. Analytics

- [ ] `begin_checkout` sale **una sola vez** por visita
- [ ] Su `value` es el mismo que antes del cambio
- [ ] No se agregó ningún evento nuevo

---

## 6. ⚠️ Paridad de precios

- [ ] `netlify/functions/lib/pricing.js` sin tocar
- [ ] `frontend/src/config/pricing.js` sin tocar
- [ ] `frontend/src/context/CartContext.jsx` sin tocar
- [ ] `promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js` en verde

---

## Definition of Done

### Código
- [ ] AC-1 a AC-10 en ✅
- [ ] ANF-1 a ANF-6 en ✅
- [ ] Todos los edge cases de §3 en ✅
- [ ] REG-1 a REG-7 en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope

### Accesibilidad
- [ ] Tachado con `aria-hidden`
- [ ] Contraste del verde del porcentaje sobre el fondo del card

### Documentación
- [ ] `docs/business-rules.md`: cómo se muestra el descuento en el checkout

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope anotados
- [ ] Este documento recorrido con resultados reales
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: —
**Ejecutada por**: —
