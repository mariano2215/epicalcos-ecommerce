# Acceptance — Cupón EPIMAYOR (pack mayorista de 100 a $47.500)

| | |
|---|---|
| **Spec** | `008-cupon-epimayor` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | — |
| **Resultado** | ⬜ pendiente |

> Si un criterio no está acá, no es parte de "terminado".

---

## Cómo se valida

Al terminar se recorre este documento **punto por punto** y se reporta el
resultado **real** (`CLAUDE.md` regla 15). ✅ cumple · ❌ no cumple · ⏭️ no aplica.
**No se marca ✅ nada que no se haya verificado.**

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | Pack mayorista de **100 calcos en 4 cm** + `EPIMAYOR` → el checkout muestra **$47.500** de subtotal (y $60.000 tachado) | Compra real en el sitio + test de `promoPricing.test.js` | ⬜ |
| AC-2 *(RF-2)* | Lo mismo en **6 cm**: **$47.500** (con $80.000 tachado) | Ídem | ⬜ |
| AC-3 *(RF-3)* | Pack de 100 en **9 cm** + `EPIMAYOR` → sigue costando **$100.000**; el servidor rechaza $475/u con `price_mismatch` | Test del servidor | ⬜ |
| AC-4 *(RF-4)* | Pack mayorista de **101** calcos + `EPIMAYOR` → $60.600 (101 × 600); el cupón no aplica | Test del servidor | ⬜ |
| AC-5 *(RF-5)* | Carrito con **dos** packs de 100 (4 cm y 6 cm) + `EPIMAYOR` → total **$47.500 + $80.000 = $127.500** | Test del servidor | ⬜ |
| AC-6 *(RF-6)* | Carrito con pack de 100 + **Promo Negocio** → **$47.500 + $39.999 = $87.499**; la línea `negocio:` queda intacta | Test del servidor | ⬜ |
| AC-7 *(RF-7)* | Carrito con pack de 100 + **20 calcos sueltos** de 6 cm, pagando con Mercado Pago → los sueltos siguen a $1.600 (el cupón no les da ningún %) | Test del servidor | ⬜ |
| AC-8 *(RF-8)* | Un payload con `unit_price: 475` **sin** `couponCode` se rechaza con `price_mismatch` | Test del servidor | ⬜ |
| AC-9 *(RF-9)* | El código no aparece en ninguna pantalla | `grep -rn "EPIMAYOR" frontend/src` → solo config, lógica de precio y tests; recorrido visual de Home, `/mayorista`, carrito y checkout | ⬜ |
| AC-10 *(RF-10)* | Compra completa **por Mercado Pago** y compra completa **por transferencia**, ambas con el cupón, llegan a pago/pedido sin error | Dos compras reales de punta a punta | ⬜ |
| AC-11 *(RF-11)* | El checkout muestra el precio de lista tachado y la línea "Descuento $12.500" (4 cm) / "$32.500" (6 cm) con la etiqueta `EPIMAYOR` | Inspección visual del checkout | ⬜ |
| AC-12 *(RF-12)* | Con un carrito que no califica, el cupón **no** queda marcado como aplicado y el mensaje dice por qué | Tres casos: carrito vacío · pack de 103 · pack de 100 en 9 cm | ⬜ |
| AC-13 *(RF-13)* | `/checkout?cupon=EPIMAYOR` con el pack armado deja el cupón aplicado | Navegación directa a la URL | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — el mensaje del cupón se lee a 375 px sin scroll horizontal | DevTools, iPhone SE | ⬜ |
| ANF-2 | **Performance** — no agrega red ni scripts; el LCP del Home no cambia | Lighthouse antes/después | ⬜ |
| ANF-3 | **Accesibilidad** — el mensaje de error se anuncia junto al input, con foco visible y target de 44 px en el botón "Aplicar" | Inspección + teclado | ⬜ |
| ANF-4 | **Compatibilidad** — un pack de 100 agregado al carrito **antes** del cambio califica para el cupón después | `localStorage` con un `epicalcos.cart.v2` previo | ⬜ |
| ANF-5 | **Sin dependencias nuevas** | `git diff package.json` | ⬜ |
| ANF-6 | **Sin secretos en el bundle** | `grep` sobre `frontend/dist` — el código del cupón viaja (asumido y documentado), ningún secreto | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Carrito vacío + `EPIMAYOR` | No se marca aplicado; mensaje explicativo | ⬜ |
| Pack de **103** calcos | No aplica; el mensaje dice "tu pack tiene 103" | ⬜ |
| Pack de 100 en **9 cm** | No aplica; el mensaje dice que es solo 4 y 6 cm | ⬜ |
| Dos packs de 100 | Solo el primero a $47.500 | ⬜ |
| Pack + calcos sueltos | Pack a $47.500; sueltos sin % del cupón, con el 10 % por transferencia si corresponde | ⬜ |
| Pack + Promo Negocio | Negocio intacto en $39.999 | ⬜ |
| Se aplica el cupón y **después** se edita la cantidad del pack | El precio vuelve a $600/u en el mismo render; **no** se puede mandar un pedido de 103 u a $475 | ⬜ |
| Payload manipulado ($475 sin cupón) | `price_mismatch` | ⬜ |
| `EPIMAYOR` con una línea que no califica | El servidor cobra el precio normal de esa línea | ⬜ |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Los **229** tests existentes siguen pasando | ⬜ |
| REG-2 | Compra completa por **Mercado Pago** (sin cupón) | ⬜ |
| REG-3 | Compra completa por **transferencia** (sin cupón) | ⬜ |
| REG-4 | El envío se calcula bien en las tres zonas | ⬜ |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ⬜ |
| REG-6 | El carrito sobrevive al refresh | ⬜ |
| REG-7 | El `purchase` se dispara una sola vez | ⬜ |
| REG-8 | El `value` del `purchase` es lo realmente pagado (con descuento y envío) | ⬜ |
| REG-9 | **`EPICA10` sigue funcionando igual**: 10 % sobre calcos sueltos, acumulable con el 10 % por transferencia | ⬜ |
| REG-10 | **La Promo Negocio sigue en $39.999**, con y sin cupón aplicado | ⬜ |
| REG-11 | El pack mayorista **sin** cupón sigue a 50 % off desde 100 calcos, en los tres tamaños | ⬜ |
| REG-12 | La promo de Argentina 50 % sigue funcionando durante su ventana | ⬜ |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `add_payment_info` | El cliente elige medio de pago en el checkout | Lleva `EPIMAYOR` en el campo de cupón que ya existe | ⬜ |
| `purchase` | Pago aprobado | `value` = $47.500 + envío | ⬜ |

