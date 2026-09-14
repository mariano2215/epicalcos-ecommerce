# Acceptance — Garantía en el checkout

| | |
|---|---|
| **Spec** | `021-garantia-en-checkout` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

> **Este documento determina cuándo la feature está terminada.**

Lo que dependa de hover, lector de pantalla o de un navegador visible se marca
⚠️ si solo se pudo verificar de forma indirecta, diciendo cómo.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | Con **1 calco de catálogo** en el carrito, arriba del botón de pagar se lee "30 días para devolverlo, por el motivo que sea" | Dev server, 375 px | ⬜ |
| AC-2 *(RF-2)* | Con **1 calco de catálogo + 1 personalizado**, se lee "30 días para devolver las calcos de catálogo" (o el texto que resulte de P-1) | Dev server + test | ⬜ |
| AC-3 *(RF-3)* | Con **solo un personalizado**, se lee "Si llega con una falla, te lo reponemos gratis" y el título no contiene "devol" | Dev server + test | ⬜ |
| AC-4 *(RF-4)* | Con **solo archivos imprimibles**, no hay mensaje de garantía y la lista tiene los mismos 4 ítems que antes | Test + lectura del código (la sección está despublicada) | ⬜ |
| AC-5 *(RF-5)* | Digital + catálogo muestra el mensaje de catálogo | Test | ⬜ |
| AC-6 *(RF-6)* | Con `devoluciones.dias` en otro número, los tres mensajes lo siguen y ningún test se desincroniza | Mutación | ⬜ |
| AC-7 *(RF-7)* | El mensaje es el **primer** ítem de la lista, ocupa el ancho completo y se distingue de los otros cuatro | Captura a 375 px | ⬜ |
| AC-8 *(RF-8)* | "Ver condiciones" arranca cerrado, se abre en el lugar y **no** navega: la URL no cambia y lo tipeado en el formulario sigue ahí | Dev server | ⬜ |
| AC-9 *(RF-9)* | Las condiciones de cada tipo coinciden con `business-rules.md` §7 (D-3, D-5, D-6, D-7, D-9) | Lectura lado a lado | ⬜ |
| AC-10 *(RF-10)* | Con un personalizado en el carrito, sumar un calco desde el upsell de `/checkout` cambia el mensaje a `mixto` sin recargar | Dev server | ⬜ |
| AC-11 *(RF-11)* | Abrir → 1 `garantia_condiciones_ver` con el `tipo` correcto; cerrar → ninguno; reabrir → otro | `window.dataLayer` | ⬜ |
| AC-12 | Cada caso de clasificación de `design.md` §9 tiene su test y pasa | `lib/garantia.test.js` | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px sin scroll horizontal, abierto y cerrado | `scrollWidth === innerWidth` | ⬜ |
| ANF-2 | **Conversión** — cerrado, el botón de pagar baja como mucho una fila (medir antes y después) | `getBoundingClientRect` del botón | ⬜ |
| ANF-3 | **Accesibilidad** — "Ver condiciones" se abre con teclado, target ≥ 44 px, foco visible | Inspección + teclado | ⬜ |
| ANF-4 | **Instagram** — el componente no tiene `<a>`, `window.open` ni `navigate` | Lectura | ⬜ |
| ANF-5 | **Tracking seguro** — el evento va por `pushDataLayer` (con `try/catch`) | Lectura | ⬜ |
| ANF-6 | **Sin dependencias nuevas** | `git diff frontend/package.json` vacío | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Carrito vacío | Sin lista ni mensaje (pantalla de carrito vacío) | ⬜ |
| Pack mayorista sin archivos | `devolucion` | ⬜ (test) |
| Pack mayorista con archivos y diseños | `mixto` | ⬜ (test) |
| Pack sin `meta` / `type` desconocido | `falla` | ⬜ (test) |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Todos los tests existentes siguen pasando | ⬜ |
| REG-2 | Compra por **Mercado Pago** hasta el redirect | ⬜ |
| REG-3 | Compra por **transferencia** hasta la pantalla de datos | ⬜ |
| REG-4 | El envío se calcula bien en las tres zonas | ⬜ |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ⬜ |
| REG-6 | `begin_checkout`, `add_shipping_info` y `add_payment_info` siguen saliendo una vez cada uno | ⬜ |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `garantia_condiciones_ver` | se abre "Ver condiciones" | `tipo` ∈ `devolucion` · `mixto` · `falla`, sin PII | ⬜ |

```js
window.dataLayer.filter(e => e.event === 'garantia_condiciones_ver')
```

---

## 6. Paridad de precios

⏭️ No aplica.

---

## Definition of Done

### Código
- [ ] §1, §2 y §3 en ✅ (o ⚠️ con el motivo)
- [ ] §4 en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope

### Documentación
- [ ] `docs/analytics.md` con el evento nuevo

### Proceso
- [ ] P-1 y P-2 resueltas
- [ ] `tasks.md` completo
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
| ⚠️ Cumple, verificado de forma indirecta | |
| ❌ No cumple | |
| ⏭️ No aplica | |
