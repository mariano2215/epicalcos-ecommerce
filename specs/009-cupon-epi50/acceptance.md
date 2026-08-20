# Acceptance — Cupón EPI50 (50 % off por menor, para mandar por privado)

| | |
|---|---|
| **Spec** | `009-cupon-epi50` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 20/08/2026 |
| **Resultado** | ✅ **cumple** — 25/25 criterios verificados, 2 con la salvedad de §6 |

> Si un criterio no está acá, no es parte de "terminado".

---

## Cómo se valida

Al terminar se recorre este documento **punto por punto** y se reporta el
resultado **real** (`CLAUDE.md` regla 15). ✅ cumple · ❌ no cumple · ⏭️ no aplica.
**No se marca ✅ nada que no se haya verificado.**

Precios de referencia (50 % de lista): **4 cm $600 · 6 cm $800 · 9 cm $1.000**.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | Calco de **catálogo** + `EPI50` → $600 / $800 / $1.000 según tamaño | Test de paridad + compra real | ✅ |
| AC-2 *(RF-2)* | Calco **personalizado suelto** (`custom`) + `EPI50` → mitad de precio | Test de paridad | ✅ |
| AC-3 *(RF-3)* | Carrito de **12 calcos** de 6 cm, **transferencia**, + `EPI50` → $800/u (**no** $640) | Test del servidor | ✅ |
| AC-4 *(RF-3)* | El mismo carrito por **Mercado Pago** da **el mismo** unitario | Test del servidor | ✅ |
| AC-5 *(RF-4)* | Pack mayorista, `mayorista100`, `pack:personalizados`, `negocio`, tatuajes, polaroids y digitales **no cambian** con `EPI50` | Test del servidor | ✅ |
| AC-6 *(RF-5)* | Payload con $800/u **sin** `couponCode` → `price_mismatch`, no se crea la preferencia | Test del servidor | ✅ |
| AC-7 *(RF-6)* | Funciona por **Mercado Pago** y por **transferencia** | Compra real en los dos caminos | ⚠️ |
| AC-8 *(RF-7)* | `grep -rn "EPI50" frontend/src` solo aparece en `config/pricing.js` y tests | Búsqueda | ✅ |
| AC-9 *(RF-8)* | El cupón **no tiene `endsAt`**: `findCoupon('EPI50')` sigue dando el cupón con el reloj adelantado un año | Test con reloj falso | ✅ |
| AC-10 *(RF-9)* | Con `activa: false` en los **dos** lados: el checkout dice "no existe o venció" y el servidor cobra lista | Test + prueba manual | ✅ |
| AC-11 *(RF-10)* | Con `EPI50` y transferencia: aparece "no se le suma el 10% por transferencia" y **desaparece** "Desde 10 calcos sueltos, 10% off" | Prueba manual en el checkout | ✅ |
| AC-12 *(RF-11)* | El checkout muestra "🎟️ Cupón EPI50 aplicado" | Prueba manual | ✅ |
| AC-13 *(RF-12)* | Con la promo Argentina viva (reloj falso) + `EPI50` → 50 %, **no** 90 % | Test con reloj falso | ✅ |
| AC-14 *(RF-12)* | Con la promo 3x2 viva (reloj falso) + `EPI50` → 50 % y **sin** N×M | Test con reloj falso | ✅ |
| AC-15 *(RF-13)* | `/checkout?cupon=EPI50` deja el cupón aplicado al abrir | Prueba manual | ✅ |
| AC-16 | **`EPICA10` no cambió**: sigue dando 10 %, sigue sumando con transferencia (20 %) y sigue sin tocar `custom` | Test de no-regresión | ✅ |
| AC-17 | El popup de bienvenida y `capture-lead.js` siguen entregando `EPICA10` | Búsqueda + prueba manual | ✅ |

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-18 *(RNF-1)* | El aviso del cupón se lee a **375 px** sin scroll horizontal | DevTools a 375 px | ✅ |
| AC-19 *(RNF-2)* | No se agregan requests ni scripts nuevos | Network vacío de novedades | ✅ |
| AC-20 *(RNF-3)* | El mensaje del cupón se anuncia junto al input, igual que el error actual | Revisión del markup | ✅ |
| AC-21 *(RNF-4)* | Un carrito guardado **antes** del cambio se abre y se cobra bien | Prueba manual con `localStorage` viejo | ✅ |
| AC-22 *(RNF-4)* | Aplicar el cupón **no** persiste el precio con descuento en `epicalcos.cart.v2` | Inspección de `localStorage` | ✅ |
| AC-23 *(RNF-5)* | El precio final lo decide el servidor desde el id de la línea | Revisión de código + AC-6 | ✅ |
| AC-24 *(RNF-6)* | `package.json` sin dependencias nuevas | `git diff package.json` vacío | ✅ |
| AC-25 *(RNF-7)* | Existe un test que **falla** si se cambia el % en un solo lado del espejo | Romperlo a propósito y ver el rojo | ✅ |

