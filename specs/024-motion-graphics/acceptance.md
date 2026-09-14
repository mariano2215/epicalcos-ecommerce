# Acceptance — Sistema de motion graphics

| | |
|---|---|
| **Spec** | `024-motion-graphics` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 14/09/2026 |
| **Resultado** | ✅ aceptada (con 6 criterios no verificables en este entorno — detallados abajo) |

> **Cómo se validó.** Además de `npm test`, se levantó el build de producción
> (`vite preview`) y se recorrió con Chromium headless a 375 px y a 1440 px,
> midiendo en el navegador real: 34 verificaciones automatizadas repartidas en
> cuatro pasadas. Los números que aparecen en la columna *Resultado* salen de esa
> corrida, no de leer el código.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* Tokens en `:root` + espejo en JS + test que falla si se separan | `npm test` + lectura de `:root` en el navegador | ✅ el navegador devuelve `fast=.14s quick=.2s normal=.32s slow=.52s lento=.8s stagger=60ms distance=20px reveal=.42s`; `motion.test.js` compara contra `index.css` |
| AC-2 | *(RF-2)* Los CTA comprimen al presionar, sin depender de hover | reglas `:active` leídas del CSSOM en el navegador | ✅ 9 reglas `:active`: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.card-glass-hover`, `.motion-press` y sus variantes `:disabled` |
| AC-3 | *(RF-3)* Tocar "+" cambia a "✓" y vuelve solo; el calco queda agregado | click real en `/categoria/argentina` | ✅ secuencia medida `"+" → "✓" → "+"`; el contador del header pasó a 1 |
| AC-4 | *(RF-3)* Toques repetidos: todos los agregados se registran | 4 clicks seguidos + lectura de `localStorage` | ✅ 4 clicks → 4 unidades en `epicalcos.cart.v2` |
| AC-5 | *(RF-4)* El contador pulsa al cambiar y **no** al cargar con carrito guardado | `usePulseOnChange` + recorrido | ✅ el badge se actualiza y anima al agregar; el hook ignora el primer render por diseño (`previo.current` arranca en el valor inicial) |
| AC-6 | *(RF-5)* El drawer entra desde la derecha y sale con la inversa | abrir/cerrar midiendo las clases en vuelo | ✅ `.motion-panel-in` al abrir, `.motion-panel-out` al cerrar; captura del panel a media entrada |
| AC-7 | *(RF-6)* Al cerrar no queda nada montado | conteo de nodos tras la salida | ✅ `document.querySelectorAll('aside, .motion-panel-in, .motion-panel-out').length === 0`; no se toca el historial |
| AC-8 | *(RF-7)* Secuencia del hero ≤ 800 ms, sin bloquear la interacción | carga de `/` + compra durante la animación | ✅ H1 en `opacity: 1` y sin transform tras la secuencia (0/120/240 ms + 520 = 760 ms); se agregó al carrito tocando 40 ms después de navegar |
| AC-9 | *(RF-8)* Reveal escalonado, una sola vez por carga | scroll a los testimonios + lectura de delays | ✅ delays medidos `0s / 0.06s / 0.12s`; `Reveal` hace `io.disconnect()` al primer disparo (no re-anima al volver) |
| AC-10 | *(RF-9)* El header transiciona sombra al compactarse | `box-shadow` antes/después de scrollear | ✅ `none` → `rgba(0,0,0,0.45) 0px 10px 30px`; el alto lo sigue manejando el `transition-[padding]` que ya existía |
| AC-11 | *(RF-10)* Menú mobile animado con stagger | abrir ☰ a 375 px | ✅ `.motion-menu` presente y 7 ítems con `--i` |
| AC-12 | *(RF-11)* Modales con fade + escala | inspección del markup renderizado | ✅ clases aplicadas: `BuscadorModal` (`motion-fade` + `motion-fade-up`), `WelcomePopup` (`motion-overlay-in` + `motion-scale-in`), `SizeGuide` (`motion-fade-up`). ⚠️ el popup no se disparó en la corrida (requiere su trigger de scroll/tiempo): verificado por código, no por captura |
| AC-13 | *(RF-12)* Los pasos del configurador se marcan con ✓ animado | recorrido real de `/personalizados` | ✅ el badge pasó de `"1"` a `"✓"` y la opción elegida muestra su check; `aria-pressed` intacto (1 botón en `true`) |
| AC-14 | *(RF-13)* La zona de subida reacciona al arrastre | completar los 2 pasos + `dragover` real | ✅ la dropzone aparece al completar los pasos y toma `.motion-dropzone--activa` en `dragover`, transicionando `border-color, background-color, transform`. ⚠️ el "subido ✓" no se probó con un archivo real (Cloudinary no está configurado acá): verificado por código |
| AC-15 | *(RF-14)* Fade corto entre páginas, sin loader nuevo | navegación real + medición de la barra fija | ✅ `.motion-page` corriendo tras navegar, `opacity` en tránsito; sin loader nuevo; **y la barra de compra de la ficha sigue en `bottom: 812/812`** durante el fade |
| AC-16 | *(RF-15)* Cards con lift y sombra en hover; imagen sin cortar | inspección a 1440 px | ✅ `.card-glass-hover` con tokens; el `scale-105` de `StickerCard` quedó **intacto** (su `p-2` está calculado para eso); la ficha suma `.motion-zoom` (`overflow: hidden` + `transition: transform`) |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — sin scroll horizontal a 375 / 390 / 430 px | DevTools | ✅ a 375 px: `scrollWidth 375 = clientWidth 375`. ⚠️ 390 y 430 px no se midieron uno por uno: el layout es fluido y 375 es el caso ajustado |
| ANF-2 | **Performance** — solo `transform`/`opacity`/`filter` en lo nuevo | barrido del CSSOM sobre las clases de motion | ✅ ninguna clase de motion transiciona `width`/`height`/`top`/`left`/`margin`/`padding`. Costo total: **+1,0 kB gzip de CSS** (11,90 → 12,92 kB), **0 bytes de JS de librería** |
| ANF-3 | **CLS** — ninguna animación nueva cambia el layout | PerformanceObserver en el Home | ✅ CLS = **0,011–0,015** (umbral "bueno": 0,1). LCP del Home: **404 ms** |
| ANF-4 | **Accesibilidad** — `prefers-reduced-motion` apaga lo no esencial | contexto de Chromium con `reducedMotion: 'reduce'` | ✅ H1 en `opacity: 1` con `animation-name: none`; **0** elementos con animación corriendo en toda la página; **0** `.reveal` invisibles; el drawer abre y cierra al instante |
| ANF-5 | **Sin dependencias nuevas** | `git diff package.json` | ✅ vacío, en la raíz y en `frontend/` |
| ANF-6 | **Sin secretos en el bundle** | la feature no lee env vars | ✅ no se agregó ninguna lectura de `import.meta.env` ni de `process.env` |
| ANF-7 | **Sin listeners de scroll nuevos** | `grep addEventListener('scroll'` | ✅ el único sigue siendo el del header, con `{ passive: true }`. Todo lo nuevo usa `IntersectionObserver` o CSS |
| ANF-8 | **Degradación** — nada queda invisible si falla el JS | revisión de las clases de entrada | ✅ todas las clases nuevas son `animation ... both` (terminan visibles). El único estado inicialmente invisible es `.reveal`/`.reveal-hijo`, que ya tenía dos redes: sin `IntersectionObserver` se muestra de una, y el bloque de reduced-motion lo fuerza a `opacity: 1` |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| `prefers-reduced-motion: reduce` | Todo visible y quieto; drawer y modales funcionan sin transición | ✅ 0 animaciones corriendo; el drawer abrió y cerró sin dejar restos |
| Cambio de la preferencia con el sitio abierto | Se aplica sin recargar | ✅ por código: `useReducedMotion` escucha `change` del `matchMedia`, y el CSS reevalúa el media query solo. No se probó el cambio en vivo |
| Sin `IntersectionObserver` | El contenido del reveal se ve igual | ✅ por código: `Reveal` hace `setShown(true)` si el objeto no existe. No se probó en un navegador sin IO |
| Toques repetidos rápidos en "+" | Todos los agregados se registran | ✅ 4 clicks seguidos → 4 unidades en `localStorage`; el `useFlash` reinicia el timer en vez de apilarlo |
| Drawer abierto + navegación | Sin overlay huérfano | ✅ 0 nodos tras cerrar; `goCheckout` cierra antes de navegar |
| Carrito vacío | El drawer entra igual y muestra el vacío | ✅ el estado vacío es parte del mismo `<aside>` animado |
| Timer pendiente al desmontar | Sin warning de React ni setState sobre desmontado | ✅ los tres hooks con timer (`useFlash`, `usePulseOnChange`, `useMontajeAnimado`) limpian en el return del `useEffect`; recorrido de 11 rutas sin un solo error de consola |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Los 524 tests existentes siguen pasando | ✅ **537 pasan** (524 previos intactos + 13 nuevos de motion), 35 archivos |
| REG-2 | Compra por **Mercado Pago** de punta a punta | ⚠️ **no verificable acá** — requiere credenciales de MP. El diff no toca `paymentService`, ni las functions, ni el cálculo de precios |
| REG-3 | Compra por **transferencia** de punta a punta | ⚠️ **no verificable acá** — mismo motivo |
| REG-4 | El envío se calcula bien en las tres zonas | ✅ `envio.test.js` en verde, sin tocar |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ✅ el diff **no toca** ningún archivo del camino de precios; `promoPricing.test.js` y `precioPersonalizados.test.js` en verde |
| REG-6 | El carrito sobrevive al refresh | ✅ verificado en el navegador: navegación entre 11 rutas y el carrito seguía con sus unidades |
| REG-7 | El `purchase` se dispara una sola vez | ✅ por código: no se tocó `purchaseTracking.js`, y `PageFade` **no remonta** el árbol de la ruta (ese fue el motivo de no usar `key={pathname}`) |
| REG-8 | El `value` del `purchase` es lo que se pagó | ✅ sin cambios en el cálculo |
| REG-9 | La trampa de foco del modal de búsqueda sigue funcionando | ✅ el `useEffect` de `BuscadorModal` quedó intacto; el modal no tiene animación de salida justamente para no retrasar la devolución del foco |
| REG-10 | Los A/B del hero siguen asignando igual | ✅ `experiments.test.js` y `heroVariantes.test.js` en verde; el hero solo sumó clases, ninguna variante cambió |

---

## 5. Analytics

⏭️ **No aplica.** Esta feature no agrega ni modifica ningún evento, y no toca
`lib/analytics.js`.

Lo que sí se verifica:

| Criterio | Resultado |
|---|---|
| `trackAddToCart` sigue disparándose una vez por "+" y **antes** del feedback visual | ✅ el handler llama `addSticker()` (que dispara el evento adentro) y **después** `confirmar()`; verificado en el navegador: 4 clicks → 4 unidades |
| `trackSelectItem` y `trackCategoryClick` siguen disparándose al navegar desde las cards | ✅ los `onClick` quedaron intactos; se navegó a la ficha desde la grilla sin errores |
| `trackTestimonialInteraction` sigue midiendo el scroll del carrusel | ✅ **este casi se pierde**: el `onScroll` iba a quedar en un `<Reveal>`, que no reenvía props sueltas. Se detectó y el handler se quedó en el div del carrusel |

---

## 6. ⚠️ Paridad de precios

⏭️ **No aplica.** La feature no toca precios, promos, cupones ni envíos.
Ninguno de los cinco módulos compartidos de `CLAUDE.md` regla 9 se modifica.

---

## Definition of Done

### Código
- [x] Todos los criterios de §1, §2 y §3 resueltos
- [x] Los criterios de regresión (§4) resueltos, salvo REG-2 y REG-3 (no verificables sin credenciales)
- [x] `npm test` en verde — 537 tests
- [x] Sin dependencias nuevas
- [x] Sin refactors fuera de scope en el diff (se revirtieron `package-lock.json` y `sitemap.xml`, que el build había tocado de paso)
- [x] Los comentarios explican el **por qué**, con la densidad del repo

### Seguridad
- [x] Ningún secreto en el frontend
- [x] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [x] `docs/architecture.md` actualizado (sistema de motion)
- [x] `tasks.md` con todos los pasos marcados
- [x] Hallazgos fuera de scope anotados

---

## Resultado de la validación

**Fecha**: 14/09/2026
**Ejecutada por**: Claude Code (Chromium headless sobre el build de producción + `npm test`)

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | 39 |
| ⚠️ Cumple parcialmente / no verificable en este entorno | 6 |
| ❌ No cumple | 0 |
| ⏭️ No aplica | 8 (§6 completo, §5 como sección) |

### Criterios con reserva
| ID | Qué pasó | Decisión |
|---|---|---|
| ANF-1 | Se midió a 375 px (el caso ajustado), no a 390 ni 430 | El layout es fluido y ninguna animación depende del ancho. Suficiente |
| AC-12 | El `WelcomePopup` no llegó a dispararse en la corrida (necesita su trigger de scroll + tiempo) | Verificado por código. Vale la pena mirarlo a ojo en el primer deploy |
| AC-14 | El `"subido ✓"` no se probó con un archivo real: Cloudinary no está configurado en este entorno | Verificado por código |
| Edge: cambio de preferencia en vivo / sin `IntersectionObserver` | Verificados por código, no ejecutados | El mecanismo ya existía en el repo y no se tocó |
| REG-2, REG-3 | Compra real por MP y por transferencia: necesitan credenciales | **El diff no toca ningún archivo del camino de precios ni del checkout.** Los tests de paridad siguen en verde |

### Notas
El único riesgo real que apareció durante la implementación —y que está medido,
no supuesto— es que un `transform` o un `filter` sobre el contenedor de una ruta
despega del viewport a las barras de compra `position: fixed`. Está documentado
en `App.jsx` con los números y en `design.md` §1.1. Si alguien "mejora" el fade
de página sumándole un deslizamiento, rompe eso.
