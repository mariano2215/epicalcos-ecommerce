# Acceptance — Motion: hero vivo y calcos que responden al cursor

| | |
|---|---|
| **Spec** | `024-motion-hero-y-calcos` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 18/09/2026 |
| **Resultado** | ✅ cards aceptadas y publicadas · ✅ hero aceptado, **esperando publicación** (Q1) en la rama local `spec-024-hero` |

> Si un criterio no está acá, no es parte de "terminado". Si está, la feature no
> se cierra hasta cumplirlo.

---

## Cómo se validó

Con un arnés propio en el scratchpad (sin dependencias): **Chrome headless
manejado por CDP**. A diferencia del browser pane oculto, este sí permite:

- **mouse real** (`Input.dispatchMouseEvent`) → el `:hover` se probó de verdad;
- **reduced-motion real** (`Emulation.setEmulatedMedia`) → no hizo falta copiar
  el bloque `@media` sin la condición;
- **touch real** (`Emulation.setTouchEmulationEnabled`) → `(hover: hover)` da
  `false`, como en un celular;
- throttling de CPU y red para medir LCP.

Los tiempos del saludo y de la entrada se midieron **dentro de la página** con
`requestAnimationFrame` y el reloj de la animación, porque las lecturas por CDP
llegan con cientos de ms de retraso mientras el dev server carga módulos (y las
animaciones de `transform`/`opacity` corren en el compositor sin esperarlas).

- ✅ **Cumple** — verificado, con evidencia
- ❌ **No cumple** — con el detalle de qué pasó
- ⚠️ **Verificado de forma indirecta** — con el cómo
- ⏭️ **No aplica** — con el motivo

---

## 1. Criterios funcionales

### Hero — fondo

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* Las 5 manchas tienen una animación corriendo y su posición cambia entre dos lecturas separadas por 3 s. | `getAnimations()` + `getBoundingClientRect()` a los ~2 s y ~5 s | ✅ 5 × `running`. A 375 px se desplazaron entre 14 y 100 px; a 1280 px entre 19 y 342 px. |
| AC-2 | *(RF-2)* Ninguna dura menos de 15 s y todas tienen `alternate`. | `effect.getTiming()` | ✅ 17, 19, 21, 23 y 24 s; las 5 `alternate`. |
| AC-3 | *(RF-3)* Con las animaciones apagadas, el hero es visualmente equivalente al de antes. | Recorte del fondo solo (sin calcos ni texto), reduced-motion, build de antes vs dev de después, a 375 y 1280 | ✅ Misma paleta y distribución (azul izq., violeta centro, rosa der., fucsia abajo, franja superior oscura). En el celular el fucsia y el naranja de abajo quedaban chicos: se subió su tamaño mínimo (ver *Hallazgos* de `tasks.md`). |
| AC-4 | *(RF-4)* Fuera de pantalla: `data-pausado` y todo en `paused`; al volver, `running`. | `scrollTo` al final y a 0, `animationPlayState` | ✅ Abajo: `data-pausado`, 5 manchas + aurora + 8 calcos en `paused`. Arriba: sin atributo, todo `running`. |
| AC-5 | Las pantallas de pago siguen quietas. | `/pago-exitoso` | ✅ Sin `.hero-malla`; `.hero-gradient` conserva sus `radial-gradient` originales. |

### Hero — saludo

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-6 | *(RF-5)* La primera frase es la bienvenida. | Muestreo por rAF | ✅ "BIENVENIDO" visible de 0,24 a 1,49 s. |
| AC-7 | *(RF-6, RF-7)* Pasan de a una y al final queda **solo** la última. | Muestreo por rAF, 6,5 s | ✅ 0,24 s "Bienvenido" → 1,74 s "Qué bueno verte por acá" → 3,24 s "Tus cosas, a tu manera" → 4,69 s "Estás en casa", que queda. Nunca dos a la vez. |
| AC-8 | *(RF-8)* `duracionSaludoMs()` ≤ 5000 y el test lo exige. | `npm test` + prueba de rotura | ✅ 5000 ms. Con una 5.ª frase el test se pone rojo (probado y deshecho). |
| AC-9 | *(RF-9)* El `top` del H1 no cambia mientras rota el saludo. | `getBoundingClientRect().top` a ~1, 2, 5 y 6,5 s | ✅ 268,8 px constante a 375 (284,8 en t0 = su propia entrada de 16 px); 324,9 px constante a 1280. |
| AC-10 | *(RF-10)* Saludo más chico y menos contrastado que el H1. | `getComputedStyle` | ✅ 12,8 px vs 32 px (375) y 15,2 px vs 60 px (1280); blanco al 80 % vs blanco pleno. |
| AC-11 | *(RF-11)* En las 4 celdas el H1, el subtítulo y los botones son idénticos a antes. | Textos extraídos de build antes vs build después, forzando cada celda por URL | ✅ Idénticos en `catalogo`/`objeto` × `debajo`/`en_hero`. |

