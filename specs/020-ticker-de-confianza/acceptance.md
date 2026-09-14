# Acceptance — Ticker de confianza + devolución a 30 días

| | |
|---|---|
| **Spec** | `020-ticker-de-confianza` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 14/09/2026 |
| **Resultado** | ✅ aceptada — con 3 criterios verificados de forma indirecta (⚠️, ver notas) |

> **Este documento determina cuándo la feature está terminada.**

Verificado en el dev server (`epicalcos-frontend`, Vite) con el 3x2 vivo, a
375 × 812, 1280 × 800 y 1920 × 1080. El pane del navegador estaba **oculto**
durante la verificación: sin render, no dispara eventos de scroll ni permite
hover. Donde eso impidió probar algo de forma directa, se dice.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | En `/`, `/categorias`, una ficha de producto y `/checkout` hay una tira que se desplaza en continuo con los 4 mensajes, sin hueco entre la última frase y la primera | Dev server, 375 px y 1920 px | ✅ Las cuatro rutas (`/producto/argentina/131` como ficha) muestran los 4 mensajes. `animationName: anuncio-scroll`, `running`. Loop sin hueco: el grupo mide exactamente la mitad de la pista (1359,2 px a 375; 1920 px a 1920, estirado por `min-width: 100vw`) |
| AC-2 *(RF-2)* | Con el 3x2 vivo, en el header se ven **a la vez** el banner "3×2 EN TODAS LAS CALCOS" y la tira | Dev server, hoy | ✅ Capturas a 375 y 1280 px: banner dorado → nav → tira oscura |
| AC-3 *(RF-3)* | El mensaje de envío dice "$ 35.000" y "$ 50.000", salidos del config | Test + DOM | ✅ DOM: *"🚚 Envío gratis desde $ 35.000 en Rosario y desde $ 50.000 al resto del país"*. Test (3) lo compara contra `formatPrice(shipping.*)` |
| AC-4 *(RF-4)* | Con `now` anterior al 7/9/2026 no trae el 2x1; con `now` de la promo, sí | Test (5) | ✅ Verifica además que el mensaje aparezca **exactamente** cuando `esCategoriaEn2x1('argentina', now)` es verdadero, así que sigue valiendo si se apaga el 2x1 |
| AC-5 *(RF-5)* | Ningún mensaje junta "Argentina" con un "%" mientras la promo 50 % esté vencida | Test (6) | ✅ |
| AC-6 *(RF-6)* | Cambiar `devoluciones.dias` cambia la tira, `/politicas/cambios`, los Términos y el FAQ, y ningún test queda desincronizado | Mutación | ✅ Con `dias: 45` los 15 tests de `anuncios` + `politicaDevoluciones` pasan igual (restaurado a 30). `grep "30 días"` en las páginas legales y el FAQ: 0 resultados |
| AC-7 *(RF-7)* | Las tres páginas describen la devolución a 30 días con las condiciones aprobadas; ninguna dice "no aceptamos cambios ni devoluciones" | Lectura + test + mutación | ✅ Texto leído en el navegador en `/politicas/cambios`, `/terminos-y-condiciones` §6 y el FAQ (incluido su JSON-LD). Mutación: volver a poner *"No aceptamos cambios ni devoluciones"* en el FAQ hace fallar `politicaDevoluciones.test.js` |
| AC-8 *(RF-8)* | El mensaje del 10 % dice "10 calcos" y "transferencia" | Test (4) + DOM | ✅ *"💸 10% OFF desde 10 calcos pagando por transferencia"* |
| AC-9 *(RF-9)* | Con el mouse encima la tira se frena | Dev server, desktop | ⚠️ **Verificado por código, no con el mouse** (el pane oculto no permite hover). La regla está aplicada en el CSSOM: `.anuncio-ticker:hover .anuncio-ticker__pista { animation-play-state: paused; }` |
| AC-10 *(RF-10)* | Con `prefers-reduced-motion: reduce` la tira no se mueve, se ven los 4 mensajes y ninguno aparece dos veces | Simulación | ⚠️ **Verificado aplicando las 6 reglas reales del `@media (prefers-reduced-motion)` sin la condición**, no con la preferencia del sistema. Resultado: `animation: none`, copia `display: none`, 4 mensajes entre x=16 y x=359 a 375 px. **Encontró un bug** (la frase del envío se salía hasta x=416), corregido — ver bitácora de `tasks.md` |
| AC-11 *(RF-11)* | El lector de pantalla recibe 4 mensajes (no 8) y la tira no tiene `aria-live` | DOM | ⚠️ **Verificado en el DOM, no con VoiceOver.** La copia es `<ul aria-hidden="true">`, la tira es `<section aria-label="Envíos, promos y garantía">` sin `role` ni `aria-live`. El inspector de accesibilidad del pane lista igual los 8 ítems, pero **no aplica `aria-hidden`**: en el ticker de marcas la copia desaparece de ese árbol solo porque sus imágenes tienen `alt=""`. Pendiente: pasada con VoiceOver |
| AC-12 *(RF-12)* | Con scroll > 80 px la tira desaparece y al volver arriba reaparece | Dev server | ✅ `scrollY: 400` → tira desmontada y nav compacto; `scrollY: 0` → vuelve. El evento `scroll` se despachó a mano porque el pane oculto no lo dispara solo; el handler es el mismo de siempre (`Header.jsx`) |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px la página no scrollea en horizontal | `scrollWidth === innerWidth` | ✅ 375 = 375 en `/` y en la ficha; sin scroll horizontal a 1920 |
| ANF-2 | **Performance** — `AnnouncementBar.jsx` sin `useEffect`/`setInterval`/`requestAnimationFrame`; sin imágenes | Lectura | ✅ Solo aparecen nombrados en el comentario que explica que no están. Bundle: `index.js` 284,77 kB (gzip 93,71 kB) |
| ANF-3 | **Sin CLS** — la tira está en el primer render y su alto no cambia mientras se mueve | Dev server | ✅ Se renderiza sin efectos (no aparece después). La animación es solo `transform`: alto constante de 35,4 px |
| ANF-4 | **Contraste** — texto ≥ 4,5:1 | Cálculo con colores computados | ✅ **15,3:1** sobre el fondo de la página (`#111` + `header` negro 40 % + tira blanca 5 %); **11,6:1** en un peor caso violáceo del degradado del hero |
| ANF-5 | **Alto del header** — a 375 × 812 con el 3x2 vivo, el titular del hero se ve sin scrollear | Medición + captura | ✅ Header 171 px (tira 35 px); el H1 termina en y = 302 |
| ANF-6 | **Sin dependencias nuevas** | `git diff frontend/package.json` | ✅ Vacío |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| 2x1 apagado | La tira sigue, sin el mensaje del 2x1 | ✅ Test (5) con `now` anterior al arranque: 3 mensajes, sin 2x1 |
| Pantalla ≥ 1920 px | Sin hueco en el loop | ✅ Grupo de 1920 px = ancho de la tira |
| Menú mobile abierto | La tira queda debajo del menú | ✅ Orden del header con el menú abierto: `promo-banner` → nav → menú → `anuncio-ticker` |
| Checkout | La tira está arriba y se recoge al bajar | ✅ Presente en `/checkout` con los 4 mensajes; se recoge con el mismo mecanismo de AC-12 |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Todos los tests existentes siguen pasando | ✅ 507 / 507 (los 496 previos + 11 nuevos) |
| REG-2 | Compra por **Mercado Pago** de punta a punta | ⏭️ No se tocó el checkout ni el camino de precios; `/checkout` carga igual |
| REG-3 | Compra por **transferencia** de punta a punta | ⏭️ Ídem |
| REG-4 | El envío se calcula bien en las tres zonas | ✅ `envio.test.js` en verde; `calculateShipping` sin cambios |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ✅ `promoPricing.test.js` en verde; `config/pricing.js` y `netlify/functions/lib/pricing.js` sin diff |
| REG-6 | El carrito sobrevive al refresh | ⏭️ `CartContext.jsx` sin diff |
| REG-7 / REG-8 | `purchase` una vez y con el valor real | ⏭️ `lib/analytics.js` sin diff |
| REG-9 | El banner del 3x2 sigue igual | ✅ `PromoBanner.jsx` sin diff; mismo banner en las capturas |

