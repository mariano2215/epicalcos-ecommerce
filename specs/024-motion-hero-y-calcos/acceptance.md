# Acceptance — Motion: hero vivo y calcos que responden al cursor

| | |
|---|---|
| **Spec** | `024-motion-hero-y-calcos` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

> Si un criterio no está acá, no es parte de "terminado". Si está, la feature no
> se cierra hasta cumplirlo.

---

## Cómo se valida

- ✅ **Cumple** — verificado, con evidencia
- ❌ **No cumple** — con el detalle de qué pasó
- ⚠️ **Verificado de forma indirecta** — con el cómo (hover, scroll real y
  reduced-motion no se pueden probar con el browser pane oculto)
- ⏭️ **No aplica** — con el motivo

**No se marca ✅ nada que no se haya verificado.**

---

## 1. Criterios funcionales

### Hero — fondo

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* Las 5 manchas del hero del Home tienen una animación corriendo y su posición cambia entre dos lecturas separadas por 3 s. | `getAnimations()` en cada `.hero-malla__mancha` + `getBoundingClientRect()` dos veces | ⬜ |
| AC-2 | *(RF-2)* Ninguna animación de mancha dura menos de 15 s y todas tienen `animation-direction: alternate`. | `getComputedStyle` | ⬜ |
| AC-3 | *(RF-3)* Con las animaciones apagadas, la captura del hero es visualmente equivalente a la de antes (misma paleta, franja superior oscura). | capturas 0.4 vs 4.7, lado a lado | ⬜ |
| AC-4 | *(RF-4)* Con el hero fuera de pantalla, la sección tiene `data-pausado` y las manchas, el aurora y las calcos flotantes están en `paused`; al volver arriba, `running`. | scroll + `dispatchEvent('scroll')` + `animationPlayState` | ⬜ |
| AC-5 | Las 4 pantallas de pago siguen con el degradado quieto. | abrir `/pago/exito` (o equivalente) y confirmar que no hay `.hero-malla` | ⬜ |

### Hero — saludo

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-6 | *(RF-5)* La primera frase visible arriba del H1 es la de bienvenida acordada en Q2. | captura a los 0,5 s | ⬜ |
| AC-7 | *(RF-6, RF-7)* Las frases pasan de a una y al final queda visible **solo** la última. | captura a los 6 s: una sola frase con `opacity: 1` | ⬜ |
| AC-8 | *(RF-8)* `duracionSaludoMs()` ≤ 5000 y el test lo exige. | `npm test` + mirar el test | ⬜ |
| AC-9 | *(RF-9)* La posición `top` del H1 es la misma a los 0,2 s, 2 s y 6 s (al píxel), una vez terminada su propia entrada. | `getBoundingClientRect().top` | ⬜ |
| AC-10 | *(RF-10)* El saludo tiene menor tamaño de fuente y menor contraste que el H1. | `getComputedStyle` de ambos | ⬜ |
| AC-11 | *(RF-11)* En las 4 celdas (`catalogo`/`objeto` × `debajo`/`en_hero`) el H1, el subtítulo y el texto de los botones son idénticos a los de antes. | forzar cada variante por URL y comparar textos | ⬜ |

### Hero — entrada

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-12 | *(RF-12)* Los retrasos de entrada son: saludo 0, H1 0, subtítulo 120, buscador 300, botones 450 ms. | `getAnimations()` → `effect.getTiming().delay` | ⬜ |
| AC-13 | *(RF-13)* Retraso + duración de los botones ≤ 1200 ms. | ídem | ⬜ |
| AC-14 | *(RF-14)* El H1 y el subtítulo tienen `opacity: 1` en el primer cuadro (su animación no toca `opacity`). | keyframes de su animación + `getComputedStyle` inmediato | ⬜ |
| AC-15 | *(RF-15)* El retraso de los botones es 450 ms en `debajo` **y** en `en_hero`. | AC-12 en las dos variantes | ⬜ |
| AC-16 | *(RF-16)* Ir a `/categorias` y volver con el logo: la sección **no** tiene `.hero--entrada`, ninguna pieza tiene animaciones y la frase visible es la final. Recargar: `.hero--entrada` vuelve. | DOM + `getAnimations()` | ⬜ |
| AC-17 | *(RF-17)* Click en "Ver todos los diseños" a los 300 ms de cargar navega a `/categorias`. | click inmediato tras `navigate` | ⬜ |
| AC-18 | *(RF-18)* Variante `en_hero`, pasado 1 s: con el desplegable del buscador abierto, el elemento en el centro del desplegable (`elementFromPoint`) pertenece al desplegable, no a un botón. | `elementFromPoint` | ⬜ |

