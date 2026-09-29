# Acceptance — Hero con termo y calcos animadas

| | |
|---|---|
| **Spec** | `028-hero-termo-stickers` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 27/09/2026 (Chrome headless, build de producción) |
| **Resultado** | ⬜ publicada el 28/9/2026 — todo verificado en Chrome; falta ANF-6 (Safari/Firefox/dispositivos reales) |

> **Este documento determina cuándo la feature está terminada.**

---

## Cómo se valida

Punto por punto, con el resultado **real** (`CLAUDE.md` regla 15). Arnés de
Chrome headless por CDP (como en la spec 024) para capturas, geometría,
movimiento reducido y métricas. Lo que no se puede probar desde el contenedor
(Safari, Firefox, dispositivos reales) se marca como tal y lo valida Mariano.

- ✅ **Cumple** — verificado, con evidencia
- ❌ **No cumple** — con el detalle
- ⏭️ **No aplica** — con el motivo

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* El termo es el elemento más grande del hero, centrado, sin deformar. | Capturas a 375, 390, 768, 1024, 1440; `getBoundingClientRect` del termo vs. las calcos | ✅ En los 44 tamaños del barrido (320-1920 px) el termo tiene más área que cualquier calco; centrado (`translate: -50%`), `object-fit: contain`. |
| AC-2 | *(RF-2, RF-3)* Cuatro calcos en sus cuadrantes; al menos una delante y una detrás del termo. | Capturas + `z-index` computado | ✅ Calco 2 con `z-index` 15 (detrás del termo, 20); 1, 3 y 4 con 30. En 1440 la 2 se mete 28 px detrás del termo y la 4 pasa 28 px por delante. |
| AC-3 | *(RF-4)* Ninguna calco se cruza con el H1, la bajada ni los botones, de 360 a 1920 px. | Arnés: intersección de rectángulos cada 40 px de ancho, al terminar la entrada | ✅ 44 tamaños de 320 a 1920 px (cada 40) + 1366×650, 375×667 y 768×1024: ninguna calco cruza las líneas del H1, la bajada ni los botones. |
| AC-4 | *(RF-5)* Sin scroll horizontal y sin calcos cortadas al terminar la entrada. | Arnés: `scrollWidth === clientWidth`; rectángulo de cada calco dentro del viewport | ✅ para el hero: ninguna calco sale del viewport en ningún tamaño. ⚠️ A 320 px hay 5 px de scroll horizontal que **ya estaban antes** (el build previo mide lo mismo): hallazgo en `tasks.md`. |
| AC-5 | *(RF-6)* En desktop el hero ocupa ~la altura de la pantalla; en mobile, la del contenido. | Captura 1440×900 y 375×812 | ✅ 1440×900: el hero va de 173 a 905 px y el termo termina a 868: todo el contenido entra en la primera pantalla (solo el padding inferior queda 5 px abajo). 375×812: alto del contenido (667 px). |
| AC-6 | *(RF-7 a RF-10)* Copy exacto; "VER CALCOS" → `/categorias`, "HACER LOS MÍOS" → `/personalizados`; el secundario se oculta si `personalizados` está en `HIDDEN_SECTIONS`. | DOM + clic en cada botón | ✅ H1 "Tu termo está pidiendo calcos.", bajada exacta, botones "Ver calcos" / "Hacer los míos" (en mayúsculas por CSS). Clic en VER CALCOS → `/categorias`; en HACER LOS MÍOS → `/personalizados`. El secundario sigue condicionado a `isSectionHidden('personalizados')` (código sin cambios). |
| AC-7 | *(RF-11)* Los dos botones se ven en 375 px. | Captura | ✅ Captura 375: los dos botones, de 51 y 53 px de alto, arriba del fold. |
| AC-8 | *(RF-12)* El termo crece al entrar y después no se mueve más. | Dos capturas a 2 s y 6 s: misma posición y tamaño | ✅ Termo: `scale` 0,92 → 1 con la curva del pedido; rectángulo idéntico a los 2,7 s y a los 6,7 s (1440 y 375). |
| AC-9 | *(RF-13, RF-14)* La calco 1 oscila ~15 px en ~4 s; la 2 queda a ~8° y oscila ~8 px en ~5 s. | Estilo computado + `getAnimations()` | ✅ Calco 1: `hero-calco-flota`, 2 s por mitad (`alternate`, ciclo de 4 s), se movió 11 px en 1 s. Calco 2: rotación medida 8°, loop de 2,5 s por mitad (ciclo 5 s), amplitud 8 px. |
| AC-10 | *(RF-15)* La calco 3 entra desde la derecha, girando, y queda quieta. | Capturas a 0,3 s, 0,8 s y 3 s | ✅ Línea de tiempo: la calco 3 arranca con `x: 250`, `rotate: 20°` y opacidad 0 y termina en `x: 0`, `rotate: −6°`; sin animaciones CSS (quieta). |
| AC-11 | *(RF-16, RF-17)* Con el cursor en el borde, la calco 4 se desplaza ~12 px y las otras entre ~1,5 y ~3,5 px, todas distintas; el termo, 0. | Arnés: `Input.dispatchMouseEvent` + medición | ✅ Cursor de punta a punta: calcos 4 / 7 / 3 / **24,9** px (esperado 4, 7, 3, 25). Termo: 0 px. |
| AC-12 | *(RF-18)* Orden de entrada titular → bajada → botones → termo → calcos, todo antes de 1,5 s. | Capturas cada 100 ms | ✅ Cuadro a cuadro: H1 → bajada → botones (opacidad > 0,5 a los 440-570 ms) → termo → calcos 1, 3, 2, 4. La última termina a 1,30-1,49 s de que aparece el hero (ver bitácora: retrasos anclados). |
| AC-13 | *(RF-19, RF-20)* Los botones responden a un clic a los 50 ms; el H1 y la bajada tienen opacidad 1 desde el primer cuadro. | Arnés: clic temprano + `getComputedStyle().opacity` en el primer cuadro | ✅ En el primer cuadro con H1 (147-197 ms): H1, bajada y termo con opacidad 1; `elementFromPoint` en el centro del botón devuelve el botón. |
| AC-14 | *(RF-21)* Con mouse, hover sobre una calco la agranda y la gira un poco; con touch emulado, no. | Arnés con `hover: hover` y con `Emulation.setTouchEmulationEnabled` | ✅ Mouse: la calco 4 llega a escala 1,08 y 2° y vuelve a 1 en < 250 ms al soltar. Touch emulado: `pointer-events: none` en las 4. *(28/9, ampliación A: las calcos pasan a `pointer-events: auto` para poder tocarlas; el hover sigue solo con mouse — `whileHover` depende de `conMouse` —, verificado en `juego.mjs`.)* |
| AC-15 | *(RF-22)* Ninguna calco está encima de un elemento clickeable. | `elementFromPoint` en el centro de cada botón devuelve el botón | ✅ En los 44 tamaños, `elementFromPoint` en el centro de cada botón devuelve el botón. |
| AC-16 | *(RF-23)* Volver al Home navegando dentro del sitio muestra el hero armado; recargar repite la entrada. | Navegación con el router | ✅ Clic a `/categorias` + atrás: sin `.hero--entrada` y calcos con opacidad 1 a los 60 ms. Recargar: vuelve la entrada. |
| AC-17 | *(RF-24)* Con el hero fuera de pantalla, los loops de las calcos están en pausa. | Scroll + `animationPlayState` | ✅ Con scroll a 2500 px: `data-pausado` puesto y el loop `paused`; de vuelta arriba, `running`. |
| AC-18 | *(RF-25, RF-26)* En 375 px el orden es copy → botones → escena, y no hay listener de `pointermove`. | Captura + `getEventListeners` (CDP) | ✅ 375 (touch): tops 212 → 295 → 367 → 512 (copy → botones → escena); la sección no tiene listeners de `pointer*`. En desktop: `pointermove` y `pointerleave`. |
| AC-19 | *(RF-28)* Con movimiento reducido: sin loops, sin parallax, sin entrada desde la derecha; composición completa. | `Emulation.setEmulatedMedia` | ✅ `prefers-reduced-motion`: sin `.hero--entrada`, 0 animaciones CSS en termo y calcos, calco 3 ya en `x: 0`/`−6°` a los 250 ms, parallax 0 px. |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | *(RNF-1)* CLS del Home ≤ 0,05 a 375 px. | Arnés, CPU ×4, 5 corridas | ✅ CLS máx. 0,0126-0,0133 (7 corridas), igual que antes (0,0118-0,0132). Viene de otra parte de la página. |
| ANF-2 | *(RNF-2)* LCP a 375 px no empeora más de 200 ms (mediana, mismas condiciones que el antes). | Arnés, antes vs. después | ✅ **Mejoró**: LCP a 375 px con CPU ×4 y red 4G: antes 1480-1696 ms (mediana según la corrida), después **1232-1268 ms** (con el termo final, 1268). El elemento LCP pasó a ser el termo, siempre el mismo. |
| ANF-3 | *(RNF-3)* Termo ≤ 120 kB, cada calco ≤ 30 kB; el chunk principal no crece más de 1 kB gzip; `framer-motion` solo en un chunk aparte. | `ls -l`, salida de `vite build` | ✅ Termo 7,8 kB; calcos 9,9 / 12,1 / 27,3 / 15,0 kB. Chunk principal +0,4 kB gzip (97.607 → 98.004 B). `framer-motion` solo en `HeroCalcos-*.js` (30 kB gzip). |
| ANF-4 | *(RNF-4)* Sin tareas largas (> 50 ms) causadas por el hero al scrollear con CPU ×4. | Perfil de rendimiento | ✅ 0 tareas largas scrolleando (antes y después). FPS al scrollear con CPU ×4: mobile ~38 → ~58, desktop ~22 → ~33. En la carga, mobile suma una tarea larga (+~70 ms en total): el chunk de las calcos. |
| ANF-5 | *(RNF-5)* Calcos con `alt=""` y ocultas para lectores de pantalla; termo con `alt` descriptivo; botones ≥ 44 px de alto y con foco visible; contraste AA. | DOM + árbol de accesibilidad (CDP) + medición | ✅ Contenedor de calcos `aria-hidden="true"`, `alt=""` en las 4; termo con alt descriptivo; botones de 51 y 53 px; foco de teclado con `outline: auto`; contraste de la bajada ≈ 10:1 sobre el fondo real (el H1 es blanco o degradado sobre la franja oscura). |
| ANF-6 | *(RNF-6)* Chrome, Safari, Firefox, iOS Safari y Chrome Android: misma composición. | Chrome: arnés. **El resto, Mariano en dispositivos reales** | ⬜ Chrome: ✅ (arnés). **Safari, Firefox, iOS Safari y Chrome Android: no se pueden probar desde el contenedor.** Pendiente de Mariano en dispositivos reales antes del merge. |
| ANF-7 | *(RNF-7)* Sin termo o sin una calco, el hero no cambia de altura ni muestra imagen rota. | Renombrar el asset temporalmente | ✅ Con 404 en el termo y en la calco 2: los dos en `visibility: hidden`, las otras 3 calcos visibles, alto del hero idéntico (667,06 px). |
| ANF-8 | *(RNF-8)* Sin errores ni warnings nuevos en consola (dev y build). | Arnés + salida del build | ✅ Build sin warnings. Consola del build: limpia. Dev: solo los 2 avisos de *future flags* de React Router, que ya estaban. |

