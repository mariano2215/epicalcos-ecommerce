# Acceptance — Ticker de confianza + devolución a 30 días

| | |
|---|---|
| **Spec** | `020-ticker-de-confianza` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

> **Este documento determina cuándo la feature está terminada.**

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | En `/`, `/categorias`, una ficha de producto y `/checkout` hay una tira que se desplaza en continuo con los 4 mensajes, sin hueco entre la última frase y la primera | Dev server, 375 px y 1920 px | ⬜ |
| AC-2 *(RF-2)* | Con el 3x2 vivo, en el header se ven **a la vez** el banner "3×2 EN TODAS LAS CALCOS" y la tira | Dev server, hoy (el 3x2 no vence) | ⬜ |
| AC-3 *(RF-3)* | El mensaje de envío dice "$ 35.000" y "$ 50.000", y el test (3) falla si se cambia un umbral en `shipping` sin que cambie la tira | Test + lectura del DOM | ⬜ |
| AC-4 *(RF-4)* | Con `now` anterior al 7/9/2026 `anunciosVigentes()` no trae el 2x1; con `now` de hoy, sí | Test (5) | ⬜ |
| AC-5 *(RF-5)* | Ningún mensaje junta "Argentina" con un "%" mientras la promo Argentina 50 % esté vencida | Test (6) | ⬜ |
| AC-6 *(RF-6)* | Cambiar `devoluciones.dias` a otro número cambia la tira, `/politicas/cambios`, los Términos y el FAQ, y ningún test queda desincronizado | Tests (7) + `politicaDevoluciones.test.js` | ⬜ |
| AC-7 *(RF-7)* | `/politicas/cambios`, `/terminos-y-condiciones` §6 y el FAQ describen la devolución por cualquier motivo a 30 días con las condiciones aprobadas en §12; ninguno dice "no aceptamos cambios ni devoluciones" | Lectura de las tres páginas + test | ⬜ |
| AC-8 *(RF-8)* | El mensaje del 10 % dice "10 calcos" y "transferencia" | Test (4) | ⬜ |
| AC-9 *(RF-9)* | Con el mouse encima la tira se frena y al sacarlo sigue | Dev server, desktop | ⬜ |
| AC-10 *(RF-10)* | Con `prefers-reduced-motion: reduce` la tira no se mueve, se ven los 4 mensajes y ninguno aparece dos veces | DevTools → Rendering | ⬜ |
| AC-11 *(RF-11)* | El árbol de accesibilidad expone 4 mensajes (no 8) y la tira no tiene `aria-live` | `read_page` / VoiceOver | ⬜ |
| AC-12 *(RF-12)* | Con scroll > 80 px la tira desaparece y al volver arriba reaparece | Dev server | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px la página no scrollea en horizontal | `document.documentElement.scrollWidth === innerWidth` | ⬜ |
| ANF-2 | **Performance** — `AnnouncementBar.jsx` sin `useEffect`/`setInterval`/`requestAnimationFrame`; sin imágenes | Lectura del archivo | ⬜ |
| ANF-3 | **Sin CLS** — la tira está en el primer render y su alto no cambia mientras se mueve | Dev server | ⬜ |
| ANF-4 | **Contraste** — texto de la tira ≥ 4.5:1 sobre su fondo | Cálculo con los colores computados | ⬜ |
| ANF-5 | **Alto del header** — a 375 × 812 con el 3x2 vivo, el titular del hero se ve sin scrollear | Captura | ⬜ |
| ANF-6 | **Sin dependencias nuevas** | `git diff frontend/package.json` vacío | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| 2x1 apagado | La tira sigue, sin el mensaje del 2x1 | ⬜ (test 5) |
| Pantalla ≥ 1920 px | Sin hueco en el loop | ⬜ |
| Menú mobile abierto | La tira queda debajo del menú | ⬜ |
| Checkout | La tira está arriba y se recoge al bajar | ⬜ |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Todos los tests existentes siguen pasando | ⬜ |
| REG-2 | Se puede completar una compra por **Mercado Pago** de punta a punta | ⏭️ no se toca el checkout; se verifica que `/checkout` carga y calcula igual |
| REG-3 | Se puede completar una compra por **transferencia** de punta a punta | ⏭️ ídem |
| REG-4 | El envío se calcula bien en las tres zonas | ⬜ (`envio.test.js`) |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ⬜ (`promoPricing.test.js`; no se toca el espejo) |
| REG-6 | El carrito sobrevive al refresh | ⏭️ no se toca el carrito |
| REG-7 / REG-8 | `purchase` una vez y con el valor real | ⏭️ no se toca el tracking |
| REG-9 | El banner del 3x2 sigue igual | ⬜ |

---

## 5. Analytics

⏭️ Sin eventos nuevos ni modificados (`requirements.md` §11).

---

## 6. Paridad de precios

⏭️ No aplica: la feature no toca el camino de precios.

---

## Definition of Done

### Código
- [ ] §1, §2 y §3 en ✅
- [ ] §4 en ✅ o ⏭️ con motivo
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff
- [ ] Comentarios con el **por qué**

### Documentación
- [ ] `docs/business-rules.md` con la política nueva

### Proceso
- [ ] P-1 a P-6 resueltas y volcadas en la spec
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos reportados
- [ ] Este documento recorrido punto por punto
- [ ] Estado `DONE`

---

## Resultado de la validación

**Fecha**:
**Ejecutada por**:

| | Cantidad |
|---|---|
| ✅ Cumple | |
| ❌ No cumple | |
| ⏭️ No aplica | |