### Cards de calco

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-19 | *(RF-19, RF-20)* Con la regla de hover aplicada, la card entera vale `scale: 1.08` con transición de ~0,25 s. | CSSOM + forzar la regla sobre una card | ⚠️ esperado indirecto |
| AC-20 | *(RF-21)* AC-19 se cumple en `/categoria/anime` (con `grid-rise`), en un landing de uso y en los destacados del Home. | ídem en las tres | ⬜ |
| AC-21 | *(RF-22)* La card agrandada tiene `z-index` mayor que sus vecinas y su borde queda a ≥ 1 px del borde de la vecina a 1280 px. | `getBoundingClientRect()` de las dos | ⬜ |
| AC-22 | *(RF-23)* La `<img>` de la card no tiene regla de zoom propia. | `grep` + CSSOM | ⬜ |
| AC-23 | *(RF-24)* La regla de hover está dentro de `@media (hover: hover) and (pointer: fine)`. A 375 px con emulación móvil, tocar "+" no deja la card con `scale ≠ none`. | CSSOM + emulación | ⬜ |
| AC-24 | *(RF-25)* Con Tab hasta el link de una card, la card vale `scale: 1.08`. | teclado real o `:focus-visible` forzado | ⬜ |
| AC-25 | *(RF-26)* La propiedad animada es `scale` vía `transition` (reversible desde el punto medio), no un `@keyframes`. | CSSOM | ⬜ |

### Movimiento reducido

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-26 | *(RF-27)* Con reduced-motion: sin `.hero--entrada`, manchas sin animación, frase final visible y sola, cards sin `scale` en hover ni en foco, resaltado de borde presente. | simulación copiando el bloque sin la condición | ⚠️ esperado indirecto |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px el saludo entra en una línea y no hay scroll horizontal. | `scrollWidth === clientWidth`, alto del `<p>` = una línea | ⬜ |
| ANF-2 | **Performance** — el LCP mobile del Home no empeora más allá del ruido de Lighthouse (±100 ms) respecto de la medición de 0.4. | Lighthouse mobile antes/después, misma máquina | ⬜ |
| ANF-3 | **Fluidez** — las animaciones del hero solo usan `transform`, `opacity` y `scale` (ninguna `background-position`, `filter`, `width`, `top`). | revisión del CSS nuevo | ⬜ |
| ANF-4 | **Accesibilidad** — el saludo y la capa de manchas tienen `aria-hidden="true"`; el foco visible de los botones del hero sigue igual. | DOM + Tab | ⬜ |
| ANF-5 | **Sin dependencias nuevas** | `git diff frontend/package.json` sin líneas de esta spec | ⬜ |
| ANF-6 | **Sin secretos en el bundle** | no aplica: no hay variables nuevas | ⏭️ |
| ANF-7 | **Tests** — `npm test` en verde, incluido `heroSaludo.test.js`. | `npm test` | ⬜ |
| ANF-8 | **WIP ajeno intacto** — tras cada push, el WIP de la spec 023 sigue sin commitear. | `git status` | ⬜ |

---

## 3. Casos borde verificados

- [ ] Recarga del Home → la entrada se reproduce otra vez.
- [ ] Navegación interna de vuelta al Home → hero armado (AC-16).
- [ ] Recorrer 10 cards rápido con el mouse → sin saltos (a ojo, en desktop real — ⚠️ lo verifica Mariano si el pane está oculto).
- [ ] Zoom 200 % → el saludo no se superpone al H1.

---

## 4. Definition of Done

- [ ] Todos los criterios de §1 y §2 en ✅, ⚠️ con el cómo, o ⏭️ justificado.
- [ ] Corte en la serie anotado en `docs/CRO-EXPERIMENTS.md` con la fecha real.
- [ ] Hallazgos fuera de scope (`design.md` §8) comunicados a Mariano.
- [ ] Mariano vio el Home y una grilla y dio el OK visual.
- [ ] Estado de `requirements.md` actualizado.
