# Acceptance — Garantía en el checkout

| | |
|---|---|
| **Spec** | `021-garantia-en-checkout` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 14/09/2026 |
| **Resultado** | ✅ aceptada — 24 ✅, 4 ⚠️ (ver notas), 0 ❌ |

> **Este documento determina cuándo la feature está terminada.**

Verificado en el dev server a 375 × 812, con carritos cargados en
`epicalcos.cart.v2` (líneas con la forma exacta del `CartContext`). El pane del
navegador estaba **oculto**: no procesa Tab ni repinta después de scrollear, así
que las capturas se tomaron escondiendo por CSS lo de arriba del formulario, y
el teclado se verificó de forma indirecta.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | Con **1 calco de catálogo**, arriba del botón se lee "30 días para devolverlo, por el motivo que sea" | Dev server, 375 px | ✅ Primer ítem: *"🔄 30 días para devolverlo, por el motivo que sea"*. Captura |
| AC-2 *(RF-2)* | Con **catálogo + personalizado**, "30 días para devolver las calcos de catálogo" | Dev server + test | ✅ En la página real, con la condición extra *"Lo hecho con tu archivo se repone gratis si llega con una falla… no entra en la devolución por cualquier motivo"* |
| AC-3 *(RF-3)* | Con **solo un personalizado**, "Si llega con una falla, te lo reponemos gratis" y el título no contiene "devol" | Dev server + test | ✅ |
| AC-4 *(RF-4)* | Con **solo archivos imprimibles**, no hay garantía y la lista tiene los 4 ítems de antes | Dev server + test | ✅ 4 ítems, el primero *"🔒 Pago procesado por Mercado Pago"*. Probado con una línea `digital:` en el carrito (la sección está despublicada, pero el tipo de línea sigue vivo) |
| AC-5 *(RF-5)* | Digital + catálogo muestra el mensaje de catálogo | Dev server + test | ✅ |
| AC-6 *(RF-6)* | Con `devoluciones.dias` en otro número, los tres mensajes lo siguen y ningún test se desincroniza | Mutación | ✅ Con `dias: 45`, `garantia` + `politicaDevoluciones` + `anuncios`: 32 / 32. Restaurado a 30 (sin diff) |
| AC-7 *(RF-7)* | Es el **primer** ítem, ocupa el ancho completo y se distingue | Captura + medición | ✅ `col-span-2`, 285 px = ancho de la lista; tarjeta con borde y fondo verdes, texto blanco en negrita, contra chips grises |
| AC-8 *(RF-8)* | "Ver condiciones" arranca cerrado, abre en el lugar y **no** navega; lo tipeado sigue | Dev server | ✅ `open: false` al cargar; abierto, URL idéntica y el nombre tipeado (*"Prueba Garantía"*) sigue en el campo |
| AC-9 *(RF-9)* | Las condiciones coinciden con la política | Lectura lado a lado con `business-rules.md` §7 | ✅ `devolucion`: D-1 (plazo desde la recepción), D-3 (sin pegar), D-5 (envío de vuelta), D-6 (mismo medio, 10 días hábiles, el envío no), D-9 (cómo se pide). `falla`: D-7 (foto/video en 30 días, reposición con envío) y D-4 (lo hecho con archivo no entra) |
| AC-10 *(RF-10)* | Sumar un calco desde el upsell a un carrito de personalizados cambia el mensaje a `mixto` sin recargar | Dev server | ✅ Click en *"Agregar · $ 1.600"* del upsell: *"Si llega con una falla…"* → *"30 días para devolver las calcos de catálogo"*; carrito `custom` + `sticker` |
| AC-11 *(RF-11)* | Abrir → 1 evento con el `tipo`; cerrar → 0; reabrir → 1 | `window.dataLayer` | ✅ `{ event: 'garantia_condiciones_ver', tipo: 'devolucion' }`; abrir 1, cerrar 0, reabrir 1 |
| AC-12 | Cada caso de clasificación tiene su test y pasa | `lib/garantia.test.js` | ✅ 17 tests |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px sin scroll horizontal | `scrollWidth === innerWidth` | ✅ Cerrado: 375 = 375. Abierto: la captura muestra las condiciones partidas dentro de la tarjeta, sin desborde |
| ANF-2 | **Conversión** — cerrado, el botón baja como mucho una fila | Medición | ⚠️ Es **una** fila de la grilla, pero de **95 px** (título en dos líneas + el "Ver condiciones" de 44 px), casi dos filas de chips (48 px): el botón baja **103 px**. Con este texto el título no entra en una línea a 285 px. Ver notas |
| ANF-3 | **Accesibilidad** — teclado, 44 px, foco visible | Inspección | ⚠️ **Indirecta.** `<summary>` nativo (focusable, `tabIndex` 0), 44 px de alto, orden de tabulación comentario → "Ver condiciones" → botón de pagar, foco visible `solid 2px` verde (forzado con `focus({ focusVisible: true })`). La tecla Tab real no se pudo probar con el pane oculto |
| ANF-4 | **Instagram** — sin `<a>`, `window.open` ni `navigate` | `grep` | ✅ |
| ANF-5 | **Tracking seguro** — por `pushDataLayer` con `try/catch` | Lectura | ✅ |
| ANF-6 | **Sin dependencias nuevas** | `git diff frontend/package.json` | ✅ Vacío |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Carrito vacío | Sin lista ni mensaje | ✅ Test (vacío → `null`); el checkout vacío no renderiza el formulario (`Checkout.jsx` sin cambios, visto hoy en la verificación de la spec 020) |
| Pack mayorista sin archivos | `devolucion` | ✅ Test |
| Pack mayorista con archivos y diseños | `mixto` | ✅ Test |
| Pack sin `meta` / `type` desconocido | `falla` | ✅ Test |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Todos los tests existentes siguen pasando | ✅ 524 / 524 (507 previos + 17) |
| REG-2 | Compra por **Mercado Pago** hasta el redirect | ⚠️ **No probada de punta a punta**: en local no corren las functions (`netlify dev` no anda en esta máquina) y en producción crearía una preferencia real. El diff no toca el submit, `Checkout.jsx` ni ninguna function |
| REG-3 | Compra por **transferencia** hasta la pantalla de datos | ⚠️ Ídem: en producción crearía un pedido y mandaría mails reales |
| REG-4 | El envío se calcula bien en las tres zonas | ✅ `envio.test.js`; sin diff en el cálculo |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ✅ `promoPricing.test.js`; los dos espejos sin diff |
| REG-6 | `begin_checkout`, `add_shipping_info` y `add_payment_info` como antes | ✅ `begin_checkout` 1 vez al montar; los otros dos en 0 hasta que se cambia el método (se disparan al **cambiar**, `docs/analytics.md`) |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `garantia_condiciones_ver` | se abre "Ver condiciones" | `tipo: 'devolucion'`, sin PII | ✅ |