---

## 3. Edge cases

| ID | Caso | Resultado esperado | Resultado |
|---|---|---|---|
| EC-1 | 320 px | Sin scroll horizontal, botones usables | ✅ Sin calcos fuera ni sobre el texto, botones tocables. (Los 5 px de scroll son previos: ver AC-4.) |
| EC-2 | 1920 px | Composición centrada, ≤ 880 px de escena | ✅ Escena de 880 px centrada; calcos 1 y 3 a 360 px del centro. |
| EC-3 | 1366×650 | Botones arriba del fold; calcos enteras | ✅ Botones arriba del fold (terminan a 458 px de 650); el termo queda cortado por el fold, las calcos enteras. |
| EC-4 | 768 px en vertical | Ninguna calco sobre el texto | ✅ Ninguna calco sobre el texto a 768×1024. |
| EC-5 | Cursor sale de la ventana | Las calcos vuelven al reposo | ✅ Al sacar el cursor del hero, las 4 calcos vuelven a 0 px de desplazamiento. |
| EC-6 | Chunk de las calcos bloqueado (CDP `Network.setBlockedURLs`) | Hero con texto, botones y termo; sin error en pantalla | ✅ Con el chunk bloqueado: H1, termo y el resto de la Home presentes, 0 calcos, sin pantalla rota (un error de import en consola, esperado). |
| EC-7 | Movimiento reducido cambia con la página abierta | Loops y parallax se apagan sin recargar | ✅ Activando reduced-motion con la página abierta: 0 loops y la sección pierde los listeners de `pointer*`. |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | `npm test` en verde (todo lo que había + `heroTermo.test.js`) | ✅ 743 tests en verde. |
| REG-2 | `npm run build --prefix frontend` sin errores | ✅ `vite build` sin errores ni warnings. |
| REG-3 | Con `?exp_hero_buscador=en_hero` hay exactamente un buscador en la Home | ✅ Con `?exp_hero_buscador=en_hero` el hero no tiene buscador y la sección sí (kill switch → control). *(Hay otro `.buscador` fijo más abajo en la Home, igual que antes.)* |
| REG-4 | "HACER LOS MÍOS" sigue mandando `custom_sticker_click` con `origen: 'hero'` | ✅ `dataLayer`: `{event: 'custom_sticker_click', origen: 'hero'}` al tocar HACER LOS MÍOS. |
| REG-5 | Las páginas de pago (mismo fondo) se ven igual que antes | ✅ `/pago-error` antes vs. después: píxeles idénticos salvo los 58 px de la barra de promo (sus calcos son al azar). |
| REG-6 | `PromoBanner` y `Categorias` siguen mostrando su `StickerField` | ✅ `PromoBanner`: 9 calcos de `StickerField`; `/categorias`: 18. El hero: 0. |
| REG-7 | Carrito, checkout y navegación: agregar al carrito y llegar al checkout desde el Home | ✅ Desde el Home: agregar una calco destacada → 1 línea en `epicalcos.cart.v2` → `/checkout` con su formulario (6 inputs). Igual que antes. |
| REG-8 | `title`, meta description y JSON-LD del Home sin cambios | ✅ `title`, meta description, canonical y JSON-LD del Home: idénticos byte a byte. |