```js
window.dataLayer.filter(e => e.event === 'add_payment_info')
```
- [ ] GA4 DebugView lo recibe
- [ ] Meta → Administrador de eventos lo recibe
- [ ] No viaja PII

---

## 6. ⚠️ Paridad de precios

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | El cupón está en `frontend/src/config/pricing.js` | ⬜ |
| PAR-2 | El **mismo** cupón, con los mismos cuatro valores, está en `netlify/functions/lib/pricing.js` | ⬜ |
| PAR-3 | `promoPricing.test.js` pasa, incluyendo el test de paridad de `EPIMAYOR` | ⬜ |
| PAR-4 | `envio.test.js` pasa, incluyendo que el pack a $47.500 **no** cruza ningún umbral | ⬜ |
| PAR-5 | `precioPersonalizados.test.js` pasa | ⬜ |
| PAR-6 | Un pedido real con el cupón **no** se rechaza con `price_mismatch` | ⬜ |
| PAR-7 | El precio es coherente en checkout y confirmación. **El carrito muestra $60.000 y el checkout $47.500: es esperado** — el cupón se escribe en el checkout, igual que `EPICA10` | ⬜ |
| PAR-8 | `47500 / 100 === 475` exacto, verificado por test | ⬜ |

---

## 7. Envío — la consecuencia declarada en `requirements.md` §9.1

| ID | Criterio | Resultado |
|---|---|---|
| ENV-1 | Pack con `EPIMAYOR` a **Rosario**: envío **$4.500** (no cruza los $50.000) | ⬜ |
| ENV-2 | Pack con `EPIMAYOR` a **ciudad próxima**: envío **$6.500** | ⬜ |
| ENV-3 | Pack con `EPIMAYOR` al **interior**: envío **$8.500** | ⬜ |
| ENV-4 | Mariano vio y aprobó que el cupón hace **perder** el envío gratis que hoy tiene el pack de 6 cm | ⬜ |

---

## Definition of Done

### Código
- [ ] Todos los criterios de §1, §2 y §3 en ✅
- [ ] Todos los de regresión (§4) en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff
- [ ] Los comentarios explican el **por qué**, con la densidad del repo

### Seguridad
- [ ] Ningún secreto en el frontend ni en el bundle
- [ ] El servidor no confía en ningún valor del cliente
- [ ] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [ ] `docs/business-rules.md` §2, §5 y §9 actualizados
- [ ] `docs/analytics.md` — sin cambios (no hay eventos nuevos)

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope reportados
- [ ] Este documento recorrido punto por punto, con resultados reales
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: —
**Ejecutada por**: —

| | Cantidad |
|---|---|
| ✅ Cumple | |
| ❌ No cumple | |
| ⏭️ No aplica | |

### Criterios no cumplidos
| ID | Qué pasó | Decisión |
|---|---|---|

### Notas
