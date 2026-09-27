# Acceptance — Hero con termo y calcos animadas

| | |
|---|---|
| **Spec** | `028-hero-termo-stickers` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

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
| AC-1 | *(RF-1)* El termo es el elemento más grande del hero, centrado, sin deformar. | Capturas a 375, 390, 768, 1024, 1440; `getBoundingClientRect` del termo vs. las calcos | ⬜ |
| AC-2 | *(RF-2, RF-3)* Cuatro calcos en sus cuadrantes; al menos una delante y una detrás del termo. | Capturas + `z-index` computado | ⬜ |
| AC-3 | *(RF-4)* Ninguna calco se cruza con el H1, la bajada ni los botones, de 360 a 1920 px. | Arnés: intersección de rectángulos cada 40 px de ancho, al terminar la entrada | ⬜ |
| AC-4 | *(RF-5)* Sin scroll horizontal y sin calcos cortadas al terminar la entrada. | Arnés: `scrollWidth === clientWidth`; rectángulo de cada calco dentro del viewport | ⬜ |
| AC-5 | *(RF-6)* En desktop el hero ocupa ~la altura de la pantalla; en mobile, la del contenido. | Captura 1440×900 y 375×812 | ⬜ |
| AC-6 | *(RF-7 a RF-10)* Copy exacto; "VER CALCOS" → `/categorias`, "HACER LOS MÍOS" → `/personalizados`; el secundario se oculta si `personalizados` está en `HIDDEN_SECTIONS`. | DOM + clic en cada botón | ⬜ |
| AC-7 | *(RF-11)* Los dos botones se ven en 375 px. | Captura | ⬜ |
| AC-8 | *(RF-12)* El termo crece al entrar y después no se mueve más. | Dos capturas a 2 s y 6 s: misma posición y tamaño | ⬜ |
| AC-9 | *(RF-13, RF-14)* La calco 1 oscila ~15 px en ~4 s; la 2 queda a ~8° y oscila ~8 px en ~5 s. | Estilo computado + `getAnimations()` | ⬜ |
| AC-10 | *(RF-15)* La calco 3 entra desde la derecha, girando, y queda quieta. | Capturas a 0,3 s, 0,8 s y 3 s | ⬜ |
| AC-11 | *(RF-16, RF-17)* Con el cursor en el borde, la calco 4 se desplaza ~12 px y las otras entre ~1,5 y ~3,5 px, todas distintas; el termo, 0. | Arnés: `Input.dispatchMouseEvent` + medición | ⬜ |
| AC-12 | *(RF-18)* Orden de entrada titular → bajada → botones → termo → calcos, todo antes de 1,5 s. | Capturas cada 100 ms | ⬜ |
| AC-13 | *(RF-19, RF-20)* Los botones responden a un clic a los 50 ms; el H1 y la bajada tienen opacidad 1 desde el primer cuadro. | Arnés: clic temprano + `getComputedStyle().opacity` en el primer cuadro | ⬜ |
| AC-14 | *(RF-21)* Con mouse, hover sobre una calco la agranda y la gira un poco; con touch emulado, no. | Arnés con `hover: hover` y con `Emulation.setTouchEmulationEnabled` | ⬜ |
| AC-15 | *(RF-22)* Ninguna calco está encima de un elemento clickeable. | `elementFromPoint` en el centro de cada botón devuelve el botón | ⬜ |
| AC-16 | *(RF-23)* Volver al Home navegando dentro del sitio muestra el hero armado; recargar repite la entrada. | Navegación con el router | ⬜ |
| AC-17 | *(RF-24)* Con el hero fuera de pantalla, los loops de las calcos están en pausa. | Scroll + `animationPlayState` | ⬜ |
| AC-18 | *(RF-25, RF-26)* En 375 px el orden es copy → botones → escena, y no hay listener de `pointermove`. | Captura + `getEventListeners` (CDP) | ⬜ |
| AC-19 | *(RF-28)* Con movimiento reducido: sin loops, sin parallax, sin entrada desde la derecha; composición completa. | `Emulation.setEmulatedMedia` | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | *(RNF-1)* CLS del Home ≤ 0,05 a 375 px. | Arnés, CPU ×4, 5 corridas | ⬜ |
| ANF-2 | *(RNF-2)* LCP a 375 px no empeora más de 200 ms (mediana, mismas condiciones que el antes). | Arnés, antes vs. después | ⬜ |
| ANF-3 | *(RNF-3)* Termo ≤ 120 kB, cada calco ≤ 30 kB; el chunk principal no crece más de 1 kB gzip; `framer-motion` solo en un chunk aparte. | `ls -l`, salida de `vite build` | ⬜ |
| ANF-4 | *(RNF-4)* Sin tareas largas (> 50 ms) causadas por el hero al scrollear con CPU ×4. | Perfil de rendimiento | ⬜ |
| ANF-5 | *(RNF-5)* Calcos con `alt=""` y ocultas para lectores de pantalla; termo con `alt` descriptivo; botones ≥ 44 px de alto y con foco visible; contraste AA. | DOM + árbol de accesibilidad (CDP) + medición | ⬜ |
| ANF-6 | *(RNF-6)* Chrome, Safari, Firefox, iOS Safari y Chrome Android: misma composición. | Chrome: arnés. **El resto, Mariano en dispositivos reales** | ⬜ |
| ANF-7 | *(RNF-7)* Sin termo o sin una calco, el hero no cambia de altura ni muestra imagen rota. | Renombrar el asset temporalmente | ⬜ |
| ANF-8 | *(RNF-8)* Sin errores ni warnings nuevos en consola (dev y build). | Arnés + salida del build | ⬜ |