---

## 5. Analytics

| ID | Criterio | Resultado |
|---|---|---|
| AN-1 | Sin eventos nuevos; `custom_sticker_click` intacto (REG-4) | ✅ Sin eventos nuevos; `custom_sticker_click` intacto. |
| AN-2 | El Home ya no manda `experiment_view` de `hero_titular` ni `hero_buscador` | ❌ **como estaba escrito**: `hero_titular` ya no se envía, pero `hero_buscador` **sí** (todo `debajo`), porque `Home` lo sigue leyendo a propósito (RN-5) y `useExperiment` reporta aunque esté apagado. El criterio estaba mal planteado; queda documentado en `CRO-EXPERIMENTS.md` para no leerlo. |
| AN-3 | `docs/CRO-EXPERIMENTS.md` tiene el corte con la fecha real del deploy | ✅ Publicada el 28/9/2026 (adelantada por Mariano; el plan era desde el 3/10): fecha y ventana de lectura (18/9 al 27/9) en `CRO-EXPERIMENTS.md`. |

---

## 6. ⚠️ Paridad de precios

⏭️ No aplica: la feature no toca precios, promos ni envíos.

---

## 7. Ampliación A — Pegar las calcos en el termo

> Validado el 28/09/2026 con `juego.mjs` (arnés de Chrome headless: mouse, touch emulado, movimiento reducido) sobre el build de producción.

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-A1 | *(RF-A1)* Cursor `grab` sobre una calco y `grabbing` al arrastrar. | `getComputedStyle().cursor` | ✅ `cursor: grab` sobre la calco y `grabbing` mientras se arrastra. |
| AC-A2 | *(RF-A2)* Arrastrando, el centro de la calco queda a ± 1 px del cursor en todo el recorrido; no flota ni hace parallax. | Arnés: `page.mouse` en 20 pasos | ✅ Deriva máxima entre cursor y calco: 0,00 px en 20 pasos; `z-index` 40 en la mano; la flotación se pausa. |
| AC-A3 | *(RF-A3)* Soltada sobre el cuerpo: queda pegada ahí, más chica, y la parte fuera de la silueta no se ve. Sobre la tapa, la base o la manija: no se pega. | Arnés + captura | ✅ Soltada en (0,35; 0,41) → pegada ahí, al 42 % del ancho del termo, con la suelta oculta. Soltada sobre la tapa: no se pega. Captura: la silueta recorta lo que se pasa. |
| AC-A4 | *(RF-A4)* Soltada afuera: vuelve a su lugar (± 1 px) en < 1 s. | Arnés | ✅ Soltada afuera: vuelve a 1,5 px de su lugar en < 1,1 s (el resto lo pone la flotación, que sigue). |
| AC-A5 | *(RF-A5)* Clic en las cuatro: todas pegadas, cada una en su destino, sin taparse. | Arnés + captura | ✅ Clic en 2, 3 y 4: las tres en su destino (± 2 %), solape máximo 15 %. Del clic a pegada: 570 ms. |
| AC-A6 | *(RF-A6, RF-A8)* Pegada: sin animaciones, sin parallax; por delante del termo y por detrás de una que se arrastra. | Arnés | ✅ Pegadas: 0 animaciones, 0,0 px de corrimiento con el cursor cruzando la pantalla, capa con `z-index` 25. |
| AC-A7 | *(RF-A7)* Agarrar una pegada la despega bajo el cursor; clic en una pegada la manda a su lugar. | Arnés | ✅ Agarrar una pegada: aparece suelta en la mano y se re-pega donde se suelta, sin evento nuevo. Clic en una pegada: vuelve a 0,9 px de su lugar. ⏭️ *Desde la ampliación D, reemplazado por AC-D5 (RF-D5).* |
| AC-A8 | *(RF-A9)* Arrastrar y soltar sobre "VER CALCOS" no navega. | Arnés | ✅ Soltada encima de VER CALCOS: sigue en `/`. |
| AC-A9 | *(RF-A5, Q4)* Táctil: un toque pega la calco. | Arnés con touch emulado | ✅ Toque (touch emulado) → pegada, evento `1:toque`. Con un poco de scroll, las cuatro. ⚠️ Sin scroll, en 375×812 el botón "10% OFF" tapa el centro de la calco 2 (hallazgo en `tasks.md`). |
| AC-A10 | *(RF-A10)* Táctil: un gesto de scroll que empieza sobre una calco scrollea la página y no la pega. | Arnés: `Input.dispatchTouchEvent` | ✅ Gesto de scroll con el dedo empezando sobre la calco 3 (eventos táctiles de CDP): la página baja 174 px, igual que empezando sobre el titular, y no se pega nada. `touch-action: auto`. |
| AC-A11 | *(RF-A11)* La pista aparece al terminar la entrada, con el texto según el puntero, y se va al pegar la primera; si el chunk no cargó, no aparece. | Arnés | ✅ Con mouse: "Arrastrá una calco al termo"; táctil: "Tocá una calco para pegarla". Aparece al terminar la entrada, se va al pegar la primera; con el chunk bloqueado no aparece. |
| AC-A12 | *(RF-A12)* Recargar o volver al Home navegando: todas en su lugar. | Arnés | ✅ Volver al Home navegando y recargar: 0 pegadas, las 4 sueltas visibles. |
| ANF-A1 | *(RNF-A1)* Chunk de calcos ≤ +3 kB gzip; chunk principal sin cambios. | Salida del build | ✅ para el chunk de calcos: **+1,9 kB** gzip (30,0 → 31,9). ⚠️ El principal no quedó "sin cambios": **+0,3 kB** (la función `trackHeroStickerStick` en `analytics.js` y el texto de la pista), por debajo del 1 kB del ANF-3. |
| ANF-A2 | *(RNF-A2)* ≥ 50 fps arrastrando en desktop. | Arnés con `requestAnimationFrame` | ✅ 60 fps arrastrando (y 60 en reposo), medidos con el fondo con blur apagado: este Chrome sin GPU dibuja ese fondo a ~13 fps aunque no se toque nada. En un equipo real, mirarlo en el preview. |
| ANF-A3 | *(RNF-A3)* Movimiento reducido: el arrastre funciona; vuelo y vuelta instantáneos. | Arnés | ✅ Movimiento reducido: clic → pegada a los 120 ms en su destino; soltada afuera vuelve de una (0 px); el arrastre funciona igual. |
| ANF-A4 | *(RNF-A4)* Pegar, despegar o arrastrar no cambia la altura del hero. | Arnés | ✅ Alto del hero 732 px antes y después de pegar las cuatro. |
| AN-A1 | `hero_sticker_stick` con `slot` y `metodo` correctos, una vez por pegada; no al mover una pegada dentro del termo. | `dataLayer` | ✅ `dataLayer`: `1:arrastre, 2:clic, 3:clic, 4:clic`, una por pegada; moverla dentro del termo no suma. |
| REG-A1 | Todo §1-§5 sigue en verde (barrido de geometría incluido). | Arnés completo | ✅ Todo el arnés de §1-§5 de nuevo: barrido de 44 tamaños (ahora con la pista como texto que nada puede tapar) sin calcos sobre el texto; mismos únicos ❌ de antes (320 px previo, `.buscador` fijo). El LCP del 28/9 dio más lento en los dos builds (entorno): producción 2332 ms, este 1760 ms en la misma corrida. CLS 0,02, todo de la barra de promo (hallazgo). |