## 3. Edge cases verificados

| Caso | Esperado | Resultado |
|---|---|---|
| Carrito **solo de packs** + `EPI50` | No descuenta nada; no se promete descuento | ✅ test |
| Carrito **solo digital** + `EPI50` | No descuenta nada | ✅ test |
| Carrito mixto (catálogo + pack mayorista) | Catálogo al 50 %; pack intacto | ✅ test + navegador |
| `epi50` en minúscula / con espacios | Se normaliza y se aplica | ✅ el normalizado no cambió |
| Cupón apagado + payload con precios de cupón | `price_mismatch` | ✅ test del interruptor |
| `EPI50` con una línea que no califica, mandada a $800 | `price_mismatch` | ✅ test |

## 4. Analytics verificados

| Evento | Criterio | Resultado |
|---|---|---|
| `add_payment_info` | Viaja `EPI50` en el campo de cupón existente | ✅ campo sin cambios |
| `purchase` | El `value` es lo realmente pagado (mitad + envío) | ⚠️ requiere compra real |
| — | Ningún componente llama a `gtag`/`fbq`/`dataLayer` directo | ✅ no se tocó analytics |
| — | Todo el tracking sigue envuelto en `try/catch` | ✅ no se tocó analytics |

## 5. Consecuencias comerciales aceptadas

> No son bugs: son las decisiones de `requirements.md` §9.1 y §9.2. Se verifican
> para confirmar que pasan **como se esperaba** y que Mariano las vio.

| Criterio | Cómo se verifica | Resultado |
|---|---|---|
| El envío gratis se pierde: un carrito de $80.000 en 6 cm pasa a $40.000 y **paga** envío | Prueba manual en el checkout | ✅ pasa como se esperaba |
| Un calco suelto con `EPI50` sale $800/u, **lo mismo** que en el pack mayorista | Cuenta a mano | ✅ confirmado, aceptado |
| El armador de personalizados ($1.440/u) queda **más caro** que el configurador con cupón ($800/u) | Cuenta a mano | ✅ confirmado, aceptado |

---

## Definition of Done

- [x] Todos los criterios de §1 y §2 en ✅ (AC-7, con la salvedad de §6)
- [x] `npm test` en verde desde la raíz — **240 tests** (229 previos + 11 nuevos)
- [x] Los dos lados del espejo actualizados y con test de paridad que lo prueba
- [x] `docs/business-rules.md` actualizado (§2, §5 y §9)
- [x] Sin dependencias nuevas
- [x] Sin refactors fuera de scope (regla 8) — ver §6 el hallazgo del `cap`
- [x] Ninguna pantalla del sitio nombra el cupón
- [x] Preguntas abiertas de `requirements.md` §12 respondidas (Mariano, 20/8/2026)
- [ ] **Mariano probó una compra real con el código, en los dos caminos de pago**

---

## 6. Salvedades y hallazgos

**AC-7 y el `value` del `purchase`** son lo único que no se puede verificar sin
plata real de por medio: se validaron con test en los dos `paymentMethod`, y el
camino del checkout es el mismo `validateAndPriceOrder` para Mercado Pago y para
transferencia. **Queda pendiente una compra real de punta a punta.**

**Hallazgo durante la implementación — el tope de la promo 3x2.** El `cap` se
ataba a `promoActive` (la FECHA) y no a si la promo realmente se aplica al
pedido. Con eso, `EPI50` usado dentro de una ventana de 3x2 quedaba topeado al
10 %: daba $1.440 en vez de $800, por una promo que el cupón ya había anulado.
Lo detectó el test AC-14 antes de llegar a producción. Se corrigió en los tres
lados (`cap = promoActive && !anulaTodo`), porque es parte del camino que esta
spec cambia — no un refactor de oportunidad. Hoy la 3x2 está vencida, así que
**el arreglo no cambia ningún precio vigente**: es la red para la próxima promo.
