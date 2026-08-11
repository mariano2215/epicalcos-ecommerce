# Acceptance — El carrito ignora las promos por categoría

| | |
|---|---|
| **Spec** | `001-fix-precio-carrito-promo-categoria` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | — |
| **Resultado** | ⬜ pendiente |

> **Este documento determina cuándo la feature está terminada.**

---

## Cómo se valida

Recorrer punto por punto y reportar el resultado **real** de cada criterio.
✅ cumple (verificado) · ❌ no cumple (con detalle) · ⏭️ no aplica (con motivo).

**No se marca ✅ nada que no se haya verificado.**

### Escenario de referencia

Salvo que se indique otra cosa, todo se verifica con el reloj **dentro de la
ventana de la promo** (17–19/08/2026) y con este carrito:

| Línea | Producto | Precio de lista |
|---|---|---|
| A | 1 × calco `argentina-72`, 6 cm | $1.600 |
| B | 1 × calco `anime-1`, 6 cm (sin promo) | $1.600 |

**Precio esperado con Mercado Pago**: A = **$800**, B = **$1.600**,
**subtotal = $2.400**.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **AC-1** *(RF-1)* | En `/carrito` y en el drawer, la línea A muestra **$800** por unidad | inspección visual, mobile 375 px | ⬜ |
| **AC-2** *(RF-1, RF-8)* | La línea B sigue mostrando **$1.600** | ídem | ⬜ |
| **AC-3** *(RF-2)* | El **Subtotal** del carrito dice **$2.400** | resumen del carrito | ⬜ |
| **AC-4** *(RF-2)* | El **Total** del carrito dice **$2.400** | ídem | ⬜ |
| **AC-5** *(RF-3)* | La barra de envío gratis se calcula sobre $2.400, no sobre $3.200 | comparar el "te faltan $X" del carrito con el del checkout: **tienen que coincidir** | ⬜ |
| **AC-6** *(RF-4)* | `add_to_cart` de la línea A reporta `value: 800` | `window.dataLayer.filter(e => e.event === 'add_to_cart')` | ⬜ |
| **AC-7** *(RF-4)* | `view_cart` reporta `value: 2400` | ídem con `'view_cart'` | ⬜ |
| **AC-8** *(RF-4)* | `remove_from_cart` de la línea A reporta `value: 800` | ídem | ⬜ |
| **AC-9** *(RF-5)* | Con Mercado Pago y sin cupón, la línea de descuento del checkout **nombra la promo** (no dice solo "Descuento") | checkout | ⬜ |
| **AC-10** *(RF-6)* | Con 10 unidades de A y transferencia, el bloque "Con transferencia" muestra el mismo importe que cobra el checkout | comparar carrito vs. checkout | ⬜ |
| **AC-11** *(RF-7)* | Una compra real de punta a punta **no** se rechaza con `price_mismatch` | compra completa por Mercado Pago | ⬜ |
| **AC-12** *(RF-7)* | Ídem por transferencia | compra completa | ⬜ |
| **AC-13** *(RF-8)* | El helper decide por el `id` de la línea, sin categorías escritas a mano | lectura del código | ⬜ |
| **AC-14** *(RF-9)* | Con el reloj **fuera** de la ventana, A vuelve a $1.600 en todas las pantallas | reloj al 20/08/2026 | ⬜ |
| **AC-15** | El precio de A es **idéntico** en grilla, ficha, carrito y total del checkout | recorrido completo | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **ANF-1** *(RNF-1)* | El carrito funciona a 375 px sin scroll horizontal | DevTools, iPhone SE | ⬜ |
| **ANF-2** *(RNF-2)* | El cálculo sigue dentro del `useMemo` de `derived`; sin recálculos por render | lectura del código | ⬜ |
| **ANF-3** *(RNF-3)* | Si se agregó precio tachado, el lector de pantalla anuncia el vigente | VoiceOver | ⬜ |
| **ANF-4** *(RNF-4)* | Un carrito guardado **antes** del deploy sigue funcionando sin vaciarlo | `localStorage` con datos previos | ⬜ |
| **ANF-5** *(RNF-5)* | **Ninguna línea del carrito guarda el precio con descuento** | inspeccionar `epicalcos.cart.v2`: `basePrice` de A debe ser **1600**, no 800 | ⬜ |
| **ANF-6** *(RNF-7)* | Sin dependencias nuevas | `git diff package.json frontend/package.json` vacío | ⬜ |
| **ANF-7** *(RNF-8)* | El servidor no se tocó | `git diff --stat -- netlify/` vacío | ⬜ |
| **ANF-8** *(RNF-6)* | Sin secretos nuevos en el bundle | `git diff` sin `VITE_` nuevas | ⬜ |