---

## 8. Ampliación B — El termo gira

> Validado el 28/09/2026 con `giro3.mjs` y capturas cuadro a cuadro.

| ID | Criterio | Resultado |
|---|---|---|
| AC-B1 | *(RF-B1)* Termo sin manija ni logo. | ✅ Captura: cuerpo liso y simétrico, 142×512, 4,9 kB. |
| AC-B2 | *(RF-B2, RF-B3)* Gira (una vuelta cada 12 s); las pegadas se corren, se angostan en el borde y pasan por detrás. | ✅ Tira de 8 cuadros cada 0,65 s: las pegadas salen del frente, se angostan en el borde derecho y desaparecen. |
| AC-B3 | *(RF-B4)* Soltada sobre el termo, queda donde se soltó en ese momento del giro. | ✅ Centro soltado (742,5; 702,1) → pegada en (742,2; 702,1). |
| AC-B4 | *(RF-B5)* Clic/toque: vuela al frente, a su altura. | ✅ Con el giro detenido: las cuatro en fx 0,5 y su fy (± 2 %), solape máximo 19 %. |
| AC-B5 | *(RF-B6)* Arrastrando, el giro se pausa; al soltar sigue. | ✅ `currentTime` 2350 → 2350 durante 0,7 s arrastrando; 3400 → 3917 después. |
| AC-B6 | *(RF-B7)* Fuera de pantalla se pausa. | ✅ `.hero-termo__giro` sumado a la regla de `data-pausado` (misma que el fondo, verificada en §1 AC-17). |
| AC-B7 | *(RF-B8)* Movimiento reducido: no gira. | ✅ Sin animación en el giro; el juego igual (clic → pegada al frente a los 120 ms). |
| AC-B8 | *(RF-B9)* Del lado de atrás no se puede tocar. | ✅ A 127°, `elementFromPoint` en su centro devuelve el termo, no la calco. |
| ANF-B1 | *(RNF-B1, RNF-B2)* Sin librerías; chunk de calcos ≤ +2 kB. | ✅ CSS 3D + animación CSS. Chunk de calcos 31,9 → 32,4 kB gzip (+0,5 kB, con el juego incluido). |

