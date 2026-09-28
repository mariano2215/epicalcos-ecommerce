# Tasks — Hero con termo y calcos animadas

| | |
|---|---|
| **Spec** | `028-hero-termo-stickers` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `IMPLEMENTADA EN LA RAMA` (27/09/2026) — falta 8.4 (deploy desde el 3/10 y OK en el celular) |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 028"*.
Ver [`specs/README.md`](../README.md).

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] Mariano contestó Q1 (cuándo se publica), Q2 (el termo) y Q3 (reemplazo o A/B)
- [x] **Mariano pidió explícitamente la implementación** — 27/09/2026: *"Implementá la spec 028 y ya está en images la webp del termo, sacale el fondo blanco"*

---

## Cómo usar esta lista

- Los pasos van **en orden**. Cada uno deja el repo en un estado coherente.
- **Sin refactors de oportunidad** (`CLAUDE.md` regla 8): lo que aparezca fuera
  de scope se anota en *Hallazgos*, no se arregla.
- Si una task resulta estar mal planteada, **se para y se avisa**.

---

## Fase 0 — Preparación

- [x] **0.1** Releer `Hero.jsx`, `Home.jsx`, el bloque del hero y el de
      reduced-motion de `index.css`, `lib/experiments.js`, `lib/heroVariantes.js`
      y sus tests.
  - *Verificación*: sé qué hace cada pieza y por qué (comentarios incluidos)
- [x] **0.2** `npm ci` en la raíz y en `frontend/`, y `npm test` en verde
  - *Verificación*: todos los tests pasan (731 al 27/9/2026) — ✅ 731 → 743 al terminar (−6 del saludo, +18 de `heroTermo.test.js`)
- [x] **0.3** Medir el **antes**: LCP y CLS del Home a 375 px con CPU ×4 (5
      corridas) y capturas a 375, 390, 768, 1024 y 1440
  - *Verificación*: números y capturas guardados en el scratchpad — ✅ LCP 1480-1696 ms (mediana según la corrida; el elemento LCP era una calco flotante al azar), CLS ≤ 0,013
- [x] **0.4** Confirmar que se trabaja en `claude/lucid-albattani-1cjjn2`
  - *Verificación*: `git branch --show-current` no dice `main`

---

## Fase 1 — Assets

- [x] **1.1** Copiar las 4 calcos elegidas (Q2) a
      `frontend/public/images/hero/calco-{1..4}.webp`
  - *Verificación*: 4 archivos, cada uno ≤ 30 kB, con alfa (`VP8X` + `ALPH`) — ✅ 9,9 / 12,1 / 27,3 / 15,0 kB
- [x] **1.2** Si llegó el termo: convertirlo a `termo.webp` con alfa, ≤ 120 kB y
      ≤ 900 px de alto. Anotar sus medidas reales para `width`/`height`.
  - *Verificación*: `file termo.webp` muestra las medidas; el peso cumple RNF-3 — ✅ 172×516, 7,8 kB (ver bitácora)

---

## Fase 2 — Datos y tests (`lib/heroTermo.js`)

- [x] **2.1** Escribir `lib/heroTermo.test.js` con los guardarraíles de
      `design.md` §9. Correrlo: tiene que fallar (no existe el módulo).
  - *Verificación*: falla por el import, no por otra cosa
- [x] **2.2** Escribir `lib/heroTermo.js`: `COPY_HERO`, `TERMO`, `CALCOS` (slot,
      src, entrada, loop, parallax, capa) y `duracionEntradaMs()`
  - *Verificación*: `heroTermo.test.js` en verde

---

## Fase 3 — Las calcos (`components/hero/HeroCalcos.jsx`)

- [x] **3.1** Componente con `LazyMotion features={domAnimation} strict` +
      `MotionConfig reducedMotion="user"` + las 4 calcos de `CALCOS` (dos
      elementos cada una: parallax y entrada/hover)
  - *Verificación*: `grep -rn "framer-motion" frontend/src` → solo este archivo
- [x] **3.2** Parallax: 2 resortes compartidos + `useTransform` por calco;
      `pointermove`/`pointerleave` sobre la sección, solo con puntero fino y sin
      movimiento reducido
  - *Verificación*: con mouse, la calco 4 se mueve ~12 px al llevar el cursor al
    borde; la 3 casi nada; con touch emulado no hay listener
- [x] **3.3** Prop `entrada`: con `false`, `initial={false}`
  - *Verificación*: navegar a otra ruta y volver → calcos ya en su lugar
- [x] **3.4** `onError` por calco → se oculta
  - *Verificación*: con una ruta rota, no aparece ícono de imagen rota

---

## Fase 4 — El hero (`Hero.jsx` + `index.css`)

