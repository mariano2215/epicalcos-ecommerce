# Tasks — Motion: hero vivo y calcos que responden al cursor

| | |
|---|---|
| **Spec** | `024-motion-hero-y-calcos` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `DONE` (18/9/2026) |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 024"*.
Ver [`specs/README.md`](../README.md).

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] Mariano contestó Q1 (cuándo sale el hero) y Q2 (copy del saludo), o
      aceptó los valores por defecto — *"Implementá la spec 024, con los valores
      por defecto"* (18/9/2026)
- [x] **Mariano pidió explícitamente la implementación**

---

## Fase 0 — Preparación

- [x] **0.1** Releer `Hero.jsx`, `StickerCard.jsx`, el bloque "Motion graphics"
      y el de reduced-motion de `index.css`, `lib/heroVariantes.js` y su test.
  - *Verificación*: sé qué experimentos corren en el hero y por qué.
- [x] **0.2** Suite en verde antes de empezar.
  ```bash
  npm test
  ```
  - *Verificación*: todos pasan. Anotar el número (el árbol tiene tests nuevos
    de la spec 023 sin commitear: el número puede no ser 210).
- [x] **0.3** `git status` + `git diff` de `Hero.jsx`, `StickerCard.jsx`,
      `index.css`, `docs/CRO-EXPERIMENTS.md`.
  - *Verificación*: ninguno tiene cambios ajenos. Si alguno tiene, **parar y
    avisar**.
- [x] **0.4** Captura "antes": Home a 375 px y a 1280 px, y `/categoria/anime`
      a 1280 px. Lighthouse mobile del Home (LCP).
  - *Verificación*: capturas + LCP anotados en `acceptance.md`.

---

## Fase 1 — Card de calco (commit 1)

- [x] **1.1** `index.css`: bloque `.sticker-card` (§1.6), con `:hover` dentro
      de `@media (hover: hover) and (pointer: fine)` y `:has(:focus-visible)`
      en una regla aparte.
  - *Verificación*: el CSS usa `scale`, no `transform`; son dos reglas, no una
    lista con coma.
- [x] **1.2** `index.css`: en el bloque final de reduced-motion, `.sticker-card`
      sin transición de `scale` y `scale: none` en hover y en foco (reglas
      separadas).
- [x] **1.3** `StickerCard.jsx`: `card-glass-hover` → `sticker-card`; la
      `<img>` pierde `transition-transform duration-500 hover:scale-105`;
      reescribir el comentario de `p-2`.
  - *Verificación*: `grep -n "scale-105\|card-glass-hover" frontend/src/components/StickerCard.jsx` → vacío.
- [x] **1.4** Verificar en el navegador (`/categoria/anime`, un landing de uso y
      el Home): `getComputedStyle(card).scale` con la regla de hover aplicada
      vale `1.08` **en las tres grillas**, incluida la de `grid-rise`.
- [x] **1.5** `npm test` en verde.
- [x] **1.6** Commit 1 (solo `StickerCard.jsx` + `index.css`, stageados por
      nombre). Push.
  - *Verificación*: `git status` sigue mostrando el WIP de la spec 023 como
    no stageado.

---

## Fase 2 — Saludo (datos + test)

- [x] **2.1** `lib/heroSaludo.js` con `FRASES_SALUDO`, `DURACION_FRASE_MS`,
      `ENTRADA_FINAL_MS`, `duracionSaludoMs()` y un comentario que explique el
      tope de 5 s y por qué el saludo no es el H1. Copy según Q2.
- [x] **2.2** `lib/heroSaludo.test.js`:
  - entre 2 y 5 frases
  - la primera es el saludo de bienvenida (`/bienvenid|hola/i`)
  - ninguna supera 24 caracteres
  - no hay frases repetidas (se usan como `key`)
  - `duracionSaludoMs()` ≤ 5000
  - *Verificación*: el test falla si agrego una quinta frase sin bajar
    `DURACION_FRASE_MS` (probarlo y deshacerlo).

---

## Fase 3 — Hero

- [x] **3.1** `index.css`: `.hero-gradient--vivo`, `.hero-malla`,
      `.hero-malla::after` (franja oscura), 5 `.hero-malla__mancha--*` en las
      coordenadas y colores de hoy, keyframes `malla-deriva-a|b|c` con
      `alternate`.
  - *Verificación*: `.hero-gradient` está intacto (`git diff` no muestra líneas
    borradas en su bloque).
- [x] **3.2** `index.css`: `.hero-saludo`, `.hero-saludo__frase`,
      `.hero-saludo__frase--final`, keyframes `saludo-pasa` (`both`) y
      `saludo-queda` (`backwards`), tiempos leídos de `--i`, `--saludo-dur`,
      `--saludo-entrada`.
- [x] **3.3** `index.css`: `.hero-pieza`, los cuatro roles con su retraso
      (0 / 120 / 300 / 450 ms), keyframes `hero-sube` y `hero-aparece`, todo bajo
      `.hero--entrada` y con `animation-fill-mode: backwards`.
  - *Verificación*: `grep -n "hero-pieza" index.css` no contiene `both` ni
    `forwards`.
- [x] **3.4** `index.css`: regla `[data-pausado]` y suma al bloque de
      reduced-motion (§1.7).
- [x] **3.5** `Hero.jsx`: `ref`, `hero-gradient--vivo`, capa `.hero-malla` con
      sus 5 manchas `aria-hidden`, el `<p className="hero-saludo" aria-hidden>`
      con las frases y sus custom properties, clases de pieza en H1 /
      subtítulo / buscador / botones.
  - *Verificación*: `TITULARES`, `CTA_PRINCIPAL`, `useExperiment` y el texto
    del H1 no cambian (`git diff` de esas líneas vacío).