---

## 9. Ampliación C — "Pegá las 4 calcos y ganate 10% OFF"

> Validado el 28/09/2026 con `giro.mjs`, `giro3.mjs` y `bloqueo.mjs`.

| ID | Criterio | Resultado |
|---|---|---|
| AC-C1 | *(RF-C1)* Con premio: "🎁 Pegá las 4 calcos y ganate 10% OFF" + contador. | ✅ 0/4 → 1/4 → 2/4 → 3/4 al pegar (desktop). |
| AC-C2 | *(RF-C2)* Con la cuarta: "¡Listo!" y el popup con "¡Ganaste 10% OFF!". | ✅ Desktop y celular (4 toques): `popup_view` con `popup_trigger: 'sticker_game'` y el título del premio. |
| AC-C3 | *(RF-C3)* Jugando, el popup no se abre solo; al dejar de jugar vuelve. | ✅ Sin jugar abre solo a los 13 s (`time`). Jugando hasta los 33 s: nada. Después abrió a los 55 s (20 s + la gracia de 3 s). |
| AC-C4 | *(RF-C4, RF-C6)* Una vez por carga. | ✅ `premiado` en `juegoTermo` (test: `ganaAhora` con `premiado: true` no gana). |
| AC-C5 | *(RF-C5)* Sin premio (cupón activo): pista simple, sin popup. | ✅ Pista "Arrastrá una calco al termo"; con las 4 pegadas, 0 `popup_view`. |
| AN-C1 | `hero_sticker_stick` con `pegadas`. | ✅ `1:clic:1 … 4:clic:4` y `1:toque:1 … 4:toque:4`. |
| REG-C1 | El popup sigue igual para quien no juega; nada de precios. | ✅ Control de `bloqueo.mjs`; `config/pricing.js` sin cambios (el premio es `EPICA10`). |