- [x] **4.1** `index.css`: bloque `.hero-termo*` / `.hero-calco*` (layout de
      §1.1, termo de §1.2, loops con `translate`), `[data-pausado]` y
      reduced-motion ampliados, retrasos de subtítulo (100 ms) y botones (200 ms)
  - *Verificación*: el CSS nuevo no edita ninguna regla de `.hero-gradient`,
    `.btn-*` ni `.sticker-float`
- [x] **4.2** `Hero.jsx`: layout copy + escena, termo con `fetchpriority`,
      `lazy(HeroCalcos)` dentro de `ErrorBoundary` + `Suspense`, copy de
      `heroTermo.js`, botones con `uppercase`. Se quedan la bandera, el
      `IntersectionObserver`, `conBuscador` y `trackCustomStickerClick('hero')`.
  - *Verificación*: el build genera un chunk aparte con `framer-motion`, y el
    chunk principal no crece más de 1 kB gzip — ✅ `HeroCalcos` 30,0 kB; principal 97.607 → 98.004 B (+0,4 kB)
- [x] **4.3** Sacar `StickerField` y el saludo del hero; borrar
      `lib/heroSaludo.js`, su test y el bloque `.hero-saludo*` de `index.css`
  - *Verificación*: `grep -rn "hero-saludo\|heroSaludo" frontend/src` → vacío
- [x] **4.4** Reescribir el comentario de cabecera de `Hero.jsx`: qué se fue y
      por qué (StickerField, saludo, experimentos), el LCP del termo, por qué
      Framer Motion va en un chunk aparte
  - *Verificación*: los ⚠️ que siguen valiendo (bandera, `data-pausado`,
    `conBuscador`) siguen explicados

---

## Fase 5 — Experimentos

- [x] **5.1** `experiments.js`: `hero_titular` y `hero_buscador` →
      `active: false`, con comentario "cerrado con la spec 028; el hero ya no lo
      lee"
  - *Verificación*: `npm test` en verde (`heroVariantes.test.js` incluido)
- [x] **5.2** Forzar `?exp_hero_buscador=en_hero` y comprobar que hay
      exactamente **un** buscador (el kill switch manda a control)
  - *Verificación*: un solo buscador, en su sección

---

## Fase 6 — Verificación

- [x] **6.1** `npm test` y `npm run build --prefix frontend`, sin warnings nuevos
- [x] **6.2** Capturas a 375, 390, 768, 1024 y 1440: en reposo y a mitad de la
      entrada. Ajustar posiciones y tamaños hasta cumplir RF-1 a RF-5.
  - *Verificación*: capturas del **después** junto a las del antes
- [x] **6.3** Arnés en Chrome headless: `scrollWidth === clientWidth`; ninguna
      calco se cruza con el H1, la bajada ni los botones; consola limpia
- [x] **6.4** LCP y CLS del **después** (mismas condiciones que 0.3)
  - *Verificación*: cumple RNF-1 y RNF-2
- [x] **6.5** Movimiento reducido emulado por CDP: sin loops, sin parallax, todo
      en su lugar
- [x] **6.6** Perfil de rendimiento con CPU ×4 scrolleando el Home (RNF-4)

---

## Fase 7 — Documentación

- [x] **7.1** `docs/CRO-EXPERIMENTS.md`: cierre de `hero_titular` y
      `hero_buscador`, y corte en la serie (fecha real del deploy)
  - ⚠️ La fecha real se completa al publicar: hoy dice "completar al publicar".
- [x] **7.2** `docs/architecture.md` y `CLAUDE.md` regla 10: `framer-motion` en
      el stack, **solo en el chunk del hero**

---

## Fase 8 — Cierre

- [x] **8.1** Recorrer `acceptance.md` punto por punto con resultados reales
- [x] **8.2** Reportar hallazgos y lo que no se pudo probar (Safari/iOS reales)
- [x] **8.3** Commit + push a la rama. **No a `main`**: el merge espera Q1
      (desde el 3/10) y el OK de Mariano en su celular (`design.md` §8)
- [ ] **8.4** Estado de la spec en `DONE` recién después del deploy y del OK de
      Mariano en su celular

---

## Ampliación A — Pegar las calcos en el termo

> ⛔ Se ejecuta solo cuando Mariano apruebe la ampliación y lo pida
> explícitamente. Mismo PR, antes del merge. Diseño: `design.md` §12.

- [x] **A.0** Mariano pidió la implementación (28/9: *"Haz esto en preview…"*); Q4-Q6 con las propuestas

### Fase A1 — Datos y tests
- [x] **A1.1** Tests nuevos en `heroTermo.test.js` (destinos, cuerpo, `ajustarAlCuerpo`); tienen que fallar
  - *Verificación*: fallan por lo que falta, no por otra cosa
- [x] **A1.2** `TERMO.cuerpo`, `DESTINOS_PEGADO`, `ANCHO_PEGADA`, `dentroDelCuerpo`, `ajustarAlCuerpo` en `heroTermo.js`
  - *Verificación*: `npm test` en verde

