# Design — Hero con termo y calcos animadas

| | |
|---|---|
| **Spec** | `028-hero-termo-stickers` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 27/09/2026 |

> **Este documento define CÓMO se implementará.**
>
> Lo que cambió al implementar (calcos elegidas, posiciones contra el borde del
> termo, retrasos anclados al inicio del hero, etc.) está en la **bitácora** de
> [`tasks.md`](tasks.md). Este documento queda como el diseño aprobado.

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| Framework | **React 18.3 + Vite 5 + React Router 6**, SPA sin SSR. **No es Next.js**: no hay `<Image />` ni `"use client"`. Las imágenes van con `<img>` + `width`/`height` + `fetchpriority` (precedente: `StickerField`, `SocialProof`). |
| Estilos | Tailwind 3 (breakpoints por defecto: `sm` 640, `md` 768, `lg` 1024, `xl` 1280) + `styles/index.css` con las clases propias. `.container-app` = 1200 px máx., 1,25 rem de padding. |
| Botones | `.btn-primary` (píldora fucsia→naranja) y `.btn-secondary` (vidrio). Se reusan tal cual. |
| Títulos | `h1` y `.font-display` van en **mayúsculas por CSS** (`index.css`, con el tracking calibrado para caps). El copy se escribe normal y con tildes. |
| Dependencias | `framer-motion@13.4.4` ya está instalado (commit `39a598c`, pedido de Mariano) y **nadie lo importa**. |
| Hero actual | `components/Hero.jsx`: experimentos `hero_titular` + `hero_cta` (pausado) + `hero_buscador` (lo resuelve `Home`); movimiento de la spec 024 (malla, aurora, saludo, entrada por CSS, pausa fuera de pantalla con `data-pausado`, bandera "una vez por carga"); `StickerField` con 8 calcos al 22 % y `eagerFirst`. |
| Assets | **No existe** `public/images/hero/`. **No hay ningún termo recortado**: `images/antes-despues-termo.webp` es 1080×1080 con fondo. Sí hay **60 calcos recortadas** en `public/stickers-cutout/nuevas/`: WebP 320×320 con alfa, ~12 kB cada una. |
| Home y bundle | `Home` es **eager** (`App.jsx`: "Home eager (LCP)") y va en el chunk principal, que es el que se carga **en todas las rutas**. Hoy pesa **97,6 kB gzip**. |
| ¿Toca precios? | **No.** Ni `pricing.js`, ni `site.js`, ni `CartContext`. |
| Tests que cubren el hero | `lib/heroVariantes.test.js` (copy de las variantes y la exclusividad del buscador), `lib/heroSaludo.test.js` (saludo). Todo en `environment: node`: nada renderiza componentes. |

### Lo que cuesta Framer Motion (medido)

Con `esbuild --minify`, React afuera, gzip -9:

| Cómo se usa | gzip | Sobre el chunk principal (97,6 kB) |
|---|---|---|
| `motion` (el del código de referencia) | **43,0 kB** | +44 % en **todas** las rutas |
| `LazyMotion` + `m` + `domAnimation`, en el chunk principal | 29,3 kB | +30 % en todas las rutas |
| `LazyMotion` + `m`, features en un chunk aparte | 14,8 kB | +15 % en todas las rutas |
| **Todo en un chunk que solo pide el Home** (lo que propone este diseño) | **0 kB** | ~29 kB en un chunk que baja **en paralelo** en el Home |

### Lo que dicen los comentarios del hero y cómo se respeta

1. **"El H1 y el subtítulo nunca arrancan invisibles: solo suben. Un fade-in
   correría el LCP."** El código de referencia del pedido hace
   `opacity: 0 → 1` en el H1 y en el termo. **No se hace**: el H1 y la bajada
   solo suben (la animación CSS que ya existe), y el termo solo crece. El termo
   pasa a ser el candidato a LCP del Home: si arrancara en opacidad 0, Chrome no
   lo contaría hasta que aparezca.
2. **"Lo ÚNICO que cambia entre variantes es eso."** Con el hero nuevo el H1 deja
   de ser una variante: `hero_titular` se apaga (RN-2). Ver §1.6.
3. **`grid-rise` y el `fill-mode: both` (spec 024).** Lección: dos cosas que
   escriben `transform` en el mismo elemento se pisan. Acá conviven Framer
   Motion (que escribe `transform` inline) y los loops de CSS: los loops usan la
   propiedad individual **`translate`**, que es independiente (§1.3).
4. **Bandera "una vez por carga" y `data-pausado`.** Se reusan tal cual.
5. **`StickerField` ya hace parallax con el cursor** (variables CSS `--px`/`--py`
   y un `pointermove`, 0 kB). Es un precedente de que el parallax se puede hacer
   sin librería; se usa Framer Motion porque Mariano lo pidió explícitamente
   (§10).

### Calcos propuestas (Q2)

Del catálogo, recortadas y transparentes. Mariano puede cambiarlas por otras:

| Slot | Propuesta | Por qué |
|---|---|---|
| 1 (arriba izq., flota) | `mate-1` | El objeto de la marca junto al termo. |
| 2 (abajo izq., inclinada) | `fernet-1` | Humor, reconocible a distancia. |
| 3 (arriba der., entra) | `carpincho-1` | Personaje: la que "llega" tiene que tener cara. |
| 4 (abajo der., parallax) | `bandera-1` | Colores fuertes: la que más se mueve se tiene que ver. |

---

## 1. Arquitectura propuesta

Tres capas, cada una con la herramienta más barata que alcanza:

| Pieza | Cómo se anima | Por qué |
|---|---|---|
| Titular, bajada, botones | **CSS que ya existe** (`.hero-pieza`, spec 024), con retrasos ajustados | No depende de que llegue ningún JS extra: el contenido y el LCP no esperan a la librería. |
| Termo | **CSS**: una keyframe nueva de `scale` 0,92 → 1 | Es el LCP. Tiene que estar en el primer render, sin esperar un chunk. |
| 4 calcos + parallax + hover | **Framer Motion**, en un chunk que solo pide el Home | Es donde el pedido quiere resortes, inercia y comportamientos distintos. |