### Hero — entrada

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-12 | *(RF-12)* Retrasos: saludo 0, H1 0, subtítulo 120, buscador 300, botones 450 ms. | `effect.getTiming().delay` | ✅ Exactos. |
| AC-13 | *(RF-13)* Retraso + duración de los botones ≤ 1200 ms. | ídem + rAF | ✅ 450 + 600 = 1050 ms; medidos con opacidad 1 a los ~990 ms. |
| AC-14 | *(RF-14)* H1 y subtítulo con `opacity: 1` en el primer cuadro. | Keyframes + `getComputedStyle` en t0 | ✅ `hero-sube` no tiene `opacity` en sus keyframes; opacidad `1` en t0. |
| AC-15 | *(RF-15)* Botones a 450 ms en `debajo` **y** en `en_hero`. | AC-12 en las dos | ✅ 450 en las dos. |
| AC-16 | *(RF-16)* Volver con el logo: sin `.hero--entrada`, sin animaciones y frase final. Recargar: vuelve. | Click real al logo desde `/categorias`, después `Page.reload` | ✅ Vuelta: sin clase, 0 animaciones en las piezas, solo "Estás en casa". Recarga: `.hero--entrada` presente. |
| AC-17 | *(RF-17)* Click en el CTA durante la entrada navega. | Desde la página, en el primer cuadro con los botones entre 0 y 0,6 de opacidad: `elementFromPoint` + click | ✅ Con el botón al 11 % de opacidad, el punto cae en el link y navega a `/categorias`. |
| AC-18 | *(RF-18)* `en_hero`, pasado 1 s: el desplegable queda sobre los botones. | Escribir "anime" en el buscador del hero, `elementFromPoint` en un punto de la lista que cae encima de los botones | ✅ Lo que está en ese punto es un ítem de la lista. |

### Cards de calco

> ⚠️ **Cambio de valor durante la implementación**: `1.08` → **`1.075`**. Con
> 8 % justo, AC-21 fallaba en el Home (ver *Hallazgos* de `tasks.md`). 7,5 %
> sigue dentro del "alrededor de un 8 %" de RF-20.

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-19 | *(RF-19, RF-20)* Con el cursor encima, la card entera vale `scale: 1.075`, con transición de ~0,25 s. | **Mouse real** por CDP | ✅ `none` → `1.075` → `none`. |
| AC-20 | *(RF-21)* Igual en categoría (`grid-rise`), landing de uso y destacados del Home. | Ídem en `/categoria/anime`, `/calcos-termo` y `/` (las dos variantes de buscador) | ✅ Las tres. En categoría y landing la card está dentro de `grid-rise`. |
| AC-21 | *(RF-22)* La agrandada tiene `z-index` mayor y queda a ≥ 1 px de la vecina a 1280 px. | `getBoundingClientRect()` de las dos | ✅ `z-index: 2`. Hueco: 5,1 px en categoría/landing y 1,5 px en el Home (el peor caso: cards de 281 px). |
| AC-22 | *(RF-23)* La `<img>` no tiene zoom propio. | `grep` + `transform` de la img con hover | ✅ Sin `scale-105`; `transform: none` con el cursor encima. |
| AC-23 | *(RF-24)* Hover dentro de `(hover: hover) and (pointer: fine)`; en un celular, tocar "+" no deja la card agrandada. | Touch emulado + `touchStart`/`touchEnd` sobre el "+" | ✅ `matchMedia` da `false`; la card queda en `none` aunque `:hover` haga match. |
| AC-24 | *(RF-25)* Con teclado, al enfocar la card, `scale: 1.075`. | Tecla real + foco al link | ✅ `:focus-visible` true, `scale: 1.075`. |
| AC-25 | *(RF-26)* Se anima `scale` con `transition` (reversible a mitad de camino). | Mouse adentro 110 ms y afuera, muestreando cada 30 ms | ✅ 1.068 → 1.030 → 1.019 → … → `none`, sin saltos, en las tres grillas. |

