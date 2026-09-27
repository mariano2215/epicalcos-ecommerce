# Tasks — Hero con termo y calcos animadas

| | |
|---|---|
| **Spec** | `028-hero-termo-stickers` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 028"*.
Ver [`specs/README.md`](../README.md).

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] Mariano contestó Q1 (cuándo se publica), Q2 (el termo) y Q3 (reemplazo o A/B)
- [ ] **Mariano pidió explícitamente la implementación**

---

## Cómo usar esta lista

- Los pasos van **en orden**. Cada uno deja el repo en un estado coherente.
- **Sin refactors de oportunidad** (`CLAUDE.md` regla 8): lo que aparezca fuera
  de scope se anota en *Hallazgos*, no se arregla.
- Si una task resulta estar mal planteada, **se para y se avisa**.

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `Hero.jsx`, `Home.jsx`, el bloque del hero y el de
      reduced-motion de `index.css`, `lib/experiments.js`, `lib/heroVariantes.js`
      y sus tests.
  - *Verificación*: sé qué hace cada pieza y por qué (comentarios incluidos)
- [ ] **0.2** `npm ci` en la raíz y en `frontend/`, y `npm test` en verde
  - *Verificación*: todos los tests pasan (731 al 27/9/2026)
- [ ] **0.3** Medir el **antes**: LCP y CLS del Home a 375 px con CPU ×4 (5
      corridas) y capturas a 375, 390, 768, 1024 y 1440
  - *Verificación*: números y capturas guardados en el scratchpad
- [ ] **0.4** Confirmar que se trabaja en `claude/lucid-albattani-1cjjn2`
  - *Verificación*: `git branch --show-current` no dice `main`

---

## Fase 1 — Assets

- [ ] **1.1** Copiar las 4 calcos elegidas (Q2) a
      `frontend/public/images/hero/calco-{1..4}.webp`
  - *Verificación*: 4 archivos, cada uno ≤ 30 kB, con alfa (`VP8X` + `ALPH`)
- [ ] **1.2** Si llegó el termo: convertirlo a `termo.webp` con alfa, ≤ 120 kB y
      ≤ 900 px de alto. Anotar sus medidas reales para `width`/`height`.
  - *Verificación*: `file termo.webp` muestra las medidas; el peso cumple RNF-3
  - Si **no** llegó: seguir sin él (el hero lo tolera, RNF-7) y dejar anotado
    en la bitácora que **la spec no se puede mergear** así.

---

## Fase 2 — Datos y tests (`lib/heroTermo.js`)

- [ ] **2.1** Escribir `lib/heroTermo.test.js` con los guardarraíles de
      `design.md` §9. Correrlo: tiene que fallar (no existe el módulo).
  - *Verificación*: falla por el import, no por otra cosa
- [ ] **2.2** Escribir `lib/heroTermo.js`: `COPY_HERO`, `TERMO`, `CALCOS` (slot,
      src, entrada, loop, parallax, capa) y `duracionEntradaMs()`
  - *Verificación*: `heroTermo.test.js` en verde

---

## Fase 3 — Las calcos (`components/hero/HeroCalcos.jsx`)

- [ ] **3.1** Componente con `LazyMotion features={domAnimation} strict` +
      `MotionConfig reducedMotion="user"` + las 4 calcos de `CALCOS` (dos
      elementos cada una: parallax y entrada/hover)
  - *Verificación*: `grep -rn "framer-motion" frontend/src` → solo este archivo
- [ ] **3.2** Parallax: 2 resortes compartidos + `useTransform` por calco;
      `pointermove`/`pointerleave` sobre la sección, solo con puntero fino y sin
      movimiento reducido
  - *Verificación*: con mouse, la calco 4 se mueve ~12 px al llevar el cursor al
    borde; la 3 casi nada; con touch emulado no hay listener
- [ ] **3.3** Prop `entrada`: con `false`, `initial={false}`
  - *Verificación*: navegar a otra ruta y volver → calcos ya en su lugar
- [ ] **3.4** `onError` por calco → se oculta
  - *Verificación*: con una ruta rota, no aparece ícono de imagen rota