```
<section.hero-gradient.hero-gradient--vivo.hero-termo[.hero--entrada][data-pausado]>
  ├─ .hero-malla (existe)                          fondo, z 0
  ├─ .hero-aurora (existe)                         fondo, z 0
  └─ .container-app.hero-termo__grilla
       ├─ .hero-termo__copy                        z 10
       │    ├─ h1.hero-pieza--titular
       │    ├─ p.hero-pieza--subtitulo
       │    ├─ [BuscadorCalcos]  (solo si conBuscador, RN-5)
       │    └─ div.hero-pieza--botones
       └─ .hero-termo__escena  (caja de tamaño fijo, reserva el lugar)
            ├─ img.hero-termo__producto            z 20   ← CSS, eager
            └─ <Suspense fallback={null}>
                 <HeroCalcos entrada={…} />        ← lazy(): Framer Motion
                    ├─ calco 1   z 30  (delante)
                    ├─ calco 2   z 15  (detrás del termo)
                    ├─ calco 3   z 30  (delante)
                    └─ calco 4   z 30  (delante)
```

**Qué se va del hero** (no del sitio):
- **`StickerField`** (8 calcos flotando al 22 %). Con las 4 nuevas serían 12
  calcos moviéndose, que es exactamente el "10 elementos moviéndose
  simultáneamente" que el pedido prohíbe (punto 27). `StickerField` sigue en
  `PromoBanner` y `Categorias`, sin tocarse.
- **El saludo** ("Bienvenido" → "Estás en casa"). Es una segunda línea de texto
  animada arriba de un titular que ahora tiene que leerse de inmediato (punto
  42: claridad antes que movimiento). `lib/heroSaludo.js`, su test y sus reglas
  CSS quedan sin uso y **se borran** en el mismo cambio: no es un refactor de
  oportunidad, es sacar lo que este cambio deja muerto.

**Qué se queda**: la malla y el aurora (el fondo de la marca, punto 26), la
bandera "una vez por carga", el `IntersectionObserver` con `data-pausado`, y la
entrada por CSS de las piezas de texto.

### 1.1 Layout

**Mobile (< 768 px)** — una columna, en este orden (RF-25):

```
 TU TERMO ESTÁ PIDIENDO CALCOS.      ← H1, 2 líneas a 375 px
 Dale personalidad a lo que…         ← bajada
 [      VER CALCOS      ]            ← 100 % de ancho, como hoy
 [    HACER LOS MÍOS    ]
        ┌─ escena ─────────┐
        │ c1     termo  c3 │           altura: clamp(260px, 72vw, 340px)
        │ c2           c4  │
        └──────────────────┘
```

- La escena mide el ancho del contenedor y una altura fija con `clamp()`: su
  tamaño **no depende de la imagen**, así que cargarla no mueve nada (RNF-1).
- Calcos: `width: clamp(64px, 19vw, 92px)`, en las esquinas de la escena y
  **dentro** de ella (`top`/`left`/`right`/`bottom` ≥ 0 en mobile). Como la
  escena está debajo de los botones en el flujo, **ninguna calco puede tapar el
  texto**: es estructural, no depende de afinar porcentajes (RF-4).
- Si en 360 px la calco 2 o la 4 se pisa con el termo más de lo que queda bien,
  se oculta una (RF-27) y se anota en la bitácora.

**Desktop (≥ 1024 px)** — la misma columna centrada, más aire:

```
   c1                                              c3
              TU TERMO ESTÁ PIDIENDO CALCOS.
             Dale personalidad a lo que usás…
             [ VER CALCOS ] [ HACER LOS MÍOS ]
                         ┌─────┐
               c2        │termo│        c4
                         └─────┘
```

- `min-height: calc(100svh - <alto del header>)` (RF-6). `svh` y no `vh`: en
  iOS `100vh` incluye la barra de direcciones y el hero quedaría más alto que la
  pantalla.
- Termo: `height: clamp(320px, 44svh, 440px)`, ancho automático.
- Calcos 2 y 4: a los costados del termo, dentro de la escena.
- Calcos 1 y 3: **suben al margen lateral del copy** solo desde `xl` (1280 px),
  donde a cada lado del H1 quedan ≥ 200 px libres. Entre 768 y 1279 px se quedan
  en las esquinas superiores de la escena. Así se cumple RF-4 en todo el rango
  sin que las calcos de arriba pisen el titular en una notebook de 1024.
- La escena tiene `max-width: 880px`: en 1920 px la composición queda centrada y
  no se desparrama.

**Tablet (768–1023 px)**: layout mobile con la escena más grande. Sin parallax
si el dispositivo es táctil (el criterio es el puntero, no el ancho: §1.4).

Los valores exactos (porcentajes de cada calco, `clamp` del termo) se ajustan
mirando capturas a 375, 390, 768, 1024 y 1440, como en la spec 024. Lo que no se
negocia son las reglas: escena de tamaño fijo, calcos dentro de la escena salvo
1 y 3 en `xl`, nada encima del copy.

### 1.2 El termo

```jsx
<img
  src="/images/hero/termo.webp"
  alt="Termo personalizado con calcos EPICALCOS"
  width={ANCHO_REAL} height={ALTO_REAL}   // del archivo que mande Mariano
  fetchpriority="high"                     // minúscula: React 18 no conoce `fetchPriority`
  decoding="async"
  className="hero-termo__producto"
  onError={() => setTermoFalta(true)}
/>
```

- `object-fit: contain`, `width: 100%; height: 100%` dentro de su caja:
  mantiene la proporción sea cual sea la del archivo.
