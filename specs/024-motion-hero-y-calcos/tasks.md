# Tasks — Motion: hero vivo y calcos que responden al cursor

| | |
|---|---|
| **Spec** | `024-motion-hero-y-calcos` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 024"*.
Ver [`specs/README.md`](../README.md).

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] Mariano contestó Q1 (cuándo sale el hero) y Q2 (copy del saludo), o
      aceptó los valores por defecto
- [ ] **Mariano pidió explícitamente la implementación**

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `Hero.jsx`, `StickerCard.jsx`, el bloque "Motion graphics"
      y el de reduced-motion de `index.css`, `lib/heroVariantes.js` y su test.
  - *Verificación*: sé qué experimentos corren en el hero y por qué.
- [ ] **0.2** Suite en verde antes de empezar.
  ```bash
  npm test
  ```
  - *Verificación*: todos pasan. Anotar el número (el árbol tiene tests nuevos
    de la spec 023 sin commitear: el número puede no ser 210).
- [ ] **0.3** `git status` + `git diff` de `Hero.jsx`, `StickerCard.jsx`,
      `index.css`, `docs/CRO-EXPERIMENTS.md`.
  - *Verificación*: ninguno tiene cambios ajenos. Si alguno tiene, **parar y
    avisar**.
- [ ] **0.4** Captura "antes": Home a 375 px y a 1280 px, y `/categoria/anime`
      a 1280 px. Lighthouse mobile del Home (LCP).
  - *Verificación*: capturas + LCP anotados en `acceptance.md`.

---

## Fase 1 — Card de calco (commit 1)

- [ ] **1.1** `index.css`: bloque `.sticker-card` (§1.6), con `:hover` dentro
      de `@media (hover: hover) and (pointer: fine)` y `:has(:focus-visible)`
      en una regla aparte.
  - *Verificación*: el CSS usa `scale`, no `transform`; son dos reglas, no una
    lista con coma.
- [ ] **1.2** `index.css`: en el bloque final de reduced-motion, `.sticker-card`
      sin transición de `scale` y `scale: none` en hover y en foco (reglas
      separadas).
- [ ] **1.3** `StickerCard.jsx`: `card-glass-hover` → `sticker-card`; la
      `<img>` pierde `transition-transform duration-500 hover:scale-105`;
      reescribir el comentario de `p-2`.
  - *Verificación*: `grep -n "scale-105\|card-glass-hover" frontend/src/components/StickerCard.jsx` → vacío.
- [ ] **1.4** Verificar en el navegador (`/categoria/anime`, un landing de uso y
      el Home): `getComputedStyle(card).scale` con la regla de hover aplicada
      vale `1.08` **en las tres grillas**, incluida la de `grid-rise`.
- [ ] **1.5** `npm test` en verde.
- [ ] **1.6** Commit 1 (solo `StickerCard.jsx` + `index.css`, stageados por
      nombre). Push.
  - *Verificación*: `git status` sigue mostrando el WIP de la spec 023 como
    no stageado.

---

## Fase 2 — Saludo (datos + test)

- [ ] **2.1** `lib/heroSaludo.js` con `FRASES_SALUDO`, `DURACION_FRASE_MS`,
      `ENTRADA_FINAL_MS`, `duracionSaludoMs()` y un comentario que explique el
      tope de 5 s y por qué el saludo no es el H1. Copy según Q2.
- [ ] **2.2** `lib/heroSaludo.test.js`:
  - entre 2 y 5 frases
  - la primera es el saludo de bienvenida (`/bienvenid|hola/i`)
  - ninguna supera 24 caracteres
  - no hay frases repetidas (se usan como `key`)
  - `duracionSaludoMs()` ≤ 5000
  - *Verificación*: el test falla si agrego una quinta frase sin bajar
    `DURACION_FRASE_MS` (probarlo y deshacerlo).

---

## Fase 3 — Hero