---

## Fase 4 — El hero (`Hero.jsx` + `index.css`)

- [ ] **4.1** `index.css`: bloque `.hero-termo*` / `.hero-calco*` (layout de
      §1.1, termo de §1.2, loops con `translate`), `[data-pausado]` y
      reduced-motion ampliados, retrasos de subtítulo (100 ms) y botones (200 ms)
  - *Verificación*: el CSS nuevo no edita ninguna regla de `.hero-gradient`,
    `.btn-*` ni `.sticker-float`
- [ ] **4.2** `Hero.jsx`: layout copy + escena, termo con `fetchpriority`,
      `lazy(HeroCalcos)` dentro de `ErrorBoundary` + `Suspense`, copy de
      `heroTermo.js`, botones con `uppercase`. Se quedan la bandera, el
      `IntersectionObserver`, `conBuscador` y `trackCustomStickerClick('hero')`.
  - *Verificación*: el build genera un chunk aparte con `framer-motion`, y el
    chunk principal no crece más de 1 kB gzip
- [ ] **4.3** Sacar `StickerField` y el saludo del hero; borrar
      `lib/heroSaludo.js`, su test y el bloque `.hero-saludo*` de `index.css`
  - *Verificación*: `grep -rn "hero-saludo\|heroSaludo" frontend/src` → vacío
- [ ] **4.4** Reescribir el comentario de cabecera de `Hero.jsx`: qué se fue y
      por qué (StickerField, saludo, experimentos), el LCP del termo, por qué
      Framer Motion va en un chunk aparte
  - *Verificación*: los ⚠️ que siguen valiendo (bandera, `data-pausado`,
    `conBuscador`) siguen explicados

---

## Fase 5 — Experimentos

- [ ] **5.1** `experiments.js`: `hero_titular` y `hero_buscador` →
      `active: false`, con comentario "cerrado con la spec 028; el hero ya no lo
      lee"
  - *Verificación*: `npm test` en verde (`heroVariantes.test.js` incluido)
- [ ] **5.2** Forzar `?exp_hero_buscador=en_hero` y comprobar que hay
      exactamente **un** buscador (el kill switch manda a control)
  - *Verificación*: un solo buscador, en su sección

---

## Fase 6 — Verificación

- [ ] **6.1** `npm test` y `npm run build --prefix frontend`, sin warnings nuevos
- [ ] **6.2** Capturas a 375, 390, 768, 1024 y 1440: en reposo y a mitad de la
      entrada. Ajustar posiciones y tamaños hasta cumplir RF-1 a RF-5.
  - *Verificación*: capturas del **después** junto a las del antes
- [ ] **6.3** Arnés en Chrome headless: `scrollWidth === clientWidth`; ninguna
      calco se cruza con el H1, la bajada ni los botones; consola limpia
- [ ] **6.4** LCP y CLS del **después** (mismas condiciones que 0.3)
  - *Verificación*: cumple RNF-1 y RNF-2
- [ ] **6.5** Movimiento reducido emulado por CDP: sin loops, sin parallax, todo
      en su lugar
- [ ] **6.6** Perfil de rendimiento con CPU ×4 scrolleando el Home (RNF-4)

---

## Fase 7 — Documentación

- [ ] **7.1** `docs/CRO-EXPERIMENTS.md`: cierre de `hero_titular` y
      `hero_buscador`, y corte en la serie (fecha real del deploy)
- [ ] **7.2** `docs/architecture.md` y `CLAUDE.md` regla 10: `framer-motion` en
      el stack, **solo en el chunk del hero**

---

## Fase 8 — Cierre

- [ ] **8.1** Recorrer `acceptance.md` punto por punto con resultados reales
- [ ] **8.2** Reportar hallazgos y lo que no se pudo probar (Safari/iOS reales)
- [ ] **8.3** Commit + push a la rama. **No a `main`**: el merge espera Q1 y el
      termo (`design.md` §8)
- [ ] **8.4** Estado de la spec en `DONE` recién después del deploy y del OK de
      Mariano en su celular

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| Ver `design.md` §11 | | |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