- Entrada: `@keyframes hero-termo-entra { from { scale: 0.92; } }`, 0,7 s,
  `cubic-bezier(0.22, 1, 0.36, 1)` (la curva del pedido), 200 ms de retraso,
  `fill-mode: backwards`. **Sin opacidad**: ver §0, comentario 1. Propiedad
  individual `scale`: no pisa ningún `transform`.
- Después queda quieto: sin loop, sin parallax (RF-12).
- Sombra: `filter: drop-shadow(0 18px 30px rgba(0,0,0,0.35))`. Más fuerte que
  el 0,12 del pedido porque el fondo es casi negro: con 0,12 no se ve.
- Si el archivo falta: `onError` → `visibility: hidden`. La caja mantiene su
  tamaño y no aparece el ícono de imagen rota (RNF-7).

### 1.3 Las calcos

**`components/hero/HeroCalcos.jsx`** (el único archivo que importa
`framer-motion`) y **`lib/heroTermo.js`** (datos puros, testeables en node).

Cada calco son **dos elementos**, porque tres cosas distintas la mueven y no se
pueden pisar:

```jsx
<m.div className="hero-calco hero-calco--1" style={{ x: px1, y: py1 }}>   {/* parallax */}
  <m.img
    src={…} alt="" aria-hidden="true" width={320} height={320}
    className="hero-calco__img hero-calco__img--flota-lento"             {/* loop CSS: `translate` */}
    initial={…} animate={…} transition={…}                                 {/* entrada: opacity/scale/rotate/x */}
    whileHover={{ scale: 1.08, rotate: rotacionFinal + 2 }}                {/* hover */}
  />
</m.div>
```

- **Parallax** en el `div` (motion values de `x`/`y`).
- **Entrada y hover** en la `img` (Framer Motion escribe su `transform` inline).
- **Loop de flotación en CSS**, en la misma `img` pero sobre la propiedad
  individual `translate`, que no choca con el `transform` de Framer Motion.
  Así el loop lo corre el compositor, se pausa con el `data-pausado` que ya
  existe (RF-24) y el `@media (prefers-reduced-motion)` lo apaga solo.
  - *Alternativa descartada*: el `y: [0, -15, 0]` con `repeat: Infinity` del
    código de referencia. Lo corre JS en cada cuadro, no se pausa fuera de
    pantalla y chocaría con el `y` del parallax en el mismo elemento.

Comportamientos (RF-13 a RF-17), en `lib/heroTermo.js`:

| Calco | Entrada (Framer Motion) | Retraso | Loop (CSS) | Parallax |
|---|---|---|---|---|
| 1 | opacity 0→1, scale 0,8→1, 0,5 s | 300 ms | `translate` 0 → −15 px, 4 s, `ease-in-out`, `alternate` | 4 px |
| 2 | opacity 0→1, scale 0,8→1, rotate 0→8°, 0,6–0,8 s | 500 ms | `translate` 0 → −8 px, 5 s | 7 px |
| 3 | opacity 0→1, x +320→0 (mobile +160), rotate 20°→−6°, 1 s, `[0.22,1,0.36,1]` | 400 ms | **ninguno** (queda quieta) | 3 px |
| 4 | opacity 0→1, scale 0,8→1, rotate −10°, 0,8 s | 600 ms | **ninguno** | **25 px** |

- **Nada de rebote**: todas las entradas con curva de desaceleración, sin
  `type: 'spring'` con sobrepaso. El único resorte es el del parallax y el del
  hover, que no rebotan con `damping` 15–20.
- **La calco 3 arranca fuera de la escena** (`x: 320`): el `overflow: hidden`
  del hero la recorta mientras entra. Al terminar está entera adentro (RF-5).
- `alternate` en los loops: el ciclo vuelve por el mismo camino, sin salto.
- Los loops arrancan **después** de la entrada (`animation-delay` = retraso +
  duración de la entrada), para que la calco no aparezca ya a mitad de camino.

### 1.4 Parallax

```js
// Un solo par de valores para todas las calcos: la posición del cursor
// normalizada a [-0.5, 0.5]. Cada calco la multiplica por su intensidad.
const cursorX = useMotionValue(0);
const cursorY = useMotionValue(0);
const suaveX = useSpring(cursorX, { stiffness: 60, damping: 15 });
const suaveY = useSpring(cursorY, { stiffness: 60, damping: 15 });
// por calco:
const x = useTransform(suaveX, (v) => v * intensidad);
```

- **Dos resortes para las cuatro calcos**, no ocho: las intensidades distintas
  ya dan la profundidad, y cada resorte es trabajo por cuadro en el hilo
  principal.
- El listener es `pointermove` sobre la **sección** del hero (se pasa por
  prop), `passive`. Al salir el cursor (`pointerleave`) los valores vuelven a 0
  y las calcos regresan con el mismo resorte (edge case "cursor sale").
- **Solo se engancha** si `matchMedia('(hover: hover) and (pointer: fine)')` y
  sin movimiento reducido. El criterio es el puntero, no el ancho: una tablet con
  mouse tiene parallax; una notebook táctil sin mouse, no (RF-26).
- Con el cursor en el borde, la calco 4 se desplaza 12,5 px hacia cada lado (25
  px de recorrido total, como en el código de referencia).

### 1.5 Una vez por carga, movimiento reducido y chunk aparte

- **Una vez por carga**: `Hero` ya calcula `entrada` con la bandera de módulo.
  Se le pasa a `HeroCalcos`; con `entrada === false` las calcos usan
  `initial={false}` (arrancan en su estado final) y los loops no esperan retraso.
- **Movimiento reducido** (RF-28), doble guarda como en la spec 024:
  1. `<MotionConfig reducedMotion="user">`: Framer Motion saltea las animaciones
     de `transform` y conserva las de opacidad. Resultado: las calcos aparecen
     con un fundido en su lugar final, sin entrar desde la derecha.
  2. CSS: en el bloque de `prefers-reduced-motion` que ya existe, sin loops
     (`animation: none`) y sin la entrada del termo.
  3. El parallax ni se engancha (§1.4).