- [ ] **3.1** `index.css`: `.hero-gradient--vivo`, `.hero-malla`,
      `.hero-malla::after` (franja oscura), 5 `.hero-malla__mancha--*` en las
      coordenadas y colores de hoy, keyframes `malla-deriva-a|b|c` con
      `alternate`.
  - *Verificación*: `.hero-gradient` está intacto (`git diff` no muestra líneas
    borradas en su bloque).
- [ ] **3.2** `index.css`: `.hero-saludo`, `.hero-saludo__frase`,
      `.hero-saludo__frase--final`, keyframes `saludo-pasa` (`both`) y
      `saludo-queda` (`backwards`), tiempos leídos de `--i`, `--saludo-dur`,
      `--saludo-entrada`.
- [ ] **3.3** `index.css`: `.hero-pieza`, los cuatro roles con su retraso
      (0 / 120 / 300 / 450 ms), keyframes `hero-sube` y `hero-aparece`, todo bajo
      `.hero--entrada` y con `animation-fill-mode: backwards`.
  - *Verificación*: `grep -n "hero-pieza" index.css` no contiene `both` ni
    `forwards`.
- [ ] **3.4** `index.css`: regla `[data-pausado]` y suma al bloque de
      reduced-motion (§1.7).
- [ ] **3.5** `Hero.jsx`: `ref`, `hero-gradient--vivo`, capa `.hero-malla` con
      sus 5 manchas `aria-hidden`, el `<p className="hero-saludo" aria-hidden>`
      con las frases y sus custom properties, clases de pieza en H1 /
      subtítulo / buscador / botones.
  - *Verificación*: `TITULARES`, `CTA_PRINCIPAL`, `useExperiment` y el texto
    del H1 no cambian (`git diff` de esas líneas vacío).
- [ ] **3.6** `Hero.jsx`: bandera de módulo + `useState` puro + `useEffect`
      (§1.4) y el IntersectionObserver con `data-pausado` (§1.5).
- [ ] **3.7** `Hero.jsx`: sumar al comentario de cabecera el porqué del saludo
      (no es el titular rotante que sacó la spec 014), de los retrasos por rol y
      del `backwards`.
- [ ] **3.8** `npm test` en verde.

---

## Fase 4 — Verificación en el navegador

- [ ] **4.1** Home a 375 px con variante `debajo` y con `en_hero` (forzar por
      URL): entrada en orden, botones visibles ≤ 1,2 s
      (`document.getAnimations()`), saludo en una línea, sin scroll horizontal.
- [ ] **4.2** Navegar a una categoría y volver con el logo: hero armado, saludo
      en "Estás en casa", sin animaciones corriendo en las piezas.
- [ ] **4.3** Scrollear hasta el footer: `data-pausado` presente y
      `animationPlayState === 'paused'` en las manchas.
- [ ] **4.4** Reduced-motion simulado (copiando el bloque sin la condición, ver
      memoria del browser pane): fondo quieto con los colores de hoy, frase
      final visible, cards sin crecer.
- [ ] **4.5** Variante `en_hero`: abrir el desplegable del buscador pasado el
      primer segundo → queda sobre los botones.
- [ ] **4.6** Lighthouse mobile del Home: LCP comparado con 0.4.
- [ ] **4.7** Capturas "después" (mismas que 0.4).

---

## Fase 5 — Cierre

- [ ] **5.1** `docs/CRO-EXPERIMENTS.md`: corte en la serie de `hero_titular` y
      `hero_buscador` con la fecha real del deploy del hero.
- [ ] **5.2** Recorrer `acceptance.md` punto por punto con resultado real.
- [ ] **5.3** Commit 2 (Hero, `heroSaludo.*`, `index.css`, `CRO-EXPERIMENTS.md`,
      spec). Push **solo si Q1 lo permite**; si no, queda local y se avisa.
- [ ] **5.4** Estado de la spec a `DONE` (o `IN PROGRESS` si el hero quedó
      esperando).

---

## Hallazgos durante la implementación

*(se completa al implementar)*