### Movimiento reducido

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-26 | *(RF-27)* Sin entrada, manchas quietas, frase final sola, cards sin crecer y con resaltado. | **Reduced-motion emulado de verdad** por CDP | ✅ Sin `.hero--entrada`, 0 animaciones en las manchas, solo "Estás en casa" visible. Card con el cursor encima: `scale: none`, borde fucsia. |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px el saludo en una línea y sin scroll horizontal. | Alto del saludo vs `line-height`; `scrollWidth ≤ clientWidth` | ✅ 16,6 px = una línea. Sin scroll horizontal en las dos variantes. El hero creció 32,6 px (la línea del saludo + su margen), como preveía RNF-1. |
| ANF-2 | **Performance** — el LCP mobile del Home no empeora. | ⚠️ **Sin Lighthouse** (no está instalado): LCP medido con `PerformanceObserver` en Chrome headless, 375 px, CPU 4×, 150 ms RTT / 1,6 Mbps, build de producción antes vs después, gzip | ✅ Medianas antes → después: `debajo` 3452 → 3120 ms y 2952 → 2964 ms (dos tandas de 7); `en_hero` 4020 → 3004 ms (5). El elemento LCP es la calco flotante del hero en los dos casos. La varianza es grande (2,2–6 s) porque la calco es aleatoria: la lectura honesta es **"no empeora"**, no "mejora". |
| ANF-3 | **Fluidez** — el hero anima solo `transform`, `opacity` y `scale`. | Revisión del CSS nuevo | ✅ Manchas: `transform`. Saludo y piezas: `opacity` + `transform`. Sin `filter`, `background-position` ni propiedades de layout. |
| ANF-4 | **Accesibilidad** — saludo y manchas con `aria-hidden`; foco de los botones igual. | DOM + foco de teclado en el CTA, antes vs después | ✅ Los dos con `aria-hidden="true"`. Anillo de foco idéntico en las 4 celdas. ⚠️ No se probó con VoiceOver. |
| ANF-5 | **Sin dependencias nuevas** | `git diff` de los commits de la spec | ✅ Ningún commit de la 024 toca `package.json` (el cambio que tiene el árbol es WIP de la spec 023). |
| ANF-6 | **Sin secretos en el bundle** | — | ⏭️ No hay variables nuevas. |
| ANF-7 | **Tests** | `npm test` | ✅ 597 en el árbol (591 + 6 de `heroSaludo.test.js`). En la rama `spec-024-hero` sola, sin el WIP de la 023: ver `tasks.md` 5.3. |
| ANF-8 | **WIP ajeno intacto** tras cada push | `git status` / `git diff --cached` | ✅ Tras los pushes siguen los 4 borrados stageados y los archivos modificados de la spec 023. |

---

## 3. Casos borde verificados

- [x] Recarga del Home → la entrada vuelve (AC-16).
- [x] Navegación interna de vuelta al Home → hero armado (AC-16).
- [x] Salir del hover a mitad de camino → vuelve sin saltos (AC-25). ⚠️ La
      "sensación" de recorrer 10 cards rápido con un mouse físico la tiene que
      mirar Mariano.
- [x] Zoom 200 % (viewport de 188 px) → el saludo parte en 3 líneas y **no** se
      superpone al H1 (termina en 323 px, el H1 empieza en 339 px).

---

## 4. Definition of Done

- [x] Todos los criterios de §1 y §2 en ✅, ⚠️ con el cómo, o ⏭️ justificado.
- [ ] Corte en la serie anotado en `docs/CRO-EXPERIMENTS.md` con la fecha real —
      **se hace al publicar el hero** (Fase 6 de `tasks.md`).
- [x] Hallazgos fuera de scope comunicados a Mariano.
- [ ] Mariano vio el Home y una grilla y dio el OK visual.
- [ ] Estado de `requirements.md` en `DONE` — cuando el hero esté publicado.