- **Chunk aparte**: `const HeroCalcos = lazy(() => import('./hero/HeroCalcos.jsx'))`.
  Adentro, `<LazyMotion features={domAnimation} strict>` + `m.*`:
  - `strict` hace que un `motion.*` (el que arrastra los 43 kB) tire error en
    desarrollo. Es el guardarraíl de que nadie lo use "de paso" en el Home.
  - `domAnimation` cubre animaciones y hover; no hace falta `domMax` (drag,
    layout).
  - Como todo el chunk es lazy, las features van sincrónicas **adentro** de él:
    no hay un segundo round-trip.

### 1.6 Experimentos y copy

- **Copy** en `lib/heroTermo.js`, con el H1 partido en dos para el
  `gradient-text`, como hoy:
  ```js
  export const COPY_HERO = {
    h1: ['Tu termo está', 'pidiendo calcos.'],
    bajada: 'Dale personalidad a lo que usás todos los días.',
    ctaPrincipal: 'Ver calcos',
    ctaSecundario: 'Hacer los míos'
  };
  ```
  Los botones del hero llevan `uppercase` de Tailwind (el pedido los quiere en
  mayúsculas y `.btn-*` no lo es). No se toca `.btn-*`: lo usa todo el sitio.
- **`experiments.js`**: `hero_titular.active = false` y
  `hero_buscador.active = false`, con un comentario que dice que se cerraron con
  la spec 028 y **que prenderlos de nuevo no hace nada**, porque el hero ya no
  lee ni `TITULARES` ni `CTA_PRINCIPAL`. `hero_cta` sigue pausado.
- **`heroVariantes.js` no se toca.** Sus tests siguen valiendo (el control sigue
  siendo el control), y `ubicacionBuscador` lo sigue usando `Home`. Queda como
  registro del experimento. Borrarlo es otra conversación (hallazgo §11).
- **`conBuscador` se mantiene** en el hero nuevo, en el mismo lugar (entre la
  bajada y los botones). Con `hero_buscador` apagado siempre llega `false`, pero
  si alguien lo prende, la Home no puede quedar sin buscador (RN-5): `Home` apaga
  la sección y el hero lo tiene que mostrar.
- **Retrasos de la entrada del texto** (RF-18): H1 0 ms, bajada 100 ms, botones
  **200 ms** (hoy 450 ms; el pedido los quiere "inmediatamente"). El retraso por
  rol de la spec 024 se mantiene.

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/components/Hero.jsx` | Layout nuevo (copy + escena), termo, `lazy(HeroCalcos)`, copy de `heroTermo.js`. Sale `StickerField`, el saludo, `useExperiment` y `heroVariantes`. Se quedan la bandera, el `IntersectionObserver`, `conBuscador` y `trackCustomStickerClick('hero')`. Comentario de cabecera reescrito con el porqué. | 🟡 es la primera pantalla del sitio |
| `frontend/src/styles/index.css` | Bloque nuevo `.hero-termo*`, `.hero-calco*`, keyframes `hero-termo-entra` y `hero-calco-flota`; `[data-pausado]` suma `.hero-calco__img`; retrasos de `.hero-pieza--subtitulo/--botones`; reduced-motion suma lo nuevo. **Sale** el bloque `.hero-saludo*` y sus keyframes. | 🟡 archivo compartido; lo que sale solo lo usaba el saludo (verificado con `grep`) |
| `frontend/src/lib/experiments.js` | `hero_titular` y `hero_buscador` → `active: false`, con comentario | 🟡 apaga dos tests: es lo que decide Q1 |
| `docs/CRO-EXPERIMENTS.md` | Cierre de `hero_titular` y `hero_buscador` + corte de la serie con la fecha del deploy | 🟢 |
| `docs/architecture.md` y `CLAUDE.md` (regla 10) | El stack suma `framer-motion`, **solo en el chunk del hero** | 🟢 |

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/components/hero/HeroCalcos.jsx` | Las 4 calcos, el parallax y el hover. Único importador de `framer-motion`. |
| `frontend/src/lib/heroTermo.js` | Copy, rutas de assets, y la config de cada calco (entrada, loop, parallax). |
| `frontend/src/lib/heroTermo.test.js` | Guardarraíles del copy y de "cada calco se mueve distinto". |
| `frontend/public/images/hero/termo.webp` | **Lo manda Mariano** (Q2). |
| `frontend/public/images/hero/calco-{1..4}.webp` | Copias de las 4 calcos elegidas. Copias y no referencias al catálogo: si mañana se renombra un diseño, el hero no se queda sin calco. |

### Archivos que se borran

| Archivo | Por qué |
|---|---|
| `frontend/src/lib/heroSaludo.js` + `.test.js` | El saludo sale del hero y nadie más lo usa. |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **No** | — |
| `frontend/src/config/site.js` | **No** (el hero solo lee `isSectionHidden`, como hoy) | — |
| `frontend/src/context/CartContext.jsx` | **No** | — |
| `netlify/functions/lib/pricing.js` | **No** | — |
| `frontend/src/lib/analytics.js` | **No** (se sigue llamando `trackCustomStickerClick('hero')`) | — |
| `frontend/src/lib/experiments.js` | **Sí**, solo dos `active` | `Hero` (deja de usarlo), `Home` (`hero_buscador`), `PackCard`, `SizeGuide`, `WelcomePopup`, `Producto`: el cambio no afecta a sus experimentos |

Otros compartidos que se miraron:

| Pieza | Quién la usa | Qué se hace |
|---|---|---|
| `.hero-gradient` | `Hero` + las 4 páginas de pago | **No se edita** |
| `.hero-pieza*` | Solo `Hero` | Se ajustan dos retrasos |
| `StickerField` | `Hero`, `PromoBanner`, `Categorias` | **No se edita**; el hero deja de usarlo |
| `.btn-primary` / `.btn-secondary` | Todo el sitio | **No se editan** |