---

## 10. Ampliación D — Muchas calcos de Argentina

> Validado el 28/09/2026 con `muchas.mjs` (nuevo: 15 clics seguidos), `cache.mjs`
> (pedidos de imágenes por CDP), `despegar.mjs` (toque y movimiento reducido), `juego.mjs`, `giro3.mjs`, `bloqueo.mjs` y
> `verificar.mjs` sobre el build de producción, más los tests de `heroTermo`.

| ID | Criterio | Resultado |
|---|---|---|
| AC-D1 | *(RF-D1)* Todos los diseños de Argentina con fondo transparente, y ninguno con fondo blanco. | ✅ 58 de los 140 del catálogo. Test: cada archivo existe y es WebP con alfa. |
| AC-D2 | *(RF-D2)* Al pegar, el lugar se recarga: al azar, sin repetir hasta agotar, nunca uno a la vista, con la animación de entrada. | ✅ Tras pegar la 1 (diseño 30), el lugar 1 muestra otro que entra con su animación. En 15 clics seguidos: 0 veces con un diseño repetido a la vista, y 14 pegadas con 14 diseños distintos. Test: `siguienteDiseno` nunca devuelve uno visible y recorre los 58 antes de repetir. |
| AC-D3 | *(RF-D3)* Arranca con mate, Ruta 40, carpincho y Pumas. | ✅ Iniciales `30, 57, 19, 54` en cada carga. |
| AC-D4 | *(RF-D4)* Tope de 12: al pegar la 13, la más vieja se va sola. | ✅ 14 pegadas → 12 en el termo. (15 clics: uno cayó en el popup del premio, que se abre después de la cuarta, y lo cerró.) |
| AC-D5 | *(RF-D5)* Clic o toque en una pegada: se despega y deja de contar. | ✅ Clic: 12 → 11 (`muchas.mjs`) y 4 → 3 (`juego.mjs`), con la animación de salida. Toque (touch emulado, 375 px): 2 → 1. Movimiento reducido: 2 → 1 en 330 ms, y el tope de 12 también (`despegar.mjs`). |
| AC-D6 | *(RF-D6)* El juego y el premio no cambian. | ✅ Con 4 pegadas cualesquiera (una ya recargada: el lugar 1 dos veces) abre el popup con `sticker_game`; `giro3.mjs` y `bloqueo.mjs` en verde, igual que en §9. |
| AC-D7 | *(RF-D7)* Un diseño que sale del catálogo sale del juego. | ✅ Test: cada diseño de `disenosHero.js` tiene que estar en `data/argentina.json`; si se saca uno, el test falla hasta regenerar con `scripts/build-hero-argentina.py`. |
| ANF-D1 | *(RNF-D1)* No se bajan los 58 de entrada. | ✅ Al cargar: 8 imágenes (las 4 a la vista + la próxima de cada lugar). Con 3 pegadas: 11 pedidos, 11 diseños distintos: cada uno baja una vez. *(En los arneses con `page.route` salen repetidos: Playwright apaga la caché HTTP al rutear. `cache.mjs`, sin ruteo, da uno por diseño.)* |
| ANF-D2 | *(RNF-D2)* Cada calco ≤ 30 kB. | ✅ La más pesada, 28,1 kB; 871 kB entre las 58. El test falla si una pasa de 30 kB. |
| ANF-D3 | Chunks. | ✅ Calcos 32,63 → 33,33 kB gzip (+0,7, con la lista de 58). Principal 99,09 → 99,21 (+0,12: `siguienteDiseno` y los iniciales); la lista no entra al principal. |
| AN-D1 | `hero_sticker_stick` con `diseno`. | ✅ `argentina-16:11`, `argentina-49:12`, `argentina-23:12`, `argentina-32:12` (diseño:pegadas). |
| REG-D1 | Lo de las ampliaciones A-C sigue igual. | ✅ `juego.mjs` completo en verde con la recarga (AC-A1 a AC-A12, ANF-A2 a ANF-A4); `verificar.mjs`: mismos ❌ de antes (320 px previo; `pointer-events: auto` en táctil, buscado desde A — ver AC-14; el override `?exp_hero_buscador` no aplica porque el test está cerrado). |