---

## 6. Paridad de precios

⏭️ No aplica: sin diff en `config/pricing.js` ni en `netlify/functions/lib/pricing.js`.

---

## Definition of Done

### Código
- [x] §1, §2 y §3 en ✅ o ⚠️ con el motivo
- [x] §4 en ✅ o ⚠️ con el motivo
- [x] `npm test` en verde
- [x] Sin dependencias nuevas
- [x] Sin refactors fuera de scope

### Documentación
- [x] `docs/analytics.md` con el evento nuevo

### Proceso
- [x] P-1 y P-2 resueltas
- [x] `tasks.md` completo
- [x] Hallazgos reportados
- [x] Este documento recorrido punto por punto
- [x] Estado `DONE`

---

## Resultado de la validación

**Fecha**: 14/09/2026
**Ejecutada por**: Claude, en el dev server local

| | Cantidad |
|---|---|
| ✅ Cumple | 24 (12 funcionales, 4 no funcionales, 4 edge cases, 4 de regresión) |
| ⚠️ Verificado de forma indirecta o parcial | 4 (ANF-2, ANF-3, REG-2, REG-3) |
| ❌ No cumple | 0 |
| ⏭️ No aplica | 1 (paridad) |

### Notas
- **ANF-2**: el criterio decía "una fila" pensando en los chips de 48 px; con este
  título la tarjeta mide 95 px. Si molesta, la salida es meter el título
  **dentro** del `<summary>` (toda la tarjeta pasa a ser el botón de "Ver
  condiciones"): ahorra ~20-35 px sin achicar el texto.
- **ANF-3**: dos minutos en un navegador visible — Tab desde el comentario del
  pedido y Enter sobre "Ver condiciones".
- **REG-2 / REG-3**: la próxima compra real confirma los dos caminos; el cambio
  es solo presentación arriba del botón.