```bash
grep -rn "hero-saludo\|heroSaludo\|hero-pieza\|StickerField\|framer-motion" frontend/src
```

---

## 3. Datos

Nada persistente. Ni `localStorage`, ni forma de carrito. La asignación de
experimentos guardada (`epicalcos.exp.v1`) queda como está: con `active: false`
se ignora sin borrarla, que es como funciona el freno de mano.

---

## 4. APIs

Ninguna.

---

## 5. Integraciones

Ninguna. GA4 y Meta reciben los mismos eventos, menos los `experiment_view` de
los dos tests apagados.

---

## 6. Seguridad

Sin superficie nueva: no hay input, ni red, ni secretos. Los assets son
estáticos y del propio sitio.

---

## 7. Manejo de errores

| Falla | Qué pasa |
|---|---|
| Falta `termo.webp` | `onError` → caja vacía del mismo tamaño. Copy y botones intactos. |
| Falta una calco | `onError` → esa calco se oculta. |
| Falla la carga del chunk de `HeroCalcos` (red cortada) | `lazy()` rechaza. Un `ErrorBoundary` mínimo alrededor del `Suspense` devuelve `null`: el hero sigue con texto, botones y termo. Sin él, el error subiría y tiraría la Home entera. **No hay ninguno en el repo**: es una clase de ~15 líneas, local a `Hero.jsx`. |
| Navegador sin `translate`/`scale` individuales (Safari < 14.1, Chrome < 104) | Sin loops ni entrada del termo; todo en su lugar y quieto. |
| Navegador sin `svh` | Se declara `min-height: calc(100vh - …)` antes, y el `svh` lo pisa donde exista. |
| Sin `IntersectionObserver` | Los loops no se pausan fuera de pantalla. |

---

## 8. Estrategia de migración y deploy

- Sin datos que migrar.
- Rama `claude/lucid-albattani-1cjjn2` → PR a `main`.
- **No se mergea** hasta que se cumplan las dos cosas:
  1. Llegó el termo (Q2) y está en el commit.
  2. La fecha que decida Q1 (propuesta: desde el sábado 3/10, después de leer
     los tests el viernes 2/10).
- Commits:
  1. `docs(specs): spec 028 — hero con termo y calcos animadas`
  2. `feat(home): hero con termo y calcos animadas (spec 028)`
  3. `docs(cro): cierre de hero_titular y hero_buscador (spec 028)`, con la
     fecha real del deploy
- Rollback: `git revert` del commit 2 y del 3. Los dos experimentos vuelven a
  `active: true` con el revert y cada persona recupera su variante guardada.

---

## 9. Testing

### Tests nuevos (`lib/heroTermo.test.js`)

- El H1 dice "calcos" (piso de SEO de la spec 015).
- El H1 entra en 2–3 líneas a 375 px y los botones no se parten (mismo criterio
  de caracteres que `heroVariantes.test.js`).
- **Las cuatro calcos tienen comportamientos distintos**: no hay dos con la misma
  combinación de loop + parallax + entrada. Es el punto 13 del pedido, y el
  primero que se pierde cuando alguien copia y pega una calco.
- La calco 4 es la de mayor parallax y ninguna pasa de 25 px.
- La 3 y la 4 no tienen loop; la 1 flota más que la 2.
- Toda la entrada (retraso + duración de la última calco) termina antes de
  1,5 s (RF-18).
- Las rutas de assets empiezan con `/images/hero/`.

### ⚠️ Tests de paridad
No aplica: no toca precios.

### Verificación manual (con arnés de Chrome headless, como en la spec 024)

- Capturas a 375, 390, 768, 1024 y 1440 px, en reposo y a mitad de la entrada.
- `document.documentElement.scrollWidth === clientWidth` en todos los anchos.
- Rectángulos de cada calco contra el H1, la bajada y los botones: sin
  intersección (RF-4).
- LCP y CLS del Home, antes y después, con CPU ×4 (RNF-1, RNF-2).
- Movimiento reducido emulado por CDP.
- Consola sin errores ni warnings.
- **Safari, Firefox, iOS y Android reales: no se pueden probar desde acá.**
  Quedan para Mariano en su celular antes del merge (acceptance §4).

---

## 10. Dependencias nuevas

| Dependencia | `framer-motion@13.4.4` (ya instalada) |
|---|---|
| Qué resuelve | Entradas con curva y resorte, parallax con inercia y hover con resorte en las 4 calcos. |
| Cuánto pesa | ~29 kB gzip, **en un chunk que solo pide el Home**. El chunk principal (todas las rutas) no suma nada. |
| ¿Alcanzaba con código propio? | **Sí.** `StickerField` ya hace parallax con 0 kB, y la spec 024 hizo toda la entrada en CSS. Se usa porque **Mariano lo pidió explícitamente** (27/9/2026) después de que se le mostró el costo. Este diseño lo contiene: un solo archivo lo importa, en un chunk aparte, y `strict` impide el `motion` completo. |

---

## 11. Hallazgos fuera de scope

- **`heroVariantes.js`** queda sin uso en el hero (solo `ubicacionBuscador`,
  desde `Home`). Cuando se decida que `hero_titular` no vuelve, se puede limpiar
  junto con su test.
- **`StickerField` y su prop `eagerFirst`**: el único que la pasaba era el hero.
  Queda sin uso; no se toca.
- **El `sitemap.xml` commiteado está desactualizado** (le faltan 11 categorías).
  Netlify lo regenera en cada build, así que producción está bien.
- **Antes/Después también muestra un termo**, más abajo en la Home. Con el termo
  en el hero, puede sentirse repetido. Mirarlo después de publicar.

---

## 12. Ampliación A — Pegar las calcos en el termo

> Requisitos en `requirements.md` §13. **Estado: `READY FOR REVIEW`.**