### Fase A2 — Interacción (`HeroCalcos.jsx`)
- [x] **A2.1** Estados por calco en `HeroCalcos`; `data-juego` en la sección al montar
- [x] **A2.2** Arrastre con mouse: umbral 4 px, captura del puntero, parallax congelado, `jump()`
  - *Verificación*: arrastrada, la calco queda exactamente bajo el cursor (± 1 px)
- [x] **A2.3** Soltar: pegar si el centro cae en el cuerpo; si no, vuelve con resorte
- [x] **A2.4** Clic / toque: vuelo al destino y pegado al terminar
  - *Verificación*: scroll con el dedo empezando sobre una calco → la página scrollea y no se pega
- [x] **A2.5** Capa de pegadas con máscara y apretón; agarrar una pegada; clic en una pegada la despega
- [x] **A2.6** `data-pegada` + `trackHeroStickerStick` al pegar

### Fase A3 — Hero, CSS y analytics
- [x] **A3.1** La pista en `Hero.jsx` (lugar reservado, dos textos por CSS)
- [x] **A3.2** CSS: `.hero-termo__pegadas`, `.hero-calco-pegada`, `[data-arrastrando]`, cursores, `pointer-events` en táctil, pista, reduced-motion
- [x] **A3.3** `trackHeroStickerStick` en `lib/analytics.js` (solo se suma) + `docs/analytics.md`
  - *Verificación*: `git diff lib/analytics.js` solo agrega líneas