- [x] **3.6** `Hero.jsx`: bandera de módulo + `useState` puro + `useEffect`
      (§1.4) y el IntersectionObserver con `data-pausado` (§1.5).
- [x] **3.7** `Hero.jsx`: sumar al comentario de cabecera el porqué del saludo
      (no es el titular rotante que sacó la spec 014), de los retrasos por rol y
      del `backwards`.
- [x] **3.8** `npm test` en verde.

---

## Fase 4 — Verificación en el navegador

- [x] **4.1** Home a 375 px con variante `debajo` y con `en_hero` (forzar por
      URL): entrada en orden, botones visibles ≤ 1,2 s
      (`document.getAnimations()`), saludo en una línea, sin scroll horizontal.
- [x] **4.2** Navegar a una categoría y volver con el logo: hero armado, saludo
      en "Estás en casa", sin animaciones corriendo en las piezas.
- [x] **4.3** Scrollear hasta el footer: `data-pausado` presente y
      `animationPlayState === 'paused'` en las manchas.
- [x] **4.4** Reduced-motion: fondo quieto con los colores de hoy, frase
      final visible, cards sin crecer. *(Emulado de verdad por CDP, no
      simulado: ver `acceptance.md`.)*
- [x] **4.5** Variante `en_hero`: abrir el desplegable del buscador pasado el
      primer segundo → queda sobre los botones.
- [x] **4.6** LCP mobile del Home comparado con 0.4. *(Sin Lighthouse, que no
      está instalado: `PerformanceObserver` en Chrome headless con throttling,
      ver `acceptance.md` ANF-2.)*
- [x] **4.7** Capturas "después" (mismas que 0.4).

---

## Fase 5 — Cierre

- [ ] **5.1** `docs/CRO-EXPERIMENTS.md`: corte en la serie de `hero_titular` y
      `hero_buscador` con la fecha real del deploy del hero. → **pasa a la
      Fase 6**: la fecha real es la del merge.
- [x] **5.2** Recorrer `acceptance.md` punto por punto con resultado real.
- [x] **5.3** Commit 2 (Hero, `heroSaludo.*`, `index.css`). Q1 = esperar, así
      que va a la rama **local** `spec-024-hero`, commiteada desde un worktree
      aparte: la carpeta del repo la comparte otra sesión (WIP de la 023) y
      cambiarle la rama le movería el piso. `main` no tiene el hero.
- [x] **5.4** Estado de la spec a `DONE` (o `IN PROGRESS` si el hero quedó
      esperando). → `IN PROGRESS`.

---

## Fase 6 — Publicar el hero

> Mariano, 18/9/2026: *"publicá el hero, que arranquen de 0 esos test"*. Se
> publicó sin esperar la lectura (6.1 no aplica).

- [x] ~~**6.1** Leer `hero_titular` y `hero_buscador` (serie desde el 7/9; dos
      semanas completas el lunes 21/9/2026). Ver `docs/CRO-EXPERIMENTS.md`.~~ No aplica: los tests arrancan de cero.
- [x] **6.2** En `main`: `git merge spec-024-hero` (o `cherry-pick` del commit). → cherry-pick, desde un worktree (el índice de la carpeta compartida tiene WIP de la 023 stageado).
      Si `index.css` o `Hero.jsx` cambiaron en `main` mientras tanto, resolver
      el conflicto a mano y repetir la Fase 4.
- [x] **6.3** `docs/CRO-EXPERIMENTS.md`: corte en la serie con la fecha del
      merge, en el mismo commit o en el inmediato siguiente.
- [x] **6.4** `npm test` en verde → push → estado de la spec a `DONE`. → `DONE` con el OK de Mariano (18/9/2026).
- [x] **6.5** Borrar la rama: `git branch -d spec-024-hero`.

---

## Hallazgos durante la implementación

1. **El 8 % no entraba en el Home.** El diseño supuso cards de ~220 px en los
   destacados del Home; miden **281 px** con el contenedor al tope (1200 px, 4
   columnas). Al 8 % crecen 11,2 px por lado contra 12 px de separación: quedaban
   a 0,8 px de la vecina, borde contra borde, y AC-21 (≥ 1 px) fallaba. Se bajó a
   **7,5 %** (1,5 px de aire en el peor caso), dentro del "alrededor de un 8 %"
   de RF-20. La cuenta quedó escrita en `index.css`.
2. **Las manchas de abajo, más grandes en el celular.** En un hero vertical el
   radio del degradado original sale de la diagonal más larga: el fucsia y el
   naranja daban ~370-400 px de diámetro, no 320. Con 320 el fondo en reposo se
   veía más apagado abajo que el de antes. Mínimos subidos a 370 y 400 px.
3. **El comentario del LCP de `Hero.jsx` está bien.** `design.md` §8 sospechaba
   que estaba desactualizado; medido: a 375 px el LCP es la calco flotante del
   hero en 28 de 28 corridas. No se toca.
4. **El popup de bienvenida tapa la grilla del Home** en cuanto el scroll llega
   a las categorías destacadas: la primera medición del hover "falló" por eso.
   No es un bug (es su comportamiento), pero cualquier prueba automática del
   Home tiene que marcar `epicalcos.welcomePopup.seen` antes.
5. **Hueco de ~250 ms entre frases** del saludo: una sale antes de que entre la
   siguiente, así que durante un instante no hay ninguna. Es lo diseñado (sin
   dos textos superpuestos), se menciona por si a la vista se prefiere que se
   crucen.