### 12.0 Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Cuánto cuesta el arrastre de Framer Motion? | `drag` necesita `domMax` en vez de `domAnimation`: el chunk de las calcos pasa de **29,3 a 43,2 kB gzip (+14 kB)**. El `animate()` imperativo suma 4,3 kB. |
| ¿Hace falta? | **No.** El arrastre acá es solo con mouse (Q4), sin inercia ni límites. Con eventos de puntero y los `MotionValue` que ya se usan alcanza: `useSpring` + `.jump()` (seguir al cursor sin resorte) + `.set()` (volver con resorte) + el evento `animationComplete`. Verificados en los tipos de `motion-dom` 13.4. Costo: código propio, < 2 kB. |
| ¿Dónde se puede pegar? | Medido en `termo.webp` (172×516): el **cuerpo** va de 4 % a 82 % del ancho (desde 83 % está la manija) y de 29 % a 89 % del alto (arriba la tapa y el aro negro, abajo la base de acero). El logo de Stanley está a 33-41 % del alto: una calco pegada ahí lo tapa, y está bien. |
| ¿Qué choca con lo que ya está? | (1) En táctil las calcos tienen `pointer-events: none` → para tocar hay que prenderlo; nada clickeable queda debajo (RF-22 se sigue cumpliendo). (2) El `div` de cada calco ya lleva el parallax: mientras se arrastra hay que **congelarlo**, si no la calco se corre del cursor hasta 12 px. (3) La flotación es CSS sobre `translate`: se pausa con un atributo, no se apaga (apagarla haría saltar la calco hasta 15 px). |
| ¿Toca precios, carrito o checkout? | **No.** |

### 12.1 Estados de cada calco

```
          clic / toque                    llega (animationComplete)
  libre ───────────────► volando ───────────────────────────► pegada
    │  ▲                                                        │  │
    │  │ suelta afuera (vuelve con resorte)       clic / toque  │  │ agarrarla
    │  │                                         (vuelve a su   │  │ con el mouse
    ▼  │                                          lugar)        │  │
 arrastrando ──── suelta sobre el cuerpo ──────────────────────►│  │
    ▲                                                           │  │
    └───────────────────────────────────────────────────────────┴──┘
```

El estado vive en `HeroCalcos` (`{ [slot]: { estado, fx, fy, rot } }`). No se
guarda en ningún lado (Q5): desmontar el Home lo borra.

### 12.2 Capas

```
.hero-termo__escena
  ├─ img.hero-termo__producto                     z 20
  ├─ .hero-termo__pegadas  (NUEVA)                z 25   ← encima del termo, con máscara
  │    └─ m.img.hero-calco-pegada × n             (left/top en %, ancho 42 % del termo)
  └─ .hero-calcos
       └─ .hero-calco × 4                         z 15 / 30; 40 mientras se arrastra
```

- **`.hero-termo__pegadas`** ocupa exactamente la caja del termo (mismo `left:
  50%`, `translate`, alto de la escena y ancho `alto × proporción`, con las
  variables que ya existen) y lleva **`mask-image: url(termo.webp)`** con
  `mask-size: 100% 100%`: una calco pegada solo se ve donde hay termo. El borde
  que se pasa de la silueta queda "doblado" hacia atrás, como una calco de
  verdad en un cilindro. Sin JS y sin medir nada.
- La calco **libre** no se desmonta al pegarse: queda con `visibility: hidden`.
  Así, despegarla es mostrarla de nuevo y moverla, sin volver a montar ni a
  cargar nada.

### 12.3 Arrastre con mouse (código propio)

En el `div` de cada calco libre, con `pointerType === 'mouse'`:

1. **`pointerdown`**: guarda el punto, `setPointerCapture` y `preventDefault`
   (sin esto el navegador selecciona texto de la página mientras se arrastra).
2. **`pointermove`**: pasados **4 px**, empieza el arrastre. Congela el parallax
   (un `ref` con el valor del momento, que el `useTransform` del `x`/`y` usa en
   vez del cursor), marca `data-arrastrando` (pausa la flotación, `z-index` 40,
   sombra de "levantada", cursor `grabbing`) y mueve con `arrastreX.jump(dx)`:
   sin resorte, pegada al cursor (RF-A2).
3. **`pointerup`**:
   - sin haber pasado los 4 px → **clic** → vuela (12.4).
   - con el centro de la calco sobre el cuerpo del termo → **pegada** en esa
     posición, llevada hacia adentro si hace falta (`ajustarAlCuerpo`).
   - si no → `arrastreX.set(0)`: vuelve con resorte a su lugar y se descongela
     el parallax.

`arrastreX`/`arrastreY` son `useSpring(0, …)`: `.jump()` para seguir al cursor y
`.set()` para volver con resorte. Se suman al parallax en el `useTransform` que
ya da el `x`/`y` del `div`.

Con `setPointerCapture`, el `pointerup` y el `click` siguientes caen en la calco
aunque el cursor esté sobre un botón: soltar sobre "VER CALCOS" no navega
(RF-A9).

### 12.4 Clic o toque: la calco vuela

- Cada calco tiene su **destino** en el termo (`DESTINOS_PEGADO` en
  `lib/heroTermo.js`, en fracciones de la caja del termo, con su rotación), para
  que las cuatro con clic queden repartidas y sin taparse (RF-A5).
- Se calcula el desplazamiento desde el centro actual hasta el destino y se hace
  `arrastreX.set(dx)`: el mismo resorte de la vuelta. Al terminar
  (`animationComplete`) pasa a **pegada**.
- **Táctil (Q4)**: solo toque, sin arrastre. `touch-action` queda en `auto`, así
  que si el dedo se mueve, el navegador scrollea y manda `pointercancel`: no
  cuenta como toque (RF-A10). Toque = `pointerup` sin `pointercancel` y con
  menos de 8 px de movimiento.

### 12.5 Pegada

- Se monta `m.img.hero-calco-pegada` en `.hero-termo__pegadas`, en `left: fx%`,
  `top: fy%`, ancho **42 % del termo**, rotada según su destino (o la rotación
  que traía si se soltó arrastrando).