---

## 3. Edge cases

| ID | Caso | Resultado esperado | Resultado |
|---|---|---|---|
| EC-1 | 320 px | Sin scroll horizontal, botones usables | ⬜ |
| EC-2 | 1920 px | Composición centrada, ≤ 880 px de escena | ⬜ |
| EC-3 | 1366×650 | Botones arriba del fold; calcos enteras | ⬜ |
| EC-4 | 768 px en vertical | Ninguna calco sobre el texto | ⬜ |
| EC-5 | Cursor sale de la ventana | Las calcos vuelven al reposo | ⬜ |
| EC-6 | Chunk de las calcos bloqueado (CDP `Network.setBlockedURLs`) | Hero con texto, botones y termo; sin error en pantalla | ⬜ |
| EC-7 | Movimiento reducido cambia con la página abierta | Loops y parallax se apagan sin recargar | ⬜ |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | `npm test` en verde (todo lo que había + `heroTermo.test.js`) | ⬜ |
| REG-2 | `npm run build --prefix frontend` sin errores | ⬜ |
| REG-3 | Con `?exp_hero_buscador=en_hero` hay exactamente un buscador en la Home | ⬜ |
| REG-4 | "HACER LOS MÍOS" sigue mandando `custom_sticker_click` con `origen: 'hero'` | ⬜ |
| REG-5 | Las páginas de pago (mismo fondo) se ven igual que antes | ⬜ |
| REG-6 | `PromoBanner` y `Categorias` siguen mostrando su `StickerField` | ⬜ |
| REG-7 | Carrito, checkout y navegación: agregar al carrito y llegar al checkout desde el Home | ⬜ |
| REG-8 | `title`, meta description y JSON-LD del Home sin cambios | ⬜ |

---

## 5. Analytics

| ID | Criterio | Resultado |
|---|---|---|
| AN-1 | Sin eventos nuevos; `custom_sticker_click` intacto (REG-4) | ⬜ |
| AN-2 | El Home ya no manda `experiment_view` de `hero_titular` ni `hero_buscador` | ⬜ |
| AN-3 | `docs/CRO-EXPERIMENTS.md` tiene el corte con la fecha real del deploy | ⬜ |

---

## 6. ⚠️ Paridad de precios

⏭️ No aplica: la feature no toca precios, promos ni envíos.

---

## Definition of Done

### Código
- [ ] Todos los criterios de §1, §2 y §3 en ✅ (ANF-6: con el OK de Mariano)
- [ ] Todos los criterios de regresión (§4) en ✅
- [ ] `npm test` en verde
- [ ] `framer-motion` importado en **un solo** archivo y fuera del chunk principal
- [ ] Sin refactors fuera de scope en el diff
- [ ] Los comentarios explican el **por qué**, con la densidad del repo

### Seguridad
- [ ] Ningún secreto en el frontend ni en el bundle
- [ ] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [ ] `docs/CRO-EXPERIMENTS.md` actualizado
- [ ] `docs/architecture.md` y `CLAUDE.md` (regla 10) con `framer-motion` en el stack

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope anotados y reportados
- [ ] Este documento recorrido punto por punto, con resultados reales
- [ ] El termo real está en el commit (Q2)
- [ ] Publicado en la fecha que decidió Mariano (Q1)
- [ ] Estado de la spec en `DONE`

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