## 11. Ampliación E — El hero lleno de calcos

> Validado el 29/09/2026 con los arneses de Chrome headless `hero.mjs`
> (geometría y capturas en 12 anchos), `juego.mjs` (toque, clic, premio y
> movimiento reducido) y `lcp.mjs` (antes vs. después sobre builds de
> producción), más los tests de `heroTermo`.

| ID | Criterio | Resultado |
|---|---|---|
| AC-E1 | *(RF-E1)* 8 calcos en el celular, 10 en tablet, 12 desde 1024, 14 desde 1280 y 16 desde 1440. | ✅ Medido: 320/360/375/390 → 8 · 768 → 10 · 1024 → 12 · 1280 y 1366 → 14 · 1440, 1680 y 1920 → 16. Test: `lugaresPara` da 8/10/12/14/16. |
| AC-E2 | *(RF-E2)* Por todo el hero: alrededor del termo y, desde 1024, a los costados del titular. | ✅ Capturas a 375, 768, 1280, 1440 y 1920. Desde 1440 las de afuera se abren con la pantalla (`vw`): a 1920 llegan a las esquinas. |
| AC-E3 | *(RF-E3)* Todas flotan, ninguna igual a otra. | ✅ Test: las 16 con `loop`; firmas (entrada + loop + parallax) y parallax distintos en las 16. |
| AC-E4 | *(RF-E4)* Cualquiera se pega y su lugar se recarga. | ✅ Celular (toque, 375): el lugar 5 pega y pasa del diseño 7 al 11. Desktop (clic, 1440): los lugares 13, 16, 5 y 11 → 4 pegadas. |
| AC-E5 | *(RF-E5)* Ninguna calco cruza el H1, la bajada, los botones ni la pista; ninguna se sale de la pantalla; no hay scroll horizontal nuevo. | ✅ 0 cruces y 0 fuera en 320, 360, 375, 390, 768, 1024, 1280, 1366×650, 1440, 1680 y 1920 (líneas de texto medidas con `Range`). Tampoco se pisan entre sí (> 25 % del área). A 320 siguen los 5 px de scroll que ya estaban (hallazgo previo): la calco más a la derecha termina en 318. |
| AC-E6 | *(RF-E6)* Entrada de a una, terminada antes de 1,5 s. | ✅ Test: 16 retrasos distintos y `duracionEntradaMs() ≤ 1500` (la última, 950 + 550 ms). |
| AC-E7 | *(RF-E7)* Pista "Pegá 4 calcos y ganate {pct}% OFF"; premio con 4 cualesquiera. | ✅ Pista `🎁 Pegá 4 calcos y ganate 10% OFF · 0/4`, en una línea a 375. Con 4 de lugares distintos (13, 16, 5, 11) se abre "¡Ganaste 10% OFF!". |
| AC-E8 | *(RF-E8)* Pegadas seguidas con clic, en alturas distintas. | ✅ Alturas: 38,9 % → 68,6 % → 55,6 % → 80,6 %. |
| AC-E9 | *(RF-E9)* Movimiento reducido: todas en su lugar, sin loops. | ✅ 1440 con `prefers-reduced-motion`: 16 de 16 con opacidad 1 y 0 animaciones. |
| ANF-E1 | *(RNF-E1)* El celular no baja las imágenes de desktop. | ✅ Al cargar: 8 imágenes a 375, 10 a 768, 12 a 1024, 14 a 1280, 16 a 1440 — una por calco a la vista. |
| ANF-E2 | *(RNF-E2)* La próxima de cada lugar, recién con el primer toque. | ✅ 375: 8 imágenes al cargar → 17 después del primer toque (8 + la próxima de cada lugar + la nueva del lugar pegado). Antes de esta ampliación eran 8 al cargar con 4 lugares; ahora son 8 con 8. |
| ANF-E3 | *(RNF-E3)* LCP no empeora > 200 ms; CLS ≤ 0,05. | ✅ 375 px, CPU ×4, red 4G, 7 cargas de cada build alternadas: LCP mediana **2.536 → 2.312 ms**, el elemento sigue siendo el termo. CLS máx. 0,0191 → 0,0195 (viene de la barra de promo, hallazgo previo). Una carga suelta de 5,6 s en el build nuevo (el viejo llegó a 2,9 s; en la primera tanda, con los tests corriendo en paralelo, los dos pasaron de 6,8 s): se lee como ruido de la máquina, porque en el celular se piden las mismas 8 imágenes que antes. |
| ANF-E4 | Chunks. | ✅ Principal 98,76 → 99,08 kB gzip (+0,32: los datos de 16 lugares); calcos 33,25 → 33,31 kB. Medido con el mismo `.env` en los dos builds. |
| REG-E1 | Tests. | ✅ `npm test`: 769 en verde (44 archivos). |