Consola: sin errores en cargas limpias de `/`, `/politicas/cambios` y
`/terminos-y-condiciones`. Aparecieron dos `Cannot read properties of null
(reading 'sequence')` **una sola vez**, inmediatamente después de un hot reload
de `index.css` en el dev server; no se repitieron en ninguna carga posterior.

---

## 5. Analytics

⏭️ Sin eventos nuevos ni modificados (`requirements.md` §11).

---

## 6. Paridad de precios

⏭️ No aplica: la feature no toca el camino de precios (sin diff en los dos
espejos).

---

## Definition of Done

### Código
- [x] §1, §2 y §3 en ✅ — salvo AC-9, AC-10 y AC-11, en ⚠️ por verificación indirecta (ver notas)
- [x] §4 en ✅ o ⏭️ con motivo
- [x] `npm test` en verde
- [x] Sin dependencias nuevas
- [x] Sin refactors fuera de scope en el diff
- [x] Comentarios con el **por qué**

### Documentación
- [x] `docs/business-rules.md` con la política nueva y la tira (§7)

### Proceso
- [x] P-1 a P-6 resueltas y volcadas en la spec
- [x] `tasks.md` con todos los pasos marcados
- [x] Hallazgos reportados
- [x] Este documento recorrido punto por punto
- [x] Estado `DONE`

---

## Resultado de la validación

**Fecha**: 14/09/2026
**Ejecutada por**: Claude, en el dev server local

| | Cantidad |
|---|---|
| ✅ Cumple | 23 (9 funcionales, 6 no funcionales, 4 edge cases, 4 de regresión) |
| ⚠️ Cumple, verificado de forma indirecta | 3 (AC-9, AC-10, AC-11) |
| ❌ No cumple | 0 |
| ⏭️ No aplica | 6 (4 filas de regresión, analytics y paridad) |

### Criterios no cumplidos
Ninguno.

### Notas
- **AC-9 / AC-10 / AC-11** se aceptan sobre evidencia de código y DOM, no de uso
  real. Las tres se confirman en dos minutos en un navegador visible: mouse
  encima de la tira, *Rendering → prefers-reduced-motion* en DevTools y una
  pasada con VoiceOver.
- La política nueva **genera trabajo operativo** que antes no existía:
  devoluciones y reembolsos a mano (panel de MP o transferencia).