- **Apretón** (RF-A3): `initial={{ scale: r }}` → `animate={{ scale: [r, 0.94, 1] }}`,
  donde `r` es el ancho libre sobre el ancho pegado. Arranca del mismo tamaño que
  tenía en la mano y se achica "apretándose" contra el termo; no hay salto.
- Sin flotación, sin parallax, sin hover que la agrande (RF-A6).
- **Agarrarla con el mouse** (RF-A7): al pasar los 4 px, sale de las pegadas y la
  calco libre aparece **debajo del cursor** (el desplazamiento se calcula para
  eso) y sigue como un arrastre normal. Crece de 1/r a 1 con el mismo resorte.
- **Clic o toque sobre una pegada**: se despega y vuelve volando a su lugar
  original (el vuelo del 12.4, al revés).

### 12.6 La pista (Q6)

- Un `<p class="hero-termo__pista" aria-hidden="true">` en `Hero.jsx`, **entre
  los botones y la escena y siempre en el DOM**: su lugar está reservado desde el
  primer cuadro, así que aparecer o irse no mueve nada (RNF-A4).
- Dos textos, y el CSS muestra uno según el puntero (`@media (hover: hover) and
  (pointer: fine)`): *"Arrastrá una calco al termo"* / *"Tocá una calco para
  pegarla"*. Sin JS para elegir.
- Solo se ve si el juego cargó y todavía no se pegó nada: `HeroCalcos` pone
  `data-juego` en la sección al montar y `data-pegada` al pegar la primera
  (atributos, por el mismo motivo que `data-pausado`). Si el chunk no llega, no
  hay pista de un juego que no existe.
- `0.8rem`, blanco al 55 %: más chica y apagada que la bajada (RN-A1). Aparece
  con un fundido al terminar la entrada.

### 12.7 Movimiento reducido

- El arrastre sigue igual: es movimiento que hace la persona, no una animación.
- `MotionConfig reducedMotion="user"` ya hace instantáneos los resortes de
  `transform`; además, con `reducido` se usa `.jump()` en vez de `.set()` para el
  vuelo y la vuelta, y el apretón no se reproduce.

### 12.8 Accesibilidad (RN-A3)

Las calcos siguen con `aria-hidden` y sin `tabindex`: son un juego de 5 segundos
sin contenido ni función de compra, y cuatro botones "pegar calco" en el orden
de tabulación le agregarían ruido al hero a quien navega con teclado o lector,
justo antes de los productos. El clic/toque cubre WCAG 2.5.7 (alternativa de un
solo puntero al arrastre). *Alternativa descartada*: hacerlas botones
focuseables — se puede sumar después si Mariano lo pide.

### 12.9 Analytics

`lib/analytics.js` suma:

```js
/** Una calco del hero quedó pegada en el termo (spec 028, ampliación A). */
export function trackHeroStickerStick({ slot, metodo }) {
  pushDataLayer({ event: 'hero_sticker_stick', slot, metodo });
  debug('hero_sticker_stick', slot, metodo);
}
```

`pushDataLayer` ya tiene su `try/catch` y ya reenvía a GA4. Sin Píxel de Meta.
Se llama solo al pasar a **pegada** (no al moverla dentro del termo).
`docs/analytics.md` suma el evento.

### 12.10 Archivos

| Archivo | Cambio |
|---|---|
| `components/hero/HeroCalcos.jsx` | Estados, arrastre, vuelo, capa de pegadas, `data-juego`/`data-pegada` |
| `lib/heroTermo.js` | `TERMO.cuerpo`, `DESTINOS_PEGADO`, `ANCHO_PEGADA`, `dentroDelCuerpo()`, `ajustarAlCuerpo()` |
| `lib/heroTermo.test.js` | Destinos dentro del cuerpo y sin taparse; `ajustarAlCuerpo` |
| `components/Hero.jsx` | La pista |
| `styles/index.css` | `.hero-termo__pegadas` (máscara), `.hero-calco-pegada`, `[data-arrastrando]`, cursores, `pointer-events` en táctil, `.hero-termo__pista` |
| `lib/analytics.js` ⚠️ compartido | Solo **suma** `trackHeroStickerStick`; no cambia nada existente |
| `docs/analytics.md` | El evento nuevo |

### 12.11 Manejo de errores

| Falla | Qué pasa |
|---|---|
| Navegador sin `mask-image` | Las pegadas se ven enteras aunque pasen el borde del termo. Se declara también `-webkit-mask-image` (Safari y Chrome < 120): hoy lo soportan todos los navegadores actuales. |
| Sin `setPointerCapture` | Si el cursor sale de la calco muy rápido, se pierde el arrastre y vuelve a su lugar. |
| Falla el tracking | `pushDataLayer` lo atrapa; la calco se pega igual. |

### 12.12 Testing

- `heroTermo.test.js`: cada destino cae dentro del cuerpo; dos destinos no están
  más cerca que medio ancho de calco pegada; `ajustarAlCuerpo` deja adentro un
  punto de afuera y no toca uno de adentro; `dentroDelCuerpo` excluye tapa, base
  y manija.
- Arnés de Chrome (el de la spec): arrastre con `page.mouse` (soltar adentro,
  afuera, sobre un botón), clic, toque emulado, scroll con el dedo encima de una
  calco, re-arrastre de una pegada, movimiento reducido, `dataLayer`, fps
  arrastrando, tamaño del chunk.

### 12.13 Dependencias

Ninguna nueva y **sin `domMax`**: +14 kB por algo que se resuelve con ~150 líneas
propias sobre lo que ya se carga.

---

## 13. Ampliación B — El termo gira

### 13.1 La foto