### Fase A4 — Verificación y cierre
- [x] **A4.1** `npm test`, build; chunk de calcos ≤ +3 kB gzip; chunk principal sin cambios — ✅ 749 tests; calcos +1,9 kB; principal +0,3 kB (la función de analytics y la pista, ver acceptance)
- [x] **A4.2** Arnés: arrastrar adentro / afuera / sobre un botón, clic, toque, scroll táctil, re-arrastre, despegar, movimiento reducido, `dataLayer`, fps arrastrando
- [x] **A4.3** Barrido de geometría de nuevo (la pista suma altura): nada tapa el texto
- [x] **A4.4** `acceptance.md` §7 con resultados reales; commit + push al PR

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| A 320 px el Home tiene 5 px de scroll horizontal (emulación mobile). **Ya estaba antes**: el build previo mide lo mismo (325/320). El único elemento en ese rango es una mancha de `.hero-malla` (spec 024), que está dentro de un `overflow: hidden`. | `styles/index.css` (malla) | Investigar aparte; afecta a muy pocos equipos (320 px). |
| Si las fuentes de Google no cargan, el header a 1024 px se sale 25 px (el botón del carrito). Con Montserrat/Inter cargadas entra justo. | `components/Header.jsx` | Dejar que el nav se achique (`min-width: 0` / `gap` menor en `lg`). |
| `useExperiment` manda `experiment_view` aunque el experimento esté apagado (con la variante de control). Infla las exposiciones de los tests pausados. | `lib/experiments.js` | Decidir si un test apagado debe reportar exposición. Documentado en `CRO-EXPERIMENTS.md`. |
| `heroVariantes.js` ya solo se usa por `ubicacionBuscador`; `TITULARES` y `CTA_PRINCIPAL` quedan como registro. | `lib/heroVariantes.js` | Limpiar cuando se decida que `hero_titular` no vuelve. |
| La prop `eagerFirst` de `StickerField` quedó sin uso (solo la pasaba el hero). | `components/StickerField.jsx` | Sacarla en otro cambio. |
| La barra de promo anima `left` en su `::after` (el brillo que la cruza): el navegador lo cuenta como corrimiento de layout. Es **todo** el CLS del Home (0,013-0,02 en cada carga; en una corrida del build viejo, 0,35). | `styles/index.css` (`.promo-banner::after`, `relampago-barrido`) | Animar con `transform: translateX()` en vez de `left`: mismo efecto, CLS 0. |
| En 375×812, sin scrollear, el botón flotante "10% OFF" (spec 026) queda encima de la calco 2 y el de WhatsApp cerca de la 4: un toque ahí abre el popup en vez de pegar la calco. Con un poco de scroll las cuatro quedan libres. | `WelcomePopup` / botón flotante | Mirarlo en el celular; si molesta, correr las dos calcos de abajo o el botón. |
| El `sitemap.xml` commiteado está desactualizado (faltan 11 categorías); Netlify lo regenera en cada build. | `frontend/public/sitemap.xml` | Commitear el regenerado en un cambio aparte. |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 27/9 | **El termo sale de `antes-despues-termo.webp`**, recortado a solo el termo (sin "ANTES"/"DESPUÉS", emojis ni logo) y sin el fondo claro. Mitad liso, mitad con calcos. | Pedido de Mariano. El fondo se sacó con un mate por píxel (alfa por proyección contra el color del termo más cercano): con un umbral fijo quedaba un filo claro de 1 px en la tapa y la base, que sobre el fondo oscuro del hero se veía. |
| 27/9 | **Termo reemplazado por la foto que mandó Mariano**: un termo liso con manija, 388×516 sobre blanco → recortado a 172×516, 7,8 kB. Mismo mate por píxel; los brillos casi blancos de la tapa y la base no se tocan porque están encerrados (no se conectan con el fondo del borde). Alt: "Termo liso, listo para personalizar con calcos". | Liso le va mejor al titular: es el termo que "pide calcos", y las cuatro de alrededor son las que le faltan. De paso deja de repetirse la foto de Antes/Después. ⚠️ La foto es chica: en pantallas retina se ve un poco suave; si hay una versión más grande, conviene cambiarla. |
| 27/9 | **Calcos: `bandera-1` → `pumas-1` y `fernet-1` → `ruta-40-1`.** Se quedan `mate-1` y `carpincho-1`. | Mirándolas: la bandera es un rectángulo liso que no se lee como calco, y el fernet (vaso oscuro) se pierde contra el fondo oscuro. |
| 27/9 | **Calco 3: arranca a 250 px** (el valor del pedido), no 320/160. | En un celular ya arranca fuera de la pantalla; en desktop entra desde el costado mientras aparece. Un solo valor, sin ramas por ancho. |
| 27/9 | **Posiciones contra el borde del termo** (`--medio-termo`, calculado con la proporción del termo) en vez de porcentajes del ancho de la escena. | Primera captura: en 1440 las calcos 2 y 4 quedaban lejos del termo y no daban profundidad. El termo escala con el alto y la escena con el ancho: con porcentajes no se pueden acompañar. |
| 27/9 | **`xl`: calcos 1 y 3 a 360 px del centro**, medido con Montserrat (la línea más ancha del H1 llega a 300 px). | El primer intento mezclaba `left` (de `md`) y `right` (de `xl`): ganaba `left` y la calco 3 quedaba encima de los botones. Lo detectó el arnés de geometría. |
| 27/9 | **Escena en desktop: 40svh** (no 44svh), calcos un poco más grandes en todos los anchos. | Con 40svh, en 1440×900 el hero entero entra en la primera pantalla. Las calcos a 768 se veían chicas al lado del termo. |
| 27/9 | **Los retrasos de las calcos cuentan desde que arranca el hero**, no desde que llega su chunk (se adelantan hasta 300 ms). | Medido cuadro a cuadro: el chunk monta 160-490 ms después del hero y la última calco terminaba a 1,6 s (RF-18 pide ≤ 1,5). Con el ajuste: 1,30-1,49 s. El tope de 300 ms mantiene el escalonado aunque el chunk tarde. |
| 27/9 | **El hover va en el `div` de la calco, no en la `img`.** | Al soltar el hover, Framer Motion vuelve con la `transition` del elemento; en la `img` esa transición tiene el retraso de la entrada. |
| 27/9 | **Sombra del termo al 0,45**, no al 0,12 del pedido. | Sobre un fondo casi negro, 0,12 no se ve. |
| 27/9 | **Retraso del buscador en el hero: 300 → 150 ms.** | Con los botones a 200 ms, el buscador (que va arriba de ellos) tiene que salir antes. |
| 28/9 | **Ampliación A implementada** con las propuestas de Q4-Q6. | Pedido de Mariano: verla en el deploy preview. |
| 28/9 | **Resorte del vuelo con `restDelta`/`restSpeed` en píxeles** (0,5 px / 10 px/s). La escala va con otro resorte, con los valores de fábrica. | Medido: con los de fábrica (0,001) el resorte tardaba más de 1 s en darse por quieto después de llegar, y la última calco se pegaba 1,3 s después del clic. Ahora: 570 ms. |
| 28/9 | **La pista baja la escena**: `margin-top` de la escena 1,75 → 1 rem (mobile) y 2,25 → 1,5 rem (md); calcos 1 y 3 en `xl` suben 25 px (−315 / −275 px). | La pista ocupa su lugar siempre (sin salto): la escena se acerca para compensar y las de `xl` siguen a la altura del titular. |
| 28/9 | **FPS del arrastre medidos con el fondo apagado.** | Este Chrome sin GPU dibuja el fondo con blur a ~13 fps aunque no se toque nada. Sin el fondo: 60 en reposo y 60 arrastrando. |
| 27/9 | **AN-2 estaba mal planteado**: `experiment_view` de `hero_buscador` sigue llegando (todo `debajo`). | `Home` sigue leyendo el experimento a propósito (RN-5) y `useExperiment` reporta aunque esté apagado. Documentado en `CRO-EXPERIMENTS.md`. |