> **ANF-5 es el criterio que más importa a largo plazo.** Si `basePrice` quedó
> guardado con el descuento, la feature **está mal** aunque todo se vea bien
> durante la promo: el 20/08 esos carritos van a rebotar con `price_mismatch`.

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Carrito vacío | sin cambios, sin errores en consola | ⬜ |
| Carrito armado **antes** de la ventana, recargado **dentro** | el precio baja solo al recargar | ⬜ |
| Carrito armado **dentro**, recargado **fuera** | el precio vuelve solo al de lista | ⬜ |
| Carrito mixto (promo + otras + pack + `custom` + digital) | solo las líneas de la categoría en promo bajan | ⬜ |
| Pack mayorista con calcos de la categoría en promo | el pack **no** recibe el 50 % | ⬜ |
| Línea `custom` (personalizado) | **no** recibe el 50 % | ⬜ |
| Archivo digital | precio fijo; no suma para el envío gratis | ⬜ |
| ≥10 unidades de la categoría en promo + transferencia | precio final = base × 0,40 | ⬜ |
| `EPICA10` + transferencia + promo | 70 % off, sin superar el tope de 90 % | ⬜ |
| `PROMO_ARGENTINA.activa = false` | todo vuelve al precio de lista de inmediato | ⬜ |
| Línea con `basePrice` corrupto | precio $0 sin `NaN` en pantalla | ⬜ |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| **REG-1** | Los 100 tests existentes siguen pasando **sin modificarse** | ⬜ |
| **REG-2** | Compra completa por **Mercado Pago** de punta a punta | ⬜ |
| **REG-3** | Compra completa por **transferencia** de punta a punta | ⬜ |
| **REG-4** | Envío correcto en las tres zonas (Rosario / próxima / interior) | ⬜ |
| **REG-5** | Ningún checkout se rechaza con `price_mismatch` | ⬜ |
| **REG-6** | El carrito sobrevive al refresh | ⬜ |
| **REG-7** | `purchase` se dispara **una sola vez** (refrescar la gracias no lo repite) | ⬜ |
| **REG-8** | El `value` del `purchase` es lo que el cliente pagó (con descuento y envío) | ⬜ |
| **REG-9** | **La promo 3x2 sigue calculando igual** (`eligibleUnitBasePrices` intacto) | ⬜ |
| **REG-10** | El 10 % por volumen y el cupón siguen funcionando **fuera** de la promo | ⬜ |
| **REG-11** | La promo mayorista y la Negocio no cambiaron de precio | ⬜ |

> **REG-9 es el riesgo silencioso de esta spec**: `eligibleUnitBasePrices` tiene
> que seguir usando `basePrice` para espejar la bolsa del N×M del servidor. Si
> alguien lo "corrige" al precio de vidriera, la 3x2 se desincroniza.

---

## 5. Analytics

| Evento | Se dispara cuando | Valor esperado (línea A) | Resultado |
|---|---|---|---|
| `add_to_cart` | se agrega A | `value: 800`, `items[0].price: 800` | ⬜ |
| `remove_from_cart` | se saca A | `value: 800` | ⬜ |
| `view_cart` | se abre `/carrito` | `value: 2400` | ⬜ |
| `begin_checkout` | **sin cambios** | ya correcto | ⬜ |
| `purchase` | **sin cambios** | ya correcto | ⬜ |

**Verificación**
```js
window.dataLayer.filter(e => ['add_to_cart','view_cart','remove_from_cart'].includes(e.event))
```
- [ ] GA4 DebugView los recibe con el valor correcto
- [ ] No viaja PII
- [ ] Ningún componente llama a `gtag`/`fbq`/`dataLayer` directo

---

## 6. ⚠️ Paridad de precios

| ID | Criterio | Resultado |
|---|---|---|
| **PAR-1** | `config/pricing.js` solo **agregó** una función, sin modificar existentes | ⬜ |
| **PAR-2** | `netlify/functions/lib/pricing.js` **sin tocar** | ⬜ |
| **PAR-3** | `config/site.js` **sin tocar** | ⬜ |
| **PAR-4** | `promoPricing.test.js` pasa, incluidos los tests nuevos | ⬜ |
| **PAR-5** | `envio.test.js` pasa | ⬜ |
| **PAR-6** | `precioPersonalizados.test.js` pasa | ⬜ |
| **PAR-7** | **T-4**: el precio de vidriera == el que valida el servidor | ⬜ |
| **PAR-8** | **T-9**: un carrito guardado durante la promo sigue siendo aceptado después | ⬜ |
| **PAR-9** | El precio es el mismo en grilla, ficha, carrito y total del checkout | ⬜ |

---

## Definition of Done

### Código
- [ ] AC-1 a AC-15 en ✅
- [ ] ANF-1 a ANF-8 en ✅
- [ ] Todos los edge cases de §3 en ✅
- [ ] REG-1 a REG-11 en ✅
- [ ] `npm test --prefix frontend` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff
- [ ] `pricedItems` y `eligibleUnitBasePrices` sin tocar
- [ ] El comentario de `derived` fue **extendido**, no borrado
- [ ] `precioVidrieraLinea` explica por qué su resultado no se persiste

### Seguridad
- [ ] Ningún secreto nuevo
- [ ] El servidor sigue sin confiar en el cliente
- [ ] Sin PII nueva en logs, URLs ni `dataLayer`

### Documentación
- [ ] `docs/architecture.md` §12.1 marcado como resuelto
- [ ] `docs/analytics.md` §8 y §9 actualizados
- [ ] `docs/business-rules.md` §3.3 sin la advertencia de inconsistencia

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope anotados y reportados
- [ ] Este documento recorrido con resultados reales
- [ ] Estado de la spec en `DONE`
- [ ] **Deployado antes del 17/08/2026** (o decisión explícita de no hacerlo)

---

## Resultado de la validación

**Fecha**:
**Ejecutada por**:

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | |
| ❌ No cumple | |
| ⏭️ No aplica | |

### Criterios no cumplidos
| ID | Qué pasó | Decisión |
|---|---|---|

### Notas