`termo.webp` se rehace desde el recorte anterior (script en el scratchpad de la
sesión): del eje del cuerpo hacia la derecha, la silueta es el **espejo** de la
izquierda (se va la manija), y cada columna del cuerpo se pinta con el color de
una franja limpia (filas sin logo ni conectores): el cuerpo es un cilindro, su
color no cambia en vertical. Resultado: 142×512, 4,9 kB. `TERMO.cuerpo` se
vuelve a medir (4-96 % del ancho, 30-89 % del alto).

### 13.2 Por qué no se gira la foto

Un cilindro liso girando se ve **igual** en cualquier ángulo. Lo único que
delata el giro es lo que tiene pegado: por eso sin manija ni logo alcanza con
girar **las calcos** alrededor del eje. Nada de WebGL ni de un modelo 3D.

### 13.3 La capa de pegadas pasa a 3D

```
.hero-termo__pegadas            máscara con la silueta · perspective: 700px
  └─ .hero-termo__giro          preserve-3d · animation: rotateY 0 → 360deg, 12 s, linear, infinite
       └─ .hero-calco-pegada    left: 50% · top: fy% · translate(-50%,-50%) rotateY(φ) translateZ(R) · backface-visibility: hidden
            └─ m.img            el apretón (Framer Motion: scale/rotate en su propio transform)
```

- **R** (`--radio`) = medio ancho de la caja del termo, en CSS con las variables
  que ya existen.
- Cada calco está en un ángulo **φ** del sistema que gira. Con el giro en **θ**,
  aparece en `x = R · sin(θ + φ)` y mira hacia atrás cuando `cos(θ + φ) < 0`:
  `backface-visibility: hidden` la esconde y deja de recibir clics (RF-B9).
- **θ** se lee de la animación CSS (`getAnimations()[0].currentTime`): no hay JS
  por cuadro.
- **Pegar**: con el centro de la calco en `x`, `α = asin((x − cx) / R)` (topeado
  a ±75°) y **φ = α − θ**: queda donde se soltó y desde ahí gira (RF-B4).
- **Clic/toque**: vuela a `x = cx` (el frente) a la altura `fy` de su destino;
  al llegar, `α = 0` (RF-B5).
- **Pausa**: `data-arrastrando` en la sección → `animation-play-state: paused`
  del giro (RF-B6). También con `data-pausado` (RF-B7) y sin animación con
  movimiento reducido (RF-B8, θ = 0).
- El borde de la calco que se pasa de la silueta lo sigue recortando la máscara.

---

## 14. Ampliación C — El juego da el 10% del popup

### 14.1 Cómo se comunican el juego y el popup

Viven en árboles distintos: `WelcomePopup` está en `App` (chunk principal) y el
juego en `HeroCalcos` (chunk del Home). Se hablan por un módulo chico,
**`lib/juegoTermo.js`**, que ya importan los dos:

```js
// estado del juego en esta carga de página
{ pegadas: 0, ultimoToque: 0, premiado: false }
registrarToque()         // HeroCalcos: cada clic/toque/arrastre sobre una calco
registrarPegadas(n)      // HeroCalcos: cuántas hay en el termo
alGanar(fn)              // WelcomePopup: se suscribe al premio
```

- **"Está jugando" (RF-C3)** reusa el mecanismo que ya tiene el popup:
  `usePopupDisparo` no abre si hay un elemento con **`data-popup-bloqueo`** en la
  página (hoy lo usa el menú del celular). `HeroCalcos` lo pone en la sección
  del hero con cada toque y lo saca a los 20 s sin tocar. Cero cambios en las
  reglas del popup; su "gracia" de 3 s después de un bloqueo también aplica.
- **El premio (RF-C2, RF-C4)**: al llegar a 4 por primera vez, `juegoTermo`
  marca `premiado` y, 1,2 s después, avisa a `WelcomePopup`, que hace
  `abrir('sticker_game', false)`: la misma apertura del acceso manual (no cuenta
  como "abierto solo", no mira el cooldown de "lo cerró").
- **¿Hay premio? (RF-C5)**: `premioDelJuego()` en `lib/popupReglas.js` (pura,
  testeada): hay premio si el popup está activo, el cupón existe, no tiene un
  cupón activo y no compró. La usan el juego (para la pista) y el popup (para
  abrirse).

### 14.2 La pista

`Hero.jsx` sigue reservando el lugar (`<p class="hero-termo__pista">`); el
contenido lo pone `HeroCalcos` con un portal, porque depende del progreso:

- Con premio: *"Pegá las 4 calcos en el termo y ganate {pct}% OFF"* + contador
  `n/4`. Al completar: *"¡Listo! Tu {pct}% OFF te espera"*.
- Sin premio: la de la ampliación A (mouse / táctil), que se va al pegar la
  primera.

### 14.3 El popup

`PopupDialogo` recibe el disparo y `PopupCaptura` cambia **solo el título**
cuando es `sticker_game`: *"¡Ganaste {pct}% OFF!"* / *"por vestir tu termo 🎉"*.
El resto (campo, botón, éxito, cupón) es el mismo.

### 14.4 Archivos

| Archivo | Cambio |
|---|---|
| `lib/juegoTermo.js` (nuevo) | Estado del juego y aviso del premio |
| `lib/popupReglas.js` | `premioDelJuego()` |
| `components/hero/HeroCalcos.jsx` | Giro (θ, φ), toques, pegadas, bloqueo, pista por portal |
| `components/WelcomePopup.jsx` | Suscripción al premio → `abrir('sticker_game')` |
| `components/popup/PopupDialogo.jsx`, `PopupCaptura.jsx` | Título de premio |
| `lib/heroTermo.js` | `TERMO` nuevo (medidas, cuerpo), `PIEZAS_PARA_GANAR` |
| `styles/index.css` | Capa 3D, giro, pausa, pista con contador |
| `lib/analytics.js` | `pegadas` en `hero_sticker_stick` |

⚠️ `WelcomePopup` y `popupReglas` son de la spec 026: solo se **suma** un
disparo y una función; ninguna regla existente cambia.