---

## Definition of Done

### Código
- [ ] Todos los criterios de §1, §2 y §3 en ✅ (ANF-6: con el OK de Mariano) — **todo ✅ salvo ANF-6**, que espera los dispositivos reales
- [x] Todos los criterios de regresión (§4) en ✅
- [x] `npm test` en verde (743; 767 con las ampliaciones A-D; 769 con la E)
- [x] `framer-motion` importado en **un solo** archivo y fuera del chunk principal
- [x] Sin refactors fuera de scope en el diff (lo encontrado va en *Hallazgos* de `tasks.md`)
- [x] Los comentarios explican el **por qué**, con la densidad del repo

### Seguridad
- [x] Ningún secreto en el frontend ni en el bundle
- [x] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [x] `docs/CRO-EXPERIMENTS.md` actualizado (falta la fecha real del deploy)
- [x] `docs/architecture.md` y `CLAUDE.md` (regla 10) con `framer-motion` en el stack

### Proceso
- [ ] `tasks.md` con todos los pasos marcados — falta 8.4 (deploy)
- [x] Hallazgos fuera de scope anotados y reportados
- [x] Este documento recorrido punto por punto, con resultados reales
- [x] El termo real está en el commit (Q2)
- [ ] Publicado en la fecha que decidió Mariano (Q1)
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: 27/09/2026
**Ejecutada por**: Claude, con un arnés de Chrome headless (Playwright + CDP) sobre el build de producción, con las fuentes reales de Google servidas desde disco. Comparaciones contra el build anterior (`39a598c`) en las mismas condiciones.

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | 43 |
| ❌ No cumple | 1 (AN-2, criterio mal planteado) |
| ⬜ Pendiente | 1 (ANF-6 dispositivos reales) |
| ⏭️ No aplica | 1 (§6 paridad de precios) |

### Criterios no cumplidos
| ID | Qué pasó | Decisión |
|---|---|---|
| AN-2 | `experiment_view` de `hero_buscador` sigue llegando (todo `debajo`): `Home` lee el experimento a propósito y `useExperiment` reporta aunque esté apagado. | Se acepta y se documenta en `CRO-EXPERIMENTS.md` ("no leerlo"). Cambiar `useExperiment` es otro alcance: queda como hallazgo. |

### Notas
- **Antes de mergear**: Mariano mira el hero en su iPhone/Android (ANF-6) y el
  merge va desde el 3/10, después de leer `hero_titular` y `hero_buscador`.
- **Al publicar**: completar la fecha real en `docs/CRO-EXPERIMENTS.md` (AN-3).
- El LCP **mejoró** (~1,6 s → ~1,25 s): el termo es un candidato estable, y el
  anterior era una calco al azar de un JSON que se pedía después del JS.
